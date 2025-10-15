const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class WhatsAppDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../data/whatsapp.db');
    this.init();
  }

  async init() {
    const SQL = await initSqlJs();
    
    // Crear directorio si no existe
    const dataDir = path.dirname(this.dbPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Cargar base de datos existente o crear nueva
    if (fs.existsSync(this.dbPath)) {
      const filebuffer = fs.readFileSync(this.dbPath);
      this.db = new SQL.Database(filebuffer);
    } else {
      this.db = new SQL.Database();
    }

    this.createTables();
    this.saveDatabase();
  }

  createTables() {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS groups (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT UNIQUE NOT NULL,
        description TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        phone TEXT UNIQUE NOT NULL,
        group_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS scheduled_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        contact_id INTEGER,
        group_id INTEGER,
        message TEXT NOT NULL,
        scheduled_time DATETIME,
        status TEXT DEFAULT 'pending',
        delay_seconds INTEGER DEFAULT 10,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS daily_stats (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        date TEXT UNIQUE NOT NULL,
        messages_sent INTEGER DEFAULT 0,
        contacts_reached INTEGER DEFAULT 0,
        groups_messaged INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);
  }

  saveDatabase() {
    const data = this.db.export();
    fs.writeFileSync(this.dbPath, data);
  }

  addContact(name, phone, groupId = null) {
    const stmt = this.db.prepare('INSERT INTO contacts (name, phone, group_id) VALUES (?, ?, ?)');
    stmt.run([name, phone, groupId]);
    const result = this.db.exec('SELECT last_insert_rowid() as id')[0];
    this.saveDatabase();
    return result.values[0][0];
  }

  getContacts() {
    const result = this.db.exec(`
      SELECT c.*, g.name as group_name 
      FROM contacts c 
      LEFT JOIN groups g ON c.group_id = g.id 
      ORDER BY c.name
    `);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      name: row[1],
      phone: row[2],
      group_id: row[3],
      created_at: row[4],
      group_name: row[5]
    })) : [];
  }

  addGroup(name, description = null) {
    const stmt = this.db.prepare('INSERT INTO groups (name, description) VALUES (?, ?)');
    stmt.run([name, description]);
    const result = this.db.exec('SELECT last_insert_rowid() as id')[0];
    this.saveDatabase();
    return result.values[0][0];
  }

  updateContact(id, name, phone, groupId = null) {
    const stmt = this.db.prepare('UPDATE contacts SET name = ?, phone = ?, group_id = ? WHERE id = ?');
    stmt.run([name, phone, groupId, id]);
    this.saveDatabase();
    return 1;
  }

  getContactById(id) {
    const result = this.db.exec('SELECT * FROM contacts WHERE id = ?', [id]);
    if (result.length > 0 && result[0].values.length > 0) {
      const row = result[0].values[0];
      return {
        id: row[0],
        name: row[1],
        phone: row[2],
        group_id: row[3],
        created_at: row[4]
      };
    }
    return null;
  }

  getGroups() {
    const result = this.db.exec('SELECT * FROM groups ORDER BY name');
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      name: row[1],
      description: row[2],
      created_at: row[3]
    })) : [];
  }

  getContactsByGroup(groupId) {
    const result = this.db.exec('SELECT * FROM contacts WHERE group_id = ?', [groupId]);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      name: row[1],
      phone: row[2],
      group_id: row[3],
      created_at: row[4]
    })) : [];
  }

  deleteContact(id) {
    const stmt = this.db.prepare('DELETE FROM contacts WHERE id = ?');
    stmt.run([id]);
    this.saveDatabase();
    return 1;
  }

  scheduleMessage(contactId, message, scheduledTime, groupId = null, delaySeconds = 10) {
    const stmt = this.db.prepare('INSERT INTO scheduled_messages (contact_id, group_id, message, scheduled_time, delay_seconds) VALUES (?, ?, ?, ?, ?)');
    stmt.run([contactId, groupId, message, scheduledTime, delaySeconds]);
    const result = this.db.exec('SELECT last_insert_rowid() as id')[0];
    this.saveDatabase();
    return result.values[0][0];
  }

  scheduleGroupMessage(groupId, message, scheduledTime, delaySeconds = 10) {
    const stmt = this.db.prepare('INSERT INTO scheduled_messages (group_id, message, scheduled_time, delay_seconds) VALUES (?, ?, ?, ?)');
    stmt.run([groupId, message, scheduledTime, delaySeconds]);
    const result = this.db.exec('SELECT last_insert_rowid() as id')[0];
    this.saveDatabase();
    return result.values[0][0];
  }

  updateMessageStatus(id, status) {
    const stmt = this.db.prepare('UPDATE scheduled_messages SET status = ? WHERE id = ?');
    stmt.run([status, id]);
    this.saveDatabase();
    return 1;
  }

  updateDailyStats(isGroup = false) {
    const today = new Date().toISOString().split('T')[0];
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO daily_stats (date, messages_sent, contacts_reached, groups_messaged) 
      VALUES (?, 
        COALESCE((SELECT messages_sent FROM daily_stats WHERE date = ?), 0) + 1,
        COALESCE((SELECT contacts_reached FROM daily_stats WHERE date = ?), 0) + 1,
        COALESCE((SELECT groups_messaged FROM daily_stats WHERE date = ?), 0) + ?
      )
    `);
    stmt.run([today, today, today, today, isGroup ? 1 : 0]);
    this.saveDatabase();
    return 1;
  }

  getDailyStats(days = 30) {
    const result = this.db.exec('SELECT * FROM daily_stats ORDER BY date DESC LIMIT ?', [days]);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      date: row[1],
      messages_sent: row[2],
      contacts_reached: row[3],
      groups_messaged: row[4],
      created_at: row[5]
    })) : [];
  }

  getMessageQueue() {
    const result = this.db.exec(`
      SELECT sm.id, sm.contact_id, sm.group_id, sm.message, sm.scheduled_time, 
             sm.status, sm.delay_seconds, sm.created_at,
             c.name as contact_name, g.name as group_name,
             CASE 
               WHEN sm.contact_id IS NOT NULL THEN 'individual'
               ELSE 'group'
             END as type
      FROM scheduled_messages sm 
      LEFT JOIN contacts c ON sm.contact_id = c.id 
      LEFT JOIN groups g ON sm.group_id = g.id
      WHERE sm.status = 'pending'
      ORDER BY sm.scheduled_time ASC
    `);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      contact_id: row[1],
      group_id: row[2],
      message: row[3],
      scheduled_time: row[4],
      status: row[5],
      delay_seconds: row[6],
      created_at: row[7],
      contact_name: row[8],
      group_name: row[9],
      type: row[10]
    })) : [];
  }

  getAllPendingMessages() {
    const result = this.db.exec(`
      SELECT sm.id, sm.contact_id, sm.group_id, sm.message, sm.scheduled_time, 
             sm.status, sm.delay_seconds, sm.created_at,
             c.name, c.phone, g.name as group_name
      FROM scheduled_messages sm 
      LEFT JOIN contacts c ON sm.contact_id = c.id 
      LEFT JOIN groups g ON sm.group_id = g.id
      WHERE sm.status = 'pending'
    `);
    return result.length > 0 ? result[0].values.map(row => ({
      id: row[0],
      contact_id: row[1],
      group_id: row[2],
      message: row[3],
      scheduled_time: row[4],
      status: row[5],
      delay_seconds: row[6],
      created_at: row[7],
      name: row[8],
      phone: row[9],
      group_name: row[10]
    })) : [];
  }

  bulkUpdateContacts(contactIds, groupId) {
    const placeholders = contactIds.map(() => '?').join(',');
    const stmt = this.db.prepare(`UPDATE contacts SET group_id = ? WHERE id IN (${placeholders})`);
    stmt.run([groupId, ...contactIds]);
    this.saveDatabase();
    return contactIds.length;
  }

  clearMessageQueue() {
    const stmt = this.db.prepare('DELETE FROM scheduled_messages WHERE status = ?');
    stmt.run(['pending']);
    this.saveDatabase();
    return 1;
  }
}

module.exports = WhatsAppDatabase;