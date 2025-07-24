/**
 * =================================================================================================
 * SERVIDOR EXPRESS PARA LISTOSAPP (VERSIÓN MINIMAL)
 * =================================================================================================
 * Este archivo configura el servidor Express que maneja las API básicas.
 */

const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const path = require('path');

// Importar configuración
const config = require('./config');
const logger = require('./utils/logger');
const errorHandler = require('./middleware/errorHandler');

// Inicializar app
const app = express();
const PORT = process.env.PORT || 8080;

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));
app.use(express.static(path.join(__dirname, 'public')));

// Inicializar conexión a la base de datos
let dbConnection;
try {
  dbConnection = require('./db/connection');
  logger.info('Módulo de base de datos cargado');
  
  // Verificar conexión a la base de datos (no bloquear el startup)
  dbConnection.testConnection()
    .then(connected => {
      if (connected) {
        logger.info('Conexión a la base de datos establecida');
        
        // Ejecutar migraciones si es necesario
        if (process.env.AUTO_MIGRATE === 'true') {
          dbConnection.runMigrations()
            .then(({ batchNo, log }) => {
              if (log.length > 0) {
                logger.info(`Migraciones aplicadas (batch ${batchNo})`);
              }
            })
            .catch(err => logger.error('Error al ejecutar migraciones:', err));
        }
        
        // Ejecutar seeds en desarrollo
        if (process.env.NODE_ENV === 'development' && process.env.AUTO_SEED === 'true') {
          dbConnection.runSeeds()
            .catch(err => logger.error('Error al ejecutar seeds:', err));
        }
      } else {
        logger.warn('No se pudo conectar a la base de datos - continuando sin DB');
      }
    })
    .catch(err => {
      logger.error('Error al verificar conexión a la base de datos:', err);
      logger.warn('Continuando sin conexión a la base de datos');
    });
} catch (error) {
  logger.warn('Módulo de base de datos no disponible:', error.message);
}

// Importar rutas
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');
let authRoutes, userRoutes, subscriptionRoutes;

// Importar middleware de autenticación
let authMiddleware;

// Cargar rutas adicionales si están disponibles
try {
  authRoutes = require('./routes/auth');
  logger.info('Rutas de autenticación cargadas');
} catch (error) {
  logger.warn('Rutas de autenticación no disponibles:', error.message);
}

try {
  userRoutes = require('./routes/user');
  logger.info('Rutas de usuario cargadas');
} catch (error) {
  logger.warn('Rutas de usuario no disponibles:', error.message);
}

try {
  subscriptionRoutes = require('./routes/subscription');
  logger.info('Rutas de suscripción cargadas');
} catch (error) {
  logger.warn('Rutas de suscripción no disponibles:', error.message);
}

try {
  authMiddleware = require('./middleware/authMiddleware');
  logger.info('Middleware de autenticación cargado');
} catch (error) {
  logger.warn('Middleware de autenticación no disponible:', error.message);
}

// Configurar rutas básicas
app.use('/health', healthRoutes);
app.use('/api', apiRoutes);

// Configurar rutas adicionales si están disponibles
if (authRoutes) {
  app.use('/auth', authRoutes);
}

if (userRoutes && authMiddleware) {
  // Proteger rutas de usuario con autenticación
  app.use('/user', authMiddleware.authenticate, userRoutes);
} else if (userRoutes) {
  logger.warn('Rutas de usuario configuradas sin autenticación');
  app.use('/user', userRoutes);
}

if (subscriptionRoutes && authMiddleware) {
  // El webhook de Stripe no requiere autenticación
  app.use('/subscription/webhook', subscriptionRoutes);
  
  // El resto de rutas de suscripción requieren autenticación
  app.use('/subscription', authMiddleware.authenticate, subscriptionRoutes);
} else if (subscriptionRoutes) {
  logger.warn('Rutas de suscripción configuradas sin autenticación');
  app.use('/subscription', subscriptionRoutes);
}

// Ruta principal
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Manejo de errores
app.use(errorHandler);

// Manejo de rutas no encontradas
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Manejo de errores no capturados
process.on('uncaughtException', (error) => {
  logger.error('Excepción no capturada:', error);
  // No cerrar el proceso, solo loggear
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Promesa rechazada no manejada:', reason);
  // No cerrar el proceso, solo loggear
});

// Iniciar servidor
const server = app.listen(PORT, '0.0.0.0', () => {
  logger.info(`🚀 Servidor iniciado en http://0.0.0.0:${PORT}`);
  logger.info(`📊 Health check disponible en http://0.0.0.0:${PORT}/health`);
  logger.info(`🔧 NODE_ENV: ${process.env.NODE_ENV}`);
});

// Manejo de cierre graceful
process.on('SIGTERM', () => {
  logger.info('SIGTERM recibido. Cerrando servidor...');
  server.close(() => {
    logger.info('Servidor cerrado.');
    process.exit(0);
  });
});

module.exports = server; // Para testing