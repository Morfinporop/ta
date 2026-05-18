async function renderWatchPage(params) {
  const { videoId } = params;
  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
    <div class="watch-layout page">
      <div class="watch-main">
        <div id="player-container"></div>
        <div class="video-info-block" id="video-info"></div>
        <div class="comments-section"></div>
      </div>
      <div class="watch-sidebar">
        <div class="related-videos" id="related-videos"></div>
      </div>
    </div>
  `;

  try {
    const data = await api.get(`/videos/${videoId}`);
    const video = data.video;
    
    store.setCurrentVideo(video);

    if (video.status === 'processing') {
      renderProcessingState(video);
      listenForVideoReady(videoId);
    } else if (video.status === 'ready') {
      initializePlayer(video);
      renderVideoInfo(video);
      renderCommentSection(videoId);
      loadRelatedVideos();
      recordView(videoId);
      
      // Join WebSocket room
      wsClient.joinVideo(videoId);
    } else {
      renderFailedState(video);
    }
  } catch (err) {
    console.error('Load video error:', err);
    mainContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <h2 class="empty-state-title">Видео не найдено</h2>
        <p class="empty-state-text">Запрашиваемое видео не существует или недоступно.</p>
        <button class="btn btn-primary" onclick="navigate('/')">На главную</button>
      </div>
    `;
  }
}

function renderProcessingState(video) {
  const playerContainer = document.getElementById('player-container');
  playerContainer.innerHTML = `
    <div class="player-wrapper">
      <div class="player-processing">
        <div class="player-processing-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
        </div>
        <div class="player-processing-text">Видео обрабатывается</div>
        <div class="player-processing-sub">Это может занять несколько минут</div>
        <div class="player-processing-bar">
          <div class="player-processing-fill"></div>
        </div>
      </div>
    </div>
  `;

  document.getElementById('video-info').innerHTML = `
    <h1 class="video-page-title">${video.title}</h1>
    <p style="color: var(--color-text-muted); margin-top: 12px;">Видео будет доступно после завершения обработки.</p>
  `;
}

function renderFailedState(video) {
  const playerContainer = document.getElementById('player-container');
  playerContainer.innerHTML = `
    <div class="player-wrapper">
      <div class="player-processing">
        <div class="player-processing-icon" style="animation: none;">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <div class="player-processing-text">Ошибка обработки</div>
        <div class="player-processing-sub">Не удалось обработать видео</div>
      </div>
    </div>
  `;

  document.getElementById('video-info').innerHTML = `
    <h1 class="video-page-title">${video.title}</h1>
  `;
}

function listenForVideoReady(videoId) {
  wsClient.on('video:ready', (message) => {
    if (message.videoId === videoId) {
      Toast.success('Видео готово к просмотру!');
      router.handleRoute(window.location.pathname);
    }
  });
}

function renderVideoInfo(video) {
  const state = store.getState();
  const isOwner = state.user && state.user.id === video.user_id;

  document.getElementById('video-info').innerHTML = `
    <h1 class="video-page-title">${video.title}</h1>
    
    <div class="video-page-meta">
      <div class="video-page-views">
        <span id="views-count">${formatViews(video.views_count)}</span> • ${formatDate(video.created_at)}
      </div>
      <div class="video-actions">
        <div class="like-btn-group">
          <button class="like-btn ${video.userLike === 'like' ? 'active' : ''}" id="like-btn" onclick="toggleLike('${video.id}', 'like')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${video.userLike === 'like' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span id="likes-count">${video.likes_count > 0 ? video.likes_count : ''}</span>
          </button>
          <div class="like-divider"></div>
          <button class="like-btn ${video.userLike === 'dislike' ? 'active' : ''}" id="dislike-btn" onclick="toggleLike('${video.id}', 'dislike')">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="${video.userLike === 'dislike' ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" style="transform: rotate(180deg);">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            <span id="dislikes-count">${video.dislikes_count > 0 ? video.dislikes_count : ''}</span>
          </button>
        </div>
      </div>
    </div>

    <div class="channel-info-bar">
      <div class="channel-info-main" onclick="navigate('/channel/${video.username}')">
        <img 
          src="${video.avatar_url || '/assets/icons/profile.svg'}" 
          alt="${video.display_name}"
          class="avatar avatar-lg"
          onerror="this.src='/assets/icons/profile.svg'"
        />
        <div class="channel-info-text">
          <div class="channel-info-name">${video.display_name}</div>
          <div class="channel-info-subs"><span id="subs-count">${video.subscribers_count}</span> подписчиков</div>
        </div>
      </div>
      ${!isOwner && state.isAuthenticated ? `
        <button 
          class="btn-subscribe ${video.isSubscribed ? 'subscribed' : ''}" 
          id="subscribe-btn"
          onclick="toggleSubscribe('${video.username}')"
        >
          ${video.isSubscribed ? 'Вы подписаны' : 'Подписаться'}
        </button>
      ` : ''}
    </div>

    ${video.description ? `
      <div class="video-description-wrapper">
        <div class="video-description-text ${video.description.length > 200 ? 'collapsed' : ''}" id="description-text">
          ${video.description}
        </div>
        ${video.description.length > 200 ? `
          <span class="show-more-btn" onclick="toggleDescription()">Показать больше</span>
        ` : ''}
      </div>
    ` : ''}
  `;

  // Listen for real-time updates
  wsClient.on('video:likes_update', (message) => {
    if (message.videoId === video.id) {
      updateLikeCounts(message.likesCount, message.dislikesCount);
    }
  });

  wsClient.on('video:views_update', (message) => {
    if (message.videoId === video.id) {
      document.getElementById('views-count').textContent = formatViews(message.viewsCount);
    }
  });

  wsClient.on('channel:subscribers_update', (message) => {
    if (message.channelUsername === video.username) {
      document.getElementById('subs-count').textContent = message.subscribersCount;
    }
  });
}

function toggleDescription() {
  const text = document.getElementById('description-text');
  const btn = event.target;
  
  if (text.classList.contains('collapsed')) {
    text.classList.remove('collapsed');
    btn.textContent = 'Скрыть';
  } else {
    text.classList.add('collapsed');
    btn.textContent = 'Показать больше';
  }
}

async function toggleLike(videoId, type) {
  const state = store.getState();
  if (!state.isAuthenticated) {
    Toast.error('Войдите, чтобы оценить видео');
    navigate('/login');
    return;
  }

  try {
    const data = await api.post(`/likes/${videoId}`, { type });
    updateLikeButtons(data.liked, data.disliked);
    updateLikeCounts(data.likesCount, data.dislikesCount);
  } catch (err) {
    Toast.error('Не удалось оценить видео');
  }
}

function updateLikeButtons(liked, disliked) {
  const likeBtn = document.getElementById('like-btn');
  const dislikeBtn = document.getElementById('dislike-btn');
  
  if (liked) {
    likeBtn.classList.add('active');
    dislikeBtn.classList.remove('active');
  } else if (disliked) {
    likeBtn.classList.remove('active');
    dislikeBtn.classList.add('active');
  } else {
    likeBtn.classList.remove('active');
    dislikeBtn.classList.remove('active');
  }
}

function updateLikeCounts(likes, dislikes) {
  document.getElementById('likes-count').textContent = likes > 0 ? likes : '';
  document.getElementById('dislikes-count').textContent = dislikes > 0 ? dislikes : '';
}

async function toggleSubscribe(username) {
  try {
    const data = await api.post(`/users/${username}/subscribe`);
    const btn = document.getElementById('subscribe-btn');
    
    if (data.subscribed) {
      btn.classList.add('subscribed');
      btn.textContent = 'Вы подписаны';
      Toast.success('Вы подписались на канал');
    } else {
      btn.classList.remove('subscribed');
      btn.textContent = 'Подписаться';
      Toast.info('Вы отписались от канала');
    }
    
    document.getElementById('subs-count').textContent = data.subscribersCount;
  } catch (err) {
    Toast.error('Не удалось подписаться');
  }
}

async function recordView(videoId) {
  try {
    await api.post(`/videos/${videoId}/view`);
  } catch (err) {
    console.error('Record view error:', err);
  }
}

async function loadRelatedVideos() {
  const container = document.getElementById('related-videos');
  if (!container) return;

  try {
    const data = await api.get('/videos', { limit: 10 });
    
    container.innerHTML = data.videos.map(video => `
      <div class="related-video-card" onclick="navigate('/watch/${video.id}')">
        <div class="related-thumbnail">
          ${video.thumbnail_url ? `
            <img src="${video.thumbnail_url}" alt="${video.title}" loading="lazy" />
          ` : ''}
          ${video.duration ? `<div class="video-duration">${formatDuration(video.duration)}</div>` : ''}
        </div>
        <div class="related-info">
          <div class="related-title">${video.title}</div>
          <div class="related-meta">
            <div>${video.display_name}</div>
            <div>${formatViews(video.views_count)} • ${formatDate(video.created_at)}</div>
          </div>
        </div>
      </div>
    `).join('');
  } catch (err) {
    console.error('Load related videos error:', err);
  }
}
