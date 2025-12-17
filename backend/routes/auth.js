import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'timesheet-secret-key-change-in-production';

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
        // Set session (for desktop/browser that supports cookies)
        req.session.userId = user.id;
        req.session.username = user.username;
        req.session.fullName = user.full_name;
        req.session.role = user.role;
        req.session.companyId = user.company_id;

        // Generate JWT (for mobile/cross-domain)
        const token = jwt.sign(
          { 
            userId: user.id, 
            username: user.username, 
            role: user.role, 
            companyId: user.company_id 
          },
          JWT_SECRET,
          { expiresIn: '30d' }
        );

        res.json({
          message: 'Login successful',
          token,
          user: {
            id: user.id,
            username: user.username,
            full_name: user.full_name,
            email: user.email,
            role: user.role,
            company_id: user.company_id
          }
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
  // Check Session
  if (req.session && req.session.userId) {
    return res.json({
      authenticated: true,
      user: {
        id: req.session.userId,
        username: req.session.username,
        full_name: req.session.fullName,
        role: req.session.role,
        company_id: req.session.companyId
      }
    });
  } 
  
  // Check JWT Header (manual check for this endpoint if session missing)
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.json({ authenticated: false });
      }
      return res.json({
        authenticated: true,
        user: {
          id: user.userId,
          username: user.username,
          role: user.role,
          company_id: user.companyId
          // full_name missing in JWT payload above, added to login but here extracted from token
        }
      });
    });
  } else {
    res.json({ authenticated: false });
  }
});

export default router;
