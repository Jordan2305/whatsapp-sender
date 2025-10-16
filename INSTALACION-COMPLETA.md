# 📱 WhatsApp Sender - Instalación Completa

## 🚀 Instalación Automática (Recomendada)

### Paso 1: Descargar el Proyecto

#### **Opción A - Con Git:**
```bash
git clone [URL_DEL_REPOSITORIO]
cd whatsapp-sender
```
**Nota:** Git se instala automáticamente con Xcode Command Line Tools

#### **Opción B - Sin Git (Más Fácil):**
1. Ir a la página del proyecto en GitHub
2. Hacer clic en "Code" → "Download ZIP"
3. Descomprimir el archivo en Escritorio
4. Abrir Terminal y navegar:
```bash
cd ~/Desktop/whatsapp-sender
```

### Paso 2: Ejecutar Instalación Automática
```bash
./install-client.sh
```

**¡Eso es todo!** El script instalará automáticamente:
- ✅ Homebrew (si no lo tienes)
- ✅ Node.js (si no lo tienes)
- ✅ Todas las dependencias
- ✅ Compilará la aplicación
- ✅ Creará acceso directo en Applications

---

## 🛠 Instalación Manual (Si falla la automática)

### 1. Instalar Homebrew
```bash
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
```

### 2. Instalar Node.js
```bash
brew install node
```

### 3. Instalar Dependencias del Proyecto
```bash
npm install
```

### 4. Compilar Aplicación
```bash
npm run build
```

### 5. Crear Enlace en Applications
```bash
ln -s "$(pwd)/dist/WhatsApp-Sender-darwin-x64/WhatsApp-Sender.app" "/Applications/WhatsApp Sender.app"
```

---

## 📋 Requisitos del Sistema

- **macOS**: 10.14 o superior
- **Conexión a Internet**: Para descargar dependencias
- **Espacio en disco**: ~500MB

---

## 🆘 Solución de Problemas

### Error: "command not found: git"
**Solución 1:** Usar Opción B (descargar ZIP) - Más fácil

**Solución 2:** Instalar Git:
```bash
xcode-select --install
```
**Nota:** No necesitas cuenta de GitHub para descargar proyectos públicos

### Error: "Permission denied"
**Solución:** Ejecutar con permisos:
```bash
chmod +x install-client.sh
./install-client.sh
```

### Error: "Homebrew installation failed"
**Solución:** Instalar manualmente desde: https://brew.sh

### Error: "Node.js not found"
**Solución:** Reiniciar Terminal después de instalar Homebrew

---

## ✅ Verificar Instalación

Después de la instalación:
1. Buscar "WhatsApp Sender" en Applications
2. O ejecutar desde Terminal:
   ```bash
   open "/Applications/WhatsApp Sender.app"
   ```

---

## 📞 Soporte

Si tienes problemas:
1. Verificar que tienes permisos de administrador
2. Asegurar conexión a Internet estable
3. Reiniciar Terminal entre pasos