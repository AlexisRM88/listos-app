/**
 * =================================================================================================
 * RUTAS DE STRIPE PARA LISTOSAPP
 * =================================================================================================
 * Este archivo maneja todas las rutas relacionadas con Stripe, incluyendo:
 * - Creación de sesiones de checkout
 * - Manejo de webhooks
 * - Gestión de suscripciones
 */

import express from 'express';
import Stripe from 'stripe';
import { OAuth2Client } from 'google-auth-library';
import databaseService from '../services/databaseService.js';

const router = express.Router();

// Inicializar Stripe
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-06-20',
});

// Inicializar cliente de Google Auth
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

/**
 * Middleware para verificar token de Google
 */
const verifyGoogleToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token de autorización requerido' });
    }

    const idToken = authHeader.substring(7);
    const ticket = await googleClient.verifyIdToken({
      idToken,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    req.user = {
      id: payload.sub,
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
    };

    next();
  } catch (error) {
    console.error('Error verificando token de Google:', error);
    res.status(401).json({ error: 'Token inválido' });
  }
};

/**
 * POST /api/stripe/create-checkout-session
 * Crea una sesión de checkout de Stripe
 */
router.post('/create-checkout-session', verifyGoogleToken, async (req, res) => {
  try {
    const { id: userId, email } = req.user;

    // Verificar si el usuario ya tiene una suscripción activa
    const existingSubscription = await databaseService.getActiveSubscription(userId);
    if (existingSubscription) {
      return res.status(400).json({ 
        error: 'El usuario ya tiene una suscripción activa' 
      });
    }

    // Verificar configuración de Stripe
    if (!process.env.STRIPE_SECRET_KEY) {
      console.error('STRIPE_SECRET_KEY no está configurada');
      return res.status(500).json({ error: 'Configuración de pago no disponible' });
    }

    if (!process.env.STRIPE_PRICE_ID) {
      console.error('STRIPE_PRICE_ID no está configurada');
      return res.status(500).json({ error: 'Producto no configurado' });
    }

    // Buscar o crear cliente en Stripe
    let customer;
    const existingCustomers = await stripe.customers.list({
      email: email,
      limit: 1,
    });

    if (existingCustomers.data.length > 0) {
      customer = existingCustomers.data[0];
    } else {
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          userId: userId,
        },
      });
    }

    // Crear sesión de checkout
    const session = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: process.env.STRIPE_PRICE_ID,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `${req.headers.origin || 'http://localhost:3000'}?payment=success`,
      cancel_url: `${req.headers.origin || 'http://localhost:3000'}?payment=cancelled`,
      metadata: {
        userId: userId,
      },
      subscription_data: {
        metadata: {
          userId: userId,
        },
      },
    });

    res.json({ sessionId: session.id });

  } catch (error) {
    console.error('Error creando sesión de checkout:', error);
    
    // Manejo específico de errores de Stripe
    if (error.type === 'StripeCardError') {
      res.status(400).json({ error: 'Error con la tarjeta de crédito' });
    } else if (error.type === 'StripeRateLimitError') {
      res.status(429).json({ error: 'Demasiadas solicitudes, intenta más tarde' });
    } else if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Solicitud inválida' });
    } else if (error.type === 'StripeAPIError') {
      res.status(500).json({ error: 'Error interno del servicio de pagos' });
    } else if (error.type === 'StripeConnectionError') {
      res.status(500).json({ error: 'Error de conexión con el servicio de pagos' });
    } else if (error.type === 'StripeAuthenticationError') {
      res.status(500).json({ error: 'Error de autenticación con el servicio de pagos' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

/**
 * GET /api/stripe/session/:sessionId
 * Verifica el estado de una sesión de checkout
 */
router.get('/session/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: 'ID de sesión requerido' });
    }

    // Obtener información de la sesión desde Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);

    res.json({
      status: session.payment_status,
      customerEmail: session.customer_details?.email,
      subscriptionId: session.subscription,
    });

  } catch (error) {
    console.error('Error obteniendo estado de sesión:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      res.status(404).json({ error: 'Sesión no encontrada' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

/**
 * GET /api/stripe/config
 * Obtiene la configuración de productos y precios
 */
router.get('/config', async (req, res) => {
  try {
    // Verificar configuración
    if (!process.env.STRIPE_PRICE_ID) {
      return res.status(500).json({ error: 'Configuración de precios no disponible' });
    }

    // Obtener información del precio desde Stripe
    const price = await stripe.prices.retrieve(process.env.STRIPE_PRICE_ID, {
      expand: ['product'],
    });

    res.json({
      priceId: price.id,
      amount: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      intervalCount: price.recurring?.interval_count,
      product: {
        id: price.product.id,
        name: price.product.name,
        description: price.product.description,
      },
    });

  } catch (error) {
    console.error('Error obteniendo configuración de Stripe:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      res.status(404).json({ error: 'Precio no encontrado' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

/**
 * POST /api/stripe/cancel-subscription
 * Cancela una suscripción
 */
router.post('/cancel-subscription', verifyGoogleToken, async (req, res) => {
  try {
    const { id: userId } = req.user;

    // Obtener suscripción activa del usuario
    const subscription = await databaseService.getActiveSubscription(userId);
    if (!subscription) {
      return res.status(404).json({ error: 'No se encontró suscripción activa' });
    }

    // Cancelar suscripción en Stripe al final del período
    const stripeSubscription = await stripe.subscriptions.update(
      subscription.stripe_subscription_id,
      {
        cancel_at_period_end: true,
      }
    );

    // Actualizar en la base de datos
    await databaseService.updateSubscription(subscription.stripe_subscription_id, {
      cancel_at_period_end: true,
    });

    res.json({
      success: true,
      message: 'Suscripción programada para cancelación al final del período',
      cancelAt: stripeSubscription.current_period_end,
    });

  } catch (error) {
    console.error('Error cancelando suscripción:', error);
    
    if (error.type === 'StripeInvalidRequestError') {
      res.status(400).json({ error: 'Suscripción no válida' });
    } else {
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }
});

/**
 * POST /api/stripe/webhook
 * Maneja eventos de webhooks de Stripe
 */
router.post('/webhook', async (req, res) => {
  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('STRIPE_WEBHOOK_SECRET no está configurado');
    return res.status(500).json({ error: 'Configuración de webhook no disponible' });
  }

  let event;

  try {
    // Verificar la firma del webhook
    event = stripe.webhooks.constructEvent(req.body, sig, webhookSecret);
  } catch (err) {
    console.error('Error verificando webhook:', err.message);
    return res.status(400).json({ error: `Webhook signature verification failed: ${err.message}` });
  }

  try {
    // Manejar diferentes tipos de eventos
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;

      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;

      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;

      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;

      case 'invoice.payment_succeeded':
        await handleInvoicePaymentSucceeded(event.data.object);
        break;

      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object);
        break;

      default:
        console.log(`Evento no manejado: ${event.type}`);
    }

    res.json({ received: true });

  } catch (error) {
    console.error('Error procesando webhook:', error);
    res.status(500).json({ error: 'Error procesando webhook' });
  }
});

/**
 * Maneja el evento de sesión de checkout completada
 */
async function handleCheckoutSessionCompleted(session) {
  console.log('Checkout session completed:', session.id);
  
  try {
    const userId = session.metadata?.userId;
    if (!userId) {
      console.error('No se encontró userId en metadata de la sesión');
      return;
    }

    // Asegurar que el usuario existe en la base de datos
    const user = await databaseService.getUserById(userId);
    if (!user) {
      console.error(`Usuario ${userId} no encontrado en la base de datos`);
      return;
    }

    // Si hay una suscripción asociada, se manejará en el evento subscription.created
    if (session.subscription) {
      console.log(`Sesión ${session.id} tiene suscripción ${session.subscription}`);
    }

  } catch (error) {
    console.error('Error manejando checkout.session.completed:', error);
    throw error;
  }
}

/**
 * Maneja el evento de suscripción creada
 */
async function handleSubscriptionCreated(subscription) {
  console.log('Subscription created:', subscription.id);
  
  try {
    const userId = subscription.metadata?.userId;
    if (!userId) {
      console.error('No se encontró userId en metadata de la suscripción');
      return;
    }

    // Crear suscripción en la base de datos
    await databaseService.createSubscription({
      userId,
      stripeCustomerId: subscription.customer,
      stripeSubscriptionId: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      plan: 'pro',
      priceId: subscription.items.data[0]?.price?.id,
    });

    console.log(`Suscripción ${subscription.id} creada para usuario ${userId}`);

  } catch (error) {
    console.error('Error manejando customer.subscription.created:', error);
    throw error;
  }
}

/**
 * Maneja el evento de suscripción actualizada
 */
async function handleSubscriptionUpdated(subscription) {
  console.log('Subscription updated:', subscription.id);
  
  try {
    // Actualizar suscripción en la base de datos
    await databaseService.updateSubscription(subscription.id, {
      status: subscription.status,
      current_period_end: new Date(subscription.current_period_end * 1000),
      cancel_at_period_end: subscription.cancel_at_period_end,
    });

    console.log(`Suscripción ${subscription.id} actualizada`);

  } catch (error) {
    console.error('Error manejando customer.subscription.updated:', error);
    throw error;
  }
}

/**
 * Maneja el evento de suscripción eliminada
 */
async function handleSubscriptionDeleted(subscription) {
  console.log('Subscription deleted:', subscription.id);
  
  try {
    // Marcar suscripción como cancelada
    await databaseService.updateSubscription(subscription.id, {
      status: 'canceled',
    });

    console.log(`Suscripción ${subscription.id} marcada como cancelada`);

  } catch (error) {
    console.error('Error manejando customer.subscription.deleted:', error);
    throw error;
  }
}

/**
 * Maneja el evento de pago de factura exitoso
 */
async function handleInvoicePaymentSucceeded(invoice) {
  console.log('Invoice payment succeeded:', invoice.id);
  
  try {
    if (invoice.subscription) {
      // Activar suscripción
      await databaseService.updateSubscription(invoice.subscription, {
        status: 'active',
      });

      console.log(`Suscripción ${invoice.subscription} activada por pago exitoso`);
    }

  } catch (error) {
    console.error('Error manejando invoice.payment_succeeded:', error);
    throw error;
  }
}

/**
 * Maneja el evento de pago de factura fallido
 */
async function handleInvoicePaymentFailed(invoice) {
  console.log('Invoice payment failed:', invoice.id);
  
  try {
    if (invoice.subscription) {
      // Marcar suscripción como vencida
      await databaseService.updateSubscription(invoice.subscription, {
        status: 'past_due',
      });

      console.log(`Suscripción ${invoice.subscription} marcada como vencida por pago fallido`);
    }

  } catch (error) {
    console.error('Error manejando invoice.payment_failed:', error);
    throw error;
  }
}

export default router;