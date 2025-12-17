import sqlite3 from 'sqlite3';
import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

dotenv.config(); 

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
          full_name TEXT,
          email TEXT,
          role TEXT DEFAULT 'program_manager' NOT NULL,
          company_id INTEGER,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id)
        )
      `);

      // Create companies table
      db.run(`
        CREATE TABLE IF NOT EXISTS companies (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT UNIQUE NOT NULL,
          abbreviation TEXT UNIQUE NOT NULL,
          email TEXT,
          email_enabled INTEGER DEFAULT 1
        )
      `);

      // Create crew_chiefs table (renamed from employees)
      db.run(`
        CREATE TABLE IF NOT EXISTS crew_chiefs (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          name TEXT NOT NULL,
          employee_code TEXT,
          company_id INTEGER NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id)
        )
      `);

      // Create timesheet_entries table
      db.run(`
        CREATE TABLE IF NOT EXISTS timesheet_entries (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          unique_id TEXT UNIQUE NOT NULL,
          job_id TEXT UNIQUE NOT NULL,
          job_type TEXT NOT NULL,
          company_id INTEGER NOT NULL,
          crew_chief_id INTEGER NOT NULL,
          user_id INTEGER NOT NULL,
          entry_date DATE NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (company_id) REFERENCES companies(id),
          FOREIGN KEY (crew_chief_id) REFERENCES crew_chiefs(id),
          FOREIGN KEY (user_id) REFERENCES users(id)
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
      `);

      // Create indexes for performance
      db.run('CREATE INDEX IF NOT EXISTS idx_timesheet_user ON timesheet_entries(user_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_timesheet_company ON timesheet_entries(company_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_crew_chief_company ON crew_chiefs(company_id)');
      db.run('CREATE INDEX IF NOT EXISTS idx_job_id ON timesheet_entries(job_id)', (err) => {
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
          // Insert companies with abbreviation and email settings
          const companies = [
            { name: 'Karma Staff', abbreviation: 'KS', email: 'timesheets@karmastaff.com', email_enabled: 1 },
            { name: 'PuroClean San Clemente', abbreviation: 'SC', email: 'admin@purocleansanclemente.com', email_enabled: 1 },
            { name: 'Alpine Builders', abbreviation: 'AB', email: 'notify@alpine.com', email_enabled: 0 },
            { name: 'Mountain Works Inc', abbreviation: 'MW', email: null, email_enabled: 0 }
          ];

          const insertCompany = db.prepare('INSERT INTO companies (name, abbreviation, email, email_enabled) VALUES (?, ?, ?, ?)');
          companies.forEach(company => insertCompany.run(company.name, company.abbreviation, company.email, company.email_enabled));
          insertCompany.finalize();

          // Insert crew chiefs with company associations
          const crewChiefs = [
            { name: 'John Martinez', code: 'CC001', company_id: 1 },
            { name: 'Sarah Johnson', code: 'CC002', company_id: 1 },
            { name: 'Mike Rodriguez', code: 'CC001', company_id: 2 },
            { name: 'Emily Chen', code: 'CC002', company_id: 2 },
            { name: 'David Kim', code: 'CC003', company_id: 2 },
            { name: 'Lisa Anderson', code: 'CC001', company_id: 3 }
          ];

          const insertCrewChief = db.prepare('INSERT INTO crew_chiefs (name, employee_code, company_id) VALUES (?, ?, ?)');
          crewChiefs.forEach(cc => insertCrewChief.run(cc.name, cc.code, cc.company_id));
          insertCrewChief.finalize();

          // Create default admin user
          const adminUsername = process.env.ADMIN_USERNAME || 'admin';
          const adminPasswordRaw = process.env.ADMIN_PASSWORD || 'admin123';
          const adminPassword = await bcrypt.hash(adminPasswordRaw, 10);
          
          db.run(
            'INSERT INTO users (username, password_hash, full_name, email, role, company_id) VALUES (?, ?, ?, ?, ?, ?)',
            [adminUsername, adminPassword, 'System Administrator', 'admin@karmastaff.com', 'admin', 1],
            async (err) => {
              if (err) {
                reject(err);
                return;
              }

              // Create sample program manager user
              const pmUsername = process.env.PM_USERNAME || 'pm_sanclemente';
              const pmPasswordRaw = process.env.PM_PASSWORD || 'password123';
              const pmPassword = await bcrypt.hash(pmPasswordRaw, 10);

              db.run(
                'INSERT INTO users (username, password_hash, full_name, email, role, company_id) VALUES (?, ?, ?, ?, ?, ?)',
                [pmUsername, pmPassword, 'John Smith', 'pm@purocleansanclemente.com', 'program_manager', 2],
                (err) => {
                  if (err) {
                    reject(err);
                  } else {
                    console.log('Database seeded successfully');
                    console.log('Initial users created (credentials hidden)');
                    resolve();
                  }
                }
              );
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
