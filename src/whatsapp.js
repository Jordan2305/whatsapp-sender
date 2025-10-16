const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const path = require('path');
const os = require('os');
const fs = require('fs');

function findChromiumExecutable() {
  const isPackaged = process.env.NODE_ENV === 'production' || process.resourcesPath;
  const platform = os.platform();
  
  let possiblePaths = [];
  
  if (isPackaged && process.resourcesPath) {
    // En aplicación empaquetada
    possiblePaths = [
      path.join(process.resourcesPath, 'app', '.chrome-cache'),
      path.join(process.resourcesPath, '.chrome-cache')
    ];
  } else {
    // En desarrollo
    possiblePaths = [
      path.join(__dirname, '..', '.chrome-cache'),
      path.join(__dirname, '..', 'node_modules', 'puppeteer', '.local-chromium')
    ];
  }
  
  for (const basePath of possiblePaths) {
    try {
      if (fs.existsSync(basePath)) {
        // Buscar recursivamente el ejecutable de Chrome
        const findChromeRecursive = (dir) => {
          const items = fs.readdirSync(dir);
          
          for (const item of items) {
            const fullPath = path.join(dir, item);
            const stat = fs.statSync(fullPath);
            
            if (stat.isDirectory()) {
              if (platform === 'darwin' && item === 'Google Chrome for Testing.app') {
                const execPath = path.join(fullPath, 'Contents', 'MacOS', 'Google Chrome for Testing');
                if (fs.existsSync(execPath)) {
                  return execPath;
                }
              } else if (platform === 'darwin' && item === 'Chromium.app') {
                const execPath = path.join(fullPath, 'Contents', 'MacOS', 'Chromium');
                if (fs.existsSync(execPath)) {
                  return execPath;
                }
              } else {
                const result = findChromeRecursive(fullPath);
                if (result) return result;
              }
            } else if (platform === 'win32' && item === 'chrome.exe') {
              return fullPath;
            } else if (platform === 'linux' && item === 'chrome') {
              return fullPath;
            }
          }
          return null;
        };
        
        const result = findChromeRecursive(basePath);
        if (result) return result;
      }
    } catch (error) {
      console.log('Error checking path:', basePath, error.message);
    }
  }
  
  return null;
}

class WhatsAppService {
  constructor() {
    // Configurar directorio de sesión en home del usuario
    const userDataPath = path.join(os.homedir(), '.whatsapp-sender');
    if (!fs.existsSync(userDataPath)) {
      fs.mkdirSync(userDataPath, { recursive: true });
    }
    const sessionPath = path.join(userDataPath, '.wwebjs_auth');
    
    console.log('WhatsApp session path:', sessionPath);
    
    // Configuración simplificada - Puppeteer usará su Chromium por defecto
    let puppeteerConfig = {
      headless: true,
      timeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--no-first-run',
        '--disable-gpu',
        '--disable-web-security'
      ]
    };
    
    console.log('Using default Puppeteer Chromium');
    
    this.client = new Client({
      authStrategy: new LocalAuth({ 
        dataPath: sessionPath,
        clientId: 'whatsapp-sender'
      }),
      puppeteer: puppeteerConfig
    });
    this.isReady = false;
    this.qrCode = null;
    this.setupEvents();
  }

  setupEvents() {
    this.client.on('qr', async (qr) => {
      console.log('QR Code generated');
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
      this.qrCode = null;
    });

    this.client.on('disconnected', (reason) => {
      console.log('WhatsApp disconnected:', reason);
      this.isReady = false;
      this.qrCode = null;
    });

    this.client.on('loading_screen', (percent, message) => {
      console.log('Loading screen:', percent, message);
    });
  }

  async initialize() {
    try {
      console.log('Initializing WhatsApp client...');
      await this.client.initialize();
    } catch (error) {
      console.error('Failed to initialize WhatsApp client:', error);
      throw error;
    }
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