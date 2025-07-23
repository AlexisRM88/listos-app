/**
 * =================================================================================================
 * RUTAS DE SUSCRIPCIÓN
 * =================================================================================================
 * Este archivo define las rutas para gestión de suscripciones con Stripe.
 */

const express = require('express');
const router = express.Router();
const logger = require('../utils/logger');
const config = require('../config');

// Inicializar Stripe (si está configurado)
let stripe;
try {
  if (config.stripe && config.stripe.secretKey) {
    stripe = require('stripe')(config.stripe.secretKey);
    logger.info('Stripe inicializado correctamente');
  } else {
    logger.warn('Stripe no configurado - API funcionará en modo simulación');
  }
} catch (error) {
  logger.error('Error al inicializar Stripe:', error);
}

/**
 * @route GET /subscription/plans
 * @desc Obtener planes de suscripción disponibles
 * @access Public
 */
router.get('/plans', async (req, res, next) => {
  try {
    logger.debug('Planes de suscripción solicitados');
    
    // Si Stripe está configurado, obtener planes reales
    if (stripe) {
      const prices = await stripe.prices.list({
        active: true,
        limit: 10,
        expand: ['data.product']
      });
      
      // Transformar datos de Stripe a formato de la API
      const plans = prices.data.map(price => {
        const product = price.product;
        return {
          id: price.id,
          name: product.name,
          description: product.description,
          price: price.unit_amount / 100, // Convertir de centavos a unidades
          currency: price.currency,
          interval: price.recurring ? price.recurring.interval : 'one-time',
          features: product.metadata.features ? JSON.parse(product.metadata.features) : [],
          popular: product.metadata.popular === 'true',
          worksheetLimit: parseInt(product.metadata.worksheetLimit || '0')
        };
      });
      
      res.json({
        success: true,
        plans
      });
    } else {
      // Planes simulados si Stripe no está configurado
      const mockPlans = [
        {
          id: 'price_basic',
          name: 'Plan Básico',
          description: 'Perfecto para comenzar',
          price: 9.99,
          currency: 'usd',
          interval: 'month',
          features: ['5 hojas de trabajo por mes', 'Acceso a plantillas básicas', 'Soporte por email'],
          popular: false,
          worksheetLimit: 5
        },
        {
          id: 'price_pro',
          name: 'Plan Profesional',
          description: 'Para educadores dedicados',
          price: 19.99,
          currency: 'usd',
          interval: 'month',
          features: ['20 hojas de trabajo por mes', 'Todas las plantillas', 'Soporte prioritario', 'Personalización avanzada'],
          popular: true,
          worksheetLimit: 20
        },
        {
          id: 'price_unlimited',
          name: 'Plan Ilimitado',
          description: 'Sin restricciones',
          price: 39.99,
          currency: 'usd',
          interval: 'month',
          features: ['Hojas de trabajo ilimitadas', 'Todas las funciones', 'Soporte prioritario', 'Personalización avanzada', 'Análisis detallado'],
          popular: false,
          worksheetLimit: 999
        }
      ];
      
      res.json({
        success: true,
        plans: mockPlans,
        mode: 'simulation'
      });
    }
  } catch (error) {
    logger.error('Error al obtener planes:', error);
    next(error);
  }
});

/**
 * @route POST /subscription/create-checkout
 * @desc Crear sesión de checkout para suscripción
 * @access Private
 */
router.post('/create-checkout', async (req, res, next) => {
  try {
    const { priceId, successUrl, cancelUrl } = req.body;
    
    if (!priceId || !successUrl || !cancelUrl) {
      return res.status(400).json({
        error: 'priceId, successUrl y cancelUrl son requeridos'
      });
    }
    
    logger.debug(`Creando sesión de checkout para priceId: ${priceId}`);
    
    // Si Stripe está configurado, crear sesión real
    if (stripe) {
      // En un escenario real, obtendríamos el customerId del usuario autenticado
      // Por ahora simulamos un usuario
      const userId = 'user_123';
      
      const session = await stripe.checkout.sessions.create({
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: successUrl,
        cancel_url: cancelUrl,
        client_reference_id: userId,
        metadata: {
          userId
        }
      });
      
      res.json({
        success: true,
        sessionId: session.id,
        url: session.url
      });
    } else {
      // Sesión simulada si Stripe no está configurado
      res.json({
        success: true,
        sessionId: 'cs_test_' + Math.random().toString(36).substring(2, 15),
        url: successUrl + '?simulation=true',
        mode: 'simulation'
      });
    }
  } catch (error) {
    logger.error('Error al crear sesión de checkout:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      return res.status(400).json({
        error: error.message
      });
    }
    
    next(error);
  }
});

/**
 * @route GET /subscription/status
 * @desc Obtener estado de la suscripción del usuario
 * @access Private
 */
router.get('/status', async (req, res, next) => {
  try {
    logger.debug('Estado de suscripción solicitado');
    
    // En un escenario real, obtendríamos el customerId del usuario autenticado
    // y consultaríamos su suscripción en Stripe
    // Por ahora simulamos una suscripción
    
    const subscriptionStatus = {
      active: true,
      plan: 'Pro',
      currentPeriodStart: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      currentPeriodEnd: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString(),
      cancelAtPeriodEnd: false,
      worksheetLimit: 20,
      worksheetsUsed: 7,
      worksheetsRemaining: 13
    };
    
    res.json({
      success: true,
      subscription: subscriptionStatus
    });
  } catch (error) {
    logger.error('Error al obtener estado de suscripción:', error);
    next(error);
  }
});

/**
 * @route POST /subscription/cancel
 * @desc Cancelar suscripción del usuario
 * @access Private
 */
router.post('/cancel', async (req, res, next) => {
  try {
    const { cancelImmediately } = req.body;
    
    logger.debug(`Cancelando suscripción (inmediatamente: ${cancelImmediately})`);
    
    // En un escenario real, obtendríamos el subscriptionId del usuario
    // y lo cancelaríamos en Stripe
    // Por ahora simulamos una cancelación
    
    res.json({
      success: true,
      message: cancelImmediately 
        ? 'Suscripción cancelada inmediatamente' 
        : 'Suscripción configurada para cancelarse al final del período',
      cancelDate: cancelImmediately 
        ? new Date().toISOString() 
        : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString()
    });
  } catch (error) {
    logger.error('Error al cancelar suscripción:', error);
    next(error);
  }
});

/**
 * @route POST /subscription/webhook
 * @desc Webhook para eventos de Stripe
 * @access Public (pero verificado con firma)
 */
router.post('/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    let event;
    
    // Verificar firma del webhook si Stripe y el secreto están configurados
    if (stripe && config.stripe && config.stripe.webhookSecret) {
      const signature = req.headers['stripe-signature'];
      
      try {
        event = stripe.webhooks.constructEvent(
          req.body,
          signature,
          config.stripe.webhookSecret
        );
      } catch (err) {
        logger.error(`Firma de webhook inválida: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // Si no hay configuración de Stripe, intentar parsear el body
      try {
        event = JSON.parse(req.body.toString());
      } catch (err) {
        logger.error(`Error al parsear webhook: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    }
    
    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        const session = event.data.object;
        logger.info(`Checkout completado para usuario: ${session.client_reference_id}`);
        // Aquí actualizaríamos la base de datos con la nueva suscripción
        break;
        
      case 'customer.subscription.updated':
        const subscription = event.data.object;
        logger.info(`Suscripción actualizada: ${subscription.id}`);
        // Aquí actualizaríamos el estado de la suscripción en la base de datos
        break;
        
      case 'customer.subscription.deleted':
        const canceledSubscription = event.data.object;
        logger.info(`Suscripción cancelada: ${canceledSubscription.id}`);
        // Aquí marcaríamos la suscripción como cancelada en la base de datos
        break;
        
      case 'invoice.payment_succeeded':
        const invoice = event.data.object;
        logger.info(`Pago exitoso para factura: ${invoice.id}`);
        // Aquí registraríamos el pago exitoso
        break;
        
      case 'invoice.payment_failed':
        const failedInvoice = event.data.object;
        logger.info(`Pago fallido para factura: ${failedInvoice.id}`);
        // Aquí manejaríamos el fallo de pago
        break;
        
      default:
        logger.debug(`Evento no manejado: ${event.type}`);
    }
    
    res.json({ received: true });
  } catch (error) {
    logger.error('Error en webhook:', error);
    res.status(500).send('Error interno del servidor');
  }
});

module.exports = router;