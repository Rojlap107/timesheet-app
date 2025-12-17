import jwt from 'jsonwebtoken';
import { db } from '../config/database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'timesheet-secret-key-change-in-production';

export function requireAuth(req, res, next) {
  // 1. Check Session
  if (req.session && req.session.userId) {
    return next();
  }

  // 2. Check JWT
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ error: 'Unauthorized. Invalid token.' });
      }
      // Attach user info to request for downstream use
      req.user = user;
      // Also mimic session for compatibility if needed (optional)
      req.session = req.session || {};
      req.session.userId = user.userId;
      req.session.role = user.role;
      req.session.companyId = user.companyId;
      
      next();
    });
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

export function requireAdmin(req, res, next) {
  const checkRole = (userId, role) => {
    if (role === 'admin') {
      return next();
    }
    // Double check DB just in case (optional, but safer)
    db.get('SELECT role FROM users WHERE id = ?', [userId], (err, user) => {
      if (err || !user) return res.status(401).json({ error: 'Unauthorized' });
      if (user.role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
      next();
    });
  };

  if (req.session && req.session.userId) {
    // Session path
    return checkRole(req.session.userId, req.session.role);
  }

  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) return res.status(401).json({ error: 'Unauthorized' });
      req.user = user;
      // Mimic session
      req.session = req.session || {};
      req.session.userId = user.userId;
      req.session.role = user.role;
      
      checkRole(user.userId, user.role);
    });
  } else {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

export function attachUserRole(req, res, next) {
  // Session check
  if (req.session && req.session.userId) {
    db.get('SELECT id, username, role, company_id FROM users WHERE id = ?', [req.session.userId], (err, user) => {
      if (!err && user) {
        req.user = user;
      }
      next();
    });
    return;
  }

  // JWT check
  const authHeader = req.headers.authorization;
  if (authHeader) {
    const token = authHeader.split(' ')[1];
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (!err && user) {
        req.user = {
          id: user.userId,
          username: user.username,
          role: user.role,
          company_id: user.companyId
        };
      }
      next();
    });
  } else {
    next();
  }
}
