import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const dbPath = join(__dirname, '..', 'timesheet.db');

// Create and configure database connection
export const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error connecting to database:', err.message);
  } else {
    console.log('Connected to SQLite database');
  }
});

// Enable foreign keys
db.run('PRAGMA foreign_keys = ON');

// Initialize database schema
export function initializeDatabase() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      // Create users table
      db.run(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username TEXT UNIQUE NOT NULL,
          password_hash TEXT NOT NULL,
          email TEXT,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create companies table
      db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL
        )
      `);

      // Create work_ids table
      db.run(`
        CREATE TABLE IF NOT EXISTS work_ids (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          work_id TEXT UNIQUE NOT NULL,
          description TEXT
        )
      `);

      // Create employees table
      db.run(`
        CREATE TABLE IF NOT EXISTS employees (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          employee_code TEXT UNIQUE
        )
      `);

      // Create timesheet_entries table
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

      // Create time_entries table
      db.run(`
        CREATE TABLE IF NOT EXISTS time_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          timesheet_entry_id INTEGER NOT NULL,
          time_in TEXT NOT NULL,
          time_out TEXT NOT NULL,
          FOREIGN KEY (timesheet_entry_id) REFERENCES timesheet_entries(id) ON DELETE CASCADE
        )
      `, (err) => {
        if (err) {
          reject(err);
        } else {
          console.log('Database schema created successfully');
          resolve();
        }
      });
    });
  });
}

// Seed initial data
export async function seedDatabase() {
  return new Promise(async (resolve, reject) => {
    try {
      // Check if data already exists
      db.get('SELECT COUNT(*) as count FROM companies', async (err, row) => {
        if (err) {
          reject(err);
          return;
        }

        if (row.count > 0) {
          console.log('Database already seeded');
          resolve();
          return;
        }

        console.log('Seeding database with initial data...');

        db.serialize(async () => {
          // Insert companies
          const companies = [
            'KS Construction',
            'Alpine Builders',
            'Mountain Works Inc',
            'Summit Projects'
          ];

          const insertCompany = db.prepare('INSERT INTO companies (name) VALUES (?)');
          companies.forEach(company => insertCompany.run(company));
          insertCompany.finalize();

          // Insert work IDs
          const workIds = [
            { id: 'PRJ-001', desc: 'Main Project Phase 1' },
            { id: 'PRJ-002', desc: 'Main Project Phase 2' },
            { id: 'PRJ-003', desc: 'Main Project Phase 3' },
            { id: 'MAINT-101', desc: 'Maintenance Work' },
            { id: 'MAINT-102', desc: 'Emergency Repairs' }
          ];

          const insertWorkId = db.prepare('INSERT INTO work_ids (work_id, description) VALUES (?, ?)');
          workIds.forEach(w => insertWorkId.run(w.id, w.desc));
          insertWorkId.finalize();

          // Insert employees
          const employees = [
            { name: 'John Doe', code: 'EMP001' },
            { name: 'Jane Smith', code: 'EMP002' },
            { name: 'Mike Johnson', code: 'EMP003' },
            { name: 'Sarah Williams', code: 'EMP004' },
            { name: 'David Brown', code: 'EMP005' }
          ];

          const insertEmployee = db.prepare('INSERT INTO employees (name, employee_code) VALUES (?, ?)');
          employees.forEach(emp => insertEmployee.run(emp.name, emp.code));
          insertEmployee.finalize();

          // Create default admin user
          const password = await bcrypt.hash('admin123', 10);
          db.run(
            'INSERT INTO users (username, password_hash, email) VALUES (?, ?, ?)',
            ['admin', password, 'admin@timesheet.com'],
            (err) => {
              if (err) {
                reject(err);
              } else {
                console.log('Database seeded successfully');
                console.log('Default login - Username: admin, Password: admin123');
                resolve();
              }
            }
          );
        });
      });
    } catch (error) {
      reject(error);
    }
  });
}

// Run setup if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Starting database setup...');
  initializeDatabase()
    .then(() => {
      console.log('Initialization complete, starting seed...');
      return seedDatabase();
    })
    .then(() => {
      console.log('Database setup complete');
      db.close((err) => {
        if (err) {
          console.error('Error closing database:', err);
        }
        process.exit(0);
      });
    })
    .catch((err) => {
      console.error('Database setup failed:', err);
      db.close(() => {
        process.exit(1);
      });
    });
}
