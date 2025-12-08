import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';

const router = express.Router();

// Login
router.post('/login', (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  db.get('SELECT * FROM users WHERE username = ?', [username], async (err, user) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    try {
      const passwordMatch = await bcrypt.compare(password, user.password_hash);

      if (passwordMatch) {
        req.session.userId = user.id;
        req.session.username = user.username;
        res.json({
          message: 'Login successful',
          user: { id: user.id, username: user.username, email: user.email }
        });
      } else {
        res.status(401).json({ error: 'Invalid username or password' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Authentication error' });
    }
  });
});

// Logout
router.post('/logout', (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logout successful' });
  });
});

// Check authentication status
router.get('/check', (req, res) => {
  if (req.session && req.session.userId) {
    res.json({
      authenticated: true,
      user: { id: req.session.userId, username: req.session.username }
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;
