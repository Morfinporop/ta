class Store {
  constructor() {
    this.state = {
      user: null,
      isAuthenticated: false,
      currentPage: null,
      currentVideo: null,
      currentChannel: null,
      notifications: [],
      unreadNotificationsCount: 0
    };
    this.subscribers = new Set();
  }

  getState() {
    return { ...this.state };
  }

  setState(updates) {
    this.state = { ...this.state, ...updates };
    this.notify();
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.unsubscribe(callback);
  }

  unsubscribe(callback) {
    this.subscribers.delete(callback);
  }

  notify() {
    this.subscribers.forEach(callback => {
      try {
        callback(this.state);
      } catch (err) {
        console.error('Subscriber error:', err);
      }
    });
  }

  setUser(user) {
    this.setState({ user, isAuthenticated: !!user });
  }

  clearUser() {
    this.setState({ user: null, isAuthenticated: false });
  }

  setCurrentVideo(video) {
    this.setState({ currentVideo: video });
  }

  setCurrentChannel(channel) {
    this.setState({ currentChannel: channel });
  }

  setNotifications(notifications, unreadCount) {
    this.setState({
      notifications,
      unreadNotificationsCount: unreadCount
    });
  }
}

const store = new Store();
