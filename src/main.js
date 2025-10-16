const { app, BrowserWindow, systemPreferences } = require('electron');
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

  // Solicitar permisos explícitamente
  if (process.platform === 'darwin') {
    console.log('Requesting macOS permissions...');
    
    try {
      // Solicitar acceso a archivos y carpetas
      const fileAccess = systemPreferences.getMediaAccessStatus('microphone'); // Esto fuerza el diálogo de permisos
      console.log('File access status:', fileAccess);
      
      // Solicitar permisos de forma explícita
      if (app.isPackaged) {
        // Forzar solicitud de permisos usando AppleScript
        const { execSync } = require('child_process');
        
        const requestScript = `
          tell application "System Events"
            try
              set homeFolder to (path to home folder)
              get contents of homeFolder
            on error
              display dialog "WhatsApp Sender necesita acceso a archivos y carpetas para funcionar correctamente.\n\nPor favor, concede los permisos cuando se soliciten." buttons {"OK"} default button "OK"
            end try
          end tell
        `;
        
        try {
          execSync(`osascript -e '${requestScript}'`, { stdio: 'pipe' });
        } catch (e) {
          console.log('Permission request completed');
        }
      }
      
    } catch (error) {
      console.log('Permission request error:', error.message);
    }
  }

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
app.whenReady().then(() => {
  // Verificar si necesita reubicarse en ubicación fija
  if (app.isPackaged) {
    try {
      const { relocateAppIfNeeded } = require('./app-relocator');
      const relocated = relocateAppIfNeeded();
      
      if (relocated) {
        // Si se reubicó, la app se reiniciará desde nueva ubicación
        return;
      }
    } catch (error) {
      console.log('Relocation error:', error.message);
    }
  }
  
  createWindow();
});

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