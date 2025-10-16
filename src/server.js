const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const multer = require('multer');
const XLSX = require('xlsx');
const Database = require('./database');
const WhatsAppService = require('./whatsapp');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// Configurar ruta de archivos estáticos
const isPackaged = process.env.NODE_ENV === 'production' || process.resourcesPath;
let publicPath;

if (isPackaged && process.resourcesPath) {
  publicPath = path.join(process.resourcesPath, 'app', 'public');
} else {
  publicPath = path.join(__dirname, '../public');
}

console.log('Public path:', publicPath);
app.use(express.static(publicPath));

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const isPackaged = process.env.NODE_ENV === 'production' || process.resourcesPath;
    let uploadDir;
    
    if (isPackaged && process.resourcesPath) {
      uploadDir = path.join(process.resourcesPath, 'app', 'uploads');
    } else {
      uploadDir = path.join(__dirname, '../uploads');
    }
    
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

// Inicializar servicios
let db;
const whatsapp = new WhatsAppService();

// Inicializar base de datos y WhatsApp
(async () => {
  try {
    db = new Database();
    await db.init();
    console.log('Database initialized');
    whatsapp.initialize();
    console.log('WhatsApp service initialized');
  } catch (error) {
    console.error('Initialization error:', error);
  }
})();

// Rutas API
app.get('/api/status', (req, res) => {
  res.json({
    whatsappReady: whatsapp.isClientReady(),
    qrCode: whatsapp.getQRCode()
  });
});

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

app.delete('/api/contacts/:id', (req, res) => {
  try {
    db.deleteContact(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.get('/api/stats', (req, res) => {
  try {
    const stats = db.getDailyStats();
    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

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

app.post('/api/logout', async (req, res) => {
  try {
    await whatsapp.logout();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});



// Procesador de mensajes programados
setInterval(async () => {
  try {
    if (!db) return;
    const allPendingMessages = db.getAllPendingMessages();
    
    const now = new Date();
    
    for (const msg of allPendingMessages) {
      // Convertir fecha correctamente desde sql.js
      let scheduledDate;
      if (msg.scheduled_time) {
        let dateStr = msg.scheduled_time;
        // Agregar segundos si no los tiene
        if (dateStr.match(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)) {
          dateStr += ':00';
        }
        scheduledDate = new Date(dateStr);
      } else {
        continue; // Skip si no hay fecha
      }
      
      if (scheduledDate <= now) {
        try {
          // Marcar como procesando para evitar duplicados
          db.updateMessageStatus(msg.id, 'processing');
          
          if (msg.contact_id) {
            if (msg.image_path) {
              await whatsapp.sendMessageWithMedia(msg.phone, msg.message, msg.image_path);
            } else {
              await whatsapp.sendMessage(msg.phone, msg.message);
            }
            db.updateMessageStatus(msg.id, 'sent');
            db.updateDailyStats(false);
          } else if (msg.group_id) {
            const contacts = db.getContactsByGroup(msg.group_id);
            const delayMs = (msg.delay_seconds || 10) * 1000;
            let sentCount = 0;
            
            for (let i = 0; i < contacts.length; i++) {
              const contact = contacts[i];
              try {
                if (msg.image_path) {
                  await whatsapp.sendMessageWithMedia(contact.phone, msg.message, msg.image_path);
                } else {
                  await whatsapp.sendMessage(contact.phone, msg.message);
                }
                sentCount++;
                
                // Esperar entre mensajes (excepto el último)
                if (i < contacts.length - 1) {
                  await new Promise(resolve => setTimeout(resolve, delayMs));
                }
              } catch (error) {
                console.error(`Failed to send to ${contact.name}:`, error);
              }
            }
            
            for (let i = 0; i < sentCount; i++) {
              db.updateDailyStats(true);
            }
            
            db.updateMessageStatus(msg.id, 'sent');
          }
        } catch (error) {
          db.updateMessageStatus(msg.id, 'failed');
          console.error(`Failed to process message ${msg.id}:`, error);
        }
      }
    }
  } catch (error) {
    console.error('Error processing scheduled messages:', error);
  }
}, 60000); // Revisar cada minuto

// Ruta principal
app.get('/', (req, res) => {
  const isPackaged = process.env.NODE_ENV === 'production' || process.resourcesPath;
  let indexPath;
  
  if (isPackaged && process.resourcesPath) {
    indexPath = path.join(process.resourcesPath, 'app', 'public', 'index.html');
  } else {
    indexPath = path.join(__dirname, '../public/index.html');
  }
  
  res.sendFile(indexPath);
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;