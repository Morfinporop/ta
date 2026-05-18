function setupQualityMenu() {
  const qualityBtn = document.getElementById('quality-btn');
  if (!qualityBtn || !currentPlayer || !currentPlayer.hls) return;

  let qualityMenu = null;

  qualityBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    
    if (qualityMenu) {
      qualityMenu.remove();
      qualityMenu = null;
      return;
    }

    qualityMenu = document.createElement('div');
    qualityMenu.className = 'quality-menu';
    
    const qualities = currentPlayer.qualities;
    const currentLevel = currentPlayer.hls.currentLevel;

    let menuHTML = `
      <div class="quality-option ${currentLevel === -1 ? 'active' : ''}" data-quality="-1">
        Auto
        ${currentLevel === -1 ? '<span>✓</span>' : ''}
      </div>
    `;

    qualities.forEach(quality => {
      const label = quality.height + 'p';
      menuHTML += `
        <div class="quality-option ${currentLevel === quality.index ? 'active' : ''}" data-quality="${quality.index}">
          ${label}
          ${currentLevel === quality.index ? '<span>✓</span>' : ''}
        </div>
      `;
    });

    qualityMenu.innerHTML = menuHTML;
    qualityBtn.parentElement.style.position = 'relative';
    qualityBtn.parentElement.appendChild(qualityMenu);

    // Set quality on click
    qualityMenu.querySelectorAll('.quality-option').forEach(option => {
      option.addEventListener('click', () => {
        const qualityIndex = parseInt(option.dataset.quality);
        switchQuality(qualityIndex);
        qualityMenu.remove();
        qualityMenu = null;
      });
    });

    // Close on outside click
    setTimeout(() => {
      document.addEventListener('click', function closeMenu() {
        if (qualityMenu) {
          qualityMenu.remove();
          qualityMenu = null;
        }
        document.removeEventListener('click', closeMenu);
      });
    }, 10);
  });

  // Update button text when quality changes
  currentPlayer.hls.on(Hls.Events.LEVEL_SWITCHED, (event, data) => {
    const level = data.level;
    if (currentPlayer.hls.currentLevel === -1) {
      qualityBtn.textContent = 'Auto';
    } else {
      const height = currentPlayer.hls.levels[level].height;
      qualityBtn.textContent = height + 'p';
    }
  });
}

function switchQuality(levelIndex) {
  if (!currentPlayer || !currentPlayer.hls) return;

  const video = currentPlayer.video;
  const currentTime = video.currentTime;
  const wasPaused = video.paused;

  currentPlayer.hls.currentLevel = levelIndex;
  currentPlayer.currentQuality = levelIndex;

  // Show quality indicator
  const indicator = document.getElementById('quality-indicator');
  if (indicator) {
    const qualityText = levelIndex === -1 ? 'Auto' : currentPlayer.hls.levels[levelIndex].height + 'p';
    indicator.textContent = qualityText;
    indicator.classList.add('visible');
    
    setTimeout(() => {
      indicator.classList.remove('visible');
    }, 2000);
  }

  // Restore playback state
  video.currentTime = currentTime;
  if (!wasPaused) {
    video.play().catch(() => {});
  }
}
