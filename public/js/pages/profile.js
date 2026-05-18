async function renderProfilePage(params) {
  const { username } = params;
  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>';

  try {
    const data = await api.get(`/users/${username}`);
    const channel = data.user;
    const state = store.getState();
    const isOwner = state.user && state.user.username === channel.username;

    store.setCurrentChannel(channel);

    mainContent.innerHTML = `
      <div class="profile-page page">
        <div class="profile-banner">
          ${channel.banner_url ? `<img src="${channel.banner_url}" alt="${channel.display_name}" />` : ''}
        </div>

        <div class="profile-header">
          <div class="profile-header-row">
            <img 
              src="${channel.avatar_url || '/assets/icons/profile.svg'}" 
              alt="${channel.display_name}"
              class="profile-avatar-large"
              onerror="this.src='/assets/icons/profile.svg'"
            />
            <div class="profile-header-info">
              <h1 class="profile-name">${channel.display_name}</h1>
              <p class="profile-username">@${channel.username}</p>
              <div class="profile-stats">
                <div class="profile-stat">
                  <span class="profile-stat-value" id="channel-subs">${channel.subscribers_count}</span>
                  <span>подписчиков</span>
                </div>
                <div class="profile-stat">
                  <span class="profile-stat-value">${channel.videos_count}</span>
                  <span>видео</span>
                </div>
              </div>
            </div>
            <div class="profile-header-actions">
              ${isOwner ? `
                <button class="btn btn-secondary" onclick="navigate('/upload')">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 5v14M5 12h14"/>
                  </svg>
                  Загрузить видео
                </button>
              ` : state.isAuthenticated ? `
                <button 
                  class="btn-subscribe ${channel.isSubscribed ? 'subscribed' : ''}" 
                  id="profile-subscribe-btn"
                  onclick="toggleChannelSubscribe('${channel.username}')"
                >
                  ${channel.isSubscribed ? 'Вы подписаны' : 'Подписаться'}
                </button>
              ` : `
                <button class="btn btn-primary" onclick="navigate('/login')">Подписаться</button>
              `}
            </div>
          </div>
          ${channel.description ? `
            <p class="profile-description">${channel.description}</p>
          ` : ''}
        </div>

        <div class="profile-tabs tabs">
          <div class="tab active" data-tab="videos">Видео</div>
          <div class="tab" data-tab="about">О канале</div>
        </div>

        <div class="profile-content" id="profile-content"></div>
      </div>
    `;

    setupProfileTabs(channel);
    loadChannelVideos(channel.username);

    // Listen for subscriber updates
    wsClient.on('channel:subscribers_update', (message) => {
      if (message.channelUsername === channel.username) {
        document.getElementById('channel-subs').textContent = message.subscribersCount;
      }
    });

  } catch (err) {
    console.error('Load profile error:', err);
    mainContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
            <circle cx="12" cy="7" r="4"/>
          </svg>
        </div>
        <h2 class="empty-state-title">Канал не найден</h2>
        <p class="empty-state-text">Запрашиваемый канал не существует.</p>
        <button class="btn btn-primary" onclick="navigate('/')">На главную</button>
      </div>
    `;
  }
}

function setupProfileTabs(channel) {
  const tabs = document.querySelectorAll('.profile-tabs .tab');
  
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      const tabType = tab.dataset.tab;
      if (tabType === 'videos') {
        loadChannelVideos(channel.username);
      } else if (tabType === 'about') {
        renderAboutTab(channel);
      }
    });
  });
}

async function loadChannelVideos(username) {
  const content = document.getElementById('profile-content');
  content.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

  try {
    const data = await api.get(`/videos/channel/${username}`);
    
    if (data.videos.length === 0) {
      content.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="m22 8-6 4 6 4V8Z"/>
              <rect x="2" y="6" width="14" height="12" rx="2"/>
            </svg>
          </div>
          <h3 class="empty-state-title">Пока нет видео</h3>
          <p class="empty-state-text">На этом канале еще не загружено ни одного видео.</p>
        </div>
      `;
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'profile-videos-grid';
    
    data.videos.forEach(video => {
      grid.appendChild(createVideoCard(video));
    });

    content.innerHTML = '';
    content.appendChild(grid);
  } catch (err) {
    console.error('Load channel videos error:', err);
    content.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Не удалось загрузить видео</p>';
  }
}

function renderAboutTab(channel) {
  const content = document.getElementById('profile-content');
  
  content.innerHTML = `
    <div class="profile-about">
      ${channel.description ? `
        <div class="profile-about-item">
          <div class="profile-about-label">Описание</div>
          <div class="profile-about-value">${channel.description}</div>
        </div>
      ` : ''}
      
      <div class="profile-about-item">
        <div class="profile-about-label">Дата регистрации</div>
        <div class="profile-about-value">${formatDate(channel.created_at)}</div>
      </div>
      
      <div class="profile-about-item">
        <div class="profile-about-label">Всего просмотров</div>
        <div class="profile-about-value">Статистика недоступна</div>
      </div>
    </div>
  `;
}

async function toggleChannelSubscribe(username) {
  try {
    const data = await api.post(`/users/${username}/subscribe`);
    const btn = document.getElementById('profile-subscribe-btn');
    
    if (data.subscribed) {
      btn.classList.add('subscribed');
      btn.textContent = 'Вы подписаны';
      Toast.success('Вы подписались на канал');
    } else {
      btn.classList.remove('subscribed');
      btn.textContent = 'Подписаться';
      Toast.info('Вы отписались от канала');
    }
    
    document.getElementById('channel-subs').textContent = data.subscribersCount;
  } catch (err) {
    Toast.error('Не удалось подписаться');
  }
}
