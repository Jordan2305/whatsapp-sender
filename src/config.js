const os = require('os');
const path = require('path');

const isPackaged = process.env.NODE_ENV === 'production' || process.resourcesPath;
const platform = os.platform();

const config = {
  // Rutas de la aplicación
  paths: {
    userData: isPackaged 
      ? path.join(os.homedir(), '.whatsapp-sender')
      : path.join(__dirname, '..', 'data'),
    
    session: isPackaged 
      ? path.join(os.homedir(), '.whatsapp-sender', '.wwebjs_auth')
      : path.join(__dirname, '..', '.wwebjs_auth'),
    
    uploads: isPackaged && process.resourcesPath
      ? path.join(process.resourcesPath, 'app', 'uploads')
      : path.join(__dirname, '..', 'uploads'),
    
    public: isPackaged && process.resourcesPath
      ? path.join(process.resourcesPath, 'app', 'public')
      : path.join(__dirname, '..', 'public')
  },
  
  // Configuración de Puppeteer
  puppeteer: {
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
  },
  
  // Configuración del servidor
  server: {
    port: 3000,
    host: 'localhost'
  },
  
  // Información del entorno
  environment: {
    isPackaged,
    platform,
    isDevelopment: !isPackaged,
    isProduction: isPackaged
  }
};

module.exports = config;