const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 Preparando build para Windows...');

try {
  // Verificar si Chrome está instalado en el sistema
  const systemChromePaths = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    path.join(process.env.LOCALAPPDATA || '', 'Google\\Chrome\\Application\\chrome.exe')
  ];
  
  let systemChromeFound = false;
  for (const chromePath of systemChromePaths) {
    if (fs.existsSync(chromePath)) {
      console.log('✅ Chrome del sistema encontrado:', chromePath);
      systemChromeFound = true;
      break;
    }
  }
  
  if (!systemChromeFound) {
    console.log('⚠️ Chrome del sistema no encontrado, descargando Chromium...');
    
    // Asegurar que Puppeteer descargue Chromium
    process.env.PUPPETEER_SKIP_CHROMIUM_DOWNLOAD = 'false';
    
    try {
      execSync('npm install puppeteer --force', { stdio: 'inherit' });
    } catch (e) {
      console.log('Error reinstalando puppeteer:', e.message);
    }
  }
  
  // Verificar instalación de Puppeteer
  const puppeteerPath = path.join(__dirname, '../node_modules/puppeteer');
  const chromiumPath = path.join(puppeteerPath, '.local-chromium');
  
  if (fs.existsSync(chromiumPath)) {
    const versions = fs.readdirSync(chromiumPath);
    console.log('✅ Chromium disponible, versiones:', versions);
  }
  
  console.log('🎉 Preparación para Windows completada');
  
} catch (error) {
  console.error('❌ Error en preparación:', error.message);
  console.log('💡 La aplicación intentará usar Chrome del sistema');
}