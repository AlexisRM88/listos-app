/**
 * =================================================================================================
 * RUTAS DE API PARA GESTIÓN DE SUSCRIPCIONES (ADMIN)
 * =================================================================================================
 * Endpoints para la gestión de suscripciones desde el panel de administración.
 */

import express from 'express';
import databaseService from '../services/databaseService.js';
import Stripe from 'stripe';
import { isAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();
const db = databaseService.getDb();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

/**
 * Obtener todas las suscripciones con información de usuario
 * GET /api/admin/subscriptions
 */
router.get('/subscriptions', isAdmin, async (req, res) => {
  try {
    // Parámetros de paginación y filtrado
    const limit = parseInt(req.query.limit) || 50;
    const offset = parseInt(req.query.offset) || 0;
    const status = req.query.status || null;
    
    // Construir consulta base
    let query = db('subscriptions')
      .select(
        'subscriptions.*',
        'users.name as user_name',
        'users.email as user_email',
        'users.picture as user_picture'
      )
      .leftJoin('users', 'subscriptions.user_id', 'users.id')
      .orderBy('subscriptions.created_at', 'desc')
      .limit(limit)
      .offset(offset);
    
    // Aplicar filtro de estado si se proporciona
    if (status) {
      query = query.where('subscriptions.status', status);
    }
    
    // Ejecutar consulta
    const subscriptions = await query;
    
    // Formatear resultados para incluir usuario anidado
    const formattedSubscriptions = subscriptions.map(sub => {
      const { user_name, user_email, user_picture, ...subscription } = sub;
      return {
        ...subscription,
        user: user_name ? {
          id: subscription.user_id,
          name: user_name,
          email: user_email,
          picture: user_picture
        } : null
      };
    });
    
    // Obtener conteo total para paginación
    const [{ count }] = await db('subscriptions')
      .count('* as count')
      .modify(query => {
        if (status) {
          query.where('status', status);
        }
      });
    
    res.json({
      subscriptions: formattedSubscriptions,
      pagination: {
        total: parseInt(count),
        limit,
        offset
      }
    });
  } catch (error) {
    console.error('Error al obtener suscripciones:', error);
    res.status(500).json({ error: 'Error al obtener suscripciones' });
  }
});

/**
 * Obtener detalles de una suscripción específica
 * GET /api/admin/subscriptions/:id
 */
router.get('/subscriptions/:id', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener suscripción con datos de usuario
    const subscription = await db('subscriptions')
      .select(
        'subscriptions.*',
        'users.name as user_name',
        'users.email as user_email',
        'users.picture as user_picture'
      )
      .leftJoin('users', 'subscriptions.user_id', 'users.id')
      .where('subscriptions.id', id)
      .first();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    // Formatear resultado para incluir usuario anidado
    const { user_name, user_email, user_picture, ...subscriptionData } = subscription;
    const formattedSubscription = {
      ...subscriptionData,
      user: user_name ? {
        id: subscription.user_id,
        name: user_name,
        email: user_email,
        picture: user_picture
      } : null
    };
    
    res.json(formattedSubscription);
  } catch (error) {
    console.error('Error al obtener detalles de suscripción:', error);
    res.status(500).json({ error: 'Error al obtener detalles de suscripción' });
  }
});

/**
 * Cancelar una suscripción
 * POST /api/admin/subscriptions/:id/cancel
 */
router.post('/subscriptions/:id/cancel', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener suscripción
    const subscription = await db('subscriptions')
      .where('id', id)
      .first();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    // Si hay ID de suscripción de Stripe, cancelar en Stripe
    if (subscription.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: true
        });
      } catch (stripeError) {
        console.error('Error al cancelar suscripción en Stripe:', stripeError);
        // Continuamos con la cancelación en nuestra base de datos aunque falle en Stripe
      }
    }
    
    // Actualizar estado en la base de datos
    await db('subscriptions')
      .where('id', id)
      .update({
        cancel_at_period_end: true,
        updated_at: db.fn.now()
      });
    
    res.json({ success: true, message: 'Suscripción cancelada correctamente' });
  } catch (error) {
    console.error('Error al cancelar suscripción:', error);
    res.status(500).json({ error: 'Error al cancelar suscripción' });
  }
});

/**
 * Reactivar una suscripción
 * POST /api/admin/subscriptions/:id/reactivate
 */
router.post('/subscriptions/:id/reactivate', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    
    // Obtener suscripción
    const subscription = await db('subscriptions')
      .where('id', id)
      .first();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    // Si hay ID de suscripción de Stripe, reactivar en Stripe
    if (subscription.stripe_subscription_id) {
      try {
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          cancel_at_period_end: false
        });
      } catch (stripeError) {
        console.error('Error al reactivar suscripción en Stripe:', stripeError);
        // Continuamos con la reactivación en nuestra base de datos aunque falle en Stripe
      }
    }
    
    // Actualizar estado en la base de datos
    await db('subscriptions')
      .where('id', id)
      .update({
        status: 'active',
        cancel_at_period_end: false,
        updated_at: db.fn.now()
      });
    
    res.json({ success: true, message: 'Suscripción reactivada correctamente' });
  } catch (error) {
    console.error('Error al reactivar suscripción:', error);
    res.status(500).json({ error: 'Error al reactivar suscripción' });
  }
});

/**
 * Procesar reembolso de una suscripción
 * POST /api/admin/subscriptions/:id/refund
 */
router.post('/subscriptions/:id/refund', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, reason } = req.body;
    
    // Validar datos de entrada
    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'El monto del reembolso debe ser mayor que cero' });
    }
    
    if (!reason) {
      return res.status(400).json({ error: 'Se requiere un motivo para el reembolso' });
    }
    
    // Obtener suscripción
    const subscription = await db('subscriptions')
      .where('id', id)
      .first();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    // Verificar si hay un cliente de Stripe asociado
    if (!subscription.stripe_customer_id) {
      return res.status(400).json({ error: 'No hay un cliente de Stripe asociado a esta suscripción' });
    }
    
    // Buscar pagos recientes del cliente
    const charges = await stripe.charges.list({
      customer: subscription.stripe_customer_id,
      limit: 5
    });
    
    if (charges.data.length === 0) {
      return res.status(400).json({ error: 'No se encontraron pagos recientes para reembolsar' });
    }
    
    // Procesar reembolso del cargo más reciente
    const latestCharge = charges.data[0];
    const refund = await stripe.refunds.create({
      charge: latestCharge.id,
      amount: Math.round(amount * 100), // Convertir a centavos
      reason: 'requested_by_customer',
      metadata: {
        reason: reason,
        admin_id: req.user.id,
        subscription_id: id
      }
    });
    
    // Registrar reembolso en la base de datos
    await db('refunds').insert({
      subscription_id: id,
      user_id: subscription.user_id,
      stripe_refund_id: refund.id,
      amount: amount,
      reason: reason,
      admin_id: req.user.id,
      created_at: db.fn.now()
    });
    
    res.json({ 
      success: true, 
      message: 'Reembolso procesado correctamente',
      refund: {
        id: refund.id,
        amount: refund.amount / 100,
        status: refund.status
      }
    });
  } catch (error) {
    console.error('Error al procesar reembolso:', error);
    res.status(500).json({ error: 'Error al procesar reembolso' });
  }
});

/**
 * Cambiar plan de una suscripción
 * POST /api/admin/subscriptions/:id/change-plan
 */
router.post('/subscriptions/:id/change-plan', isAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { plan } = req.body;
    
    // Validar datos de entrada
    if (!plan) {
      return res.status(400).json({ error: 'Se requiere especificar un plan' });
    }
    
    // Obtener suscripción
    const subscription = await db('subscriptions')
      .where('id', id)
      .first();
    
    if (!subscription) {
      return res.status(404).json({ error: 'Suscripción no encontrada' });
    }
    
    // Actualizar en Stripe si hay una suscripción de Stripe asociada
    if (subscription.stripe_subscription_id) {
      try {
        // Obtener el ID del precio correspondiente al nuevo plan
        // Esto requeriría una tabla o configuración que mapee planes a precios de Stripe
        const priceMapping = {
          'pro': process.env.STRIPE_PRICE_PRO,
          'pro-annual': process.env.STRIPE_PRICE_PRO_ANNUAL,
          'edu': process.env.STRIPE_PRICE_EDU,
          'team': process.env.STRIPE_PRICE_TEAM
        };
        
        const newPriceId = priceMapping[plan];
        
        if (!newPriceId) {
          throw new Error(`No se encontró un precio para el plan: ${plan}`);
        }
        
        // Primero necesitamos obtener los items de la suscripción
        const stripeSubscription = await stripe.subscriptions.retrieve(subscription.stripe_subscription_id);
        
        // Obtener el ID del primer item de la suscripción
        const subscriptionItemId = stripeSubscription.items.data[0].id;
        
        // Actualizar la suscripción en Stripe
        await stripe.subscriptions.update(subscription.stripe_subscription_id, {
          items: [{
            id: subscriptionItemId, // Usar el ID del item, no de la suscripción
            price: newPriceId
          }],
          proration_behavior: 'create_prorations'
        });
      } catch (stripeError) {
        console.error('Error al actualizar suscripción en Stripe:', stripeError);
        // Continuamos con la actualización en nuestra base de datos aunque falle en Stripe
      }
    }
    
    // Actualizar en la base de datos
    await db('subscriptions')
      .where('id', id)
      .update({
        plan: plan,
        updated_at: db.fn.now()
      });
    
    // Registrar el cambio de plan
    await db('subscription_changes').insert({
      subscription_id: id,
      user_id: subscription.user_id,
      old_plan: subscription.plan,
      new_plan: plan,
      admin_id: req.user.id,
      created_at: db.fn.now()
    });
    
    res.json({ 
      success: true, 
      message: 'Plan actualizado correctamente',
      subscription: {
        id: id,
        plan: plan
      }
    });
  } catch (error) {
    console.error('Error al cambiar plan de suscripción:', error);
    res.status(500).json({ error: 'Error al cambiar plan de suscripción' });
  }
});

export default router;