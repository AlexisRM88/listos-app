/**
 * =================================================================================================
 * RUTAS DE API PARA ADMINISTRACIÓN
 * =================================================================================================
 * Este archivo define las rutas de API para el panel de administración,
 * incluyendo gestión de usuarios, suscripciones y métricas.
 */

import express from 'express';
import { OAuth2Client } from 'google-auth-library';
import databaseService from '../services/databaseService.js';

const router = express.Router();
const db = databaseService.getDb();

// Cliente de OAuth2 para verificar tokens de Google
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Helper function to get date range for analytics
 */
const getDateRange = (period) => {
  const now = new Date();
  let daysBack;
  
  switch (period) {
    case '7d':
      daysBack = 7;
      break;
    case '30d':
      daysBack = 30;
      break;
    case '90d':
      daysBack = 90;
      break;
    case '1y':
      daysBack = 365;
      break;
    default:
      daysBack = 30;
  }
  
  const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));
  return startDate;
};

/**
 * Middleware para verificar autenticación
 */
const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token de autenticación no proporcionado' });
    }
    
    // Verificar token con Google
    const ticket = await googleClient.verifyIdToken({
      idToken: token,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    
    const payload = ticket.getPayload();
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture
    };
    
    next();
  } catch (error) {
    console.error('Error al verificar token:', error);
    return res.status(403).json({ error: 'Token inválido o expirado' });
  }
};

/**
 * Middleware para verificar autorización de administrador
 */
const requireAdmin = async (req, res, next) => {
  try {
    const userId = req.user.id;
    
    // Obtener usuario de la base de datos
    const user = await db('users').where({ id: userId }).first();
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    if (user.role !== 'admin') {
      return res.status(403).json({ error: 'Acceso denegado. Se requieren permisos de administrador.' });
    }
    
    req.adminUser = user;
    next();
  } catch (error) {
    console.error('Error al verificar permisos de administrador:', error);
    return res.status(500).json({ error: 'Error al verificar permisos' });
  }
};

// ===== ENDPOINTS DE GESTIÓN DE USUARIOS =====

/**
 * GET /api/admin/users
 * Obtiene lista de usuarios con paginación y filtros
 */
router.get('/users', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      role = '', 
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir query base
    let query = db('users')
      .select(
        'users.*',
        db.raw('COUNT(subscriptions.id) as subscription_count'),
        db.raw('MAX(subscriptions.created_at) as last_subscription_date')
      )
      .leftJoin('subscriptions', 'users.id', 'subscriptions.user_id')
      .groupBy('users.id');
    
    // Aplicar filtros
    if (search) {
      query = query.where(function() {
        this.where('users.name', 'like', `%${search}%`)
            .orWhere('users.email', 'like', `%${search}%`);
      });
    }
    
    if (role) {
      query = query.where('users.role', role);
    }
    
    // Obtener total de registros para paginación
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as total').first();
    const total = parseInt(totalResult.total);
    
    // Aplicar ordenamiento y paginación
    const users = await query
      .orderBy(`users.${sortBy}`, sortOrder)
      .limit(parseInt(limit))
      .offset(offset);
    
    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener usuarios:', error);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

/**
 * GET /api/admin/users/:id
 * Obtiene detalles de un usuario específico
 */
router.get('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener usuario con información de suscripciones
    const user = await db('users')
      .select(
        'users.*',
        db.raw('COUNT(subscriptions.id) as total_subscriptions'),
        db.raw('COUNT(CASE WHEN subscriptions.status = "active" THEN 1 END) as active_subscriptions')
      )
      .leftJoin('subscriptions', 'users.id', 'subscriptions.user_id')
      .where('users.id', id)
      .groupBy('users.id')
      .first();
    
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener suscripciones del usuario
    const subscriptions = await db('subscriptions')
      .where('user_id', id)
      .orderBy('created_at', 'desc');
    
    // Obtener estadísticas de uso
    const usageStats = await db('usage')
      .select(
        db.raw('COUNT(*) as total_documents'),
        db.raw('COUNT(CASE WHEN document_type = "worksheet" THEN 1 END) as worksheets'),
        db.raw('COUNT(CASE WHEN document_type = "exam" THEN 1 END) as exams')
      )
      .where('user_id', id)
      .first();
    
    res.json({
      success: true,
      data: {
        user,
        subscriptions,
        usageStats
      }
    });
  } catch (error) {
    console.error('Error al obtener detalles de usuario:', error);
    res.status(500).json({ error: 'Error al obtener detalles de usuario' });
  }
});

/**
 * PUT /api/admin/users/:id
 * Actualiza información de un usuario
 */
router.put('/users/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, role } = req.body;
    
    // Validar datos
    if (!name || !role || !['user', 'admin'].includes(role)) {
      return res.status(400).json({ error: 'Datos inválidos' });
    }
    
    // Verificar que el usuario existe
    const existingUser = await db('users').where('id', id).first();
    if (!existingUser) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Actualizar usuario
    await db('users')
      .where('id', id)
      .update({ name, role });
    
    // Obtener usuario actualizado
    const updatedUser = await db('users').where('id', id).first();
    
    res.json({
      success: true,
      data: updatedUser
    });
  } catch (error) {
    console.error('Error al actualizar usuario:', error);
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
});

// ===== ENDPOINTS DE GESTIÓN DE SUSCRIPCIONES =====

/**
 * GET /api/admin/subscriptions
 * Obtiene lista de suscripciones con paginación y filtros
 */
router.get('/subscriptions', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status = '', 
      sortBy = 'created_at', 
      sortOrder = 'desc' 
    } = req.query;
    
    const offset = (parseInt(page) - 1) * parseInt(limit);
    
    // Construir query base
    let query = db('subscriptions')
      .select(
        'subscriptions.*',
        'users.name as user_name',
        'users.email as user_email'
      )
      .join('users', 'subscriptions.user_id', 'users.id');
    
    // Aplicar filtros
    if (status) {
      query = query.where('subscriptions.status', status);
    }
    
    // Obtener total de registros para paginación
    const totalQuery = query.clone();
    const totalResult = await totalQuery.count('* as total').first();
    const total = parseInt(totalResult.total);
    
    // Aplicar ordenamiento y paginación
    const subscriptions = await query
      .orderBy(`subscriptions.${sortBy}`, sortOrder)
      .limit(parseInt(limit))
      .offset(offset);
    
    res.json({
      success: true,
      data: {
        subscriptions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          totalPages: Math.ceil(total / parseInt(limit))
        }
      }
    });
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

/**
 * PUT /api/admin/subscriptions/:id
 * Actualiza el estado de una suscripción
 */
router.put('/subscriptions/:id', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, cancel_at_period_end } = req.body;
    
    // Validar datos
    if (!status || !['active', 'canceled', 'expired'].includes(status)) {
      return res.status(400).json({ error: 'Estado de suscripción inválido' });
    }
    
    // Verificar que la suscripción existe
    const existingSubscription = await db('subscriptions').where('id', id).first();
    if (!existingSubscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    // Actualizar suscripción
    const updateData = { status };
    if (cancel_at_period_end !== undefined) {
      updateData.cancel_at_period_end = cancel_at_period_end;
    }
    
    await db('subscriptions')
      .where('id', id)
      .update(updateData);
    
    // Obtener suscripción actualizada
    const updatedSubscription = await db('subscriptions')
      .select(
        'subscriptions.*',
        'users.name as user_name',
        'users.email as user_email'
      )
      .join('users', 'subscriptions.user_id', 'users.id')
      .where('subscriptions.id', id)
      .first();
    
    res.json({
      success: true,
      data: updatedSubscription
    });
  } catch (error) {
    console.error('Error al actualizar suscripción:', error);
    res.status(500).json({ error: 'Error al actualizar suscripción' });
  }
});

/**
 * POST /api/admin/users/:id/subscription
 * Crea o modifica la suscripción de un usuario
 */
router.post('/users/:id/subscription', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { id: userId } = req.params;
    const { action, plan = 'pro' } = req.body;
    
    // Validar acción
    if (!action || !['create', 'cancel', 'reactivate'].includes(action)) {
      return res.status(400).json({ error: 'Acción inválida' });
    }
    
    // Verificar que el usuario existe
    const user = await db('users').where('id', userId).first();
    if (!user) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    
    // Obtener suscripción activa existente
    const existingSubscription = await db('subscriptions')
      .where('user_id', userId)
      .where('status', 'active')
      .first();
    
    let result;
    
    switch (action) {
      case 'create':
        if (existingSubscription) {
          return res.status(400).json({ error: 'El usuario ya tiene una suscripción activa' });
        }
        
        // Crear nueva suscripción
        const [subscriptionId] = await db('subscriptions').insert({
          user_id: userId,
          status: 'active',
          plan,
          created_at: db.fn.now(),
          current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
          cancel_at_period_end: false
        });
        
        result = await db('subscriptions').where('id', subscriptionId).first();
        break;
        
      case 'cancel':
        if (!existingSubscription) {
          return res.status(400).json({ error: 'No hay suscripción activa para cancelar' });
        }
        
        await db('subscriptions')
          .where('id', existingSubscription.id)
          .update({ 
            status: 'canceled',
            cancel_at_period_end: true
          });
        
        result = await db('subscriptions').where('id', existingSubscription.id).first();
        break;
        
      case 'reactivate':
        if (!existingSubscription) {
          return res.status(400).json({ error: 'No hay suscripción para reactivar' });
        }
        
        await db('subscriptions')
          .where('id', existingSubscription.id)
          .update({ 
            status: 'active',
            cancel_at_period_end: false
          });
        
        result = await db('subscriptions').where('id', existingSubscription.id).first();
        break;
    }
    
    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error('Error al gestionar suscripción de usuario:', error);
    res.status(500).json({ error: 'Error al gestionar suscripción de usuario' });
  }
});

// ===== ENDPOINTS DE MÉTRICAS Y ANÁLISIS =====

/**
 * GET /api/admin/analytics
 * Obtiene métricas y análisis del sistema
 */
router.get('/analytics', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Calcular fecha de inicio basada en el período
    const startDate = getDateRange(period);
    
    // Métricas de usuarios
    const userMetrics = await db('users')
      .select(
        db.raw('COUNT(*) as total_users'),
        db.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_users', [startDate]),
        db.raw('COUNT(CASE WHEN role = ? THEN 1 END) as admin_users', ['admin'])
      )
      .first();
    
    // Métricas de suscripciones
    const subscriptionMetrics = await db('subscriptions')
      .select(
        db.raw('COUNT(*) as total_subscriptions'),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as active_subscriptions', ['active']),
        db.raw('COUNT(CASE WHEN status = ? THEN 1 END) as canceled_subscriptions', ['canceled']),
        db.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as new_subscriptions', [startDate])
      )
      .first();
    
    // Métricas de uso
    const usageMetrics = await db('usage')
      .select(
        db.raw('COUNT(*) as total_documents'),
        db.raw('COUNT(CASE WHEN document_type = ? THEN 1 END) as worksheets', ['worksheet']),
        db.raw('COUNT(CASE WHEN document_type = ? THEN 1 END) as exams', ['exam']),
        db.raw('COUNT(CASE WHEN created_at >= ? THEN 1 END) as recent_documents', [startDate])
      )
      .first();
    
    // Documentos por día (últimos 30 días)
    const thirtyDaysAgo = getDateRange('30d');
    const dailyUsage = await db('usage')
      .select(
        db.raw('DATE(created_at) as date'),
        db.raw('COUNT(*) as count')
      )
      .where('created_at', '>=', thirtyDaysAgo)
      .groupBy(db.raw('DATE(created_at)'))
      .orderBy('date', 'asc');
    
    // Suscripciones por mes (últimos 12 meses)
    const twelveMonthsAgo = getDateRange('1y');
    const monthlySubscriptions = await db('subscriptions')
      .select(
        db.raw('EXTRACT(YEAR FROM created_at) as year'),
        db.raw('EXTRACT(MONTH FROM created_at) as month'),
        db.raw('COUNT(*) as count')
      )
      .where('created_at', '>=', twelveMonthsAgo)
      .groupBy(db.raw('EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)'))
      .orderBy(['year', 'month'], 'asc');
    
    // Top usuarios por uso
    const topUsers = await db('users')
      .select(
        'users.id',
        'users.name',
        'users.email',
        db.raw('COUNT(usage.id) as document_count')
      )
      .leftJoin('usage', 'users.id', 'usage.user_id')
      .groupBy('users.id', 'users.name', 'users.email')
      .orderBy('document_count', 'desc')
      .limit(10);
    
    // Calcular tasa de conversión
    const totalUsers = parseInt(userMetrics.total_users);
    const activeSubscriptions = parseInt(subscriptionMetrics.active_subscriptions);
    const conversionRate = totalUsers > 0 ? (activeSubscriptions / totalUsers * 100).toFixed(2) : 0;
    
    res.json({
      success: true,
      data: {
        period,
        userMetrics: {
          ...userMetrics,
          conversion_rate: parseFloat(conversionRate)
        },
        subscriptionMetrics,
        usageMetrics,
        charts: {
          dailyUsage,
          monthlySubscriptions
        },
        topUsers
      }
    });
  } catch (error) {
    console.error('Error al obtener métricas:', error);
    res.status(500).json({ error: 'Error al obtener métricas' });
  }
});

/**
 * GET /api/admin/analytics/revenue
 * Obtiene métricas de ingresos (simuladas ya que no tenemos integración completa con Stripe)
 */
router.get('/analytics/revenue', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { period = '30d' } = req.query;
    
    // Obtener suscripciones activas para calcular ingresos estimados
    const activeSubscriptions = await db('subscriptions')
      .where('status', 'active')
      .count('* as count')
      .first();
    
    // Precio estimado por suscripción (basado en el precio actual de $9.99)
    const pricePerSubscription = 9.99;
    const monthlyRevenue = parseInt(activeSubscriptions.count) * pricePerSubscription;
    
    // Ingresos por mes (estimados) - últimos 12 meses
    const twelveMonthsAgo = getDateRange('1y');
    const monthlyRevenueData = await db('subscriptions')
      .select(
        db.raw('EXTRACT(YEAR FROM created_at) as year'),
        db.raw('EXTRACT(MONTH FROM created_at) as month'),
        db.raw(`COUNT(*) * ${pricePerSubscription} as revenue`)
      )
      .where('created_at', '>=', twelveMonthsAgo)
      .groupBy(db.raw('EXTRACT(YEAR FROM created_at), EXTRACT(MONTH FROM created_at)'))
      .orderBy(['year', 'month'], 'asc');
    
    res.json({
      success: true,
      data: {
        period,
        currentMonthlyRevenue: monthlyRevenue,
        pricePerSubscription,
        monthlyRevenueData,
        note: 'Los ingresos son estimados basados en suscripciones activas y precio actual'
      }
    });
  } catch (error) {
    console.error('Error al obtener métricas de ingresos:', error);
    res.status(500).json({ error: 'Error al obtener métricas de ingresos' });
  }
});

export default router;