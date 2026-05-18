const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

const JWT_SECRET = process.env.JWT_SECRET || 'lobystyo-secret-key-change-in-production-2024';

function generateToken(payload) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '30d' });
}

function verifyToken(token) {
  return jwt.verify(token, JWT_SECRET);
}

async function authMiddleware(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (!token) {
      return res.status(401).json({ error: 'Not authenticated' });
    }
    const decoded = verifyToken(token);
    const result = await pool.query(
      'SELECT id, username, display_name, email, avatar_url, banner_url, description, subscribers_count, videos_count, created_at FROM users WHERE id = $1',
      [decoded.userId]
    );
    if (!result.rows[0]) {
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = result.rows[0];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

async function optionalAuth(req, res, next) {
  try {
    const token = req.cookies?.token;
    if (token) {
      const decoded = verifyToken(token);
      const result = await pool.query(
        'SELECT id, username, display_name, email, avatar_url, banner_url, description, subscribers_count, videos_count, created_at FROM users WHERE id = $1',
        [decoded.userId]
      );
      if (result.rows[0]) {
        req.user = result.rows[0];
      }
    }
    next();
  } catch (err) {
    next();
  }
}

module.exports = { authMiddleware, optionalAuth, generateToken, verifyToken, JWT_SECRET };
