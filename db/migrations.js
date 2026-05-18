const pool = require('./pool');

async function runMigrations() {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        username VARCHAR(50) UNIQUE NOT NULL,
        display_name VARCHAR(100) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url VARCHAR(500) DEFAULT NULL,
        banner_url VARCHAR(500) DEFAULT NULL,
        description TEXT DEFAULT '',
        subscribers_count INTEGER DEFAULT 0,
        videos_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS videos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        description TEXT DEFAULT '',
        thumbnail_url VARCHAR(500) DEFAULT NULL,
        duration INTEGER DEFAULT 0,
        views_count INTEGER DEFAULT 0,
        likes_count INTEGER DEFAULT 0,
        dislikes_count INTEGER DEFAULT 0,
        status VARCHAR(50) DEFAULT 'processing',
        visibility VARCHAR(50) DEFAULT 'public',
        qualities JSONB DEFAULT '[]',
        hls_path VARCHAR(500) DEFAULT NULL,
        file_size BIGINT DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        subscriber_id UUID REFERENCES users(id) ON DELETE CASCADE,
        channel_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(subscriber_id, channel_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        parent_id UUID REFERENCES comments(id) ON DELETE CASCADE DEFAULT NULL,
        text TEXT NOT NULL,
        likes_count INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS video_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(10) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(video_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS comment_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        comment_id UUID REFERENCES comments(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        UNIQUE(comment_id, user_id)
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS video_views (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE DEFAULT NULL,
        session_id VARCHAR(255) DEFAULT NULL,
        ip_address VARCHAR(45) DEFAULT NULL,
        watched_seconds INTEGER DEFAULT 0,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        from_user_id UUID REFERENCES users(id) ON DELETE CASCADE DEFAULT NULL,
        video_id UUID REFERENCES videos(id) ON DELETE CASCADE DEFAULT NULL,
        type VARCHAR(50) NOT NULL,
        message TEXT NOT NULL,
        is_read BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `);

    // Indexes
    await client.query(`CREATE INDEX IF NOT EXISTS idx_videos_user_id ON videos(user_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_videos_status ON videos(status)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_videos_created_at ON videos(created_at DESC)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_subscriber ON subscriptions(subscriber_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_subscriptions_channel ON subscriptions(channel_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_comments_video_id ON comments(video_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_video_views_video_id ON video_views(video_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)`);
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_videos_search ON videos
      USING GIN(to_tsvector('russian', coalesce(title,'') || ' ' || coalesce(description,'')))
    `);

    await client.query('COMMIT');
    console.log('Migrations completed successfully');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Migration error:', err);
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { runMigrations };
