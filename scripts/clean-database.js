const initSqlJs = require('sql.js');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, '../data/whatsapp.db');

console.log('🧹 Limpiando base de datos...');

(async () => {
  if (fs.existsSync(dbPath)) {
    try {
      const SQL = await initSqlJs();
      const filebuffer = fs.readFileSync(dbPath);
      const db = new SQL.Database(filebuffer);
      
      // Limpiar todas las tablas
      db.exec('DELETE FROM daily_stats');
      console.log('✅ Estadísticas diarias limpiadas');
      
      db.exec('DELETE FROM scheduled_messages');
      console.log('✅ Mensajes programados limpiados');
      
      db.exec('DELETE FROM contacts');
      console.log('✅ Contactos limpiados');
      
      db.exec('DELETE FROM groups');
      console.log('✅ Grupos limpiados');
      
      // Resetear contadores de autoincrement
      db.exec('DELETE FROM sqlite_sequence');
      console.log('✅ Contadores ID reseteados');
      
      // Guardar base de datos limpia
      const data = db.export();
      fs.writeFileSync(dbPath, data);
      
      console.log('🎉 Base de datos limpiada exitosamente');
      console.log('📦 Lista para entregar al cliente');
    } catch (error) {
      console.error('❌ Error limpiando base de datos:', error);
    }
  } else {
    console.log('⚠️  No se encontró base de datos para limpiar');
  }
})();