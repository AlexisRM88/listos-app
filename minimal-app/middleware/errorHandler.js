/**
 * =================================================================================================
 * MIDDLEWARE DE MANEJO DE ERRORES
 * =================================================================================================
 * Este middleware centraliza el manejo de errores en la aplicación.
 */

const logger = require('../utils/logger');

/**
 * Middleware para manejar errores
 */
function errorHandler(err, req, res, next) {
  // Loggear el error
  logger.error(`Error: ${err.message}`);
  logger.debug(err.stack);

  // Determinar el código de estado
  const statusCode = err.statusCode || 500;
  
  // Determinar el mensaje de error
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'Error interno del servidor'
    : err.message;

  // Enviar respuesta
  res.status(statusCode).json({
    error: {
      message,
      status: statusCode,
      timestamp: new Date().toISOString(),
    }
  });
}

module.exports = errorHandler;