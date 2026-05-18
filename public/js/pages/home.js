async function renderHomePage() {
  const mainContent = document.getElementById('main-content');
  
  mainContent.innerHTML = `
    <div class="home-page page">
      <div class="home-filters filters-bar" id="home-filters"></div>
      <div class="video-grid" id="videos-grid"></div>
      <div class="sentinel" id="scroll-sentinel"></div>
    </div>
  `;

  renderFilters();
  loadVideos();
  setupInfiniteScroll();
}

function renderFilters() {
  const filtersContainer = document.getElementById('home-filters');
  const filters = ['Все', 'Новые', 'Популярные'];
  const currentFilter = new URLSearchParams(window.location.search).get('filter') || 'Все';

  filtersContainer.innerHTML = filters.map(filter => `
    <button class="tag ${currentFilter === filter ? 'active' : ''}" onclick="setFilter('${filter}')">
      ${filter}
    </button>
  `).join('');
}

function setFilter(filter) {
  const url = new URL(window.location);
  if (filter === 'Все') {
    url.searchParams.delete('filter');
  } else {
    url.searchParams.set('filter', filter);
  }
  window.history.pushState({}, '', url);
  renderFilters();
  loadVideos(true);
}

let currentPage = 1;
let loading = false;
let hasMore = true;

async function loadVideos(reset = false) {
  if (loading) return;
  if (!reset && !hasMore) return;

  if (reset) {
    currentPage = 1;
    hasMore = true;
  }

  loading = true;
  const grid = document.getElementById('videos-grid');

  if (reset) {
    grid.innerHTML = Array(8).fill(0).map(() => createSkeletonCard().outerHTML).join('');
  }

  try {
    const params = { page: currentPage, limit: 20 };
    const filter = new URLSearchParams(window.location.search).get('filter');
    
    if (filter === 'Популярные') {
      params.sort = 'views';
    }

    const data = await api.get('/videos', params);
    
    if (reset) {
      grid.innerHTML = '';
    }

    if (data.videos.length === 0 && currentPage === 1) {
      grid.innerHTML = `
        <div class="empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="m22 8-6 4 6 4V8Z"/>
              <rect x="2" y="6" width="14" height="12" rx="2"/>
            </svg>
          </div>
          <h2 class="empty-state-title">Пока нет видео</h2>
          <p class="empty-state-text">Загрузите первое видео на платформу!</p>
          <button class="btn btn-primary" onclick="navigate('/upload')">Загрузить видео</button>
        </div>
      `;
      loading = false;
      hasMore = false;
      return;
    }

    data.videos.forEach((video, index) => {
      const card = createVideoCard(video);
      card.style.animationDelay = `${index * 50}ms`;
      card.classList.add('animate-fade-in-up');
      grid.appendChild(card);
    });

    hasMore = data.videos.length === params.limit;
    currentPage++;
  } catch (err) {
    console.error('Load videos error:', err);
    Toast.error('Не удалось загрузить видео');
  } finally {
    loading = false;
  }
}

function setupInfiniteScroll() {
  const sentinel = document.getElementById('scroll-sentinel');
  
  const observer = new IntersectionObserver((entries) => {
    if (entries[0].isIntersecting && !loading && hasMore) {
      loadVideos();
    }
  }, {
    rootMargin: '200px'
  });

  observer.observe(sentinel);
}
