/**
 * =================================================================================================
 * SERVICIO DE GESTIÓN DE SUSCRIPCIONES
 * =================================================================================================
 * Este servicio maneja la lógica de negocio relacionada con suscripciones,
 * incluyendo verificación de estado, límites de uso y gestión de beneficios.
 */

import databaseService from './databaseService.js';
import errorHandlingService from './errorHandlingService';
import cacheService from './cacheService.js';

/**
 * Interfaz para el estado de suscripción
 */
export interface SubscriptionStatus {
  isActive: boolean;
  isPro: boolean;
  subscription?: {
    id: string;
    status: string;
    currentPeriodEnd: Date;
    cancelAtPeriodEnd: boolean;
    plan: string;
  };
  usage: {
    current: number;
    limit: number;
    unlimited: boolean;
  };
}

/**
 * Interfaz para límites de uso
 */
export interface UsageLimits {
  FREE_LIMIT: number;
  PRO_LIMIT: number;
}

/**
 * Límites de uso por tipo de usuario
 */
export const USAGE_LIMITS: UsageLimits = {
  FREE_LIMIT: 2,
  PRO_LIMIT: -1, // -1 significa ilimitado
};

/**
 * Servicio para gestión de suscripciones
 */
class SubscriptionService {
  /**
   * Verifica el estado completo de suscripción de un usuario
   * @param userId - ID del usuario
   * @returns Estado completo de la suscripción
   */
  async getSubscriptionStatus(userId: string): Promise<SubscriptionStatus> {
    return errorHandlingService.withRetry(async () => {
      try {
        // Usar caché para mejorar rendimiento (TTL: 2 minutos)
        return await cacheService.getOrSet('subscription_status', userId, async () => {
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
        }, 2 * 60 * 1000); // 2 minutos de TTL
      } catch (error) {
        const formattedError = errorHandlingService.formatError(error);
        console.error('Error obteniendo estado de suscripción:', formattedError);
        throw formattedError;
      }
    }, { maxRetries: 3 });
  }

  /**
   * Verifica si un usuario puede generar un documento
   * @param userId - ID del usuario
   * @returns true si puede generar, false si ha alcanzado el límite
   */
  async canGenerateDocument(userId: string): Promise<{ canGenerate: boolean; reason?: string }> {
    return errorHandlingService.withRetry(async () => {
      try {
        // Usar caché para mejorar rendimiento (TTL: 1 minuto)
        return await cacheService.getOrSet('can_generate', userId, async () => {
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
        }, 60 * 1000); // 1 minuto de TTL
      } catch (error) {
        const formattedError = errorHandlingService.formatError(error);
        console.error('Error verificando límites de uso:', formattedError);
        throw formattedError;
      }
    }, { maxRetries: 2 });
  }

  /**
   * Registra el uso de un documento y verifica límites
   * @param userId - ID del usuario
   * @param documentType - Tipo de documento generado
   * @param metadata - Metadatos adicionales
   * @returns Resultado del registro
   */
  async recordDocumentUsage(
    userId: string, 
    documentType: 'worksheet' | 'exam', 
    metadata: { subject?: string; grade?: string; language?: string } = {}
  ): Promise<{ success: boolean; error?: string; remainingUses?: number }> {
    return errorHandlingService.withRetry(async () => {
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

        // Invalidar caché para este usuario ya que su uso ha cambiado
        cacheService.delete('subscription_status', userId);
        cacheService.delete('can_generate', userId);

        // Calcular usos restantes para usuarios gratuitos
        const status = await this.getSubscriptionStatus(userId);
        const remainingUses = status.isPro ? -1 : Math.max(0, USAGE_LIMITS.FREE_LIMIT - (status.usage.current + 1));

        return { 
          success: true, 
          remainingUses 
        };
      } catch (error) {
        const formattedError = errorHandlingService.formatError(error);
        console.error('Error registrando uso de documento:', formattedError);
        return { 
          success: false, 
          error: errorHandlingService.getUserFriendlyMessage(error)
        };
      }
    }, { maxRetries: 2 });
  }

  /**
   * Actualiza el estado de una suscripción basado en eventos de Stripe
   * @param stripeSubscriptionId - ID de la suscripción en Stripe
   * @param eventType - Tipo de evento de Stripe
   * @param subscriptionData - Datos de la suscripción desde Stripe
   */
  async handleStripeEvent(
    stripeSubscriptionId: string, 
    eventType: string, 
    subscriptionData: any
  ): Promise<void> {
    return errorHandlingService.withRetry(async () => {
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
              
              // Invalidar caché para este usuario
              cacheService.delete('subscription_status', existingSubscription.user_id);
              cacheService.delete('can_generate', existingSubscription.user_id);
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
                
                // Invalidar caché para este usuario
                cacheService.delete('subscription_status', userId);
                cacheService.delete('can_generate', userId);
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
        const formattedError = errorHandlingService.formatError(error);
        console.error('Error manejando evento de Stripe:', formattedError);
        throw formattedError;
      }
    }, { 
      maxRetries: 3, 
      initialDelayMs: 1000, // Mayor retraso para eventos de webhook que son críticos
      backoffFactor: 2 
    });
  }

  /**
   * Cancela una suscripción al final del período actual
   * @param userId - ID del usuario
   * @returns Resultado de la cancelación
   */
  async cancelSubscription(userId: string): Promise<{ success: boolean; error?: string; cancelAt?: Date }> {
    return errorHandlingService.withRetry(async () => {
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
        
        // Invalidar caché para este usuario
        cacheService.delete('subscription_status', userId);
        cacheService.delete('can_generate', userId);

        return { 
          success: true, 
          cancelAt: new Date(subscription.current_period_end) 
        };
      } catch (error) {
        const formattedError = errorHandlingService.formatError(error);
        console.error('Error cancelando suscripción:', formattedError);
        return { 
          success: false, 
          error: errorHandlingService.getUserFriendlyMessage(error)
        };
      }
    }, { maxRetries: 2 });
  }

  /**
   * Reactiva una suscripción cancelada
   * @param userId - ID del usuario
   * @returns Resultado de la reactivación
   */
  async reactivateSubscription(userId: string): Promise<{ success: boolean; error?: string }> {
    return errorHandlingService.withRetry(async () => {
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
        
        // Invalidar caché para este usuario
        cacheService.delete('subscription_status', userId);
        cacheService.delete('can_generate', userId);

        return { success: true };
      } catch (error) {
        const formattedError = errorHandlingService.formatError(error);
        console.error('Error reactivando suscripción:', formattedError);
        return { 
          success: false, 
          error: errorHandlingService.getUserFriendlyMessage(error)
        };
      }
    }, { maxRetries: 2 });
  }
}

// Exportar instancia del servicio
const subscriptionService = new SubscriptionService();
export default subscriptionService;