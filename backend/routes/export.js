import express from 'express';
import { db } from '../config/database.js';
import { requireAuth } from '../middleware/auth.js';
import { generateExcelFile } from '../utils/excelGenerator.js';

const router = express.Router();

// Export to Excel
router.get('/excel', requireAuth, (req, res) => {
  const { start_date, end_date } = req.query;

  let query = `
    SELECT
      te.id,
      te.unique_id,
      te.entry_date,
      c.name as company_name,
      w.work_id,
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

  query += ' ORDER BY te.entry_date ASC';

  db.all(query, params, (err, entries) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (entries.length === 0) {
      return res.status(404).json({ error: 'No entries found for the specified date range' });
    }

    // For each entry, get the time entries
    const entriesWithTimes = [];
    let processed = 0;

    entries.forEach((entry) => {
      db.all(
        'SELECT * FROM time_entries WHERE timesheet_entry_id = ? ORDER BY time_in',
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
            // Generate Excel file
            try {
              const buffer = generateExcelFile(entriesWithTimes);

              // Set headers for file download
              const filename = `timesheets_${start_date || 'all'}_to_${end_date || 'all'}.xlsx`;
              res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
              res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

              res.send(buffer);
            } catch (error) {
              console.error('Error generating Excel file:', error);
              res.status(500).json({ error: 'Failed to generate Excel file' });
            }
          }
        }
      );
    });
  });
});

export default router;
