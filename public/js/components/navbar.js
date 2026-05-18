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
            <button class="btn-icon" id="notifications-btn" style="position: relative;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"/>
              </svg>
              ${state.unreadNotificationsCount > 0 ? `
                <span class="notif-badge">${state.unreadNotificationsCount > 9 ? '9+' : state.unreadNotificationsCount}</span>
              ` : ''}
            </button>
            <div class="dropdown-menu" id="notifications-menu" style="display: none; min-width: 320px; max-width: 360px;"></div>
          </div>

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
      document.getElementById('notifications-menu').style.display = 'none';
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

    // Notifications dropdown
    const notificationsBtn = document.getElementById('notifications-btn');
    const notificationsMenu = document.getElementById('notifications-menu');

    notificationsBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      notificationsMenu.style.display = notificationsMenu.style.display === 'none' ? 'block' : 'none';
      userMenu.style.display = 'none';

      if (notificationsMenu.style.display === 'block') {
        await loadNotifications();
      }
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
      userMenu.style.display = 'none';
      notificationsMenu.style.display = 'none';
    });

    // Load notifications initially
    loadNotifications();
  }
}

function closeDropdowns() {
  const userMenu = document.getElementById('user-menu');
  const notificationsMenu = document.getElementById('notifications-menu');
  if (userMenu) userMenu.style.display = 'none';
  if (notificationsMenu) notificationsMenu.style.display = 'none';
}

async function loadNotifications() {
  try {
    const data = await api.get('/users/me/notifications');
    store.setNotifications(data.notifications, data.unreadCount);
    renderNotifications(data.notifications);
    
    // Mark as read
    if (data.unreadCount > 0) {
      await api.post('/users/me/notifications/read');
      store.setNotifications(data.notifications, 0);
      renderNavbar();
    }
  } catch (err) {
    console.error('Load notifications error:', err);
  }
}

function renderNotifications(notifications) {
  const menu = document.getElementById('notifications-menu');
  if (!menu) return;

  if (notifications.length === 0) {
    menu.innerHTML = `
      <div style="padding: 20px; text-align: center; color: var(--color-text-muted); font-size: var(--text-sm);">
        Нет уведомлений
      </div>
    `;
    return;
  }

  menu.innerHTML = notifications.slice(0, 5).map(notif => `
    <div class="dropdown-item" style="white-space: normal; line-height: 1.4; padding: 12px;">
      <div style="font-size: var(--text-sm); color: var(--color-text-primary); margin-bottom: 4px;">
        ${notif.message}
      </div>
      <div style="font-size: var(--text-xs); color: var(--color-text-muted);">
        ${formatDate(notif.created_at)}
      </div>
    </div>
  `).join('');
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
