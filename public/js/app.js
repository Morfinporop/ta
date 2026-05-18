// Initialize app when DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
  console.log('LobyStyo initializing...');

  // Check authentication
  await checkAuth();

  // Setup routes
  setupRoutes();

  // Initialize WebSocket
  wsClient.connect();

  // Render UI
  renderNavbar();
  renderSidebar();

  // Handle initial route
  router.handleRoute(window.location.pathname);

  // Subscribe to store changes
  store.subscribe((state) => {
    if (state.isAuthenticated) {
      // User logged in
      renderNavbar();
      renderSidebar();
    }
  });

  console.log('LobyStyo ready!');
});

async function checkAuth() {
  try {
    const data = await api.get('/auth/me');
    store.setUser(data.user);
  } catch (err) {
    // Not authenticated
    store.clearUser();
  }
}

function setupRoutes() {
  router.addRoute('/', renderHomePage);
  router.addRoute('/watch/:videoId', renderWatchPage);
  router.addRoute('/channel/:username', renderProfilePage);
  router.addRoute('/upload', renderUploadPage);
  router.addRoute('/login', renderLoginPage);
  router.addRoute('/register', renderRegisterPage);
  router.addRoute('/search', renderSearchPage);
}

// Cleanup on navigation
window.addEventListener('beforeunload', () => {
  if (currentPlayer) {
    if (currentPlayer.hls) {
      currentPlayer.hls.destroy();
    }
    if (currentPlayer.video) {
      currentPlayer.video.pause();
      currentPlayer.video.src = '';
    }
  }
  
  const state = store.getState();
  if (state.currentVideo) {
    wsClient.leaveVideo(state.currentVideo.id);
  }
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Pause video when tab is hidden
    if (currentPlayer && currentPlayer.video && !currentPlayer.video.paused) {
      currentPlayer.video.pause();
    }
  }
});

// Prevent memory leaks
let previousRoute = null;
store.subscribe((state) => {
  const currentRoute = window.location.pathname;
  
  if (previousRoute && previousRoute !== currentRoute) {
    // Cleanup previous page
    if (currentPlayer) {
      if (currentPlayer.hls) {
        currentPlayer.hls.destroy();
      }
      currentPlayer = null;
    }
    
    if (state.currentVideo) {
      wsClient.leaveVideo(state.currentVideo.id);
      store.setCurrentVideo(null);
    }
  }
  
  previousRoute = currentRoute;
});
