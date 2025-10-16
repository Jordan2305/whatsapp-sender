const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Preparando build para macOS...');

try {
  // Limpiar cache de Puppeteer
  console.log('🧽 Limpiando cache de Puppeteer...');
  try {
    execSync('rm -rf node_modules/puppeteer/.local-chromium', { stdio: 'inherit' });
  } catch (e) {
    // Ignorar si no existe
  }
  
  // Reinstalar Puppeteer y descargar Chromium
  console.log('📦 Reinstalando Puppeteer...');
  execSync('npm uninstall puppeteer', { stdio: 'inherit' });
  execSync('npm install puppeteer', { stdio: 'inherit' });
  
  // Forzar descarga de Chromium
  console.log('🌍 Descargando Chromium...');
  execSync('npx puppeteer browsers install chrome', { stdio: 'inherit' });
  
  // Verificar instalación
  const puppeteerPath = path.join(__dirname, '../node_modules/puppeteer');
  const chromiumPath = path.join(puppeteerPath, '.local-chromium');
  
  if (fs.existsSync(puppeteerPath)) {
    console.log('✅ Puppeteer instalado correctamente');
  }
  
  if (fs.existsSync(chromiumPath)) {
    console.log('✅ Chromium descargado correctamente');
  } else {
    console.log('⚠️ Chromium no encontrado, pero puede funcionar');
  }
  
  console.log('🎉 Preparación completada');
} catch (error) {
  console.error('❌ Error en preparación:', error.message);
}