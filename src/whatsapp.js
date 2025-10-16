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
    if (platform === 'win32') {
      possiblePaths = [
        path.join(process.resourcesPath, 'app', 'node_modules', 'puppeteer', '.local-chromium'),
        path.join(process.resourcesPath, 'node_modules', 'puppeteer', '.local-chromium')
      ];
    } else if (platform === 'darwin') {
      possiblePaths = [
        path.join(process.resourcesPath, 'app', 'node_modules', 'puppeteer', '.local-chromium'),
        path.join(process.resourcesPath, 'node_modules', 'puppeteer', '.local-chromium')
      ];
    }
  } else {
    // En desarrollo
    const homeDir = os.homedir();
    possiblePaths = [
      path.join(__dirname, '..', 'node_modules', 'puppeteer', '.local-chromium'),
      path.join(homeDir, '.cache', 'puppeteer', 'chrome')
    ];
  }
  
  for (const basePath of possiblePaths) {
    try {
      if (fs.existsSync(basePath)) {
        const versions = fs.readdirSync(basePath);
        if (versions.length > 0) {
          const latestVersion = versions.sort().pop();
          let possibleExecs = [];
          
          if (platform === 'win32') {
            possibleExecs = [
              path.join(basePath, latestVersion, 'chrome-win', 'chrome.exe'),
              path.join(basePath, latestVersion, 'chrome-win32', 'chrome.exe'),
              path.join(basePath, latestVersion, 'chrome-win64', 'chrome.exe')
            ];
          } else if (platform === 'darwin') {
            possibleExecs = [
              path.join(basePath, latestVersion, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
              path.join(basePath, latestVersion, 'chrome-mac-x64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
              path.join(basePath, latestVersion, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
              path.join(basePath, latestVersion, 'chrome-mac', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing')
            ];
          } else if (platform === 'linux') {
            possibleExecs = [
              path.join(basePath, latestVersion, 'chrome-linux', 'chrome'),
              path.join(basePath, latestVersion, 'chrome-linux64', 'chrome')
            ];
          }
          
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
    const isPackaged = process.env.NODE_ENV === 'production' || process.resourcesPath;
    
    // Configurar directorio de sesión
    let sessionPath;
    if (isPackaged && process.resourcesPath) {
      // En aplicación empaquetada, usar directorio temporal del usuario
      const userDataPath = path.join(os.homedir(), '.whatsapp-sender');
      if (!fs.existsSync(userDataPath)) {
        fs.mkdirSync(userDataPath, { recursive: true });
      }
      sessionPath = path.join(userDataPath, '.wwebjs_auth');
    } else {
      sessionPath = path.join(__dirname, '../.wwebjs_auth');
    }
    
    // Crear directorio si no existe
    if (!fs.existsSync(sessionPath)) {
      fs.mkdirSync(sessionPath, { recursive: true });
    }
    
    console.log('WhatsApp session path:', sessionPath);
    
    let puppeteerConfig = {
      headless: true,
      timeout: 120000,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-accelerated-2d-canvas',
        '--no-first-run',
        '--no-zygote',
        '--disable-gpu',
        '--disable-web-security',
        '--disable-features=VizDisplayCompositor',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding'
      ]
    };
    
    // Buscar Chromium
    const chromiumPath = findChromiumExecutable();
    if (chromiumPath) {
      puppeteerConfig.executablePath = chromiumPath;
      console.log('Using Chromium at:', chromiumPath);
    } else {
      console.log('Chromium not found, using system Chrome');
      // Intentar usar Chrome del sistema según la plataforma
      const platform = os.platform();
      let systemChromePaths = [];
      
      if (platform === 'win32') {
        systemChromePaths = [
          'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
          'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
          path.join(os.homedir(), 'AppData\\Local\\Google\\Chrome\\Application\\chrome.exe')
        ];
      } else if (platform === 'darwin') {
        systemChromePaths = [
          '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
          '/Applications/Chromium.app/Contents/MacOS/Chromium',
          path.join(os.homedir(), '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome')
        ];
      } else if (platform === 'linux') {
        systemChromePaths = [
          '/usr/bin/google-chrome',
          '/usr/bin/chromium-browser',
          '/usr/bin/chromium'
        ];
      }
      
      for (const chromePath of systemChromePaths) {
        if (fs.existsSync(chromePath)) {
          puppeteerConfig.executablePath = chromePath;
          console.log('Using system Chrome at:', chromePath);
          break;
        }
      }
    }
    
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