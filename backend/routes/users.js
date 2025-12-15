import express from 'express';
import bcrypt from 'bcrypt';
import { db } from '../config/database.js';
import { requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// All routes require admin
router.use(requireAdmin);

// GET /api/users - List all program managers
router.get('/', (req, res) => {
  db.all(
    `SELECT u.id, u.username, u.full_name, u.email, u.role, u.company_id, u.created_at,
            c.name as company_name, c.abbreviation as company_abbr
     FROM users u
     LEFT JOIN companies c ON u.company_id = c.id
     WHERE u.role = 'program_manager'
     ORDER BY u.username`,
    (err, users) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      res.json(users);
    }
  );
});

// POST /api/users - Create new program manager
router.post('/', async (req, res) => {
  const { username, password, full_name, email, company_id } = req.body;

  if (!username || !password || !company_id) {
    return res.status(400).json({ error: 'Username, password, and company are required' });
  }

  try {
    const passwordHash = await bcrypt.hash(password, 10);

    db.run(
      'INSERT INTO users (username, password_hash, full_name, email, role, company_id) VALUES (?, ?, ?, ?, ?, ?)',
      [username, passwordHash, full_name, email, 'program_manager', company_id],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          if (err.message.includes('UNIQUE')) {
            return res.status(409).json({ error: 'Username already exists' });
          }
          return res.status(500).json({ error: 'Failed to create user' });
        }

        res.status(201).json({
          message: 'Program Manager created successfully',
          id: this.lastID
        });
      }
    );
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// PUT /api/users/:id - Update program manager
router.put('/:id', async (req, res) => {
  const { id } = req.params;
  const { username, full_name, email, company_id, password } = req.body;

  // Prevent editing admin users
  db.get('SELECT role FROM users WHERE id = ?', [id], async (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot edit admin users' });
    }

    let query = 'UPDATE users SET username = ?, full_name = ?, email = ?, company_id = ?';
    let params = [username, full_name, email, company_id];

    if (password) {
      try {
        const passwordHash = await bcrypt.hash(password, 10);
        query += ', password_hash = ?';
        params.push(passwordHash);
      } catch (error) {
        console.error('Error hashing password:', error);
        return res.status(500).json({ error: 'Failed to update password' });
      }
    }

    query += ' WHERE id = ?';
    params.push(id);

    db.run(query, params, function (err) {
      if (err) {
        console.error('Database error:', err);
        if (err.message.includes('UNIQUE')) {
          return res.status(409).json({ error: 'Username already exists' });
        }
        return res.status(500).json({ error: 'Failed to update user' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      res.json({ message: 'User updated successfully' });
    });
  });
});

// DELETE /api/users/:id - Delete program manager
router.delete('/:id', (req, res) => {
  const { id } = req.params;

  // Prevent self-deletion
  if (parseInt(id) === req.session.userId) {
    return res.status(403).json({ error: 'Cannot delete your own account' });
  }

  // Prevent deleting admin users
  db.get('SELECT role FROM users WHERE id = ?', [id], (err, user) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    if (user.role === 'admin') {
      return res.status(403).json({ error: 'Cannot delete admin users' });
    }

    db.run('DELETE FROM users WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete user' });
      }
      if (this.changes === 0) {
        return res.status(404).json({ error: 'User not found' });
      }
      res.json({ message: 'User deleted successfully' });
    });
  });
});

export default router;
