const { app, BrowserWindow } = require('electron');
const path = require('path');
const express = require('express');
const net = require('net');

let mainWindow;
let server;

function findAvailablePort(startPort = 3000) {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(startPort, () => {
      const port = server.address().port;
      server.close(() => resolve(port));
    });
    server.on('error', () => {
      resolve(findAvailablePort(startPort + 1));
    });
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    show: true,
    backgroundColor: '#f5f5f5',
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
      webSecurity: false
    }
  });

  // Crear servidor Express simple
  const expressApp = express();
  expressApp.use(express.static(path.join(__dirname, '../public')));
  
  // Ruta básica
  expressApp.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../public/index.html'));
  });

  // Encontrar puerto disponible e iniciar servidor
  const port = await findAvailablePort(3000);
  server = expressApp.listen(port, () => {
    console.log(`Server running on port ${port}`);
    mainWindow.loadURL(`http://localhost:${port}`);
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (server) {
      server.close();
    }
  });
}

app.disableHardwareAcceleration();
app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (server) {
    server.close();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (mainWindow === null) {
    createWindow();
  }
});