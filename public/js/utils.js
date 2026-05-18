function formatViews(count) {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1).replace('.0', '') + 'M просмотров';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1).replace('.0', '') + 'K просмотров';
  }
  return count + ' просмотров';
}

function formatDate(isoString) {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now - date;
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  const diffMonths = Math.floor(diffDays / 30);
  const diffYears = Math.floor(diffDays / 365);

  if (diffSecs < 60) return 'только что';
  if (diffMins < 60) return `${diffMins} ${pluralize(diffMins, 'минуту', 'минуты', 'минут')} назад`;
  if (diffHours < 24) return `${diffHours} ${pluralize(diffHours, 'час', 'часа', 'часов')} назад`;
  if (diffDays < 30) return `${diffDays} ${pluralize(diffDays, 'день', 'дня', 'дней')} назад`;
  if (diffMonths < 12) return `${diffMonths} ${pluralize(diffMonths, 'месяц', 'месяца', 'месяцев')} назад`;
  return `${diffYears} ${pluralize(diffYears, 'год', 'года', 'лет')} назад`;
}

function formatDuration(seconds) {
  if (!seconds || seconds < 0) return '0:00';
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
}

function pluralize(num, one, few, many) {
  const mod10 = num % 10;
  const mod100 = num % 100;
  
  if (mod10 === 1 && mod100 !== 11) return one;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return few;
  return many;
}

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
