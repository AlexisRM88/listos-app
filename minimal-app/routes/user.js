/**
 * =================================================================================================
 * RUTAS DE USUARIO
 * =================================================================================================
 * Este archivo define las rutas para gestión de usuarios.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');

/**
 * @route GET /user/profile
 * @desc Obtener perfil del usuario
 * @access Private
 */
router.get('/profile', async (req, res, next) => {
  try {
    // Por ahora simulamos datos del usuario
    // En el futuro, esto vendrá de la base de datos
    
    const userProfile = {
      id: 'user_123',
      email: 'usuario@ejemplo.com',
      name: 'Usuario Ejemplo',
      picture: 'https://via.placeholder.com/150',
      role: 'user',
      subscription: {
        status: 'free',
        plan: 'free',
        worksheetCount: 3,
        maxWorksheets: 5
      },
      createdAt: new Date().toISOString(),
      lastLogin: new Date().toISOString()
    };
    
    logger.debug('Perfil de usuario solicitado');
    
    res.json({
      success: true,
      profile: userProfile
    });
    
  } catch (error) {
    logger.error('Error al obtener perfil:', error);
    next(error);
  }
});

/**
 * @route PUT /user/profile
 * @desc Actualizar perfil del usuario
 * @access Private
 */
router.put('/profile', async (req, res, next) => {
  try {
    const { name, preferences } = req.body;
    
    logger.debug('Actualizando perfil de usuario');
    
    // Validaciones básicas
    if (name && name.length < 2) {
      return res.status(400).json({
        error: 'El nombre debe tener al menos 2 caracteres'
      });
    }
    
    // Por ahora simulamos la actualización
    // En el futuro, esto actualizará la base de datos
    
    const updatedProfile = {
      id: 'user_123',
      email: 'usuario@ejemplo.com',
      name: name || 'Usuario Ejemplo',
      picture: 'https://via.placeholder.com/150',
      preferences: preferences || {},
      updatedAt: new Date().toISOString()
    };
    
    logger.info('Perfil actualizado exitosamente');
    
    res.json({
      success: true,
      profile: updatedProfile,
      message: 'Perfil actualizado exitosamente'
    });
    
  } catch (error) {
    logger.error('Error al actualizar perfil:', error);
    next(error);
  }
});

/**
 * @route GET /user/usage
 * @desc Obtener estadísticas de uso del usuario
 * @access Private
 */
router.get('/usage', async (req, res, next) => {
  try {
    logger.debug('Estadísticas de uso solicitadas');
    
    // Por ahora simulamos datos de uso
    // En el futuro, esto vendrá de la base de datos
    
    const usageStats = {
      currentPeriod: {
        worksheetsGenerated: 3,
        maxWorksheets: 5,
        remainingWorksheets: 2
      },
      allTime: {
        totalWorksheets: 15,
        totalSessions: 8,
        favoriteSubjects: ['Matemáticas', 'Ciencias', 'Historia']
      },
      recentActivity: [
        {
          id: 1,
          type: 'worksheet_generated',
          subject: 'Matemáticas',
          grade: '5to grado',
          timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
        },
        {
          id: 2,
          type: 'worksheet_generated',
          subject: 'Ciencias',
          grade: '4to grado',
          timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString()
        }
      ]
    };
    
    res.json({
      success: true,
      usage: usageStats
    });
    
  } catch (error) {
    logger.error('Error al obtener estadísticas:', error);
    next(error);
  }
});

/**
 * @route DELETE /user/account
 * @desc Eliminar cuenta del usuario
 * @access Private
 */
router.delete('/account', async (req, res, next) => {
  try {
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Confirmación requerida para eliminar cuenta'
      });
    }
    
    logger.warn('Solicitud de eliminación de cuenta');
    
    // Por ahora solo simulamos la eliminación
    // En el futuro, esto eliminará todos los datos del usuario
    
    res.json({
      success: true,
      message: 'Cuenta eliminada exitosamente'
    });
    
  } catch (error) {
    logger.error('Error al eliminar cuenta:', error);
    next(error);
  }
});

module.exports = router;