#!/usr/bin/env node
import { initializeDatabase, seedDatabase, db } from './config/database.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('Starting database initialization...');
console.log('Current directory:', __dirname);

async function initDB() {
  try {
    console.log('\n1. Initializing database schema...');
    await initializeDatabase();
    console.log('✓ Schema created successfully');

    console.log('\n2. Seeding initial data...');
    await seedDatabase();
    console.log('✓ Data seeded successfully');

    console.log('\n✓ Database initialization complete!');
    console.log('\nCheck .env file for credentials if configured, otherwise using defaults.');
    
    db.close((err) => {
      if (err) {
        console.error('Error closing database:', err);
        process.exit(1);
      }
      console.log('\nDatabase connection closed.');
      process.exit(0);
    });
  } catch (error) {
    console.error('\n✗ Database initialization failed:', error);
    db.close(() => {
      process.exit(1);
    });
  }
}

initDB();
