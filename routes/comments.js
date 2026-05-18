const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { authMiddleware, optionalAuth } = require('../middleware/auth');
const { broadcastToRoom, sendToUser } = require('../services/websocket');

function sanitizeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

// GET /api/comments/:videoId
router.get('/:videoId', optionalAuth, async (req, res) => {
  try {
    const { videoId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;

    const result = await pool.query(
      `SELECT c.*, u.username, u.display_name, u.avatar_url
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.video_id = $1 AND c.parent_id IS NULL
       ORDER BY c.created_at DESC
       LIMIT $2 OFFSET $3`,
      [videoId, limit, offset]
    );

    const comments = result.rows;

    // Get replies
    if (comments.length > 0) {
      const commentIds = comments.map(c => c.id);
      const repliesResult = await pool.query(
        `SELECT c.*, u.username, u.display_name, u.avatar_url
         FROM comments c
         JOIN users u ON c.user_id = u.id
         WHERE c.parent_id = ANY($1::uuid[])
         ORDER BY c.created_at ASC`,
        [commentIds]
      );

      const repliesMap = {};
      repliesResult.rows.forEach(reply => {
        if (!repliesMap[reply.parent_id]) repliesMap[reply.parent_id] = [];
        repliesMap[reply.parent_id].push(reply);
      });

      comments.forEach(comment => {
        comment.replies = repliesMap[comment.id] || [];
      });
    }

    const countResult = await pool.query(
      'SELECT COUNT(*) FROM comments WHERE video_id = $1 AND parent_id IS NULL',
      [videoId]
    );

    res.json({
      comments,
      total: parseInt(countResult.rows[0].count),
      page,
      limit
    });
  } catch (err) {
    console.error('Get comments error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/comments/:videoId
router.post('/:videoId', authMiddleware, async (req, res) => {
  try {
    const { videoId } = req.params;
    const { text, parent_id } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Comment text is required' });
    }

    const sanitized = sanitizeHtml(text.trim());

    const videoResult = await pool.query('SELECT user_id FROM videos WHERE id = $1', [videoId]);
    if (!videoResult.rows[0]) return res.status(404).json({ error: 'Video not found' });

    const result = await pool.query(
      `INSERT INTO comments (video_id, user_id, parent_id, text)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [videoId, req.user.id, parent_id || null, sanitized]
    );

    const comment = result.rows[0];
    const commentWithUser = {
      ...comment,
      username: req.user.username,
      display_name: req.user.display_name,
      avatar_url: req.user.avatar_url,
      replies: []
    };

    // Broadcast to room
    broadcastToRoom(videoId, {
      type: 'comment:new',
      videoId,
      comment: commentWithUser
    });

    // Notify video owner
    const videoOwnerId = videoResult.rows[0].user_id;
    if (videoOwnerId !== req.user.id) {
      await pool.query(
        `INSERT INTO notifications (user_id, from_user_id, video_id, type, message)
         VALUES ($1, $2, $3, 'new_comment', $4)`,
        [videoOwnerId, req.user.id, videoId, `${req.user.display_name} прокомментировал ваше видео`]
      );

      const notifResult = await pool.query(
        'SELECT * FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
        [videoOwnerId]
      );
      if (notifResult.rows[0]) {
        sendToUser(videoOwnerId, { type: 'notification:new', notification: notifResult.rows[0] });
      }
    }

    res.status(201).json({ comment: commentWithUser });
  } catch (err) {
    console.error('Post comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// DELETE /api/comments/:commentId
router.delete('/:commentId', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;
    const commentResult = await pool.query(
      'SELECT c.*, v.user_id as video_owner FROM comments c JOIN videos v ON c.video_id = v.id WHERE c.id = $1',
      [commentId]
    );

    if (!commentResult.rows[0]) return res.status(404).json({ error: 'Comment not found' });

    const comment = commentResult.rows[0];
    if (comment.user_id !== req.user.id && comment.video_owner !== req.user.id) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    await pool.query('DELETE FROM comments WHERE id = $1', [commentId]);
    res.json({ success: true });
  } catch (err) {
    console.error('Delete comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/comments/:commentId/like
router.post('/:commentId/like', authMiddleware, async (req, res) => {
  try {
    const { commentId } = req.params;

    const existing = await pool.query(
      'SELECT id FROM comment_likes WHERE comment_id = $1 AND user_id = $2',
      [commentId, req.user.id]
    );

    if (existing.rows.length > 0) {
      await pool.query('DELETE FROM comment_likes WHERE comment_id = $1 AND user_id = $2', [commentId, req.user.id]);
    } else {
      await pool.query('INSERT INTO comment_likes (comment_id, user_id) VALUES ($1, $2)', [commentId, req.user.id]);
    }

    const countResult = await pool.query(
      `UPDATE comments SET likes_count = (SELECT COUNT(*) FROM comment_likes WHERE comment_id = $1)
       WHERE id = $1 RETURNING likes_count`,
      [commentId]
    );

    res.json({ likesCount: countResult.rows[0]?.likes_count || 0, liked: existing.rows.length === 0 });
  } catch (err) {
    console.error('Like comment error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
