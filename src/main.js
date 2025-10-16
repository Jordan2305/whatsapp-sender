const { app, BrowserWindow } = require('electron');
const path = require('path');

let mainWindow;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: false,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Ejecutar servidor directamente (sin spawn)
  console.log('Starting integrated server...');
  
  // Importar y ejecutar el servidor en el mismo proceso
  require('./server.js');
  
  // Esperar a que el servidor inicie y cargar la URL
  setTimeout(() => {
    console.log('Loading application...');
    mainWindow.loadURL('http://localhost:3000');
    mainWindow.show();
  }, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.disableHardwareAcceleration();
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});