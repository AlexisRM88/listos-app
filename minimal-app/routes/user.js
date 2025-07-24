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
    // Obtener ID del usuario autenticado
    const userId = req.user.id;
    
    // Importar modelos
    const User = require('../models/User');
    const Subscription = require('../models/Subscription');
    
    // Obtener datos del usuario
    const user = await User.findById(userId);
    
    if (!user) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }
    
    // Obtener suscripción activa
    const subscription = await Subscription.getActiveSubscription(userId);
    
    // Construir perfil completo
    const userProfile = {
      id: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture,
      role: user.role,
      worksheetCount: user.worksheet_count,
      preferences: user.preferences,
      subscription: subscription ? {
        status: subscription.status,
        plan: subscription.plan,
        worksheetCount: user.worksheet_count,
        maxWorksheets: subscription.worksheet_limit,
        currentPeriodEnd: subscription.current_period_end,
        cancelAtPeriodEnd: subscription.cancel_at_period_end
      } : {
        status: 'free',
        plan: 'free',
        worksheetCount: user.worksheet_count,
        maxWorksheets: 5
      },
      createdAt: user.created_at,
      lastLogin: user.last_login
    };
    
    logger.debug(`Perfil de usuario solicitado: ${userId}`);
    
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
    // Obtener ID del usuario autenticado
    const userId = req.user.id;
    const { name, preferences } = req.body;
    
    logger.debug(`Actualizando perfil de usuario: ${userId}`);
    
    // Validaciones básicas
    if (name && name.length < 2) {
      return res.status(400).json({
        error: 'El nombre debe tener al menos 2 caracteres'
      });
    }
    
    // Importar modelo
    const User = require('../models/User');
    
    // Actualizar perfil
    const updatedUser = await User.updateProfile(userId, {
      name,
      preferences
    });
    
    if (!updatedUser) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }
    
    logger.info(`Perfil actualizado exitosamente: ${userId}`);
    
    res.json({
      success: true,
      profile: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        picture: updatedUser.picture,
        preferences: updatedUser.preferences,
        updatedAt: updatedUser.updated_at
      },
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
    // Obtener ID del usuario autenticado
    const userId = req.user.id;
    
    logger.debug(`Estadísticas de uso solicitadas: ${userId}`);
    
    // Importar modelos
    const Usage = require('../models/Usage');
    const Subscription = require('../models/Subscription');
    
    // Obtener estadísticas de uso
    const stats = await Usage.getUserStats(userId);
    
    // Obtener suscripción activa
    const subscription = await Subscription.getActiveSubscription(userId);
    
    // Calcular límites según suscripción
    const worksheetLimit = subscription ? subscription.worksheet_limit : 5;
    const remainingWorksheets = Math.max(0, worksheetLimit - stats.totalCount);
    
    // Construir respuesta
    const usageStats = {
      currentPeriod: {
        worksheetsGenerated: stats.totalCount,
        maxWorksheets: worksheetLimit,
        remainingWorksheets: remainingWorksheets
      },
      allTime: {
        totalWorksheets: stats.totalCount,
        favoriteSubjects: stats.bySubject.map(item => item.subject)
      },
      byDocumentType: stats.byDocumentType,
      byMonth: stats.byMonth,
      recentActivity: stats.recentActivity
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
    // Obtener ID del usuario autenticado
    const userId = req.user.id;
    const { confirmation } = req.body;
    
    if (confirmation !== 'DELETE_MY_ACCOUNT') {
      return res.status(400).json({
        error: 'Confirmación requerida para eliminar cuenta'
      });
    }
    
    logger.warn(`Solicitud de eliminación de cuenta: ${userId}`);
    
    // Importar modelo
    const User = require('../models/User');
    
    // Eliminar cuenta
    const deleted = await User.delete(userId);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Usuario no encontrado'
      });
    }
    
    logger.info(`Cuenta eliminada exitosamente: ${userId}`);
    
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