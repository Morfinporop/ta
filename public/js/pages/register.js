function renderRegisterPage() {
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

        <h2 class="auth-title">Создать аккаунт</h2>
        <p class="auth-subtitle">Присоединяйтесь к сообществу</p>

        <form class="auth-form" id="register-form">
          <div class="form-group">
            <label class="form-label">Имя пользователя (для URL канала)</label>
            <div class="input-with-status">
              <input 
                type="text" 
                class="input" 
                id="username-input" 
                placeholder="username" 
                required 
                pattern="[a-zA-Z0-9_]{3,30}"
                autocomplete="username"
              />
              <div class="input-status-icon" id="username-status"></div>
            </div>
            <div class="form-hint">3-30 символов, только латиница, цифры и _</div>
            <div class="form-error" id="username-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Отображаемое имя</label>
            <input type="text" class="input" id="displayname-input" placeholder="Ваше имя" required />
          </div>

          <div class="form-group">
            <label class="form-label">Email</label>
            <input type="email" class="input" id="email-input" placeholder="example@mail.com" required autocomplete="email" />
            <div class="form-error" id="email-error" style="display: none;"></div>
          </div>

          <div class="form-group">
            <label class="form-label">Пароль</label>
            <input type="password" class="input" id="password-input" placeholder="Минимум 8 символов" required autocomplete="new-password" />
            <div class="password-strength" id="password-strength">
              <div class="password-strength-bar">
                <div class="password-strength-fill" id="strength-fill"></div>
              </div>
              <div class="password-strength-text" id="strength-text"></div>
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Подтвердите пароль</label>
            <input type="password" class="input" id="password-confirm-input" placeholder="Повторите пароль" required autocomplete="new-password" />
            <div class="form-error" id="confirm-error" style="display: none;"></div>
          </div>

          <button type="submit" class="btn btn-primary btn-lg" id="register-btn" style="width: 100%;">
            Зарегистрироваться
          </button>
        </form>

        <div class="auth-footer">
          Уже есть аккаунт? <span class="auth-link" onclick="navigate('/login')">Войти</span>
        </div>
      </div>
    </div>
  `;

  setupRegisterValidation();
}

function setupRegisterValidation() {
  const usernameInput = document.getElementById('username-input');
  const passwordInput = document.getElementById('password-input');
  const confirmInput = document.getElementById('password-confirm-input');
  const form = document.getElementById('register-form');
  const registerBtn = document.getElementById('register-btn');

  // Username validation with debounce
  let usernameCheckTimeout;
  usernameInput.addEventListener('input', () => {
    clearTimeout(usernameCheckTimeout);
    const username = usernameInput.value.trim();
    const status = document.getElementById('username-status');

    if (username.length < 3) {
      status.innerHTML = '';
      return;
    }

    if (!/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
      status.innerHTML = '<span style="color: var(--color-error);">✕</span>';
      document.getElementById('username-error').style.display = 'block';
      document.getElementById('username-error').textContent = 'Только латиница, цифры и _';
      return;
    }

    status.innerHTML = '<div class="input-status-icon loading"></div>';
    document.getElementById('username-error').style.display = 'none';

    usernameCheckTimeout = setTimeout(async () => {
      try {
        await api.get(`/users/${username}`);
        // User exists
        status.innerHTML = '<span style="color: var(--color-error);">✕</span>';
        document.getElementById('username-error').style.display = 'block';
        document.getElementById('username-error').textContent = 'Имя пользователя занято';
      } catch (err) {
        // User doesn't exist - good
        status.innerHTML = '<span style="color: var(--color-success);">✓</span>';
        document.getElementById('username-error').style.display = 'none';
      }
    }, 500);
  });

  // Password strength
  passwordInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const fill = document.getElementById('strength-fill');
    const text = document.getElementById('strength-text');

    if (password.length === 0) {
      fill.className = 'password-strength-fill';
      text.textContent = '';
      return;
    }

    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[a-z]/.test(password) && /[A-Z]/.test(password)) strength++;
    if (/\d/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) {
      fill.className = 'password-strength-fill weak';
      text.className = 'password-strength-text weak';
      text.textContent = 'Слабый пароль';
    } else if (strength <= 4) {
      fill.className = 'password-strength-fill medium';
      text.className = 'password-strength-text medium';
      text.textContent = 'Средний пароль';
    } else {
      fill.className = 'password-strength-fill strong';
      text.className = 'password-strength-text strong';
      text.textContent = 'Сильный пароль';
    }
  });

  // Confirm password
  confirmInput.addEventListener('input', () => {
    const password = passwordInput.value;
    const confirm = confirmInput.value;
    const error = document.getElementById('confirm-error');

    if (confirm && password !== confirm) {
      error.style.display = 'block';
      error.textContent = 'Пароли не совпадают';
      confirmInput.classList.add('error');
    } else {
      error.style.display = 'none';
      confirmInput.classList.remove('error');
    }
  });

  // Form submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const username = usernameInput.value.trim().toLowerCase();
    const display_name = document.getElementById('displayname-input').value.trim();
    const email = document.getElementById('email-input').value.trim().toLowerCase();
    const password = passwordInput.value;
    const confirm = confirmInput.value;

    console.log('Register form submit', { username, display_name, email });

    if (password !== confirm) {
      Toast.error('Пароли не совпадают');
      return;
    }

    if (password.length < 8) {
      Toast.error('Пароль должен содержать минимум 8 символов');
      return;
    }

    registerBtn.disabled = true;
    registerBtn.innerHTML = '<div class="spinner spinner-sm"></div> Регистрация...';

    try {
      const data = await api.post('/auth/register', {
        username,
        display_name,
        email,
        password
      });

      store.setUser(data.user);
      Toast.success(`Добро пожаловать, ${data.user.display_name}!`);
      
      renderNavbar();
      renderSidebar();
      navigate('/');
    } catch (err) {
      Toast.error(err.message || 'Ошибка регистрации');
      registerBtn.disabled = false;
      registerBtn.textContent = 'Зарегистрироваться';
    }
  });
}
