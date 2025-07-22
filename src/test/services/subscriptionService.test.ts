import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import subscriptionService, { USAGE_LIMITS } from '../../../services/subscriptionService';

// Mock dependencies
vi.mock('../../../services/databaseService.js', () => ({
  default: {
    getActiveSubscription: vi.fn(),
    getUserUsageCount: vi.fn(),
    getSubscriptionByStripeId: vi.fn(),
    updateSubscription: vi.fn(),
    createSubscription: vi.fn(),
    recordUsage: vi.fn()
  }
}));

vi.mock('../../../services/errorHandlingService', () => ({
  default: {
    withRetry: vi.fn((fn, options) => fn()),
    formatError: vi.fn(error => error),
    getUserFriendlyMessage: vi.fn(() => 'Error amigable')
  }
}));

vi.mock('../../../services/cacheService.js', () => ({
  default: {
    getOrSet: vi.fn((key, id, fn) => fn()),
    delete: vi.fn()
  }
}));

// Import mocked services
import databaseService from '../../../services/databaseService.js';
import cacheService from '../../../services/cacheService.js';
import errorHandlingService from '../../../services/errorHandlingService';

describe('SubscriptionService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('getSubscriptionStatus', () => {
    it('should return active subscription status for pro user', async () => {
      const mockSubscription = {
        id: 'sub-123',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: false,
        plan: 'pro'
      };
      
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(mockSubscription);
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValue(5);
      
      const result = await subscriptionService.getSubscriptionStatus('user-123');
      
      expect(result.isActive).toBe(true);
      expect(result.isPro).toBe(true);
      expect(result.subscription).toBeDefined();
      expect(result.subscription?.id).toBe('sub-123');
      expect(result.usage.current).toBe(5);
      expect(result.usage.limit).toBe(USAGE_LIMITS.PRO_LIMIT);
      expect(result.usage.unlimited).toBe(true);
    });

    it('should return free subscription status for non-pro user', async () => {
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(null);
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValue(1);
      
      const result = await subscriptionService.getSubscriptionStatus('user-123');
      
      expect(result.isActive).toBe(false);
      expect(result.isPro).toBe(false);
      expect(result.subscription).toBeUndefined();
      expect(result.usage.current).toBe(1);
      expect(result.usage.limit).toBe(USAGE_LIMITS.FREE_LIMIT);
      expect(result.usage.unlimited).toBe(false);
    });

    it('should return inactive subscription status for expired subscription', async () => {
      const mockSubscription = {
        id: 'sub-123',
        status: 'expired',
        current_period_end: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: false,
        plan: 'pro'
      };
      
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(mockSubscription);
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValue(5);
      
      const result = await subscriptionService.getSubscriptionStatus('user-123');
      
      expect(result.isActive).toBe(true);
      expect(result.isPro).toBe(false); // Not pro because status is expired
      expect(result.subscription).toBeDefined();
      expect(result.usage.unlimited).toBe(false);
    });

    it('should handle database errors gracefully', async () => {
      const error = new Error('Database connection error');
      vi.mocked(databaseService.getActiveSubscription).mockRejectedValue(error);
      vi.mocked(errorHandlingService.formatError).mockReturnValue(error);
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(subscriptionService.getSubscriptionStatus('user-123')).rejects.toThrow();
      
      expect(errorHandlingService.formatError).toHaveBeenCalledWith(error);
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should use cache service with correct parameters', async () => {
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(null);
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValue(1);
      
      await subscriptionService.getSubscriptionStatus('user-123');
      
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'subscription_status',
        'user-123',
        expect.any(Function),
        2 * 60 * 1000
      );
    });
  });

  describe('canGenerateDocument', () => {
    it('should allow pro users to generate documents', async () => {
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
        isActive: true,
        isPro: true,
        subscription: {
          id: 'sub-123',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
          plan: 'pro'
        },
        usage: {
          current: 10,
          limit: -1,
          unlimited: true
        }
      });
      
      const result = await subscriptionService.canGenerateDocument('user-123');
      
      expect(result.canGenerate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should allow free users to generate documents within limits', async () => {
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
        isActive: false,
        isPro: false,
        usage: {
          current: 1,
          limit: USAGE_LIMITS.FREE_LIMIT,
          unlimited: false
        }
      });
      
      const result = await subscriptionService.canGenerateDocument('user-123');
      
      expect(result.canGenerate).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should prevent free users from generating documents beyond limits', async () => {
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
        isActive: false,
        isPro: false,
        usage: {
          current: USAGE_LIMITS.FREE_LIMIT,
          limit: USAGE_LIMITS.FREE_LIMIT,
          unlimited: false
        }
      });
      
      const result = await subscriptionService.canGenerateDocument('user-123');
      
      expect(result.canGenerate).toBe(false);
      expect(result.reason).toContain('Has alcanzado el límite');
    });

    it('should handle errors when checking subscription status', async () => {
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockRejectedValue(new Error('Database error'));
      vi.mocked(errorHandlingService.formatError).mockReturnValue(new Error('Formatted error'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(subscriptionService.canGenerateDocument('user-123')).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(errorHandlingService.formatError).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should use cache service with correct parameters', async () => {
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
        isActive: false,
        isPro: false,
        usage: {
          current: 1,
          limit: USAGE_LIMITS.FREE_LIMIT,
          unlimited: false
        }
      });
      
      await subscriptionService.canGenerateDocument('user-123');
      
      expect(cacheService.getOrSet).toHaveBeenCalledWith(
        'can_generate',
        'user-123',
        expect.any(Function),
        60 * 1000
      );
    });
  });

  describe('recordDocumentUsage', () => {
    it('should record usage and return success for allowed users', async () => {
      vi.spyOn(subscriptionService, 'canGenerateDocument').mockResolvedValue({
        canGenerate: true
      });
      
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
        isActive: false,
        isPro: false,
        usage: {
          current: 1,
          limit: USAGE_LIMITS.FREE_LIMIT,
          unlimited: false
        }
      });
      
      const result = await subscriptionService.recordDocumentUsage('user-123', 'worksheet', {
        subject: 'Math',
        grade: '5',
        language: 'es'
      });
      
      expect(result.success).toBe(true);
      expect(result.remainingUses).toBe(0);
      expect(databaseService.recordUsage).toHaveBeenCalledWith({
        userId: 'user-123',
        documentType: 'worksheet',
        subject: 'Math',
        grade: '5',
        language: 'es'
      });
      expect(cacheService.delete).toHaveBeenCalledWith('subscription_status', 'user-123');
      expect(cacheService.delete).toHaveBeenCalledWith('can_generate', 'user-123');
    });

    it('should not record usage and return error for disallowed users', async () => {
      vi.spyOn(subscriptionService, 'canGenerateDocument').mockResolvedValue({
        canGenerate: false,
        reason: 'Has alcanzado el límite'
      });
      
      const result = await subscriptionService.recordDocumentUsage('user-123', 'worksheet');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Has alcanzado el límite');
      expect(databaseService.recordUsage).not.toHaveBeenCalled();
    });

    it('should use default metadata values when not provided', async () => {
      vi.spyOn(subscriptionService, 'canGenerateDocument').mockResolvedValue({
        canGenerate: true
      });
      
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
        isActive: false,
        isPro: false,
        usage: {
          current: 1,
          limit: USAGE_LIMITS.FREE_LIMIT,
          unlimited: false
        }
      });
      
      await subscriptionService.recordDocumentUsage('user-123', 'exam');
      
      expect(databaseService.recordUsage).toHaveBeenCalledWith({
        userId: 'user-123',
        documentType: 'exam',
        subject: 'General',
        grade: 'N/A',
        language: 'es'
      });
    });

    it('should handle database errors when recording usage', async () => {
      vi.spyOn(subscriptionService, 'canGenerateDocument').mockResolvedValue({
        canGenerate: true
      });
      
      vi.mocked(databaseService.recordUsage).mockRejectedValue(new Error('Database error'));
      vi.mocked(errorHandlingService.getUserFriendlyMessage).mockReturnValue('Error al registrar uso');
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await subscriptionService.recordDocumentUsage('user-123', 'worksheet');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al registrar uso');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should calculate correct remaining uses for pro users', async () => {
      vi.spyOn(subscriptionService, 'canGenerateDocument').mockResolvedValue({
        canGenerate: true
      });
      
      vi.spyOn(subscriptionService, 'getSubscriptionStatus').mockResolvedValue({
        isActive: true,
        isPro: true,
        subscription: {
          id: 'sub-123',
          status: 'active',
          currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          cancelAtPeriodEnd: false,
          plan: 'pro'
        },
        usage: {
          current: 10,
          limit: -1,
          unlimited: true
        }
      });
      
      const result = await subscriptionService.recordDocumentUsage('user-123', 'worksheet');
      
      expect(result.success).toBe(true);
      expect(result.remainingUses).toBe(-1); // Unlimited
    });
  });

  describe('handleStripeEvent', () => {
    it('should update existing subscription on update event', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        stripe_subscription_id: 'stripe-sub-123'
      };
      
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValue(mockSubscription);
      
      const subscriptionData = {
        id: 'stripe-sub-123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false
      };
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.updated', subscriptionData);
      
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'active',
        current_period_end: expect.any(Date),
        cancel_at_period_end: false
      });
      expect(cacheService.delete).toHaveBeenCalledWith('subscription_status', 'user-123');
    });

    it('should create new subscription on creation event', async () => {
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValue(null);
      
      const subscriptionData = {
        id: 'stripe-sub-123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        customer: 'cus-123',
        metadata: {
          userId: 'user-123'
        },
        items: {
          data: [
            {
              price: {
                id: 'price-123'
              }
            }
          ]
        }
      };
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.created', subscriptionData);
      
      expect(databaseService.createSubscription).toHaveBeenCalledWith({
        userId: 'user-123',
        stripeCustomerId: 'cus-123',
        stripeSubscriptionId: 'stripe-sub-123',
        status: 'active',
        currentPeriodEnd: expect.any(Date),
        plan: 'pro',
        priceId: 'price-123'
      });
    });

    it('should update subscription status on cancellation event', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        stripe_subscription_id: 'stripe-sub-123'
      };
      
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValue(mockSubscription);
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.deleted', {});
      
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'canceled'
      });
    });

    it('should update subscription status on payment success event', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        stripe_subscription_id: 'stripe-sub-123'
      };
      
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValue(mockSubscription);
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'invoice.payment_succeeded', {});
      
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'active'
      });
    });

    it('should update subscription status on payment failure event', async () => {
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'user-123',
        stripe_subscription_id: 'stripe-sub-123'
      };
      
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValue(mockSubscription);
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'invoice.payment_failed', {});
      
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'past_due'
      });
    });

    it('should handle unrecognized event types', async () => {
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'unknown.event', {});
      
      expect(consoleLogSpy).toHaveBeenCalledWith('Evento no manejado: unknown.event');
      expect(databaseService.updateSubscription).not.toHaveBeenCalled();
      expect(databaseService.createSubscription).not.toHaveBeenCalled();
      
      consoleLogSpy.mockRestore();
    });

    it('should handle errors during event processing', async () => {
      vi.mocked(databaseService.getSubscriptionByStripeId).mockRejectedValue(new Error('Database error'));
      vi.mocked(errorHandlingService.formatError).mockReturnValue(new Error('Formatted error'));
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      await expect(subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.updated', {}))
        .rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      expect(errorHandlingService.formatError).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });

    it('should use withRetry with correct parameters for webhook events', async () => {
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValue(null);
      vi.mocked(errorHandlingService.withRetry).mockImplementation((fn) => fn());
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.created', {
        metadata: { userId: 'user-123' },
        customer: 'cus-123',
        id: 'stripe-sub-123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        items: { data: [{ price: { id: 'price-123' } }] }
      });
      
      expect(errorHandlingService.withRetry).toHaveBeenCalledWith(
        expect.any(Function),
        { 
          maxRetries: 3, 
          initialDelayMs: 1000,
          backoffFactor: 2 
        }
      );
    });
  });

  describe('cancelSubscription', () => {
    it('should cancel subscription and return success', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripe_subscription_id: 'stripe-sub-123',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      };
      
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(mockSubscription);
      
      const result = await subscriptionService.cancelSubscription('user-123');
      
      expect(result.success).toBe(true);
      expect(result.cancelAt).toBeInstanceOf(Date);
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        cancel_at_period_end: true
      });
      expect(cacheService.delete).toHaveBeenCalledWith('subscription_status', 'user-123');
    });

    it('should return error when no active subscription exists', async () => {
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(null);
      
      const result = await subscriptionService.cancelSubscription('user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No se encontró una suscripción activa');
      expect(databaseService.updateSubscription).not.toHaveBeenCalled();
    });

    it('should handle database errors during cancellation', async () => {
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue({
        id: 'sub-123',
        stripe_subscription_id: 'stripe-sub-123',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
      });
      
      vi.mocked(databaseService.updateSubscription).mockRejectedValue(new Error('Database error'));
      vi.mocked(errorHandlingService.formatError).mockReturnValue(new Error('Formatted error'));
      vi.mocked(errorHandlingService.getUserFriendlyMessage).mockReturnValue('Error al cancelar suscripción');
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await subscriptionService.cancelSubscription('user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al cancelar suscripción');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('reactivateSubscription', () => {
    it('should reactivate canceled subscription and return success', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripe_subscription_id: 'stripe-sub-123',
        cancel_at_period_end: true
      };
      
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(mockSubscription);
      
      const result = await subscriptionService.reactivateSubscription('user-123');
      
      expect(result.success).toBe(true);
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        cancel_at_period_end: false
      });
      expect(cacheService.delete).toHaveBeenCalledWith('subscription_status', 'user-123');
    });

    it('should return error when subscription is not scheduled for cancellation', async () => {
      const mockSubscription = {
        id: 'sub-123',
        stripe_subscription_id: 'stripe-sub-123',
        cancel_at_period_end: false
      };
      
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(mockSubscription);
      
      const result = await subscriptionService.reactivateSubscription('user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('La suscripción no está programada para cancelación');
      expect(databaseService.updateSubscription).not.toHaveBeenCalled();
    });

    it('should return error when no active subscription exists', async () => {
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue(null);
      
      const result = await subscriptionService.reactivateSubscription('user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('No se encontró una suscripción activa');
      expect(databaseService.updateSubscription).not.toHaveBeenCalled();
    });

    it('should handle database errors during reactivation', async () => {
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValue({
        id: 'sub-123',
        stripe_subscription_id: 'stripe-sub-123',
        cancel_at_period_end: true
      });
      
      vi.mocked(databaseService.updateSubscription).mockRejectedValue(new Error('Database error'));
      vi.mocked(errorHandlingService.formatError).mockReturnValue(new Error('Formatted error'));
      vi.mocked(errorHandlingService.getUserFriendlyMessage).mockReturnValue('Error al reactivar suscripción');
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await subscriptionService.reactivateSubscription('user-123');
      
      expect(result.success).toBe(false);
      expect(result.error).toBe('Error al reactivar suscripción');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});