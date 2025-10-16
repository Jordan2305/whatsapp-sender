const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const os = require('os');
const fs = require('fs');

function findChromiumExecutable() {
  const homeDir = os.homedir();
  const possiblePaths = [
    path.join(homeDir, '.cache', 'puppeteer', 'chrome'),
    path.join(__dirname, '..', 'node_modules', 'puppeteer', '.local-chromium')
  ];
  
  for (const basePath of possiblePaths) {
    try {
      if (fs.existsSync(basePath)) {
        const versions = fs.readdirSync(basePath);
        if (versions.length > 0) {
          const latestVersion = versions.sort().pop();
          const possibleExecs = [
            path.join(basePath, latestVersion, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
            path.join(basePath, latestVersion, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
          ];
          
          for (const execPath of possibleExecs) {
            if (fs.existsSync(execPath)) {
              return execPath;
            }
          }
        }
      }
    } catch (error) {
      console.log('Error checking path:', basePath, error.message);
    }
  }
  
  return null;
}

class WhatsAppService {
  constructor() {
    const isPackaged = process.env.NODE_ENV === 'production' || process.env.ELECTRON_RUN_AS_NODE;
    
    // Configurar directorio de sesión
    let sessionPath;
    if (isPackaged && process.resourcesPath) {
      sessionPath = path.join(process.resourcesPath, 'app', 'data', '.wwebjs_auth');
    } else {
      sessionPath = path.join(__dirname, '../data/.wwebjs_auth');
    }
    
    // Crear directorio si no existe
    if (!fs.existsSync(path.dirname(sessionPath))) {
      fs.mkdirSync(path.dirname(sessionPath), { recursive: true });
    }
    
    console.log('WhatsApp session path:', sessionPath);
    
    let puppeteerConfig = {
      headless: true,
      timeout: 60000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor'
      ]
    };
    
    // Buscar Chromium en cache del usuario
    const chromiumPath = findChromiumExecutable();
    if (chromiumPath) {
      puppeteerConfig.executablePath = chromiumPath;
      console.log('Using Chromium at:', chromiumPath);
    } else {
      console.log('Chromium not found, using default Puppeteer setup');
    }
    
    this.client = new Client({
      authStrategy: new LocalAuth({ dataPath: sessionPath }),
      puppeteer: puppeteerConfig
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

  async sendMessageWithMedia(phone, message, imagePath) {
    if (!this.isReady) {
      throw new Error('WhatsApp client not ready');
    }

    const { MessageMedia } = require('whatsapp-web.js');
    const chatId = phone.includes('@c.us') ? phone : `${phone}@c.us`;
    const media = MessageMedia.fromFilePath(imagePath);
    await this.client.sendMessage(chatId, media, { caption: message });
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

  async logout() {
    try {
      if (this.client) {
        await this.client.logout();
        this.isReady = false;
        this.qrCode = null;
      }
    } catch (error) {
      console.error('Error during logout:', error);
      throw error;
    }
  }
}

module.exports = WhatsAppService;