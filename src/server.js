const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const Database = require('./database');
const WhatsAppService = require('./whatsapp');

const app = express();
const PORT = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '../public')));

// Inicializar servicios
const db = new Database();
const whatsapp = new WhatsAppService();

// Inicializar WhatsApp
whatsapp.initialize();

// Rutas API
app.get('/api/status', (req, res) => {
  res.json({
    whatsappReady: whatsapp.isClientReady(),
    qrCode: whatsapp.getQRCode()
  });
});

app.get('/api/contacts', async (req, res) => {
  try {
    const contacts = await db.getContacts();
    res.json(contacts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/contacts', async (req, res) => {
  try {
    const { name, phone } = req.body;
    const id = await db.addContact(name, phone);
    res.json({ id, name, phone });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/contacts/:id', async (req, res) => {
  try {
    await db.deleteContact(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/send-message', async (req, res) => {
  try {
    const { contactId, message } = req.body;
    const contacts = await db.getContacts();
    const contact = contacts.find(c => c.id == contactId);
    
    if (!contact) {
      return res.status(404).json({ error: 'Contact not found' });
    }

    await whatsapp.sendMessage(contact.phone, message);
    await db.addToHistory(contactId, message);
    
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/schedule-message', async (req, res) => {
  try {
    const { contactId, message, scheduledTime } = req.body;
    const id = await db.scheduleMessage(contactId, message, scheduledTime);
    res.json({ id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/history', async (req, res) => {
  try {
    const history = await db.getHistory();
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Procesador de mensajes programados
setInterval(async () => {
  try {
    const pendingMessages = await db.getPendingMessages();
    
    for (const msg of pendingMessages) {
      try {
        await whatsapp.sendMessage(msg.phone, msg.message);
        await db.updateMessageStatus(msg.id, 'sent');
        await db.addToHistory(msg.contact_id, msg.message);
        console.log(`Message sent to ${msg.name}: ${msg.message}`);
      } catch (error) {
        await db.updateMessageStatus(msg.id, 'failed');
        console.error(`Failed to send message to ${msg.name}:`, error);
      }
    }
  } catch (error) {
    console.error('Error processing scheduled messages:', error);
  }
}, 60000); // Revisar cada minuto

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

module.exports = app;