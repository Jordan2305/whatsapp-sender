# WhatsApp Sender

Aplicación de escritorio para envío automático y manual de mensajes de WhatsApp.

## Características

- ✅ Interfaz web moderna y responsive
- ✅ Gestión de contactos
- ✅ Envío manual de mensajes
- ✅ Programación de mensajes automáticos
- ✅ Historial de mensajes enviados
- ✅ Base de datos SQLite local
- ✅ Compatible con Electron para app de escritorio
- ✅ Autenticación QR de WhatsApp

## Instalación

1. Instalar dependencias:
```bash
npm install
```

2. Iniciar en modo desarrollo:
```bash
npm run dev
```

3. Abrir navegador en: http://localhost:3000

## Uso como App de Escritorio

1. Ejecutar con Electron:
```bash
npm run electron
```

2. Compilar para distribución:
```bash
npm run build
```

## Estructura del Proyecto

```
whatsapp-sender/
├── src/
│   ├── database.js      # Manejo de SQLite
│   ├── whatsapp.js      # Servicio de WhatsApp
│   ├── server.js        # Servidor Express
│   └── main.js          # Aplicación Electron
├── public/
│   ├── index.html       # Interfaz principal
│   ├── css/style.css    # Estilos
│   └── js/app.js        # JavaScript frontend
├── data/                # Base de datos SQLite
└── package.json
```

## Funcionalidades

### Dashboard
- Estado de conexión WhatsApp
- Código QR para autenticación
- Estadísticas básicas

### Gestión de Contactos
- Agregar nuevos contactos
- Lista de contactos guardados
- Eliminar contactos

### Envío de Mensajes
- Envío manual inmediato
- Programación de mensajes
- Historial de mensajes enviados

### Base de Datos
- Contactos
- Mensajes programados
- Historial de mensajes

## Notas Importantes

1. La primera vez que uses la aplicación, deberás escanear el código QR con WhatsApp
2. Los mensajes programados se procesan cada minuto
3. Todos los datos se almacenan localmente en SQLite
4. La aplicación funciona completamente offline una vez configurada