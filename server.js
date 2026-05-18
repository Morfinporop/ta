const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');

const { runMigrations } = require('./db/migrations');
const { initWebSocket } = require('./services/websocket');
const { apiLimiter } = require('./middleware/rateLimit');

const authRoutes = require('./routes/auth');
const videoRoutes = require('./routes/videos');
const userRoutes = require('./routes/users');
const commentRoutes = require('./routes/comments');
const likeRoutes = require('./routes/likes');
const searchRoutes = require('./routes/search');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;

// Create upload directories
const uploadDirs = ['uploads/videos', 'uploads/hls', 'uploads/thumbnails', 'uploads/avatars'];
uploadDirs.forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "cdn.jsdelivr.net", "fonts.googleapis.com"],
      styleSrc: ["'self'", "'unsafe-inline'", "fonts.googleapis.com", "fonts.gstatic.com"],
      fontSrc: ["'self'", "fonts.gstatic.com"],
      mediaSrc: ["'self'", "blob:"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", "ws:", "wss:"],
      workerSrc: ["'self'", "blob:"]
    }
  }
}));

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Uploads with cache headers
app.use('/uploads/hls', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=31536000');
  next();
}, express.static(path.join(__dirname, 'uploads/hls')));

app.use('/uploads/thumbnails', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(path.join(__dirname, 'uploads/thumbnails')));

app.use('/uploads/avatars', (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=86400');
  next();
}, express.static(path.join(__dirname, 'uploads/avatars')));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Rate limiting on API
app.use('/api', apiLimiter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/videos', videoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/likes', likeRoutes);
app.use('/api/search', searchRoutes);

// SPA fallback
app.get('*', (req, res) => {
  if (!req.path.startsWith('/api') && !req.path.startsWith('/uploads')) {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
  } else {
    res.status(404).json({ error: 'Not found' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'File too large' });
  }
  res.status(500).json({ error: process.env.NODE_ENV === 'production' ? 'Server error' : err.message });
});

async function start() {
  try {
    await runMigrations();
    initWebSocket(server);
    server.listen(PORT, () => {
      console.log(`LobyStyo server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

start();
