import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dbPath = join(__dirname, 'timesheet.db');

const db = new sqlite3.Database(dbPath);

console.log('Creating database schema...');

db.serialize(() => {
  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');

  // Create tables
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS companies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS work_ids (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      work_id TEXT UNIQUE NOT NULL,
      description TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      employee_code TEXT UNIQUE
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS timesheet_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      unique_id TEXT UNIQUE NOT NULL,
      company_id INTEGER NOT NULL,
      work_id INTEGER NOT NULL,
      employee_id INTEGER NOT NULL,
      entry_date DATE NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (company_id) REFERENCES companies(id),
      FOREIGN KEY (work_id) REFERENCES work_ids(id),
      FOREIGN KEY (employee_id) REFERENCES employees(id)
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS time_entries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timesheet_entry_id INTEGER NOT NULL,
      time_in TEXT NOT NULL,
      time_out TEXT NOT NULL,
      FOREIGN KEY (timesheet_entry_id) REFERENCES timesheet_entries(id) ON DELETE CASCADE
    )
  `, async () => {
    console.log('Schema created successfully');
    console.log('Seeding data...');

    // Insert companies
    const insertCompany = db.prepare('INSERT OR IGNORE INTO companies (name) VALUES (?)');
    insertCompany.run('KS Construction');
    insertCompany.run('Alpine Builders');
    insertCompany.run('Mountain Works Inc');
    insertCompany.run('Summit Projects');
    insertCompany.finalize();

    // Insert work IDs
    const insertWorkId = db.prepare('INSERT OR IGNORE INTO work_ids (work_id, description) VALUES (?, ?)');
    insertWorkId.run('PRJ-001', 'Main Project Phase 1');
    insertWorkId.run('PRJ-002', 'Main Project Phase 2');
    insertWorkId.run('PRJ-003', 'Main Project Phase 3');
    insertWorkId.run('MAINT-101', 'Maintenance Work');
    insertWorkId.run('MAINT-102', 'Emergency Repairs');
    insertWorkId.finalize();

    // Insert employees
    const insertEmployee = db.prepare('INSERT OR IGNORE INTO employees (name, employee_code) VALUES (?, ?)');
    insertEmployee.run('John Doe', 'EMP001');
    insertEmployee.run('Jane Smith', 'EMP002');
    insertEmployee.run('Mike Johnson', 'EMP003');
    insertEmployee.run('Sarah Williams', 'EMP004');
    insertEmployee.run('David Brown', 'EMP005');
    insertEmployee.finalize();

    // Insert admin user
    const password = await bcrypt.hash('admin123', 10);
    db.run(
      'INSERT OR IGNORE INTO users (username, password_hash, email) VALUES (?, ?, ?)',
      ['admin', password, 'admin@timesheet.com'],
      (err) => {
        if (err) {
          console.error('Error creating admin user:', err);
        } else {
          console.log('\n=================================');
          console.log('Database setup complete!');
          console.log('=================================');
          console.log('Default login credentials:');
          console.log('Username: admin');
          console.log('Password: admin123');
          console.log('=================================\n');
        }

        db.close((err) => {
          if (err) console.error('Error closing database:', err);
          process.exit(err ? 1 : 0);
        });
      }
    );
  });
});
