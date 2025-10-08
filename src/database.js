const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class Database {
  constructor() {
    this.db = new sqlite3.Database(path.join(__dirname, '../data/whatsapp.db'));
    this.init();
  }

  init() {
    this.db.serialize(() => {
      this.db.run(`CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        message TEXT NOT NULL,
        scheduled_time DATETIME,
        status TEXT DEFAULT 'pending',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (contact_id) REFERENCES contacts (id)
      )`);

      this.db.run(`CREATE TABLE IF NOT EXISTS message_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        message TEXT NOT NULL,
        sent_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        status TEXT DEFAULT 'sent',
        FOREIGN KEY (contact_id) REFERENCES contacts (id)
      )`);
    });
  }

  addContact(name, phone) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO contacts (name, phone) VALUES (?, ?)', [name, phone], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getContacts() {
    return new Promise((resolve, reject) => {
      this.db.all('SELECT * FROM contacts ORDER BY name', (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  deleteContact(id) {
    return new Promise((resolve, reject) => {
      this.db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  scheduleMessage(contactId, message, scheduledTime) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO scheduled_messages (contact_id, message, scheduled_time) VALUES (?, ?, ?)', 
        [contactId, message, scheduledTime], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getPendingMessages() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT sm.*, c.name, c.phone 
        FROM scheduled_messages sm 
        JOIN contacts c ON sm.contact_id = c.id 
        WHERE sm.status = 'pending' AND sm.scheduled_time <= datetime('now')
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }

  updateMessageStatus(id, status) {
    return new Promise((resolve, reject) => {
      this.db.run('UPDATE scheduled_messages SET status = ? WHERE id = ?', [status, id], function(err) {
        if (err) reject(err);
        else resolve(this.changes);
      });
    });
  }

  addToHistory(contactId, message) {
    return new Promise((resolve, reject) => {
      this.db.run('INSERT INTO message_history (contact_id, message) VALUES (?, ?)', 
        [contactId, message], function(err) {
        if (err) reject(err);
        else resolve(this.lastID);
      });
    });
  }

  getHistory() {
    return new Promise((resolve, reject) => {
      this.db.all(`
        SELECT mh.*, c.name, c.phone 
        FROM message_history mh 
        JOIN contacts c ON mh.contact_id = c.id 
        ORDER BY mh.sent_at DESC LIMIT 100
      `, (err, rows) => {
        if (err) reject(err);
        else resolve(rows);
      });
    });
  }
}

module.exports = Database;