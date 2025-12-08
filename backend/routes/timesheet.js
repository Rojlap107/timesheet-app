import express from 'express';
import { db } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { sendTimesheetEmail } from '../utils/email.js';

const router = express.Router();

// Generate unique ID for timesheet entry
function generateUniqueId(date) {
  const dateStr = date.replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TS-${dateStr}-${randomNum}`;
}

// Get all companies
router.get('/companies', requireAuth, (req, res) => {
  db.all('SELECT * FROM companies ORDER BY name', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get all work IDs
router.get('/work-ids', requireAuth, (req, res) => {
  db.all('SELECT * FROM work_ids ORDER BY work_id', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get all employees
router.get('/employees', requireAuth, (req, res) => {
  db.all('SELECT * FROM employees ORDER BY name', (err, rows) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Get all timesheet entries with optional date filtering
router.get('/entries', requireAuth, (req, res) => {
  const { start_date, end_date } = req.query;

  let query = `
    SELECT
      te.id,
      te.unique_id,
      te.entry_date,
      te.created_at,
      te.updated_at,
      c.name as company_name,
      w.work_id,
      w.description as work_description,
      e.name as employee_name,
      e.employee_code
    FROM timesheet_entries te
    JOIN companies c ON te.company_id = c.id
    JOIN work_ids w ON te.work_id = w.id
    JOIN employees e ON te.employee_id = e.id
  `;

  const params = [];

  if (start_date && end_date) {
    query += ' WHERE te.entry_date BETWEEN ? AND ?';
    params.push(start_date, end_date);
  } else if (start_date) {
    query += ' WHERE te.entry_date >= ?';
    params.push(start_date);
  } else if (end_date) {
    query += ' WHERE te.entry_date <= ?';
    params.push(end_date);
  }

  query += ' ORDER BY te.entry_date DESC, te.created_at DESC';

  db.all(query, params, (err, entries) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    // For each entry, get the time entries
    const entriesWithTimes = [];
    let processed = 0;

    if (entries.length === 0) {
      return res.json([]);
    }

    entries.forEach((entry) => {
      db.all(
        'SELECT * FROM time_entries WHERE timesheet_entry_id = ?',
        [entry.id],
        (err, timeEntries) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          entriesWithTimes.push({
            ...entry,
            time_entries: timeEntries
          });

          processed++;
          if (processed === entries.length) {
            res.json(entriesWithTimes);
          }
        }
      );
    });
  });
});

// Get single timesheet entry
router.get('/entries/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT
      te.*,
      c.name as company_name,
      w.work_id,
      w.description as work_description,
      e.name as employee_name,
      e.employee_code
    FROM timesheet_entries te
    JOIN companies c ON te.company_id = c.id
    JOIN work_ids w ON te.work_id = w.id
    JOIN employees e ON te.employee_id = e.id
    WHERE te.id = ?
    `,
    [id],
    (err, entry) => {
      if (err) {
        return res.status(500).json({ error: 'Database error' });
      }

      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      db.all(
        'SELECT * FROM time_entries WHERE timesheet_entry_id = ?',
        [id],
        (err, timeEntries) => {
          if (err) {
            return res.status(500).json({ error: 'Database error' });
          }

          res.json({
            ...entry,
            time_entries: timeEntries
          });
        }
      );
    }
  );
});

// Create new timesheet entry
router.post('/entries', requireAuth, (req, res) => {
  const { company_id, work_id, employee_id, entry_date, time_entries } = req.body;

  if (!company_id || !work_id || !employee_id || !entry_date || !time_entries || time_entries.length === 0) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const uniqueId = generateUniqueId(entry_date);

  db.run(
    'INSERT INTO timesheet_entries (unique_id, company_id, work_id, employee_id, entry_date) VALUES (?, ?, ?, ?, ?)',
    [uniqueId, company_id, work_id, employee_id, entry_date],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to create timesheet entry' });
      }

      const timesheetId = this.lastID;
      const insertTimeEntry = db.prepare('INSERT INTO time_entries (timesheet_entry_id, time_in, time_out) VALUES (?, ?, ?)');

      time_entries.forEach((te) => {
        insertTimeEntry.run(timesheetId, te.time_in, te.time_out);
      });

      insertTimeEntry.finalize((err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to create time entries' });
        }

        // Get the complete entry data for email
        db.get(
          `
          SELECT
            te.*,
            c.name as company_name,
            w.work_id,
            w.description as work_description,
            e.name as employee_name,
            e.employee_code
          FROM timesheet_entries te
          JOIN companies c ON te.company_id = c.id
          JOIN work_ids w ON te.work_id = w.id
          JOIN employees e ON te.employee_id = e.id
          WHERE te.id = ?
          `,
          [timesheetId],
          (err, entry) => {
            if (err) {
              console.error('Error fetching entry for email:', err);
            } else {
              // Send email notification
              sendTimesheetEmail({
                ...entry,
                time_entries
              }).catch(err => {
                console.error('Failed to send email:', err);
              });
            }

            res.status(201).json({
              message: 'Timesheet entry created successfully',
              id: timesheetId,
              unique_id: uniqueId
            });
          }
        );
      });
    }
  );
});

// Update timesheet entry
router.put('/entries/:id', requireAuth, (req, res) => {
  const { id } = req.params;
  const { company_id, work_id, employee_id, entry_date, time_entries } = req.body;

  if (!company_id || !work_id || !employee_id || !entry_date || !time_entries || time_entries.length === 0) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  db.run(
    'UPDATE timesheet_entries SET company_id = ?, work_id = ?, employee_id = ?, entry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
    [company_id, work_id, employee_id, entry_date, id],
    function (err) {
      if (err) {
        return res.status(500).json({ error: 'Failed to update timesheet entry' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      // Delete existing time entries
      db.run('DELETE FROM time_entries WHERE timesheet_entry_id = ?', [id], (err) => {
        if (err) {
          return res.status(500).json({ error: 'Failed to update time entries' });
        }

        // Insert new time entries
        const insertTimeEntry = db.prepare('INSERT INTO time_entries (timesheet_entry_id, time_in, time_out) VALUES (?, ?, ?)');

        time_entries.forEach((te) => {
          insertTimeEntry.run(id, te.time_in, te.time_out);
        });

        insertTimeEntry.finalize((err) => {
          if (err) {
            return res.status(500).json({ error: 'Failed to update time entries' });
          }

          res.json({ message: 'Timesheet entry updated successfully' });
        });
      });
    }
  );
});

// Delete timesheet entry
router.delete('/entries/:id', requireAuth, (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM timesheet_entries WHERE id = ?', [id], function (err) {
    if (err) {
      return res.status(500).json({ error: 'Failed to delete timesheet entry' });
    }

    if (this.changes === 0) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    res.json({ message: 'Timesheet entry deleted successfully' });
  });
});

export default router;
