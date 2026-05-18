async function renderCommentSection(videoId) {
  const container = document.querySelector('.comments-section');
  if (!container) return;

  const state = store.getState();
  
  container.innerHTML = `
    <div class="comments-header">
      <h3 class="comments-count" id="comments-count">Комментарии</h3>
    </div>

    ${state.isAuthenticated ? `
      <div class="comment-input-row">
        <img 
          src="${state.user.avatar_url || '/assets/icons/profile.svg'}" 
          alt="${state.user.display_name}"
          class="avatar avatar-md"
          onerror="this.src='/assets/icons/profile.svg'"
        />
        <div class="comment-input-wrapper">
          <textarea 
            class="comment-input" 
            placeholder="Добавить комментарий..."
            id="comment-input"
            rows="1"
          ></textarea>
          <div class="comment-input-actions" id="comment-actions" style="display: none;">
            <button class="btn btn-ghost btn-sm" onclick="cancelComment()">Отмена</button>
            <button class="btn btn-primary btn-sm" id="post-comment-btn" disabled>Комментировать</button>
          </div>
        </div>
      </div>
    ` : `
      <div style="padding: 20px; background: var(--color-bg-elevated); border-radius: var(--radius-lg); text-align: center;">
        <p style="color: var(--color-text-secondary); margin-bottom: 12px;">Войдите, чтобы оставить комментарий</p>
        <button class="btn btn-primary" onclick="navigate('/login')">Войти</button>
      </div>
    `}

    <div id="comments-list"></div>
  `;

  if (state.isAuthenticated) {
    setupCommentInput(videoId);
  }

  loadComments(videoId);

  // Listen for new comments via WebSocket
  wsClient.on('comment:new', (message) => {
    if (message.videoId === videoId) {
      prependComment(message.comment);
    }
  });
}

function setupCommentInput(videoId) {
  const input = document.getElementById('comment-input');
  const actions = document.getElementById('comment-actions');
  const postBtn = document.getElementById('post-comment-btn');

  input.addEventListener('focus', () => {
    actions.style.display = 'flex';
  });

  input.addEventListener('input', () => {
    postBtn.disabled = input.value.trim().length === 0;
    
    // Auto-resize
    input.style.height = 'auto';
    input.style.height = input.scrollHeight + 'px';
  });

  postBtn.addEventListener('click', () => postComment(videoId));
}

function cancelComment() {
  const input = document.getElementById('comment-input');
  const actions = document.getElementById('comment-actions');
  input.value = '';
  input.style.height = 'auto';
  actions.style.display = 'none';
  input.blur();
}

async function postComment(videoId, parentId = null) {
  const input = document.getElementById('comment-input');
  const text = input.value.trim();

  if (!text) return;

  const postBtn = document.getElementById('post-comment-btn');
  postBtn.disabled = true;

  try {
    await api.post(`/comments/${videoId}`, { text, parent_id: parentId });
    input.value = '';
    input.style.height = 'auto';
    document.getElementById('comment-actions').style.display = 'none';
    Toast.success('Комментарий добавлен');
  } catch (err) {
    Toast.error('Не удалось добавить комментарий');
    postBtn.disabled = false;
  }
}

async function loadComments(videoId) {
  const list = document.getElementById('comments-list');
  
  list.innerHTML = '<div class="loading-overlay"><div class="spinner"></div></div>';

  try {
    const data = await api.get(`/comments/${videoId}`);
    
    document.getElementById('comments-count').textContent = `Комментарии (${data.total})`;
    
    if (data.comments.length === 0) {
      list.innerHTML = `
        <div class="empty-state" style="padding: 40px 20px;">
          <div class="empty-state-icon">
            <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
            </svg>
          </div>
          <h3 class="empty-state-title">Пока нет комментариев</h3>
          <p class="empty-state-text">Будьте первым, кто оставит комментарий!</p>
        </div>
      `;
      return;
    }

    list.innerHTML = data.comments.map(comment => renderComment(comment)).join('');
  } catch (err) {
    console.error('Load comments error:', err);
    list.innerHTML = '<p style="text-align: center; color: var(--color-text-muted);">Не удалось загрузить комментарии</p>';
  }
}

function renderComment(comment) {
  return `
    <div class="comment-item">
      <img 
        src="${comment.avatar_url || '/assets/icons/profile.svg'}" 
        alt="${comment.display_name}"
        class="avatar avatar-md"
        onerror="this.src='/assets/icons/profile.svg'"
      />
      <div class="comment-body">
        <div class="comment-author-row">
          <span class="comment-author" onclick="navigate('/channel/${comment.username}')">${comment.display_name}</span>
          <span class="comment-date">${formatDate(comment.created_at)}</span>
        </div>
        <p class="comment-text">${comment.text}</p>
        <div class="comment-actions">
          <button class="comment-action-btn" onclick="likeComment('${comment.id}')">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/>
            </svg>
            ${comment.likes_count > 0 ? comment.likes_count : ''}
          </button>
        </div>
        ${comment.replies && comment.replies.length > 0 ? `
          <div class="replies-container">
            ${comment.replies.map(reply => renderComment(reply)).join('')}
          </div>
        ` : ''}
      </div>
    </div>
  `;
}

function prependComment(comment) {
  const list = document.getElementById('comments-list');
  const countEl = document.getElementById('comments-count');
  
  const commentEl = document.createElement('div');
  commentEl.innerHTML = renderComment(comment);
  
  if (list.querySelector('.empty-state')) {
    list.innerHTML = '';
  }
  
  list.insertBefore(commentEl.firstElementChild, list.firstChild);
  
  // Update count
  const match = countEl.textContent.match(/\d+/);
  if (match) {
    const count = parseInt(match[0]) + 1;
    countEl.textContent = `Комментарии (${count})`;
  }
}

async function likeComment(commentId) {
  try {
    await api.post(`/comments/${commentId}/like`);
  } catch (err) {
    if (err.message.includes('Not authenticated')) {
      Toast.error('Войдите, чтобы оценить комментарий');
    }
  }
}
