class Router {
  constructor() {
    this.routes = new Map();
    this.currentRoute = null;
    this.init();
  }

  init() {
    window.addEventListener('popstate', () => {
      this.handleRoute(window.location.pathname);
    });
  }

  addRoute(path, handler) {
    this.routes.set(path, handler);
  }

  navigate(path) {
    if (path !== window.location.pathname) {
      window.history.pushState({}, '', path);
    }
    this.handleRoute(path);
  }

  handleRoute(path) {
    this.currentRoute = path;

    // Exact match
    if (this.routes.has(path)) {
      this.routes.get(path)();
      return;
    }

    // Pattern matching
    for (let [pattern, handler] of this.routes) {
      const params = this.matchRoute(pattern, path);
      if (params) {
        handler(params);
        return;
      }
    }

    // 404
    this.show404();
  }

  matchRoute(pattern, path) {
    const patternParts = pattern.split('/').filter(p => p);
    const pathParts = path.split('/').filter(p => p);

    if (patternParts.length !== pathParts.length) {
      return null;
    }

    const params = {};
    for (let i = 0; i < patternParts.length; i++) {
      if (patternParts[i].startsWith(':')) {
        const paramName = patternParts[i].slice(1);
        params[paramName] = decodeURIComponent(pathParts[i]);
      } else if (patternParts[i] !== pathParts[i]) {
        return null;
      }
    }

    return params;
  }

  getCurrentParams() {
    const path = window.location.pathname;
    for (let [pattern] of this.routes) {
      const params = this.matchRoute(pattern, path);
      if (params) return params;
    }
    return {};
  }

  getQueryParams() {
    const params = {};
    const searchParams = new URLSearchParams(window.location.search);
    for (let [key, value] of searchParams) {
      params[key] = value;
    }
    return params;
  }

  show404() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">
          <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
        </div>
        <h2 class="empty-state-title">Страница не найдена</h2>
        <p class="empty-state-text">Запрашиваемая страница не существует или была удалена.</p>
        <button class="btn btn-primary" onclick="navigate('/')">На главную</button>
      </div>
    `;
  }
}

const router = new Router();

function navigate(path) {
  router.navigate(path);
}
