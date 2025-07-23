/**
 * =================================================================================================
 * MIDDLEWARE DE AUTENTICACIÓN
 * =================================================================================================
 * Este middleware verifica la autenticación del usuario para rutas protegidas.
 */

const { OAuth2Client } = require('google-auth-library');
const logger = require('../utils/logger');

// Configurar cliente OAuth2
const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Middleware para verificar autenticación
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 */
async function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        error: 'Autenticación requerida',
        message: 'Token de autorización no proporcionado'
      });
    }
    
    const token = authHeader.split(' ')[1];
    
    // Verificar token con Google
    try {
      const ticket = await client.verifyIdToken({
        idToken: token,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      
      const payload = ticket.getPayload();
      
      // Agregar información del usuario al objeto req
      req.user = {
        id: payload['sub'],
        email: payload['email'],
        name: payload['name'],
        picture: payload['picture'],
        verified: payload['email_verified']
      };
      
      logger.debug(`Usuario autenticado: ${req.user.email}`);
      
      // Continuar con la siguiente función
      next();
    } catch (error) {
      logger.error('Error al verificar token:', error);
      
      if (error.message.includes('Token used too late')) {
        return res.status(401).json({
          error: 'Token expirado',
          message: 'La sesión ha expirado, por favor inicie sesión nuevamente'
        });
      }
      
      return res.status(401).json({
        error: 'Token inválido',
        message: 'El token de autenticación no es válido'
      });
    }
  } catch (error) {
    logger.error('Error en middleware de autenticación:', error);
    res.status(500).json({
      error: 'Error interno del servidor',
      message: 'Ocurrió un error al procesar la autenticación'
    });
  }
}

/**
 * Middleware para verificar rol de administrador
 * @param {Object} req - Objeto de solicitud Express
 * @param {Object} res - Objeto de respuesta Express
 * @param {Function} next - Función next de Express
 */
function requireAdmin(req, res, next) {
  // Verificar que el usuario esté autenticado
  if (!req.user) {
    return res.status(401).json({
      error: 'Autenticación requerida',
      message: 'Debe iniciar sesión para acceder a este recurso'
    });
  }
  
  // En un escenario real, verificaríamos el rol en la base de datos
  // Por ahora, simulamos un rol basado en el email
  const isAdmin = req.user.email.endsWith('@admin.com') || req.user.email === 'admin@listosapp.com';
  
  if (!isAdmin) {
    logger.warn(`Intento de acceso a ruta de admin por usuario no autorizado: ${req.user.email}`);
    return res.status(403).json({
      error: 'Acceso denegado',
      message: 'No tiene permisos para acceder a este recurso'
    });
  }
  
  logger.debug(`Acceso de administrador concedido a: ${req.user.email}`);
  next();
}

// Middleware para modo de desarrollo que simula autenticación
function simulateAuth(req, res, next) {
  // Solo usar en entorno de desarrollo
  if (process.env.NODE_ENV !== 'development') {
    return next();
  }
  
  // Si ya hay un usuario autenticado, no hacer nada
  if (req.user) {
    return next();
  }
  
  // Simular usuario autenticado
  req.user = {
    id: 'simulated_user_123',
    email: 'usuario.simulado@ejemplo.com',
    name: 'Usuario Simulado',
    picture: 'https://via.placeholder.com/150',
    verified: true
  };
  
  logger.debug('Autenticación simulada activada');
  next();
}

module.exports = {
  authenticate,
  requireAdmin,
  simulateAuth
};