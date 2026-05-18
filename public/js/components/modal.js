class Modal {
  static container = null;
  static currentModal = null;

  static init() {
    if (!this.container) {
      this.container = document.getElementById('modal-container');
      
      // Close on overlay click
      this.container.addEventListener('click', (e) => {
        if (e.target === this.container) {
          this.close();
        }
      });

      // Close on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.container.classList.contains('open')) {
          this.close();
        }
      });
    }
  }

  static open(options) {
    this.init();

    const { title, content, actions = [], onClose } = options;

    const modalHTML = `
      <div class="modal-card">
        <div class="modal-header">
          <h3 class="modal-title">${title}</h3>
          <button class="btn-icon" onclick="Modal.close()">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M18 6L6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>
        <div class="modal-body">
          ${typeof content === 'string' ? content : ''}
        </div>
        ${actions.length > 0 ? `
          <div class="modal-footer">
            ${actions.map(action => `
              <button class="btn ${action.type || 'btn-secondary'}" data-action="${action.label}">
                ${action.label}
              </button>
            `).join('')}
          </div>
        ` : ''}
      </div>
    `;

    this.container.innerHTML = modalHTML;

    if (typeof content !== 'string') {
      const modalBody = this.container.querySelector('.modal-body');
      if (content instanceof HTMLElement) {
        modalBody.innerHTML = '';
        modalBody.appendChild(content);
      }
    }

    // Attach action handlers
    actions.forEach(action => {
      const btn = this.container.querySelector(`[data-action="${action.label}"]`);
      if (btn && action.action) {
        btn.addEventListener('click', () => {
          action.action();
        });
      }
    });

    this.container.classList.add('open');
    this.currentModal = { onClose };
  }

  static close() {
    if (this.container) {
      this.container.classList.remove('open');
      if (this.currentModal && this.currentModal.onClose) {
        this.currentModal.onClose();
      }
      setTimeout(() => {
        this.container.innerHTML = '';
      }, 300);
      this.currentModal = null;
    }
  }

  static confirm(title, message) {
    return new Promise((resolve) => {
      this.open({
        title,
        content: `<p style="color: var(--color-text-secondary); line-height: 1.6;">${message}</p>`,
        actions: [
          {
            label: 'Отмена',
            type: 'btn-secondary',
            action: () => {
              this.close();
              resolve(false);
            }
          },
          {
            label: 'Подтвердить',
            type: 'btn-primary',
            action: () => {
              this.close();
              resolve(true);
            }
          }
        ]
      });
    });
  }
}
