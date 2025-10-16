const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

const platform = os.platform();
console.log(`🔧 Preparando build para ${platform}...`);

try {
  // Limpiar cache de Puppeteer
  console.log('🧽 Limpiando cache de Puppeteer...');
  const chromiumPath = path.join(__dirname, '../node_modules/puppeteer/.local-chromium');
  
  if (fs.existsSync(chromiumPath)) {
    if (platform === 'win32') {
      execSync(`rmdir /s /q "${chromiumPath}"`, { stdio: 'inherit' });
    } else {
      execSync(`rm -rf "${chromiumPath}"`, { stdio: 'inherit' });
    }
  }
  
  // Reinstalar Puppeteer y descargar Chromium
  console.log('📦 Reinstalando Puppeteer...');
  execSync('npm uninstall puppeteer', { stdio: 'inherit' });
  execSync('npm install puppeteer', { stdio: 'inherit' });
  
  // Forzar descarga de Chromium
  console.log('🌍 Descargando Chromium...');
  try {
    execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  } catch (e) {
    console.log('⚠️ Error descargando con browsers install, intentando método alternativo...');
    // Método alternativo: reinstalar con variable de entorno
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
    execSync('npm install puppeteer --force', { stdio: 'inherit' });
  }
  
  // Verificar instalación
  const puppeteerPath = path.join(__dirname, '../node_modules/puppeteer');
  const newChromiumPath = path.join(puppeteerPath, '.local-chromium');
  
  if (fs.existsSync(puppeteerPath)) {
    console.log('✅ Puppeteer instalado correctamente');
  }
  
  if (fs.existsSync(newChromiumPath)) {
    console.log('✅ Chromium descargado correctamente');
    // Listar versiones disponibles
    const versions = fs.readdirSync(newChromiumPath);
    console.log('📋 Versiones de Chromium:', versions);
  } else {
    console.log('⚠️ Chromium no encontrado en .local-chromium');
    
    // Verificar en cache del usuario
    const userCachePath = path.join(os.homedir(), '.cache', 'puppeteer');
    if (fs.existsSync(userCachePath)) {
      console.log('✅ Chromium encontrado en cache del usuario:', userCachePath);
    }
  }
  
  console.log('🎉 Preparación completada');
} catch (error) {
  console.error('❌ Error en preparación:', error.message);
  console.log('💡 La aplicación puede funcionar usando Chrome del sistema');
}