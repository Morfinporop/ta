# LobyStyo - Setup Guide

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
DATABASE_URL=postgresql://postgres:hnXHcpFsGEnvsBbamLULzZLqnCLqOOfM@ballast.proxy.rlwy.net:20871/railway
JWT_SECRET=your-random-secret-key-minimum-64-characters-long
NODE_ENV=development
PORT=3000
MAX_VIDEO_SIZE_MB=10240
```

### 3. Run the Server

```bash
npm start
```

For development with auto-reload:
```bash
npm run dev
```

### 4. Access the Application

Open your browser and navigate to:
```
http://localhost:3000
```

## Database Setup

The database will be automatically initialized on first run. The migrations in `db/migrations.js` will create all necessary tables:

- users
- videos
- subscriptions
- comments
- video_likes
- comment_likes
- video_views
- notifications

All tables include proper indexes for optimal performance.

## File Structure

```
lobystyo/
├── server.js              # Main server file
├── package.json           # Dependencies
├── db/
│   ├── pool.js           # PostgreSQL connection pool
│   └── migrations.js     # Database schema
├── middleware/
│   ├── auth.js           # JWT authentication
│   ├── upload.js         # File upload handling
│   └── rateLimit.js      # API rate limiting
├── routes/
│   ├── auth.js           # Authentication endpoints
│   ├── videos.js         # Video CRUD operations
│   ├── users.js          # User profile management
│   ├── comments.js       # Comments system
│   ├── likes.js          # Like/dislike handling
│   └── search.js         # Search functionality
├── services/
│   ├── transcoder.js     # FFmpeg video transcoding
│   └── websocket.js      # WebSocket real-time updates
└── public/
    ├── index.html        # Single page application
    ├── css/              # All stylesheets
    ├── js/               # Client-side JavaScript
    └── assets/           # Icons and images
```

## Key Features

### Video Upload & Transcoding
- Users can upload videos up to 10GB
- Automatic transcoding to HLS format
- Multiple quality levels (360p, 480p, 720p, 1080p)
- Thumbnail generation from first frame

### Custom Video Player
- Built with HTML5 Video API
- HLS.js for adaptive streaming
- Quality switching without interruption
- Speed control (0.25x to 2x)
- Fullscreen support
- Picture-in-Picture mode
- Keyboard shortcuts

### Real-time Features
- WebSocket connections for live updates
- View count updates
- New comments appear instantly
- Like/dislike counts sync
- Subscriber count updates

### Authentication
- JWT tokens stored in httpOnly cookies
- bcrypt password hashing (12 rounds)
- Rate limiting on auth endpoints
- Secure session management

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create new account
- `POST /api/auth/login` - Login
- `POST /api/auth/logout` - Logout
- `GET /api/auth/me` - Get current user

### Videos
- `GET /api/videos` - List videos (paginated)
- `GET /api/videos/:videoId` - Get video details
- `POST /api/videos/upload` - Upload new video
- `PATCH /api/videos/:videoId` - Update video
- `DELETE /api/videos/:videoId` - Delete video
- `POST /api/videos/:videoId/view` - Record view

### Users
- `GET /api/users/:username` - Get user profile
- `PATCH /api/users/me` - Update profile
- `POST /api/users/me/avatar` - Upload avatar
- `POST /api/users/:username/subscribe` - Subscribe/unsubscribe

### Comments
- `GET /api/comments/:videoId` - Get video comments
- `POST /api/comments/:videoId` - Add comment
- `DELETE /api/comments/:commentId` - Delete comment
- `POST /api/comments/:commentId/like` - Like comment

### Likes
- `POST /api/likes/:videoId` - Like/dislike video
- `GET /api/likes/:videoId` - Get like status

### Search
- `GET /api/search?q=query` - Search videos and channels

## WebSocket Events

### Client to Server
- `auth` - Authenticate WebSocket connection
- `join_video` - Join video room
- `leave_video` - Leave video room
- `ping` - Keep-alive

### Server to Client
- `video:ready` - Video transcoding complete
- `video:views_update` - View count updated
- `video:likes_update` - Like count updated
- `comment:new` - New comment posted
- `channel:subscribers_update` - Subscriber count updated
- `notification:new` - New notification

## Video Player Shortcuts

- `Space/K` - Play/Pause
- `F` - Toggle fullscreen
- `M` - Mute/Unmute
- `←/J` - Rewind 5/10 seconds
- `→/L` - Forward 5/10 seconds
- `↑` - Increase volume
- `↓` - Decrease volume
- `0-9` - Jump to 0-90% of video

## Deployment to Railway

1. Push your code to GitHub
2. Connect repository to Railway
3. Add PostgreSQL database in Railway
4. Set environment variables:
   - `JWT_SECRET` (generate random string)
   - `NODE_ENV=production`
5. Deploy automatically

Railway will:
- Install dependencies
- Run migrations
- Start the server
- Provide public URL

## Troubleshooting

### Database Connection Issues
- Verify DATABASE_URL is correct
- Check PostgreSQL is running
- Ensure network connectivity

### Video Upload Fails
- Check upload file size limits
- Verify FFmpeg is installed
- Check disk space availability

### WebSocket Not Connecting
- Verify server is running
- Check firewall settings
- Ensure WSS protocol for HTTPS

### Video Not Playing
- Check HLS.js is loaded
- Verify video transcoding completed
- Check browser console for errors

## Production Checklist

Before deploying to production:

- [ ] Set strong JWT_SECRET (64+ characters)
- [ ] Enable HTTPS
- [ ] Configure CORS properly
- [ ] Set up file storage (S3/CDN)
- [ ] Configure backup strategy
- [ ] Set up monitoring/logging
- [ ] Review rate limits
- [ ] Test all features
- [ ] Optimize database indexes
- [ ] Configure CDN for static files

## Support

For issues or questions, please refer to the main README.md file.
