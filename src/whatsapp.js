const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');

class WhatsAppService {
  constructor() {
    this.client = new Client({
      authStrategy: new LocalAuth(),
      puppeteer: {
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
      }
    });
    this.isReady = false;
    this.qrCode = null;
    this.setupEvents();
  }

  setupEvents() {
    this.client.on('qr', async (qr) => {
      this.qrCode = await qrcode.toDataURL(qr);
    });

    this.client.on('ready', () => {
      this.isReady = true;
      console.log('WhatsApp client is ready!');
    });

    this.client.on('authenticated', () => {
      console.log('WhatsApp authenticated');
    });

    this.client.on('auth_failure', (msg) => {
      console.error('Authentication failed:', msg);
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp disconnected:', reason);
      this.isReady = false;
    });
  }

  async initialize() {
    await this.client.initialize();
  }

  async sendMessage(phone, message) {
    if (!this.isReady) {
      throw new Error('WhatsApp client not ready');
    }

    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    await this.client.sendMessage(chatId, message);
  }

  getQRCode() {
    return this.qrCode;
  }

  isClientReady() {
    return this.isReady;
  }

  async getContacts() {
    if (!this.isReady) return [];
    const contacts = await this.client.getContacts();
    return contacts.filter(contact => contact.isMyContact);
  }
}

module.exports = WhatsAppService;