/**
 * =================================================================================================
 * RUTAS DE HEALTH CHECK
 * =================================================================================================
 * Este archivo define las rutas para verificar el estado del servidor.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * @route GET /health
 * @desc Verificar estado del servidor
 * @access Public
 */
router.get('/', (req, res) => {
  logger.debug('Health check solicitado');
  
  // Información básica del sistema
  const healthInfo = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development',
    memory: process.memoryUsage(),
  };
  
  res.status(200).json(healthInfo);
});

/**
 * @route GET /health/deep
 * @desc Verificación profunda del servidor (incluye DB, etc)
 * @access Public
 */
router.get('/deep', async (req, res, next) => {
  try {
    logger.debug('Deep health check solicitado');
    
    // Por ahora solo devolvemos información básica
    // En el futuro, verificaremos conexión a DB, servicios externos, etc.
    const healthInfo = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'not_configured',
        stripe: 'not_configured',
        gemini: 'not_configured',
      }
    };
    
    res.status(200).json(healthInfo);
  } catch (error) {
    next(error);
  }
});

module.exports = router;