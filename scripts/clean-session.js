const fs = require('fs');
const path = require('path');

const sessionPath = path.join(__dirname, '../data/.wwebjs_auth');

console.log('🧹 Limpiando sesión de WhatsApp...');

try {
  if (fs.existsSync(sessionPath)) {
    fs.rmSync(sessionPath, { recursive: true, force: true });
    console.log('✅ Sesión de WhatsApp eliminada');
  } else {
    console.log('ℹ️  No hay sesión que limpiar');
  }
} catch (error) {
  console.error('❌ Error limpiando sesión:', error.message);
}

console.log('🎉 Limpieza de sesión completada');