function createVideoCard(video) {
  const card = document.createElement('div');
  card.className = 'video-card';
  card.onclick = () => navigate(`/watch/${video.id}`);

  const statusBadge = video.status !== 'ready' ? `
    <div class="video-status-badge ${video.status}">
      ${video.status === 'processing' ? 'Обработка' : 'Ошибка'}
    </div>
  ` : '';

  card.innerHTML = `
    <div class="video-thumbnail">
      ${video.thumbnail_url ? `
        <img src="${video.thumbnail_url}" alt="${video.title}" loading="lazy" />
      ` : `
        <div class="video-thumbnail-placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3;">
            <polygon points="5 3 19 12 5 21 5 3"/>
          </svg>
        </div>
      `}
      ${video.duration ? `<div class="video-duration">${formatDuration(video.duration)}</div>` : ''}
      ${statusBadge}
    </div>
    <div class="video-info">
      <div class="video-info-row">
        <img 
          src="${video.avatar_url || '/assets/icons/profile.svg'}" 
          alt="${video.display_name}" 
          class="avatar avatar-md"
          onerror="this.src='/assets/icons/profile.svg'"
        />
        <div class="video-text">
          <div class="video-title">${video.title}</div>
          <div class="video-meta">
            <div class="video-meta-channel" onclick="event.stopPropagation(); navigate('/channel/${video.username}')">
              ${video.display_name}
            </div>
            <div>${formatViews(video.views_count)} • ${formatDate(video.created_at)}</div>
          </div>
        </div>
      </div>
    </div>
  `;

  return card;
}

function createSkeletonCard() {
  const card = document.createElement('div');
  card.className = 'skeleton-video-card';
  
  card.innerHTML = `
    <div class="skeleton skeleton-thumb"></div>
    <div class="skeleton-card-info">
      <div class="skeleton-card-row">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text w-full"></div>
          <div class="skeleton skeleton-text w-3-4"></div>
          <div class="skeleton skeleton-text w-1-2"></div>
        </div>
      </div>
    </div>
  `;

  return card;
}
