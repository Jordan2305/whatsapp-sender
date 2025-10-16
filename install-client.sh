#!/bin/bash

echo "🚀 Instalando WhatsApp Sender..."
echo "📋 Verificando dependencias del sistema..."

# Función para instalar Homebrew
install_homebrew() {
    echo "📦 Instalando Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    
    # Agregar Homebrew al PATH para la sesión actual
    if [[ -f "/opt/homebrew/bin/brew" ]]; then
        export PATH="/opt/homebrew/bin:$PATH"
    elif [[ -f "/usr/local/bin/brew" ]]; then
        export PATH="/usr/local/bin:$PATH"
    fi
}

# Verificar e instalar Homebrew si no existe
if ! command -v brew &> /dev/null; then
    echo "⚠️  Homebrew no encontrado"
    install_homebrew
fi

# Verificar e instalar Node.js si no existe
if ! command -v node &> /dev/null; then
    echo "📦 Instalando Node.js..."
    brew install node
fi

echo "✅ Node.js instalado: $(node --version)"

# Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# Limpiar base de datos
echo "🧹 Limpiando base de datos..."
npm run clean-db

# Empaquetar aplicación
echo "📱 Empaquetando aplicación..."
npm run build

# Crear enlace en Applications
echo "🔗 Creando enlace en Applications..."
APP_PATH="$(pwd)/dist/WhatsApp-Sender-darwin-x64/WhatsApp-Sender.app"
LINK_PATH="/Applications/WhatsApp Sender.app"

if [ -L "$LINK_PATH" ]; then
    rm "$LINK_PATH"
fi

ln -s "$APP_PATH" "$LINK_PATH"

echo "✅ Instalación completada!"
echo "🎉 WhatsApp Sender está disponible en Applications"
echo "🚀 También puedes ejecutar: open \"$APP_PATH\""