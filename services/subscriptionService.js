/**
 * =================================================================================================
 * SERVICIO DE GESTIÓN DE SUSCRIPCIONES
 * =================================================================================================
 * Este servicio maneja la lógica de negocio relacionada con suscripciones,
 * incluyendo verificación de estado, límites de uso y gestión de beneficios.
 */

import databaseService from './databaseService.js';

/**
 * Límites de uso por tipo de usuario
 */
export const USAGE_LIMITS = {
  FREE_LIMIT: 2,
  PRO_LIMIT: -1, // -1 significa ilimitado
};

/**
 * Servicio para gestión de suscripciones
 */
class SubscriptionService {
  /**
   * Verifica el estado completo de suscripción de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Estado completo de la suscripción
   */
  async getSubscriptionStatus(userId) {
    try {
      // Obtener suscripción activa
      const subscription = await databaseService.getActiveSubscription(userId);
      
      // Obtener conteo de uso
      const usageCount = await databaseService.getUserUsageCount(userId);
      
      const isActive = subscription !== null;
      const isPro = isActive && subscription.status === 'active';
      
      return {
        isActive,
        isPro,
        subscription: subscription ? {
          id: subscription.id,
          status: subscription.status,
          currentPeriodEnd: new Date(subscription.current_period_end),
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          plan: subscription.plan,
        } : undefined,
        usage: {
          current: usageCount,
          limit: isPro ? USAGE_LIMITS.PRO_LIMIT : USAGE_LIMITS.FREE_LIMIT,
          unlimited: isPro,
        },
      };
    } catch (error) {
      console.error('Error obteniendo estado de suscripción:', error);
      throw new Error('No se pudo verificar el estado de la suscripción');
    }
  }

  /**
   * Verifica si un usuario puede generar un documento
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} true si puede generar, false si ha alcanzado el límite
   */
  async canGenerateDocument(userId) {
    try {
      const status = await this.getSubscriptionStatus(userId);
      
      // Los usuarios Pro tienen acceso ilimitado
      if (status.isPro) {
        return { canGenerate: true };
      }
      
      // Verificar límite para usuarios gratuitos
      if (status.usage.current >= USAGE_LIMITS.FREE_LIMIT) {
        return { 
          canGenerate: false, 
          reason: `Has alcanzado el límite de ${USAGE_LIMITS.FREE_LIMIT} documentos gratuitos. Actualiza a Pro para acceso ilimitado.`
        };
      }
      
      return { canGenerate: true };
    } catch (error) {
      console.error('Error verificando límites de uso:', error);
      throw new Error('No se pudo verificar los límites de uso');
    }
  }

  /**
   * Registra el uso de un documento y verifica límites
   * @param {string} userId - ID del usuario
   * @param {string} documentType - Tipo de documento generado
   * @param {Object} metadata - Metadatos adicionales
   * @returns {Promise<Object>} Resultado del registro
   */
  async recordDocumentUsage(userId, documentType, metadata = {}) {
    try {
      // Verificar si puede generar antes de registrar
      const canGenerate = await this.canGenerateDocument(userId);
      if (!canGenerate.canGenerate) {
        return { 
          success: false, 
          error: canGenerate.reason 
        };
      }

      // Registrar el uso
      await databaseService.recordUsage({
        userId,
        documentType,
        subject: metadata.subject || 'General',
        grade: metadata.grade || 'N/A',
        language: metadata.language || 'es',
      });

      // Calcular usos restantes para usuarios gratuitos
      const status = await this.getSubscriptionStatus(userId);
      const remainingUses = status.isPro ? -1 : Math.max(0, USAGE_LIMITS.FREE_LIMIT - (status.usage.current + 1));

      return { 
        success: true, 
        remainingUses 
      };
    } catch (error) {
      console.error('Error registrando uso de documento:', error);
      return { 
        success: false, 
        error: 'No se pudo registrar el uso del documento' 
      };
    }
  }

  /**
   * Actualiza el estado de una suscripción basado en eventos de Stripe
   * @param {string} stripeSubscriptionId - ID de la suscripción en Stripe
   * @param {string} eventType - Tipo de evento de Stripe
   * @param {Object} subscriptionData - Datos de la suscripción desde Stripe
   */
  async handleStripeEvent(stripeSubscriptionId, eventType, subscriptionData) {
    try {
      const existingSubscription = await databaseService.getSubscriptionByStripeId(stripeSubscriptionId);
      
      switch (eventType) {
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
          if (existingSubscription) {
            // Actualizar suscripción existente
            await databaseService.updateSubscription(stripeSubscriptionId, {
              status: subscriptionData.status,
              current_period_end: new Date(subscriptionData.current_period_end * 1000),
              cancel_at_period_end: subscriptionData.cancel_at_period_end,
            });
          } else {
            // Crear nueva suscripción
            const userId = subscriptionData.metadata?.userId;
            if (userId) {
              await databaseService.createSubscription({
                userId,
                stripeCustomerId: subscriptionData.customer,
                stripeSubscriptionId: subscriptionData.id,
                status: subscriptionData.status,
                currentPeriodEnd: new Date(subscriptionData.current_period_end * 1000),
                plan: 'pro',
                priceId: subscriptionData.items.data[0]?.price?.id,
              });
            }
          }
          break;

        case 'customer.subscription.deleted':
          if (existingSubscription) {
            await databaseService.updateSubscription(stripeSubscriptionId, {
              status: 'canceled',
            });
          }
          break;

        case 'invoice.payment_succeeded':
          if (existingSubscription) {
            await databaseService.updateSubscription(stripeSubscriptionId, {
              status: 'active',
            });
          }
          break;

        case 'invoice.payment_failed':
          if (existingSubscription) {
            await databaseService.updateSubscription(stripeSubscriptionId, {
              status: 'past_due',
            });
          }
          break;

        default:
          console.log(`Evento no manejado: ${eventType}`);
      }
    } catch (error) {
      console.error('Error manejando evento de Stripe:', error);
      throw error;
    }
  }

  /**
   * Cancela una suscripción al final del período actual
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de la cancelación
   */
  async cancelSubscription(userId) {
    try {
      const subscription = await databaseService.getActiveSubscription(userId);
      if (!subscription) {
        return { 
          success: false, 
          error: 'No se encontró una suscripción activa' 
        };
      }

      // Actualizar en la base de datos
      await databaseService.updateSubscription(subscription.stripe_subscription_id, {
        cancel_at_period_end: true,
      });

      return { 
        success: true, 
        cancelAt: new Date(subscription.current_period_end) 
      };
    } catch (error) {
      console.error('Error cancelando suscripción:', error);
      return { 
        success: false, 
        error: 'No se pudo cancelar la suscripción' 
      };
    }
  }

  /**
   * Reactiva una suscripción cancelada
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} Resultado de la reactivación
   */
  async reactivateSubscription(userId) {
    try {
      const subscription = await databaseService.getActiveSubscription(userId);
      if (!subscription) {
        return { 
          success: false, 
          error: 'No se encontró una suscripción activa' 
        };
      }

      if (!subscription.cancel_at_period_end) {
        return { 
          success: false, 
          error: 'La suscripción no está programada para cancelación' 
        };
      }

      // Actualizar en la base de datos
      await databaseService.updateSubscription(subscription.stripe_subscription_id, {
        cancel_at_period_end: false,
      });

      return { success: true };
    } catch (error) {
      console.error('Error reactivando suscripción:', error);
      return { 
        success: false, 
        error: 'No se pudo reactivar la suscripción' 
      };
    }
  }
}

// Exportar instancia del servicio
const subscriptionService = new SubscriptionService();
export default subscriptionService;