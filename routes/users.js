const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { uploadImage } = require('../middleware/upload');
const { broadcastToAll, sendToUser } = require('../services/websocket');

// GET /api/users/:username
router.get('/:username', optionalAuth, async (req, res) => {
  try {
    const { username } = req.params;
    const result = await pool.query(
      `SELECT id, username, display_name, avatar_url, banner_url, description, subscribers_count, videos_count, created_at
       FROM users WHERE username = $1`,
      [username.toLowerCase()]
    );

    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });

    const user = result.rows[0];
    let isSubscribed = false;

    if (req.user && req.user.id !== user.id) {
      const subResult = await pool.query(
        'SELECT id FROM subscriptions WHERE subscriber_id = $1 AND channel_id = $2',
        [req.user.id, user.id]
      );
      isSubscribed = subResult.rows.length > 0;
    }

    res.json({ user: { ...user, isSubscribed } });
  } catch (err) {
    console.error('Get user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/users/me
router.patch('/me', authMiddleware, async (req, res) => {
  try {
    const { display_name, description } = req.body;

    const result = await pool.query(
      `UPDATE users SET display_name = COALESCE($1, display_name), description = COALESCE($2, description), updated_at = NOW()
       WHERE id = $3
       RETURNING id, username, display_name, email, avatar_url, banner_url, description, subscribers_count, videos_count, created_at`,
      [display_name, description, req.user.id]
    );

    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('Update user error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/me/avatar
router.post('/me/avatar', authMiddleware, uploadImage.single('avatar'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET avatar_url = $1, updated_at = NOW() WHERE id = $2', [avatarUrl, req.user.id]);

    res.json({ avatarUrl });
  } catch (err) {
    console.error('Avatar error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/me/banner
router.post('/me/banner', authMiddleware, uploadImage.single('banner'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const bannerUrl = `/uploads/avatars/${req.file.filename}`;
    await pool.query('UPDATE users SET banner_url = $1, updated_at = NOW() WHERE id = $2', [bannerUrl, req.user.id]);

    res.json({ bannerUrl });
  } catch (err) {
    console.error('Banner error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/users/:username/subscribe
router.post('/:username/subscribe', authMiddleware, async (req, res) => {
  try {
    const { username } = req.params;
    const channelResult = await pool.query('SELECT * FROM users WHERE username = $1', [username.toLowerCase()]);
    if (!channelResult.rows[0]) return res.status(404).json({ error: 'Channel not found' });

    const channel = channelResult.rows[0];
    if (channel.id === req.user.id) return res.status(400).json({ error: 'Cannot subscribe to yourself' });

    const existing = await pool.query(
      'SELECT id FROM subscriptions WHERE subscriber_id = $1 AND channel_id = $2',
      [req.user.id, channel.id]
    );

    let subscribed;
    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM subscriptions WHERE subscriber_id = $1 AND channel_id = $2', [req.user.id, channel.id]);
      subscribed = false;
    } else {
      await pool.query(
        'INSERT INTO subscriptions (subscriber_id, channel_id) VALUES ($1, $2)',
        [req.user.id, channel.id]
      );
      subscribed = true;
    }

    // Update subscribers_count atomically
    const countResult = await pool.query(
      `UPDATE users SET subscribers_count = (SELECT COUNT(*) FROM subscriptions WHERE channel_id = $1)
       WHERE id = $1 RETURNING subscribers_count`,
      [channel.id]
    );

    const subscribersCount = countResult.rows[0].subscribers_count;

    broadcastToAll({
      type: 'channel:subscribers_update',
      channelUsername: channel.username,
      subscribersCount
    });

    res.json({ subscribed, subscribersCount });
  } catch (err) {
    console.error('Subscribe error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});



module.exports = router;
