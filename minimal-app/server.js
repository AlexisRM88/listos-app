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

// Importar rutas
const healthRoutes = require('./routes/health');
const apiRoutes = require('./routes/api');

// Configurar rutas
app.use('/health', healthRoutes);
app.use('/api', apiRoutes);

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