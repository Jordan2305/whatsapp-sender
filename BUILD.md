# Instrucciones de Build

## Para Windows
```bash
npm run build-win
```

## Para macOS (desde cualquier plataforma)
```bash
npm run build-mac-cross
```

## Para ambas plataformas
```bash
npm run build-all
```

## Notas importantes:

### Windows:
- La aplicación buscará Chrome en las ubicaciones estándar
- Si no encuentra Chrome, usará Chromium de Puppeteer
- El ejecutable se genera en `dist/WhatsApp-Sender-win32-x64/`

### macOS:
- Arquitectura universal (Intel + Apple Silicon)
- Buscará Chrome en `/Applications/Google Chrome.app`
- El ejecutable se genera en `dist/WhatsApp-Sender-darwin-universal/`

### Datos de usuario:
- En aplicación empaquetada: `~/.whatsapp-sender/`
- Incluye sesión de WhatsApp y base de datos
- Se mantiene entre actualizaciones

### Solución de problemas:
1. Si WhatsApp no conecta, verificar que Chrome esté instalado
2. Eliminar `~/.whatsapp-sender/` para reset completo
3. Ejecutar `npm run prepare-windows` o `npm run prepare-mac` antes del build