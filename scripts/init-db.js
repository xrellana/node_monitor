const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '..', 'db', 'monitor.db');

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('Connected to SQLite database.');
  }
});

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS servers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      url TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `, (err) => {
    if (err) {
      console.error('Error creating servers table:', err.message);
    } else {
      console.log('Servers table created or already exists.');
    }
  });

  db.run(`
    CREATE TABLE IF NOT EXISTS metrics_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      server_id INTEGER,
      data TEXT,
      cached_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (server_id) REFERENCES servers (id)
    )
  `, (err) => {
    if (err) {
      console.error('Error creating metrics_cache table:', err.message);
    } else {
      console.log('Metrics cache table created or already exists.');
    }
  });
});

db.close((err) => {
  if (err) {
    console.error('Error closing database:', err.message);
  } else {
    console.log('Database initialized successfully.');
  }
});