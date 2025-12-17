import express from 'express';
import { db } from '../config/database.js';
import { requireAuth, attachUserRole, requireAdmin } from '../middleware/auth.js';
import { sendTimesheetEmail } from '../utils/email.js';

const router = express.Router();

// Generate unique ID for timesheet entry (kept for backward compatibility)
function generateUniqueId(date) {
  const dateStr = date.replace(/-/g, '');
  const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
  return `TS-${dateStr}-${randomNum}`;
}

// Generate Job ID
function generateJobId(companyAbbr, year, uniqueNum, jobType) {
  const yearStr = year.toString().slice(-2);
  const numStr = uniqueNum.toString().padStart(4, '0');
  return `${companyAbbr}-${yearStr}-${numStr}-${jobType}`;
}

// Check if Job ID is unique
function isJobIdUnique(jobId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM timesheet_entries WHERE job_id = ?', [jobId], (err, row) => {
      if (err) reject(err);
      resolve(!row);
    });
  });
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

// Get all job types
router.get('/job-types', requireAuth, (req, res) => {
  db.all('SELECT * FROM job_types ORDER BY name', (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      // Fallback to static list if table is empty or error (during migration)
      return res.json([
        { code: 'CON', name: 'Content' },
        { code: 'WTR', name: 'Water' },
        { code: 'MLD', name: 'Mold' },
        { code: 'STC', name: 'Structured Cleaning' },
        { code: 'TRM', name: 'Trauma' },
        { code: 'TMP', name: 'Temporary Services' }
      ]);
    }
    res.json(rows);
  });
});

// Admin: Create job type
router.post('/job-types', requireAuth, requireAdmin, (req, res) => {
  const { code, name, description } = req.body;
  if (!code || !name) {
    return res.status(400).json({ error: 'Code and name are required' });
  }
  db.run('INSERT INTO job_types (code, name, description) VALUES (?, ?, ?)', [code.toUpperCase(), name, description], function(err) {
    if (err) return res.status(500).json({ error: 'Database error or duplicate code' });
    res.status(201).json({ id: this.lastID, code, name });
  });
});

// Admin: Delete job type
router.delete('/job-types/:id', requireAuth, requireAdmin, (req, res) => {
  db.run('DELETE FROM job_types WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Job type deleted' });
  });
});

// Admin: Create company
router.post('/companies', requireAuth, requireAdmin, (req, res) => {
  const { name, abbreviation, email, email_enabled } = req.body;
  if (!name || !abbreviation) return res.status(400).json({ error: 'Name and abbreviation required' });
  
  db.run('INSERT INTO companies (name, abbreviation, email, email_enabled) VALUES (?, ?, ?, ?)', 
    [name, abbreviation, email, email_enabled ? 1 : 0], 
    function(err) {
      if (err) return res.status(500).json({ error: 'Database error or duplicate' });
      res.status(201).json({ id: this.lastID, message: 'Company created' });
    }
  );
});

// Admin: Delete company
router.delete('/companies/:id', requireAuth, requireAdmin, (req, res) => {
  db.run('DELETE FROM companies WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Company deleted' });
  });
});

// Admin: Delete crew chief
router.delete('/crew-chiefs/:id', requireAuth, requireAdmin, (req, res) => {
  db.run('DELETE FROM crew_chiefs WHERE id = ?', [req.params.id], function(err) {
    if (err) return res.status(500).json({ error: 'Database error' });
    res.json({ message: 'Crew chief deleted' });
  });
});

// Get crew chiefs (optionally filtered by company)
router.get('/crew-chiefs', requireAuth, (req, res) => {
  const { company_id } = req.query;

  let query = 'SELECT * FROM crew_chiefs';
  let params = [];

  if (company_id) {
    query += ' WHERE company_id = ?';
    params.push(company_id);
  }

  query += ' ORDER BY name';

  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    res.json(rows);
  });
});

// Create new crew chief
router.post('/crew-chiefs', requireAuth, (req, res) => {
  const { name, employee_code, company_id } = req.body;

  if (!name || !company_id) {
    return res.status(400).json({ error: 'Name and company are required' });
  }

  // Check if already exists for this company
  db.get(
    'SELECT id FROM crew_chiefs WHERE name = ? AND company_id = ?',
    [name, company_id],
    (err, existing) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (existing) {
        return res.json({ id: existing.id, existed: true });
      }

      db.run(
        'INSERT INTO crew_chiefs (name, employee_code, company_id) VALUES (?, ?, ?)',
        [name, employee_code, company_id],
        function (err) {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create crew chief' });
          }
          res.status(201).json({ id: this.lastID, message: 'Crew chief created' });
        }
      );
    }
  );
});

// Get all timesheet entries with optional date filtering and role-based filtering
router.get('/entries', requireAuth, attachUserRole, (req, res) => {
  const { start_date, end_date } = req.query;

  let query = `
    SELECT
      te.id,
      te.unique_id,
      te.job_id,
      te.job_type,
      te.company_id,
      te.crew_chief_id,
      te.entry_date,
      te.created_at,
      te.updated_at,
      c.name as company_name,
      c.abbreviation as company_abbr,
      cc.name as crew_chief_name,
      cc.employee_code,
      COALESCE(u.full_name, u.username) as created_by
    FROM timesheet_entries te
    JOIN companies c ON te.company_id = c.id
    JOIN crew_chiefs cc ON te.crew_chief_id = cc.id
    JOIN users u ON te.user_id = u.id
  `;

  const params = [];
  const whereClauses = [];

  // Role-based filtering
  if (req.user && req.user.role === 'program_manager') {
    whereClauses.push('te.user_id = ?');
    params.push(req.user.id);
  }

  // Date filtering
  if (start_date && end_date) {
    whereClauses.push('te.entry_date BETWEEN ? AND ?');
    params.push(start_date, end_date);
  } else if (start_date) {
    whereClauses.push('te.entry_date >= ?');
    params.push(start_date);
  } else if (end_date) {
    whereClauses.push('te.entry_date <= ?');
    params.push(end_date);
  }

  if (whereClauses.length > 0) {
    query += ' WHERE ' + whereClauses.join(' AND ');
  }

  query += ' ORDER BY te.entry_date DESC, te.created_at DESC';

  db.all(query, params, (err, entries) => {
    if (err) {
      console.error('Database error:', err);
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
            console.error('Database error:', err);
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
router.get('/entries/:id', requireAuth, attachUserRole, (req, res) => {
  const { id } = req.params;

  db.get(
    `
    SELECT
      te.*,
      c.name as company_name,
      c.abbreviation as company_abbr,
      cc.name as crew_chief_name,
      cc.employee_code,
      COALESCE(u.full_name, u.username) as created_by
    FROM timesheet_entries te
    JOIN companies c ON te.company_id = c.id
    JOIN crew_chiefs cc ON te.crew_chief_id = cc.id
    JOIN users u ON te.user_id = u.id
    WHERE te.id = ?
    `,
    [id],
    (err, entry) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Database error' });
      }

      if (!entry) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      // Check ownership for program managers
      if (req.user && req.user.role === 'program_manager' && entry.user_id !== req.user.id) {
        return res.status(403).json({ error: 'Access denied' });
      }

      db.all(
        'SELECT * FROM time_entries WHERE timesheet_entry_id = ?',
        [id],
        (err, timeEntries) => {
          if (err) {
            console.error('Database error:', err);
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
router.post('/entries', requireAuth, attachUserRole, async (req, res) => {
  const { company_id, crew_chief_id, entry_date, unique_number, job_type, time_entries } = req.body;

  if (!company_id || !crew_chief_id || !entry_date || !unique_number || !job_type || !time_entries || time_entries.length === 0) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Validate job type
  const validJobTypes = ['CON', 'WTR', 'MLD', 'STC', 'TRM', 'TMP'];
  if (!validJobTypes.includes(job_type)) {
    return res.status(400).json({ error: 'Invalid job type' });
  }

  // Get company abbreviation
  db.get('SELECT abbreviation, email, email_enabled FROM companies WHERE id = ?', [company_id], async (err, company) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!company) {
      return res.status(404).json({ error: 'Company not found' });
    }

    // Generate Job ID
    const year = new Date(entry_date).getFullYear();
    const jobId = generateJobId(company.abbreviation, year, unique_number, job_type);

    // Check uniqueness
    try {
      const isUnique = await isJobIdUnique(jobId);
      if (!isUnique) {
        return res.status(409).json({ error: 'Job ID already exists. Please use a different unique number.' });
      }
    } catch (error) {
      console.error('Error checking Job ID uniqueness:', error);
      return res.status(500).json({ error: 'Failed to validate Job ID' });
    }

    const uniqueId = generateUniqueId(entry_date);

    db.run(
      'INSERT INTO timesheet_entries (unique_id, job_id, job_type, company_id, crew_chief_id, user_id, entry_date) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [uniqueId, jobId, job_type, company_id, crew_chief_id, req.user.id, entry_date],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to create timesheet entry' });
        }

        const timesheetId = this.lastID;
        const insertTimeEntry = db.prepare('INSERT INTO time_entries (timesheet_entry_id, time_in, time_out) VALUES (?, ?, ?)');

        time_entries.forEach((te) => {
          insertTimeEntry.run(timesheetId, te.time_in, te.time_out);
        });

        insertTimeEntry.finalize((err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to create time entries' });
          }

          // Get the complete entry data for email
          db.get(
            `
            SELECT
              te.*,
              c.name as company_name,
              c.email as company_email,
              c.email_enabled,
              cc.name as crew_chief_name,
              cc.employee_code
            FROM timesheet_entries te
            JOIN companies c ON te.company_id = c.id
            JOIN crew_chiefs cc ON te.crew_chief_id = cc.id
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
                job_id: jobId,
                unique_id: uniqueId
              });
            }
          );
        });
      }
    );
  });
});

// Update timesheet entry
router.put('/entries/:id', requireAuth, attachUserRole, (req, res) => {
  const { id } = req.params;
  const { company_id, crew_chief_id, entry_date, time_entries } = req.body;

  if (!company_id || !crew_chief_id || !entry_date || !time_entries || time_entries.length === 0) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  // Check ownership if program manager
  db.get('SELECT user_id FROM timesheet_entries WHERE id = ?', [id], (err, entry) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (req.user && req.user.role === 'program_manager' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only edit your own entries' });
    }

    db.run(
      'UPDATE timesheet_entries SET company_id = ?, crew_chief_id = ?, entry_date = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      [company_id, crew_chief_id, entry_date, id],
      function (err) {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ error: 'Failed to update timesheet entry' });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Entry not found' });
        }

        // Delete existing time entries
        db.run('DELETE FROM time_entries WHERE timesheet_entry_id = ?', [id], (err) => {
          if (err) {
            console.error('Database error:', err);
            return res.status(500).json({ error: 'Failed to update time entries' });
          }

          // Insert new time entries
          const insertTimeEntry = db.prepare('INSERT INTO time_entries (timesheet_entry_id, time_in, time_out) VALUES (?, ?, ?)');

          time_entries.forEach((te) => {
            insertTimeEntry.run(id, te.time_in, te.time_out);
          });

          insertTimeEntry.finalize((err) => {
            if (err) {
              console.error('Database error:', err);
              return res.status(500).json({ error: 'Failed to update time entries' });
            }

            res.json({ message: 'Timesheet entry updated successfully' });
          });
        });
      }
    );
  });
});

// Delete timesheet entry
router.delete('/entries/:id', requireAuth, attachUserRole, (req, res) => {
  const { id } = req.params;

  // Check ownership if program manager
  db.get('SELECT user_id FROM timesheet_entries WHERE id = ?', [id], (err, entry) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    if (!entry) {
      return res.status(404).json({ error: 'Entry not found' });
    }

    if (req.user && req.user.role === 'program_manager' && entry.user_id !== req.user.id) {
      return res.status(403).json({ error: 'You can only delete your own entries' });
    }

    db.run('DELETE FROM timesheet_entries WHERE id = ?', [id], function (err) {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ error: 'Failed to delete timesheet entry' });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      res.json({ message: 'Timesheet entry deleted successfully' });
    });
  });
});

export default router;
