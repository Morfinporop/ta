const express = require('express');
const router = express.Router();
const pool = require('../db/pool');
const { optionalAuth } = require('../middleware/auth');

// GET /api/search
router.get('/', optionalAuth, async (req, res) => {
  try {
    const { q, type = 'all', sort = 'new' } = req.query;

    if (!q || q.trim().length === 0) {
      return res.json({ videos: [], channels: [], query: '' });
    }

    const query = q.trim();
    let videos = [];
    let channels = [];

    if (type === 'all' || type === 'videos') {
      try {
        const searchQuery = query.split(' ').filter(w => w.length > 0).join(' & ');
        const orderBy = sort === 'popular' ? 'views_count DESC' : 'v.created_at DESC';

        let result = await pool.query(
          `SELECT v.*, u.username, u.display_name, u.avatar_url
           FROM videos v
           JOIN users u ON v.user_id = u.id
           WHERE v.status = 'ready' AND v.visibility = 'public'
           AND to_tsvector('russian', coalesce(v.title,'') || ' ' || coalesce(v.description,'')) @@ to_tsquery('russian', $1)
           ORDER BY ${orderBy}
           LIMIT 20`,
          [searchQuery]
        );

        if (result.rows.length === 0) {
          result = await pool.query(
            `SELECT v.*, u.username, u.display_name, u.avatar_url
             FROM videos v
             JOIN users u ON v.user_id = u.id
             WHERE v.status = 'ready' AND v.visibility = 'public'
             AND (v.title ILIKE $1 OR v.description ILIKE $1)
             ORDER BY ${orderBy}
             LIMIT 20`,
            [`%${query}%`]
          );
        }

        videos = result.rows;
      } catch (e) {
        const orderBy = sort === 'popular' ? 'views_count DESC' : 'v.created_at DESC';
        const result = await pool.query(
          `SELECT v.*, u.username, u.display_name, u.avatar_url
           FROM videos v
           JOIN users u ON v.user_id = u.id
           WHERE v.status = 'ready' AND v.visibility = 'public'
           AND (v.title ILIKE $1 OR v.description ILIKE $1)
           ORDER BY ${orderBy}
           LIMIT 20`,
          [`%${query}%`]
        );
        videos = result.rows;
      }
    }

    if (type === 'all' || type === 'channels') {
      const result = await pool.query(
        `SELECT id, username, display_name, avatar_url, banner_url, description, subscribers_count, videos_count
         FROM users
         WHERE username ILIKE $1 OR display_name ILIKE $1
         ORDER BY subscribers_count DESC
         LIMIT 10`,
        [`%${query}%`]
      );
      channels = result.rows;
    }

    res.json({ videos, channels, query });
  } catch (err) {
    console.error('Search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

module.exports = router;
