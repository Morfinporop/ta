async function renderUploadPage() {
  const state = store.getState();
  
  if (!state.isAuthenticated) {
    navigate('/login');
    return;
  }

  const mainContent = document.getElementById('main-content');
  
  mainContent.innerHTML = `
    <div class="upload-page page">
      <h1 class="upload-title">Загрузить видео</h1>
      <p class="upload-subtitle">Поделитесь своим контентом с миром</p>

      <div class="drop-zone" id="drop-zone">
        <div class="drop-zone-icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="m22 8-6 4 6 4V8Z"/>
            <rect x="2" y="6" width="14" height="12" rx="2"/>
          </svg>
        </div>
        <h3 class="drop-zone-title">Перетащите видео сюда</h3>
        <p class="drop-zone-sub">или</p>
        <div class="drop-zone-btn">
          Выбрать файл
        </div>
        <input type="file" id="video-file-input" accept="video/*" style="display: none;" />
      </div>

      <div id="file-info-container"></div>

      <div class="upload-form" id="upload-form" style="display: none;">
        <div class="form-group">
          <label class="form-label">Название *</label>
          <input type="text" class="input" id="video-title" placeholder="Добавьте описательное название" maxlength="500" required />
        </div>

        <div class="form-group">
          <label class="form-label">Описание</label>
          <textarea class="textarea" id="video-description" placeholder="Расскажите зрителям о вашем видео" rows="5"></textarea>
        </div>

        <div class="form-group">
          <label class="form-label">Видимость</label>
          <div class="visibility-options">
            <div class="visibility-option selected" data-visibility="public">
              <div class="visibility-option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
              </div>
              <div class="visibility-option-label">Публичное</div>
            </div>
            <div class="visibility-option" data-visibility="unlisted">
              <div class="visibility-option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
                  <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
                </svg>
              </div>
              <div class="visibility-option-label">По ссылке</div>
            </div>
            <div class="visibility-option" data-visibility="private">
              <div class="visibility-option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
              </div>
              <div class="visibility-option-label">Приватное</div>
            </div>
          </div>
        </div>

        <div class="upload-progress-wrapper" id="upload-progress">
          <div class="upload-progress-header">
            <span>Загрузка...</span>
            <span id="upload-percent">0%</span>
          </div>
          <div class="upload-progress-bar">
            <div class="upload-progress-fill" id="upload-progress-fill" style="width: 0%;"></div>
          </div>
          <div class="upload-status" id="upload-status" style="display: none;">
            <div class="spinner spinner-sm"></div>
            <span>Обработка видео...</span>
          </div>
        </div>

        <button class="btn btn-primary btn-lg" id="upload-btn" style="width: 100%; margin-top: 24px;">
          Опубликовать
        </button>
      </div>
    </div>
  `;

  setupUploadHandlers();
}

function setupUploadHandlers() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('video-file-input');
  const form = document.getElementById('upload-form');
  const uploadBtn = document.getElementById('upload-btn');
  let selectedFile = null;

  // Click to select file
  dropZone.addEventListener('click', () => fileInput.click());

  // File input change
  fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
      handleFileSelect(e.target.files[0]);
    }
  });

  // Drag and drop
  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    
    if (e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        handleFileSelect(file);
      } else {
        Toast.error('Пожалуйста, выберите видео файл');
      }
    }
  });

  function handleFileSelect(file) {
    const maxSize = 10 * 1024 * 1024 * 1024; // 10GB
    
    if (file.size > maxSize) {
      Toast.error('Файл слишком большой. Максимальный размер: 10GB');
      return;
    }

    selectedFile = file;
    
    document.getElementById('file-info-container').innerHTML = `
      <div class="file-info">
        <div class="file-info-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="2" y="2" width="20" height="20" rx="2.18" ry="2.18"/>
            <line x1="7" y1="2" x2="7" y2="22"/>
            <line x1="17" y1="2" x2="17" y2="22"/>
            <line x1="2" y1="12" x2="22" y2="12"/>
            <line x1="2" y1="7" x2="7" y2="7"/>
            <line x1="2" y1="17" x2="7" y2="17"/>
            <line x1="17" y1="17" x2="22" y2="17"/>
            <line x1="17" y1="7" x2="22" y2="7"/>
          </svg>
        </div>
        <div style="flex: 1;">
          <div class="file-info-name">${file.name}</div>
          <div class="file-info-size">${formatFileSize(file.size)}</div>
        </div>
      </div>
    `;

    form.style.display = 'block';
    dropZone.style.display = 'none';
  }

  // Visibility selection
  document.querySelectorAll('.visibility-option').forEach(option => {
    option.addEventListener('click', () => {
      document.querySelectorAll('.visibility-option').forEach(o => o.classList.remove('selected'));
      option.classList.add('selected');
    });
  });

  // Upload
  uploadBtn.addEventListener('click', async () => {
    if (!selectedFile) {
      Toast.error('Выберите видео файл');
      return;
    }

    const title = document.getElementById('video-title').value.trim();
    if (!title) {
      Toast.error('Введите название видео');
      return;
    }

    const description = document.getElementById('video-description').value.trim();
    const visibility = document.querySelector('.visibility-option.selected').dataset.visibility;

    uploadBtn.disabled = true;
    const progressWrapper = document.getElementById('upload-progress');
    const progressFill = document.getElementById('upload-progress-fill');
    const percentText = document.getElementById('upload-percent');
    const statusDiv = document.getElementById('upload-status');

    progressWrapper.classList.add('visible');

    const formData = new FormData();
    formData.append('video', selectedFile);
    formData.append('title', title);
    formData.append('description', description);
    formData.append('visibility', visibility);

    try {
      const data = await api.upload('/videos/upload', formData, (percent, loaded, total) => {
        progressFill.style.width = percent + '%';
        percentText.textContent = Math.round(percent) + '%';
      });

      statusDiv.style.display = 'flex';
      Toast.success('Видео загружено! Идет обработка...');

      // Listen for processing complete
      wsClient.on('video:ready', (message) => {
        if (message.videoId === data.videoId) {
          Toast.success('Видео готово!', 6000);
          
          Modal.open({
            title: 'Видео опубликовано!',
            content: '<p style="color: var(--color-text-secondary); line-height: 1.6; margin-bottom: 20px;">Ваше видео успешно обработано и опубликовано.</p>',
            actions: [
              {
                label: 'Посмотреть',
                type: 'btn-primary',
                action: () => {
                  Modal.close();
                  navigate(`/watch/${data.videoId}`);
                }
              },
              {
                label: 'Загрузить еще',
                type: 'btn-secondary',
                action: () => {
                  Modal.close();
                  renderUploadPage();
                }
              }
            ]
          });
        }
      });

    } catch (err) {
      Toast.error('Ошибка при загрузке видео: ' + err.message);
      uploadBtn.disabled = false;
      progressWrapper.classList.remove('visible');
    }
  });
}
