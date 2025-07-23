/**
 * =================================================================================================
 * RUTAS DE AUTENTICACIÓN
 * =================================================================================================
 * Este archivo define las rutas para autenticación con Google OAuth.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const { OAuth2Client } = require('google-auth-library');

// Configurar cliente OAuth2
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * @route POST /auth/google
 * @desc Verificar token de Google y autenticar usuario
 * @access Public
 */
router.post('/google', async (req, res, next) => {
  try {
    const { token } = req.body;
    
    if (!token) {
      return res.status(400).json({
        error: 'Token de Google requerido'
      });
    }
    
    logger.debug('Verificando token de Google');
    
    // Verificar token con Google
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    const userId = payload['sub'];
    
    // Datos del usuario
    const userData = {
      id: userId,
      email: payload['email'],
      name: payload['name'],
      picture: payload['picture'],
      verified: payload['email_verified']
    };
    
    logger.info(`Usuario autenticado: ${userData.email}`);
    
    // En el futuro, aquí guardaremos el usuario en la base de datos
    // Por ahora, solo devolvemos los datos del usuario
    
    res.json({
      success: true,
      user: userData,
      message: 'Autenticación exitosa'
    });
    
  } catch (error) {
    logger.error('Error en autenticación Google:', error);
    
    if (error.message.includes('Token used too late')) {
      return res.status(401).json({
        error: 'Token expirado'
      });
    }
    
    if (error.message.includes('Invalid token')) {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
    
    next(error);
  }
});

/**
 * @route POST /auth/logout
 * @desc Cerrar sesión del usuario
 * @access Public
 */
router.post('/logout', (req, res) => {
  logger.debug('Usuario cerrando sesión');
  
  // En el futuro, aquí invalidaremos la sesión en la base de datos
  
  res.json({
    success: true,
    message: 'Sesión cerrada exitosamente'
  });
});

/**
 * @route GET /auth/me
 * @desc Obtener información del usuario actual
 * @access Private (requiere autenticación)
 */
router.get('/me', async (req, res, next) => {
  try {
    // Por ahora, simulamos obtener el usuario desde el token
    // En el futuro, esto vendrá del middleware de autenticación
    
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Token de autorización requerido'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar token
    const ticket = await client.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    
    const payload = ticket.getPayload();
    
    const userData = {
      id: payload['sub'],
      email: payload['email'],
      name: payload['name'],
      picture: payload['picture'],
      verified: payload['email_verified']
    };
    
    res.json({
      success: true,
      user: userData
    });
    
  } catch (error) {
    logger.error('Error al obtener usuario:', error);
    res.status(401).json({
      error: 'Token inválido o expirado'
    });
  }
});

module.exports = router;