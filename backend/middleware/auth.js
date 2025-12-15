import { db } from '../config/database.js';

export function requireAuth(req, res, next) {
  if (req.session && req.session.userId) {
    next();
  } else {
    res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
}

export function requireAdmin(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }

  db.get('SELECT role FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(401).json({ error: 'User not found' });
    }
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Forbidden. Admin access required.' });
    }
    next();
  });
}

export function attachUserRole(req, res, next) {
  if (!req.session || !req.session.userId) {
    return next();
  }

  db.get('SELECT id, username, role, company_id FROM users WHERE id = ?', [req.session.userId], (err, user) => {
    if (!err && user) {
      req.user = user;
    }
    next();
  });
}
