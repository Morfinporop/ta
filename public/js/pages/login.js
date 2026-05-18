function renderLoginPage() {
  const state = store.getState();
  if (state.isAuthenticated) {
    navigate('/');
    return;
  }

  const mainContent = document.getElementById('main-content');
  
  mainContent.innerHTML = `
    <div class="auth-page">
      <div class="auth-card">
        <div class="auth-logo">
          <div class="auth-logo-icon">L</div>
          <div class="auth-logo-text">LobyStyo</div>
        </div>

        <h2 class="auth-title">Добро пожаловать</h2>
        <p class="auth-subtitle">Войдите в свой аккаунт</p>

        <form class="auth-form" id="login-form">
          <div class="form-group">
            <label class="form-label">Email или имя пользователя</label>
            <input type="text" class="input" id="login-input" placeholder="example@mail.com" required autocomplete="username" />
            <div class="form-error" id="login-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Пароль</label>
            <input type="password" class="input" id="password-input" placeholder="••••••••" required autocomplete="current-password" />
            <div class="form-error" id="password-error" style="display: none;"></div>
          </div>

          <div class="checkbox-wrapper">
            <input type="checkbox" class="checkbox" id="remember-me" />
            <label class="checkbox-label" for="remember-me">Запомнить меня</label>
          </div>

          <button type="submit" class="btn btn-primary btn-lg" id="login-btn" style="width: 100%;">
            Войти
          </button>
        </form>

        <div class="auth-footer">
          Нет аккаунта? <span class="auth-link" onclick="navigate('/register')">Зарегистрироваться</span>
        </div>
      </div>
    </div>
  `;

  const form = document.getElementById('login-form');
  const loginBtn = document.getElementById('login-btn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const login = document.getElementById('login-input').value.trim();
    const password = document.getElementById('password-input').value;

    if (!login || !password) {
      Toast.error('Заполните все поля');
      return;
    }

    loginBtn.disabled = true;
    loginBtn.innerHTML = '<div class="spinner spinner-sm"></div> Вход...';

    try {
      const data = await api.post('/auth/login', { login, password });
      store.setUser(data.user);
      Toast.success(`Добро пожаловать, ${data.user.display_name}!`);
      
      renderNavbar();
      renderSidebar();
      
      const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '/';
      navigate(redirectTo);
    } catch (err) {
      Toast.error(err.message || 'Ошибка входа');
      loginBtn.disabled = false;
      loginBtn.textContent = 'Войти';
    }
  });
}
