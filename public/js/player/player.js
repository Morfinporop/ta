let currentPlayer = null;

function initializePlayer(video) {
  const container = document.getElementById('player-container');
  
  container.innerHTML = `
    <div class="player-wrapper" id="player-wrapper">
      <video id="player-video" preload="metadata"></video>
      
      <div class="player-big-play" id="big-play-btn">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <polygon points="5 3 19 12 5 21 5 3"/>
        </svg>
      </div>

      <div class="player-overlay" id="player-overlay">
        <div class="player-center-controls" id="center-controls">
          <div class="center-btn" id="rewind-flash">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 19 2 12 11 5 11 19"/>
              <polygon points="22 19 13 12 22 5 22 19"/>
            </svg>
          </div>
          <div class="center-btn" id="forward-flash">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="13 5 22 12 13 19 13 5"/>
              <polygon points="2 5 11 12 2 19 2 5"/>
            </svg>
          </div>
        </div>

        <div class="player-controls" id="player-controls">
          <div class="progress-container" id="progress-container">
            <div class="progress-buffer" id="progress-buffer"></div>
            <div class="progress-played" id="progress-played"></div>
            <div class="progress-thumb" id="progress-thumb"></div>
            <div class="time-tooltip" id="time-tooltip">0:00</div>
          </div>

          <div class="controls-bottom">
            <div class="controls-left">
              <button class="player-btn" id="play-pause-btn" title="Воспроизведение/Пауза">
                <svg id="play-icon" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="5 3 19 12 5 21 5 3"/>
                </svg>
                <svg id="pause-icon" viewBox="0 0 24 24" fill="currentColor" style="display: none;">
                  <rect x="6" y="4" width="4" height="16"/>
                  <rect x="14" y="4" width="4" height="16"/>
                </svg>
              </button>

              <div class="volume-container">
                <button class="player-btn" id="volume-btn" title="Громкость">
                  <svg id="volume-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/>
                  </svg>
                  <svg id="mute-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                    <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/>
                    <line x1="23" y1="9" x2="17" y2="15"/>
                    <line x1="17" y1="9" x2="23" y2="15"/>
                  </svg>
                </button>
                <div class="volume-slider-wrapper">
                  <input type="range" id="volume-slider" class="volume-slider" min="0" max="100" value="100" />
                </div>
              </div>

              <div class="time-display">
                <span id="current-time">0:00</span> / <span id="duration-time">0:00</span>
              </div>
            </div>

            <div class="controls-right">
              <button class="player-btn" id="speed-btn" title="Скорость">1x</button>
              <button class="player-btn" id="quality-btn" title="Качество">Auto</button>
              <button class="player-btn" id="pip-btn" title="Картинка в картинке" style="display: none;">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>
                  <rect x="12" y="3" width="9" height="7" rx="1"/>
                </svg>
              </button>
              <button class="player-btn" id="fullscreen-btn" title="Полный экран">
                <svg id="fullscreen-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
                </svg>
                <svg id="fullscreen-exit-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="display: none;">
                  <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div class="quality-indicator" id="quality-indicator">HD</div>
    </div>
  `;

  const videoElement = document.getElementById('player-video');
  const hlsUrl = video.hls_path;

  currentPlayer = {
    video: videoElement,
    hls: null,
    qualities: [],
    currentQuality: -1,
    wrapper: document.getElementById('player-wrapper'),
    overlay: document.getElementById('player-overlay'),
    controls: document.getElementById('player-controls'),
    videoData: video
  };

  // Initialize HLS
  if (Hls.isSupported()) {
    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: false,
      backBufferLength: 90
    });
    
    hls.loadSource(hlsUrl);
    hls.attachMedia(videoElement);
    
    hls.on(Hls.Events.MANIFEST_PARSED, (event, data) => {
      currentPlayer.hls = hls;
      currentPlayer.qualities = data.levels.map((level, index) => ({
        index,
        height: level.height,
        bitrate: level.bitrate
      }));
      
      setupPlayerControls();
      setupQualityMenu();
    });

    hls.on(Hls.Events.ERROR, (event, data) => {
      if (data.fatal) {
        console.error('HLS Fatal Error:', data);
        Toast.error('Ошибка воспроизведения видео');
      }
    });
  } else if (videoElement.canPlayType('application/vnd.apple.mpegurl')) {
    // Native HLS support (Safari)
    videoElement.src = hlsUrl;
    setupPlayerControls();
  } else {
    Toast.error('Ваш браузер не поддерживает воспроизведение видео');
  }
}

function setupPlayerControls() {
  const player = currentPlayer;
  const video = player.video;

  // Play/Pause
  setupPlayPause(video);

  // Progress bar
  setupProgressBar(video);

  // Volume
  setupVolumeControls(video);

  // Speed
  setupSpeedControls(video);

  // Fullscreen
  setupFullscreenControls();

  // PiP
  setupPiPControls(video);

  // Keyboard shortcuts
  setupKeyboardShortcuts(video);

  // Auto-hide controls
  setupAutoHideControls();

  // Time display
  setupTimeDisplay(video);
}

function setupPlayPause(video) {
  const playPauseBtn = document.getElementById('play-pause-btn');
  const bigPlayBtn = document.getElementById('big-play-btn');
  const playIcon = document.getElementById('play-icon');
  const pauseIcon = document.getElementById('pause-icon');

  const togglePlayPause = () => {
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  playPauseBtn.addEventListener('click', togglePlayPause);
  bigPlayBtn.addEventListener('click', togglePlayPause);

  video.addEventListener('play', () => {
    playIcon.style.display = 'none';
    pauseIcon.style.display = 'block';
    bigPlayBtn.classList.add('hidden');
  });

  video.addEventListener('pause', () => {
    playIcon.style.display = 'block';
    pauseIcon.style.display = 'none';
    bigPlayBtn.classList.remove('hidden');
  });

  // Click on video to toggle
  video.addEventListener('click', togglePlayPause);
}

function setupProgressBar(video) {
  const container = document.getElementById('progress-container');
  const played = document.getElementById('progress-played');
  const buffer = document.getElementById('progress-buffer');
  const thumb = document.getElementById('progress-thumb');
  const tooltip = document.getElementById('time-tooltip');

  let scrubbing = false;

  const updateProgress = () => {
    if (scrubbing) return;
    const percent = (video.currentTime / video.duration) * 100;
    played.style.width = percent + '%';
    thumb.style.left = percent + '%';
  };

  const updateBuffer = () => {
    if (video.buffered.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1);
      const percent = (bufferedEnd / video.duration) * 100;
      buffer.style.width = percent + '%';
    }
  };

  video.addEventListener('timeupdate', updateProgress);
  video.addEventListener('progress', updateBuffer);

  const seek = (e) => {
    const rect = container.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * video.duration;
    video.currentTime = time;
    played.style.width = (percent * 100) + '%';
    thumb.style.left = (percent * 100) + '%';
  };

  container.addEventListener('mousedown', (e) => {
    scrubbing = true;
    container.classList.add('scrubbing');
    seek(e);
  });

  document.addEventListener('mousemove', (e) => {
    if (scrubbing) seek(e);

    // Show tooltip
    if (e.target === container || container.contains(e.target)) {
      const rect = container.getBoundingClientRect();
      const percent = (e.clientX - rect.left) / rect.width;
      const time = percent * video.duration;
      tooltip.textContent = formatDuration(time);
      tooltip.style.left = (e.clientX - rect.left) + 'px';
    }
  });

  document.addEventListener('mouseup', () => {
    if (scrubbing) {
      scrubbing = false;
      container.classList.remove('scrubbing');
    }
  });
}

function setupVolumeControls(video) {
  const volumeBtn = document.getElementById('volume-btn');
  const volumeSlider = document.getElementById('volume-slider');
  const volumeIcon = document.getElementById('volume-icon');
  const muteIcon = document.getElementById('mute-icon');

  volumeSlider.addEventListener('input', (e) => {
    video.volume = e.target.value / 100;
    updateVolumeIcon();
  });

  volumeBtn.addEventListener('click', () => {
    video.muted = !video.muted;
    updateVolumeIcon();
  });

  const updateVolumeIcon = () => {
    if (video.muted || video.volume === 0) {
      volumeIcon.style.display = 'none';
      muteIcon.style.display = 'block';
    } else {
      volumeIcon.style.display = 'block';
      muteIcon.style.display = 'none';
    }
  };

  video.addEventListener('volumechange', updateVolumeIcon);
}

function setupTimeDisplay(video) {
  const currentTimeEl = document.getElementById('current-time');
  const durationTimeEl = document.getElementById('duration-time');

  video.addEventListener('loadedmetadata', () => {
    durationTimeEl.textContent = formatDuration(video.duration);
  });

  video.addEventListener('timeupdate', () => {
    currentTimeEl.textContent = formatDuration(video.currentTime);
  });
}

function setupAutoHideControls() {
  const overlay = currentPlayer.overlay;
  const wrapper = currentPlayer.wrapper;
  let hideTimeout;

  const showControls = () => {
    overlay.classList.remove('hidden');
    clearTimeout(hideTimeout);
    
    if (!currentPlayer.video.paused) {
      hideTimeout = setTimeout(() => {
        overlay.classList.add('hidden');
      }, 3000);
    }
  };

  wrapper.addEventListener('mousemove', showControls);
  wrapper.addEventListener('touchstart', showControls);

  currentPlayer.video.addEventListener('play', () => {
    hideTimeout = setTimeout(() => {
      overlay.classList.add('hidden');
    }, 3000);
  });

  currentPlayer.video.addEventListener('pause', () => {
    clearTimeout(hideTimeout);
    overlay.classList.remove('hidden');
  });
}

function setupPiPControls(video) {
  if (!document.pictureInPictureEnabled) return;

  const pipBtn = document.getElementById('pip-btn');
  pipBtn.style.display = 'flex';

  pipBtn.addEventListener('click', async () => {
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else {
        await video.requestPictureInPicture();
      }
    } catch (err) {
      console.error('PiP error:', err);
    }
  });
}
