/**
 * =================================================================================================
 * RUTAS API PRINCIPALES
 * =================================================================================================
 * Este archivo define las rutas API principales de la aplicación.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * @route GET /api/status
 * @desc Obtener estado de la API
 * @access Public
 */
router.get('/status', (req, res) => {
  logger.debug('API status solicitado');
  
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development'
  });
});

/**
 * @route GET /api/config
 * @desc Obtener configuración pública
 * @access Public
 */
router.get('/config', (req, res) => {
  logger.debug('API config solicitado');
  
  // Solo devolver configuración segura para el cliente
  res.json({
    environment: process.env.NODE_ENV || 'development',
    features: {
      subscriptions: true,
      gemini: process.env.GEMINI_API_KEY ? true : false,
    }
  });
});

/**
 * @route POST /api/echo
 * @desc Endpoint de prueba que devuelve lo que recibe
 * @access Public
 */
router.post('/echo', (req, res) => {
  logger.debug('API echo solicitado');
  
  res.json({
    echo: req.body,
    timestamp: new Date().toISOString()
  });
});

module.exports = router;