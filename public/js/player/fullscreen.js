function setupFullscreenControls() {
  const fullscreenBtn = document.getElementById('fullscreen-btn');
  const wrapper = currentPlayer.wrapper;
  const fullscreenIcon = document.getElementById('fullscreen-icon');
  const fullscreenExitIcon = document.getElementById('fullscreen-exit-icon');

  if (!fullscreenBtn) return;

  fullscreenBtn.addEventListener('click', toggleFullscreen);

  function toggleFullscreen() {
    if (!document.fullscreenElement) {
      wrapper.requestFullscreen().catch(err => {
        console.error('Fullscreen error:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
      wrapper.classList.add('fullscreen');
      fullscreenIcon.style.display = 'none';
      fullscreenExitIcon.style.display = 'block';
    } else {
      wrapper.classList.remove('fullscreen');
      fullscreenIcon.style.display = 'block';
      fullscreenExitIcon.style.display = 'none';
    }
  });

  // Expose for keyboard shortcut
  currentPlayer.toggleFullscreen = toggleFullscreen;
}
