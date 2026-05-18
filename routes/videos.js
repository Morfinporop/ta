const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { uploadVideo, uploadImage } = require('../middleware/upload');
const { transcodeVideo } = require('../services/transcoder');
const { broadcastToAll, broadcastToRoom } = require('../services/websocket');
const path = require('path');
const fs = require('fs');

// GET /api/videos
router.get('/', optionalAuth, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT v.*, u.username, u.display_name, u.avatar_url
       FROM videos v
       JOIN users u ON v.user_id = u.id
       WHERE v.status = 'ready' AND v.visibility = 'public'
       ORDER BY v.created_at DESC
       LIMIT $1 OFFSET $2`,
      [limit, offset]
    );

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM videos WHERE status = 'ready' AND visibility = 'public'`
    );

    res.json({
      videos: result.rows,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });
  } catch (err) {
    console.error('Get videos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/videos/channel/:username
router.get('/channel/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const userResult = await pool.query('SELECT id FROM users WHERE username = $1', [username.toLowerCase()]);
    if (!userResult.rows[0]) return res.status(404).json({ error: 'Channel not found' });

    const userId = userResult.rows[0].id;
    const isOwner = req.user && req.user.id === userId;

    const visibilityFilter = isOwner ? '' : "AND v.visibility = 'public'";

    const result = await pool.query(
      `SELECT v.*, u.username, u.display_name, u.avatar_url
       FROM videos v
       JOIN users u ON v.user_id = u.id
       WHERE v.user_id = $1 AND v.status = 'ready' ${visibilityFilter}
       ORDER BY v.created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    );

    res.json({ videos: result.rows, page, limit });
  } catch (err) {
    console.error('Get channel videos error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/videos/:videoId
router.get('/:videoId', optionalAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const result = await pool.query(
      `SELECT v.*, u.username, u.display_name, u.avatar_url, u.subscribers_count, u.description as channel_description
       FROM videos v
       JOIN users u ON v.user_id = u.id
       WHERE v.id = $1`,
      [videoId]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'Video not found' });

    const video = result.rows[0];

    if (video.visibility === 'private' && (!req.user || req.user.id !== video.user_id)) {
      return res.status(403).json({ error: 'Access denied' });
    }

    let userLike = null;
    if (req.user) {
      const likeResult = await pool.query(
        'SELECT type FROM video_likes WHERE video_id = $1 AND user_id = $2',
        [videoId, req.user.id]
      );
      if (likeResult.rows[0]) userLike = likeResult.rows[0].type;
    }

    let isSubscribed = false;
    if (req.user && req.user.id !== video.user_id) {
      const subResult = await pool.query(
        'SELECT id FROM subscriptions WHERE subscriber_id = $1 AND channel_id = $2',
        [req.user.id, video.user_id]
      );
      isSubscribed = subResult.rows.length > 0;
    }

    res.json({ video: { ...video, userLike, isSubscribed } });
  } catch (err) {
    console.error('Get video error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/videos/upload
router.post('/upload', authMiddleware, uploadVideo.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No video file provided' });

    const { title, description = '', visibility = 'public' } = req.body;
    if (!title) return res.status(400).json({ error: 'Title is required' });

    const result = await pool.query(
      `INSERT INTO videos (user_id, title, description, visibility, file_size, status)
       VALUES ($1, $2, $3, $4, $5, 'processing')
       RETURNING *`,
      [req.user.id, title, description, visibility, req.file.size]
    );

    const video = result.rows[0];

    await pool.query(
      'UPDATE users SET videos_count = videos_count + 1 WHERE id = $1',
      [req.user.id]
    );

    // Start transcoding asynchronously
    transcodeVideo(req.file.path, video.id, req.user.id).catch(err => {
      console.error('Transcoding error:', err);
    });

    res.json({ videoId: video.id, status: 'processing' });
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/videos/:videoId/view
router.post('/:videoId/view', optionalAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const userId = req.user?.id || null;
    const ip = req.ip;
    const sessionId = req.cookies?.sessionId || null;

    await pool.query(
      `INSERT INTO video_views (video_id, user_id, ip_address, session_id) VALUES ($1, $2, $3, $4)`,
      [videoId, userId, ip, sessionId]
    );

    const result = await pool.query(
      `UPDATE videos SET views_count = views_count + 1 WHERE id = $1 RETURNING views_count`,
      [videoId]
    );

    if (result.rows[0]) {
      broadcastToRoom(videoId, {
        type: 'video:views_update',
        videoId,
        viewsCount: result.rows[0].views_count
      });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('View error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/videos/:videoId
router.patch('/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { title, description, visibility } = req.body;

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (!videoResult.rows[0]) return res.status(404).json({ error: 'Video not found' });
    if (videoResult.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const result = await pool.query(
      `UPDATE videos SET title = COALESCE($1, title), description = COALESCE($2, description),
       visibility = COALESCE($3, visibility), updated_at = NOW()
       WHERE id = $4 RETURNING *`,
      [title, description, visibility, videoId]
    );

    res.json({ video: result.rows[0] });
  } catch (err) {
    console.error('Update video error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/videos/:videoId
router.delete('/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (!videoResult.rows[0]) return res.status(404).json({ error: 'Video not found' });
    if (videoResult.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    await pool.query('DELETE FROM videos WHERE id = $1', [videoId]);
    await pool.query('UPDATE users SET videos_count = GREATEST(0, videos_count - 1) WHERE id = $1', [req.user.id]);

    // Delete files
    const hlsPath = path.join('uploads/hls', videoId);
    if (fs.existsSync(hlsPath)) {
      fs.rmSync(hlsPath, { recursive: true });
    }

    res.json({ success: true });
  } catch (err) {
    console.error('Delete video error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/videos/:videoId/thumbnail
router.post('/:videoId/thumbnail', authMiddleware, uploadImage.single('thumbnail'), async (req, res) => {
  try {
    const { videoId } = req.params;
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const videoResult = await pool.query('SELECT * FROM videos WHERE id = $1', [videoId]);
    if (!videoResult.rows[0]) return res.status(404).json({ error: 'Video not found' });
    if (videoResult.rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const thumbnailUrl = `/uploads/thumbnails/${req.file.filename}`;
    await pool.query('UPDATE videos SET thumbnail_url = $1 WHERE id = $2', [thumbnailUrl, videoId]);

    res.json({ thumbnailUrl });
  } catch (err) {
    console.error('Thumbnail error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
