function setupKeyboardShortcuts(video) {
  document.addEventListener('keydown', (e) => {
    // Don't trigger if typing in input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key.toLowerCase()) {
      case ' ':
      case 'k':
        e.preventDefault();
        if (video.paused) {
          video.play();
        } else {
          video.pause();
        }
        break;

      case 'f':
        e.preventDefault();
        if (currentPlayer.toggleFullscreen) {
          currentPlayer.toggleFullscreen();
        }
        break;

      case 'm':
        e.preventDefault();
        video.muted = !video.muted;
        break;

      case 'arrowleft':
      case 'j':
        e.preventDefault();
        video.currentTime = Math.max(0, video.currentTime - (e.key === 'j' ? 10 : 5));
        flashCenterControl('rewind');
        break;

      case 'arrowright':
      case 'l':
        e.preventDefault();
        video.currentTime = Math.min(video.duration, video.currentTime + (e.key === 'l' ? 10 : 5));
        flashCenterControl('forward');
        break;

      case 'arrowup':
        e.preventDefault();
        video.volume = Math.min(1, video.volume + 0.1);
        break;

      case 'arrowdown':
        e.preventDefault();
        video.volume = Math.max(0, video.volume - 0.1);
        break;

      case '0':
      case '1':
      case '2':
      case '3':
      case '4':
      case '5':
      case '6':
      case '7':
      case '8':
      case '9':
        e.preventDefault();
        const percent = parseInt(e.key) / 10;
        video.currentTime = video.duration * percent;
        break;
    }
  });
}

function flashCenterControl(type) {
  const elementId = type === 'rewind' ? 'rewind-flash' : 'forward-flash';
  const element = document.getElementById(elementId);
  
  if (element) {
    element.classList.remove('flash');
    void element.offsetWidth; // Force reflow
    element.classList.add('flash');
  }
}
