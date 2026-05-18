const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { broadcastToRoom } = require('../services/websocket');

// POST /api/likes/:videoId
router.post('/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { type } = req.body;

    if (!['like', 'dislike'].includes(type)) {
      return res.status(400).json({ error: 'Type must be like or dislike' });
    }

    const existing = await pool.query(
      'SELECT * FROM video_likes WHERE video_id = $1 AND user_id = $2',
      [videoId, req.user.id]
    );

    let liked = false;
    let disliked = false;

    if (existing.rows.length > 0) {
      if (existing.rows[0].type === type) {
        // Same type - remove
        await pool.query('DELETE FROM video_likes WHERE video_id = $1 AND user_id = $2', [videoId, req.user.id]);
      } else {
        // Different type - update
        await pool.query(
          'UPDATE video_likes SET type = $1 WHERE video_id = $2 AND user_id = $3',
          [type, videoId, req.user.id]
        );
        liked = type === 'like';
        disliked = type === 'dislike';
      }
    } else {
      await pool.query(
        'INSERT INTO video_likes (video_id, user_id, type) VALUES ($1, $2, $3)',
        [videoId, req.user.id, type]
      );
      liked = type === 'like';
      disliked = type === 'dislike';
    }

    // Atomically update counts
    const result = await pool.query(
      `UPDATE videos SET
        likes_count = (SELECT COUNT(*) FROM video_likes WHERE video_id = $1 AND type = 'like'),
        dislikes_count = (SELECT COUNT(*) FROM video_likes WHERE video_id = $1 AND type = 'dislike')
       WHERE id = $1
       RETURNING likes_count, dislikes_count`,
      [videoId]
    );

    const { likes_count, dislikes_count } = result.rows[0];

    broadcastToRoom(videoId, {
      type: 'video:likes_update',
      videoId,
      likesCount: likes_count,
      dislikesCount: dislikes_count
    });

    res.json({ liked, disliked, likesCount: likes_count, dislikesCount: dislikes_count });
  } catch (err) {
    console.error('Like error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/likes/:videoId
router.get('/:videoId', optionalAuth, async (req, res) => {
  try {
    const { videoId } = req.params;

    const videoResult = await pool.query(
      'SELECT likes_count, dislikes_count FROM videos WHERE id = $1',
      [videoId]
    );

    if (!videoResult.rows[0]) return res.status(404).json({ error: 'Video not found' });

    let liked = false;
    let disliked = false;

    if (req.user) {
      const likeResult = await pool.query(
        'SELECT type FROM video_likes WHERE video_id = $1 AND user_id = $2',
        [videoId, req.user.id]
      );
      if (likeResult.rows[0]) {
        liked = likeResult.rows[0].type === 'like';
        disliked = likeResult.rows[0].type === 'dislike';
      }
    }

    res.json({
      liked,
      disliked,
      likesCount: videoResult.rows[0].likes_count,
      dislikesCount: videoResult.rows[0].dislikes_count
    });
  } catch (err) {
    console.error('Get likes error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
