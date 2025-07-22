const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    const dbPath = process.env.DB_PATH || path.join(__dirname, '..', 'db', 'monitor.db');
    console.log('Database path:', dbPath);
    this.db = new sqlite3.Database(dbPath, (err) => {
      if (err) {
        console.error('Error opening database:', err.message);
        throw err;
      } else {
        console.log('Connected to SQLite database at:', dbPath);
      }
    });
  }

  // 服务器管理
  getAllServers() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM servers ORDER BY created_at DESC', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  getServerById(id) {
    return new Promise((resolve, reject) => {
      this.db.get('SELECT * FROM servers WHERE id = ?', [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  }

  addServer(name, url) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO servers (name, url) VALUES (?, ?)',
        [name, url],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  removeServer(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM servers WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  updateServer(id, name, url) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'UPDATE servers SET name = ?, url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [name, url, id],
        function(err) {
          if (err) reject(err);
          else resolve(this.changes);
        }
      );
    });
  }

  // 缓存管理
  cacheMetrics(serverId, data) {
    return new Promise((resolve, reject) => {
      this.db.run(
        'INSERT INTO metrics_cache (server_id, data) VALUES (?, ?)',
        [serverId, JSON.stringify(data)],
        function(err) {
          if (err) reject(err);
          else resolve(this.lastID);
        }
      );
    });
  }

  getCachedMetrics(serverId, maxAgeMinutes = 5) {
    return new Promise((resolve, reject) => {
      const query = `
        SELECT data FROM metrics_cache 
        WHERE server_id = ? 
        AND cached_at > datetime('now', '-${maxAgeMinutes} minutes')
        ORDER BY cached_at DESC 
        LIMIT 1
      `;
      this.db.get(query, [serverId], (err, row) => {
        if (err) reject(err);
        else resolve(row ? JSON.parse(row.data) : null);
      });
    });
  }

  close() {
    return new Promise((resolve) => {
      this.db.close((err) => {
        if (err) console.error('Error closing database:', err);
        resolve();
      });
    });
  }
}

// 创建单例实例
const dbInstance = new Database();
module.exports = dbInstance;