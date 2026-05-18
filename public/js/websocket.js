class WebSocketClient {
  constructor() {
    this.ws = null;
    this.reconnectDelay = 1000;
    this.maxReconnectDelay = 30000;
    this.currentDelay = this.reconnectDelay;
    this.listeners = new Map();
    this.connected = false;
    this.reconnecting = false;
    this.currentVideoId = null;
  }

  connect() {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}`;

    try {
      this.ws = new WebSocket(url);

      this.ws.addEventListener('open', () => {
        console.log('WebSocket connected');
        this.connected = true;
        this.reconnecting = false;
        this.currentDelay = this.reconnectDelay;

        // Authenticate if user is logged in
        const token = this.getToken();
        if (token) {
          this.send({ type: 'auth', token });
        }

        // Rejoin video room if applicable
        if (this.currentVideoId) {
          this.send({ type: 'join_video', videoId: this.currentVideoId });
        }
      });

      this.ws.addEventListener('message', (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (err) {
          console.error('WebSocket message error:', err);
        }
      });

      this.ws.addEventListener('close', () => {
        console.log('WebSocket disconnected');
        this.connected = false;
        this.reconnect();
      });

      this.ws.addEventListener('error', (err) => {
        console.error('WebSocket error:', err);
      });
    } catch (err) {
      console.error('WebSocket connection error:', err);
      this.reconnect();
    }
  }

  reconnect() {
    if (this.reconnecting) return;
    this.reconnecting = true;

    console.log(`Reconnecting in ${this.currentDelay}ms...`);
    setTimeout(() => {
      this.reconnecting = false;
      this.connect();
      this.currentDelay = Math.min(this.currentDelay * 2, this.maxReconnectDelay);
    }, this.currentDelay);
  }

  getToken() {
    // Try to get token from cookie
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'token') return value;
    }
    return null;
  }

  send(message) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
    }
  }

  handleMessage(message) {
    const listeners = this.listeners.get(message.type);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(message);
        } catch (err) {
          console.error('WebSocket listener error:', err);
        }
      });
    }
  }

  on(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, new Set());
    }
    this.listeners.get(eventType).add(callback);
  }

  off(eventType, callback) {
    const listeners = this.listeners.get(eventType);
    if (listeners) {
      listeners.delete(callback);
    }
  }

  joinVideo(videoId) {
    this.currentVideoId = videoId;
    this.send({ type: 'join_video', videoId });
  }

  leaveVideo(videoId) {
    if (this.currentVideoId === videoId) {
      this.currentVideoId = null;
    }
    this.send({ type: 'leave_video', videoId });
  }

  disconnect() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

const wsClient = new WebSocketClient();
