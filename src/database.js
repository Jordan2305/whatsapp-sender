const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

class WhatsAppDatabase {
  constructor() {
    // Usar ruta absoluta que funcione en aplicación empaquetada
    const isPackaged = process.env.NODE_ENV === 'production' || process.resourcesPath;
    
    if (isPackaged && process.resourcesPath) {
      // En aplicación empaquetada
      this.dbPath = path.join(process.resourcesPath, 'app', 'data', 'whatsapp.db');
    } else {
      // En desarrollo
      this.dbPath = path.join(__dirname, '../data/whatsapp.db');
    }
    
    console.log('Database path:', this.dbPath);
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
    this.runMigrations();
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
        image_path TEXT,
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

  runMigrations() {
    try {
      // Check if image_path column exists
      const result = this.db.exec("PRAGMA table_info(scheduled_messages)");
      const columns = result.length > 0 ? result[0].values.map(row => row[1]) : [];
      
      if (!columns.includes('image_path')) {
        this.db.exec('ALTER TABLE scheduled_messages ADD COLUMN image_path TEXT');
        console.log('✅ Added image_path column to scheduled_messages');
      }
    } catch (error) {
      console.log('Migration already applied or error:', error.message);
    }
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

  scheduleMessage(contactId, message, scheduledTime, groupId = null, delaySeconds = 10, imagePath = null) {
    const stmt = this.db.prepare('INSERT INTO scheduled_messages (contact_id, group_id, message, image_path, scheduled_time, delay_seconds) VALUES (?, ?, ?, ?, ?, ?)');
    stmt.run([contactId, groupId, message, imagePath, scheduledTime, delaySeconds]);
    const result = this.db.exec('SELECT last_insert_rowid() as id')[0];
    this.saveDatabase();
    return result.values[0][0];
  }

  scheduleGroupMessage(groupId, message, scheduledTime, delaySeconds = 10, imagePath = null) {
    const stmt = this.db.prepare('INSERT INTO scheduled_messages (group_id, message, image_path, scheduled_time, delay_seconds) VALUES (?, ?, ?, ?, ?)');
    stmt.run([groupId, message, imagePath, scheduledTime, delaySeconds]);
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
      SELECT sm.id, sm.contact_id, sm.group_id, sm.message, sm.image_path, sm.scheduled_time, 
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
      image_path: row[4],
      scheduled_time: row[5],
      status: row[6],
      delay_seconds: row[7],
      created_at: row[8],
      contact_name: row[9],
      group_name: row[10],
      type: row[11]
    })) : [];
  }

  getAllPendingMessages() {
    const result = this.db.exec(`
      SELECT sm.id, sm.contact_id, sm.group_id, sm.message, sm.image_path, sm.scheduled_time, 
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
      image_path: row[4],
      scheduled_time: row[5],
      status: row[6],
      delay_seconds: row[7],
      created_at: row[8],
      name: row[9],
      phone: row[10],
      group_name: row[11]
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

  deleteScheduledMessage(id) {
    const stmt = this.db.prepare('DELETE FROM scheduled_messages WHERE id = ? AND status = ?');
    stmt.run([id, 'pending']);
    this.saveDatabase();
    return 1;
  }

  bulkImportContacts(contacts) {
    let imported = 0;
    let errors = [];
    
    for (const contact of contacts) {
      try {
        this.addContact(contact.name, contact.phone, contact.groupId);
        imported++;
      } catch (error) {
        errors.push(`${contact.name}: ${error.message}`);
      }
    }
    
    return { imported, errors };
  }

  cleanContacts() {
    let cleaned = 0;
    let duplicates = 0;
    
    // Primero limpiar formato
    this.db.exec(`
      UPDATE contacts 
      SET phone = REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(phone, ' ', ''), '-', ''), '(', ''), ')', ''), '+', '')
    `);
    
    // Eliminar números inválidos (muy cortos, muy largos, o que no sean solo dígitos)
    this.db.exec(`
      DELETE FROM contacts 
      WHERE LENGTH(phone) < 10 
      OR LENGTH(phone) > 13
      OR phone NOT GLOB '[0-9]*'
    `);
    
    const countResult = this.db.exec('SELECT changes() as count');
    if (countResult.length > 0) {
      cleaned = countResult[0].values[0][0];
    }
    
    // Eliminar duplicados
    this.db.exec(`
      DELETE FROM contacts 
      WHERE rowid NOT IN (
        SELECT MIN(rowid) 
        FROM contacts 
        GROUP BY phone
      )
    `);
    
    const dupCountResult = this.db.exec('SELECT changes() as count');
    if (dupCountResult.length > 0) {
      duplicates = dupCountResult[0].values[0][0];
    }
    
    this.saveDatabase();
    return { cleaned, duplicates };
  }
}

module.exports = WhatsAppDatabase;