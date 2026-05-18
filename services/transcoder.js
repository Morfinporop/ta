const ffmpeg = require('fluent-ffmpeg');
const ffmpegPath = require('ffmpeg-static');
const path = require('path');
const fs = require('fs');
const pool = require('../db/pool');
const { broadcastToAll } = require('./websocket');

ffmpeg.setFfmpegPath(ffmpegPath);

const QUALITY_SETTINGS = {
  '360p': { width: 640, height: 360, videoBitrate: '800k', audioBitrate: '128k' },
  '480p': { width: 854, height: 480, videoBitrate: '1400k', audioBitrate: '128k' },
  '720p': { width: 1280, height: 720, videoBitrate: '2800k', audioBitrate: '128k' },
  '1080p': { width: 1920, height: 1080, videoBitrate: '5000k', audioBitrate: '192k' }
};

let activeTranscodings = 0;
const transcodingQueue = [];
const MAX_CONCURRENT = 2;

function processQueue() {
  while (activeTranscodings < MAX_CONCURRENT && transcodingQueue.length > 0) {
    const task = transcodingQueue.shift();
    task();
  }
}

async function getVideoInfo(filePath) {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      const videoStream = metadata.streams.find(s => s.codec_type === 'video');
      resolve({
        duration: Math.floor(metadata.format.duration || 0),
        width: videoStream?.width || 0,
        height: videoStream?.height || 0
      });
    });
  });
}

async function transcodeQuality(inputPath, outputDir, quality, settings) {
  const playlistPath = path.join(outputDir, quality, 'playlist.m3u8');
  const segmentPath = path.join(outputDir, quality, 'segment%03d.ts');

  fs.mkdirSync(path.join(outputDir, quality), { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .videoCodec('libx264')
      .audioCodec('aac')
      .videoBitrate(settings.videoBitrate)
      .audioBitrate(settings.audioBitrate)
      .videoFilter(`scale=${settings.width}:${settings.height}:force_original_aspect_ratio=decrease,pad=${settings.width}:${settings.height}:(ow-iw)/2:(oh-ih)/2`)
      .outputOptions([
        '-hls_time 6',
        '-hls_playlist_type vod',
        `-hls_segment_filename ${segmentPath}`,
        '-preset fast',
        '-crf 23'
      ])
      .output(playlistPath)
      .on('end', () => resolve(playlistPath))
      .on('error', reject)
      .run();
  });
}

async function generateThumbnail(inputPath, videoId) {
  const thumbnailDir = 'uploads/thumbnails';
  const thumbnailPath = path.join(thumbnailDir, `${videoId}.jpg`);

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ['00:00:01'],
        filename: `${videoId}.jpg`,
        folder: thumbnailDir,
        size: '1280x720'
      })
      .on('end', () => resolve(`/uploads/thumbnails/${videoId}.jpg`))
      .on('error', (err) => {
        console.error('Thumbnail error:', err);
        resolve(null);
      });
  });
}

async function createMasterPlaylist(outputDir, qualities) {
  const masterPath = path.join(outputDir, 'master.m3u8');
  let content = '#EXTM3U\n#EXT-X-VERSION:3\n';

  const bandwidths = {
    '360p': 800000,
    '480p': 1400000,
    '720p': 2800000,
    '1080p': 5000000
  };

  const resolutions = {
    '360p': '640x360',
    '480p': '854x480',
    '720p': '1280x720',
    '1080p': '1920x1080'
  };

  for (const quality of qualities) {
    content += `#EXT-X-STREAM-INF:BANDWIDTH=${bandwidths[quality]},RESOLUTION=${resolutions[quality]},NAME="${quality}"\n`;
    content += `${quality}/playlist.m3u8\n`;
  }

  fs.writeFileSync(masterPath, content);
  return masterPath;
}

async function doTranscode(inputPath, videoId, userId) {
  const outputDir = path.join('uploads/hls', videoId);
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const info = await getVideoInfo(inputPath);
    console.log(`Video info: ${info.width}x${info.height}, ${info.duration}s`);

    // Determine available qualities based on source resolution
    const availableQualities = [];
    if (info.height >= 360) availableQualities.push('360p');
    if (info.height >= 480) availableQualities.push('480p');
    if (info.height >= 720) availableQualities.push('720p');
    if (info.height >= 1080) availableQualities.push('1080p');

    if (availableQualities.length === 0) availableQualities.push('360p');

    // Generate thumbnail
    const thumbnailUrl = await generateThumbnail(inputPath, videoId);

    // Transcode each quality
    for (const quality of availableQualities) {
      console.log(`Transcoding ${quality} for video ${videoId}...`);
      await transcodeQuality(inputPath, outputDir, quality, QUALITY_SETTINGS[quality]);
      console.log(`Done ${quality} for video ${videoId}`);
    }

    // Create master playlist
    await createMasterPlaylist(outputDir, availableQualities);

    // Update database
    await pool.query(
      `UPDATE videos SET
        status = 'ready',
        hls_path = $1,
        duration = $2,
        qualities = $3,
        thumbnail_url = COALESCE($4, thumbnail_url),
        updated_at = NOW()
       WHERE id = $5`,
      [
        `/uploads/hls/${videoId}/master.m3u8`,
        info.duration,
        JSON.stringify(availableQualities),
        thumbnailUrl,
        videoId
      ]
    );

    // Delete original file to save space
    if (fs.existsSync(inputPath)) {
      fs.unlinkSync(inputPath);
    }

    // Notify clients
    broadcastToAll({ type: 'video:ready', videoId });
    console.log(`Video ${videoId} transcoding complete`);

  } catch (err) {
    console.error(`Transcoding failed for ${videoId}:`, err);
    await pool.query(
      `UPDATE videos SET status = 'failed', updated_at = NOW() WHERE id = $1`,
      [videoId]
    );
    throw err;
  }
}

async function transcodeVideo(inputPath, videoId, userId) {
  return new Promise((resolve, reject) => {
    const task = async () => {
      activeTranscodings++;
      try {
        await doTranscode(inputPath, videoId, userId);
        resolve();
      } catch (err) {
        reject(err);
      } finally {
        activeTranscodings--;
        processQueue();
      }
    };

    if (activeTranscodings < MAX_CONCURRENT) {
      task();
    } else {
      transcodingQueue.push(task);
    }
  });
}

module.exports = { transcodeVideo };
