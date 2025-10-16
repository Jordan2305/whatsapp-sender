const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const Database = require('./database');
const WhatsAppService = require('./whatsapp');

let db;
const whatsapp = new WhatsAppService();
let server;

// Configurar multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../uploads');
    if (!require('fs').existsSync(uploadDir)) {
      require('fs').mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });
const uploadMemory = multer({ storage: multer.memoryStorage() });

async function startServer() {
  return new Promise(async (resolve, reject) => {
    try {
      const app = express();
      const PORT = 3000;

      // Middleware
      app.use(cors());
      app.use(bodyParser.json());
      app.use(express.static(path.join(__dirname, '../public')));

      // Inicializar servicios
      await initializeServices();

      // Configurar rutas
      setupRoutes(app);

      // Iniciar servidor
      server = app.listen(PORT, () => {
        console.log(`Server running on http://localhost:${PORT}`);
        resolve(PORT);
      });

      server.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
}

async function initializeServices() {
  try {
    db = new Database();
    await db.init();
    console.log('Database initialized');
    whatsapp.initialize();
    console.log('WhatsApp service initialized');
  } catch (error) {
    console.error('Initialization error:', error);
  }
}

function setupRoutes(app) {
  // Status
  app.get('/api/status', (req, res) => {
    res.json({
      whatsappReady: whatsapp.isClientReady(),
      qrCode: whatsapp.getQRCode()
    });
  });

  // Contacts
  app.get('/api/contacts', (req, res) => {
    try {
      const contacts = db.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/contacts', (req, res) => {
    try {
      const { name, phone, groupId } = req.body;
      const id = db.addContact(name, phone, groupId);
      res.json({ id, name, phone, groupId });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/contacts/:id', (req, res) => {
    try {
      db.deleteContact(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.get('/api/contacts/:id', (req, res) => {
    try {
      const contact = db.getContactById(req.params.id);
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }
      res.json(contact);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/contacts/:id', (req, res) => {
    try {
      const { name, phone, groupId } = req.body;
      db.updateContact(req.params.id, name, phone, groupId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Groups
  app.get('/api/groups', (req, res) => {
    try {
      const groups = db.getGroups();
      res.json(groups);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/groups', (req, res) => {
    try {
      const { name, description } = req.body;
      const id = db.addGroup(name, description);
      res.json({ id, name, description });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Send message
  app.post('/api/send-message', upload.single('image'), async (req, res) => {
    try {
      const { contactId, message } = req.body;
      const contacts = db.getContacts();
      const contact = contacts.find(c => c.id == contactId);
      
      if (!contact) {
        return res.status(404).json({ error: 'Contact not found' });
      }

      if (req.file) {
        const imagePath = path.join(__dirname, '../uploads', req.file.filename);
        await whatsapp.sendMessageWithMedia(contact.phone, message, imagePath);
      } else {
        await whatsapp.sendMessage(contact.phone, message);
      }
      
      db.updateDailyStats(false);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Schedule message
  app.post('/api/schedule-message', upload.single('image'), (req, res) => {
    try {
      const { contactId, groupId, message, scheduledTime, delaySeconds } = req.body;
      const imagePath = req.file ? path.join(__dirname, '../uploads', req.file.filename) : null;
      let id;
      
      if (groupId) {
        id = db.scheduleGroupMessage(groupId, message, scheduledTime, delaySeconds, imagePath);
      } else {
        id = db.scheduleMessage(contactId, message, scheduledTime, null, delaySeconds, imagePath);
      }
      
      res.json({ id });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Stats
  app.get('/api/stats', (req, res) => {
    try {
      const stats = db.getDailyStats();
      res.json(stats);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Queue
  app.get('/api/queue', (req, res) => {
    try {
      const queue = db.getMessageQueue();
      res.json(queue);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/queue', (req, res) => {
    try {
      db.clearMessageQueue();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.delete('/api/queue/:id', (req, res) => {
    try {
      db.deleteScheduledMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Import/Export
  app.get('/api/whatsapp-contacts', async (req, res) => {
    try {
      const contacts = await whatsapp.getContacts();
      res.json(contacts);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/import-contacts', (req, res) => {
    try {
      const { contacts } = req.body;
      const result = db.bulkImportContacts(contacts);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/import-excel', uploadMemory.single('file'), (req, res) => {
    try {
      const workbook = XLSX.read(req.file.buffer, { type: 'buffer' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const data = XLSX.utils.sheet_to_json(worksheet);
      
      const contacts = data.map(row => ({
        name: row.Nombre || row.Name || row.nombre || '',
        phone: String(row.Telefono || row.Phone || row.telefono || row.Teléfono || '').replace(/\D/g, ''),
        groupId: null
      })).filter(contact => contact.name && contact.phone);
      
      const result = db.bulkImportContacts(contacts);
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/clean-contacts', (req, res) => {
    try {
      const result = db.cleanContacts();
      res.json(result);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.put('/api/contacts/bulk-update', (req, res) => {
    try {
      const { contactIds, groupId } = req.body;
      const finalGroupId = groupId === 'null' ? null : (groupId || null);
      const updated = db.bulkUpdateContacts(contactIds, finalGroupId);
      res.json({ success: true, updated });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  app.post('/api/logout', async (req, res) => {
    try {
      await whatsapp.logout();
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  });

  // Ruta principal
  app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });
}

module.exports = { startServer };