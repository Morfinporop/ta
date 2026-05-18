function setupSpeedControls(video) {
  const speedBtn = document.getElementById('speed-btn');
  if (!speedBtn) return;

  const speeds = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
  let speedMenu = null;

  speedBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (speedMenu) {
      speedMenu.remove();
      speedMenu = null;
      return;
    }

    speedMenu = document.createElement('div');
    speedMenu.className = 'speed-menu';
    
    speedMenu.innerHTML = speeds.map(speed => `
      <div class="speed-option ${video.playbackRate === speed ? 'active' : ''}" data-speed="${speed}">
        ${speed}x ${speed === 1 ? '(Обычная)' : ''}
      </div>
    `).join('');

    speedBtn.parentElement.style.position = 'relative';
    speedBtn.parentElement.appendChild(speedMenu);

    // Set speed on click
    speedMenu.querySelectorAll('.speed-option').forEach(option => {
      option.addEventListener('click', () => {
        const speed = parseFloat(option.dataset.speed);
        video.playbackRate = speed;
        speedBtn.textContent = speed + 'x';
        speedMenu.remove();
        speedMenu = null;
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        if (speedMenu) {
          speedMenu.remove();
          speedMenu = null;
        }
        document.removeEventListener('click', closeMenu);
      });
    }, 10);
  });
}
