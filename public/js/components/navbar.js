function renderNavbar() {
  const navbar = document.getElementById('navbar');
  const state = store.getState();
  const { user, isAuthenticated } = state;

  navbar.innerHTML = `
    <div class="navbar-inner">
      <a class="navbar-logo" onclick="navigate('/')">
        <div class="logo-icon">L</div>
        <div class="logo-text">LobyStyo</div>
      </a>

      <div class="navbar-search">
        <div class="search-input-wrapper">
          <input 
            type="text" 
            class="search-input" 
            placeholder="Поиск..." 
            id="search-input"
            autocomplete="off"
          />
        </div>
        <button class="search-btn" id="search-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </button>
      </div>

      <div class="navbar-actions">
        ${isAuthenticated ? `
          <button class="btn-icon" onclick="navigate('/upload')" title="Загрузить видео">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </button>

          <div class="dropdown" style="position: relative;">
            <img 
              src="${user.avatar_url || '/assets/icons/profile.svg'}" 
              alt="${user.display_name}"
              class="navbar-avatar"
              id="user-menu-btn"
              onerror="this.src='/assets/icons/profile.svg'"
            />
            <div class="dropdown-menu" id="user-menu" style="display: none;"></div>
          </div>
        ` : `
          <button class="btn btn-ghost" onclick="navigate('/login')">Войти</button>
          <button class="btn btn-primary" onclick="navigate('/register')">Регистрация</button>
        `}
      </div>
    </div>
  `;

  // Search functionality
  const searchInput = document.getElementById('search-input');
  const searchBtn = document.getElementById('search-btn');

  const performSearch = () => {
    const query = searchInput.value.trim();
    if (query) {
      navigate(`/search?q=${encodeURIComponent(query)}`);
    }
  };

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') performSearch();
  });

  searchBtn.addEventListener('click', performSearch);

  if (isAuthenticated) {
    // User menu dropdown
    const userMenuBtn = document.getElementById('user-menu-btn');
    const userMenu = document.getElementById('user-menu');

    userMenuBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      userMenu.style.display = userMenu.style.display === 'none' ? 'block' : 'none';
    });

    userMenu.innerHTML = `
      <div class="dropdown-item" onclick="navigate('/channel/${user.username}'); closeDropdowns();">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
        Мой канал
      </div>
      <div class="dropdown-divider"></div>
      <div class="dropdown-item danger" onclick="logout()">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/>
          <polyline points="16 17 21 12 16 7"/>
          <line x1="21" y1="12" x2="9" y2="12"/>
        </svg>
        Выйти
      </div>
    `;

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      userMenu.style.display = 'none';
    });
  }
}

function closeDropdowns() {
  const userMenu = document.getElementById('user-menu');
  if (userMenu) userMenu.style.display = 'none';
}

async function logout() {
  try {
    await api.post('/auth/logout');
    store.clearUser();
    Toast.success('Вы успешно вышли из аккаунта');
    navigate('/');
  } catch (err) {
    Toast.error('Ошибка при выходе');
  }
}
