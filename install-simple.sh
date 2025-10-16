#!/bin/bash

echo "🚀 WhatsApp Sender - Instalación Simple"
echo "======================================"

# Verificar si estamos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: Ejecuta este script desde el directorio whatsapp-sender"
    echo "💡 Usa: cd whatsapp-sender && ./install-simple.sh"
    exit 1
fi

# Verificar Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no encontrado"
    echo "📋 Por favor instala Node.js manualmente:"
    echo "   1. Ir a: https://nodejs.org"
    echo "   2. Descargar versión LTS"
    echo "   3. Instalar y reiniciar Terminal"
    echo "   4. Ejecutar este script nuevamente"
    exit 1
fi

echo "✅ Node.js encontrado: $(node --version)"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ Error instalando dependencias"
    exit 1
fi

# Limpiar base de datos
echo "🧹 Limpiando base de datos..."
npm run clean-db

# Compilar aplicación
echo "📱 Compilando aplicación..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error compilando aplicación"
    exit 1
fi

# Crear enlace en Applications
echo "🔗 Creando acceso directo..."
APP_PATH="$(pwd)/dist/WhatsApp-Sender-darwin-x64/WhatsApp-Sender.app"
LINK_PATH="/Applications/WhatsApp Sender.app"

if [ -L "$LINK_PATH" ]; then
    rm "$LINK_PATH"
fi

ln -s "$APP_PATH" "$LINK_PATH"

echo ""
echo "✅ ¡Instalación completada!"
echo "🎉 WhatsApp Sender disponible en Applications"
echo "🚀 O ejecuta: open '$APP_PATH'"