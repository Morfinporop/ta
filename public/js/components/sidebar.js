function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const state = store.getState();
  const currentPath = window.location.pathname;

  const isActive = (path) => currentPath === path ? 'active' : '';

  sidebar.innerHTML = `
    <div class="sidebar-section">
      <div class="sidebar-item ${isActive('/')}" onclick="navigate('/')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>Главная</span>
      </div>

      ${state.isAuthenticated ? `
        <div class="sidebar-item" onclick="navigate('/subscriptions')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
          <span>Подписки</span>
        </div>

        <div class="sidebar-item" onclick="navigate('/history')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span>История</span>
        </div>

        <div class="sidebar-item" onclick="navigate('/channel/${state.user.username}')">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="m22 8-6 4 6 4V8Z"/>
            <rect x="2" y="6" width="14" height="12" rx="2"/>
          </svg>
          <span>Мои видео</span>
        </div>
      ` : ''}
    </div>
  `;
}
