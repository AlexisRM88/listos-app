# ListosApp - Versión Minimal

Versión minimal de ListosApp optimizada para Cloud Run con estructura escalable.

## 🚀 Características

- ✅ Servidor Express optimizado
- ✅ Logging centralizado con Winston
- ✅ Manejo de errores robusto
- ✅ Health checks para Cloud Run
- ✅ Configuración por entornos
- ✅ Interfaz web básica
- ✅ API REST básica
- ✅ Dockerfile optimizado

## 📁 Estructura del Proyecto

```
minimal-app/
├── server.js              # Servidor principal
├── config.js              # Configuración centralizada
├── package.json            # Dependencias y scripts
├── Dockerfile             # Configuración de contenedor
├── .env.example           # Variables de entorno de ejemplo
├── middleware/            # Middlewares personalizados
│   └── errorHandler.js    # Manejo de errores
├── routes/                # Rutas de la API
│   ├── health.js          # Health checks
│   └── api.js             # API principal
├── utils/                 # Utilidades
│   └── logger.js          # Logger centralizado
└── public/                # Archivos estáticos
    ├── index.html         # Página principal
    ├── css/
    │   └── styles.css     # Estilos
    └── js/
        └── main.js        # JavaScript del cliente
```

## 🛠️ Instalación y Desarrollo

### Prerrequisitos
- Node.js 18+
- npm o yarn

### Instalación local
```bash
cd minimal-app
npm install
cp .env.example .env
# Editar .env con tus valores
npm run dev
```

### Despliegue en Cloud Run

1. **Crear servicio en Cloud Run:**
   - Nombre: `listos-app-minimal`
   - Región: `europe-west1`
   - Fuente: Repositorio GitHub
   - Dockerfile: `minimal-app/Dockerfile`

2. **Configurar variables de entorno:**
   - `NODE_ENV=production`
   - `PORT=8080`
   - Agregar secretos según necesidad

3. **Configurar health check:**
   - Path: `/health`
   - Puerto: `8080`

## 📊 Endpoints Disponibles

### Health Checks
- `GET /health` - Health check básico
- `GET /health/deep` - Health check profundo

### API
- `GET /api/status` - Estado de la API
- `GET /api/config` - Configuración pública
- `POST /api/echo` - Endpoint de prueba

### Web
- `GET /` - Página principal

## 🔧 Configuración

La aplicación usa configuración por entornos definida en `config.js`:

- **development**: Configuración para desarrollo local
- **production**: Configuración para Cloud Run
- **test**: Configuración para pruebas

## 📝 Logs

Los logs se almacenan en:
- `logs/all.log` - Todos los logs
- `logs/error.log` - Solo errores
- Console - Logs en tiempo real

## 🧪 Testing

```bash
npm test          # Ejecutar pruebas
npm run test:watch # Ejecutar pruebas en modo watch
```

## 🚀 Próximos Pasos

Esta es la base para agregar:
1. Autenticación con Google
2. Conexión a base de datos
3. Integración con Stripe
4. Integración con Gemini AI
5. Interfaz de usuario completa

## 📄 Licencia

MIT