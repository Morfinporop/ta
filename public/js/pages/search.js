async function renderSearchPage() {
  const params = router.getQueryParams();
  const query = params.q || '';
  const type = params.type || 'all';

  const mainContent = document.getElementById('main-content');

  mainContent.innerHTML = `
    <div class="search-page page">
      <div class="search-header">
        <h1 class="search-query">
          Результаты поиска: <span class="search-query-text">"${query}"</span>
        </h1>
        <p class="search-results-count" id="results-count">Загрузка...</p>
      </div>

      <div class="search-filters filters-bar">
        <button class="tag ${type === 'all' ? 'active' : ''}" onclick="setSearchFilter('all')">Все</button>
        <button class="tag ${type === 'videos' ? 'active' : ''}" onclick="setSearchFilter('videos')">Видео</button>
        <button class="tag ${type === 'channels' ? 'active' : ''}" onclick="setSearchFilter('channels')">Каналы</button>
      </div>

      <div id="search-results"></div>
    </div>
  `;

  if (!query) {
    document.getElementById('search-results').innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <h2 class="search-empty-title">Введите запрос</h2>
        <p class="search-empty-text">Начните поиск видео или каналов</p>
      </div>
    `;
    return;
  }

  performSearch(query, type);
}

function setSearchFilter(type) {
  const params = router.getQueryParams();
  const url = new URL(window.location);
  
  if (type === 'all') {
    url.searchParams.delete('type');
  } else {
    url.searchParams.set('type', type);
  }
  
  window.history.pushState({}, '', url);
  renderSearchPage();
}

async function performSearch(query, type) {
  const resultsContainer = document.getElementById('search-results');
  const resultsCount = document.getElementById('results-count');

  resultsContainer.innerHTML = '<div class="loading-overlay"><div class="spinner spinner-lg"></div></div>';

  try {
    const data = await api.get('/search', { q: query, type });
    const { videos, channels } = data;

    const totalResults = videos.length + channels.length;
    resultsCount.textContent = `Найдено результатов: ${totalResults}`;

    if (totalResults === 0) {
      resultsContainer.innerHTML = `
        <div class="search-empty">
          <div class="search-empty-icon">
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <circle cx="11" cy="11" r="8"/>
              <path d="m21 21-4.35-4.35"/>
            </svg>
          </div>
          <h2 class="search-empty-title">Ничего не найдено</h2>
          <p class="search-empty-text">Попробуйте изменить запрос или использовать другие ключевые слова</p>
        </div>
      `;
      return;
    }

    let html = '';

    // Channels section
    if (channels.length > 0 && (type === 'all' || type === 'channels')) {
      html += `
        <div class="search-section">
          <h2 class="search-section-title">
            Каналы
            <span class="search-section-count">(${channels.length})</span>
          </h2>
          <div class="channels-carousel">
            ${channels.map(channel => `
              <div class="search-channel-card" onclick="navigate('/channel/${channel.username}')">
                <img 
                  src="${channel.avatar_url || '/assets/icons/profile.svg'}" 
                  alt="${channel.display_name}"
                  class="search-channel-avatar"
                  onerror="this.src='/assets/icons/profile.svg'"
                />
                <div class="search-channel-name">${channel.display_name}</div>
                <div class="search-channel-username">@${channel.username}</div>
                <div class="search-channel-subs">${channel.subscribers_count} подписчиков</div>
                <button class="btn btn-secondary btn-sm" onclick="event.stopPropagation(); navigate('/channel/${channel.username}')">
                  Перейти
                </button>
              </div>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Videos section
    if (videos.length > 0 && (type === 'all' || type === 'videos')) {
      html += `
        <div class="search-section">
          <h2 class="search-section-title">
            Видео
            <span class="search-section-count">(${videos.length})</span>
          </h2>
          <div class="search-videos-grid" id="search-videos-grid"></div>
        </div>
      `;
    }

    resultsContainer.innerHTML = html;

    // Render video cards
    if (videos.length > 0 && (type === 'all' || type === 'videos')) {
      const videosGrid = document.getElementById('search-videos-grid');
      videos.forEach((video, index) => {
        const card = createVideoCard(video);
        card.style.animationDelay = `${index * 30}ms`;
        card.classList.add('animate-fade-in-up');
        videosGrid.appendChild(card);
      });
    }

  } catch (err) {
    console.error('Search error:', err);
    resultsContainer.innerHTML = `
      <div class="search-empty">
        <div class="search-empty-icon">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
        </div>
        <h2 class="search-empty-title">Ошибка поиска</h2>
        <p class="search-empty-text">Не удалось выполнить поиск. Попробуйте позже.</p>
      </div>
    `;
  }
}
