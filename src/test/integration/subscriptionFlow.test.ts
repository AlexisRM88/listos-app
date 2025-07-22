import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { rest } from 'msw';
import { setupServer } from 'msw/node';
import authService from '../../../services/authService';
import subscriptionService from '../../../services/subscriptionService';
import databaseService from '../../../services/databaseService.js';

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => { store[key] = value.toString(); },
    removeItem: (key: string) => { delete store[key]; },
    clear: () => { store = {}; }
  };
})();

Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock database service
vi.mock('../../../services/databaseService.js', () => ({
  default: {
    getDb: vi.fn(() => ({
      fn: {
        now: vi.fn(() => new Date())
      },
      transaction: vi.fn(callback => callback({
        'users': {
          where: vi.fn(() => ({
            first: vi.fn(() => Promise.resolve({
              id: 'test-user-id',
              email: 'test@example.com',
              name: 'Test User',
              picture: 'https://example.com/profile.jpg',
              role: 'user'
            }))
          })),
          insert: vi.fn(() => Promise.resolve()),
          update: vi.fn(() => Promise.resolve())
        },
        'subscriptions': {
          where: vi.fn(() => ({
            orderBy: vi.fn(() => ({
              first: vi.fn(() => Promise.resolve({
                id: 'sub-123',
                status: 'active',
                current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
              }))
            }))
          })),
          insert: vi.fn(() => Promise.resolve()),
          update: vi.fn(() => Promise.resolve())
        },
        'usage': {
          insert: vi.fn(() => Promise.resolve())
        }
      }))
    }),
    getActiveSubscription: vi.fn(),
    getUserUsageCount: vi.fn(),
    getSubscriptionByStripeId: vi.fn(),
    updateSubscription: vi.fn(),
    createSubscription: vi.fn(),
    recordUsage: vi.fn()
  };
}));

// Setup MSW server for API mocking
const server = setupServer(
  // Auth endpoints
  rest.post('/api/user/login', (req, res, ctx) => {
    return res(
      ctx.json({
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/profile.jpg',
        role: 'user'
      })
    );
  }),
  
  // Stripe endpoints
  rest.post('/api/subscription/create', (req, res, ctx) => {
    return res(
      ctx.json({
        url: 'https://checkout.stripe.com/test-session'
      })
    );
  }),
  
  // Webhook endpoint
  rest.post('/api/webhooks/stripe', (req, res, ctx) => {
    return res(ctx.status(200));
  })
);

describe('Subscription Flow Integration Tests', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
    server.listen();
    
    // Setup auth token
    localStorageMock.setItem('listosAppAuthToken', 'valid-token');
    localStorageMock.setItem('listosAppAuthExpiry', (Date.now() + 3600000).toString());
  });

  afterEach(() => {
    server.resetHandlers();
    vi.resetAllMocks();
  });

  afterAll(() => {
    server.close();
  });

  describe('Complete Subscription Flow', () => {
    it('should handle the full subscription lifecycle', async () => {
      // 1. Setup: User is authenticated but not subscribed
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValueOnce(null);
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValueOnce(1);
      
      // 2. Check initial subscription status
      const initialStatus = await subscriptionService.getSubscriptionStatus('test-user-id');
      expect(initialStatus.isPro).toBe(false);
      expect(initialStatus.usage.current).toBe(1);
      
      // 3. Simulate Stripe webhook for new subscription
      const subscriptionData = {
        id: 'stripe-sub-123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false,
        customer: 'cus-123',
        metadata: {
          userId: 'test-user-id'
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
      
      // Mock subscription creation
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValueOnce(null);
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.created', subscriptionData);
      expect(databaseService.createSubscription).toHaveBeenCalled();
      
      // 4. Check updated subscription status
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValueOnce({
        id: 'sub-123',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: false,
        plan: 'pro',
        stripe_subscription_id: 'stripe-sub-123',
        user_id: 'test-user-id'
      });
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValueOnce(5);
      
      const updatedStatus = await subscriptionService.getSubscriptionStatus('test-user-id');
      expect(updatedStatus.isPro).toBe(true);
      expect(updatedStatus.isActive).toBe(true);
      
      // 5. Test document generation with Pro status
      const canGenerate = await subscriptionService.canGenerateDocument('test-user-id');
      expect(canGenerate.canGenerate).toBe(true);
      
      // 6. Record document usage
      const usageResult = await subscriptionService.recordDocumentUsage('test-user-id', 'worksheet', {
        subject: 'Math',
        grade: '5',
        language: 'es'
      });
      expect(usageResult.success).toBe(true);
      expect(usageResult.remainingUses).toBe(-1); // Unlimited
      
      // 7. Simulate subscription cancellation
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValueOnce({
        id: 'sub-123',
        stripe_subscription_id: 'stripe-sub-123',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        user_id: 'test-user-id'
      });
      
      const cancelResult = await subscriptionService.cancelSubscription('test-user-id');
      expect(cancelResult.success).toBe(true);
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        cancel_at_period_end: true
      });
      
      // 8. Check subscription status after cancellation
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValueOnce({
        id: 'sub-123',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: true,
        plan: 'pro',
        stripe_subscription_id: 'stripe-sub-123',
        user_id: 'test-user-id'
      });
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValueOnce(6);
      
      const statusAfterCancel = await subscriptionService.getSubscriptionStatus('test-user-id');
      expect(statusAfterCancel.isPro).toBe(true);
      expect(statusAfterCancel.subscription?.cancelAtPeriodEnd).toBe(true);
      
      // 9. Simulate subscription reactivation
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValueOnce({
        id: 'sub-123',
        stripe_subscription_id: 'stripe-sub-123',
        cancel_at_period_end: true,
        user_id: 'test-user-id'
      });
      
      const reactivateResult = await subscriptionService.reactivateSubscription('test-user-id');
      expect(reactivateResult.success).toBe(true);
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        cancel_at_period_end: false
      });
    });
  });

  describe('Webhook Event Processing', () => {
    it('should handle Stripe webhook events correctly', async () => {
      // Mock existing subscription
      const mockSubscription = {
        id: 'sub-123',
        user_id: 'test-user-id',
        stripe_subscription_id: 'stripe-sub-123'
      };
      
      vi.mocked(databaseService.getSubscriptionByStripeId).mockResolvedValue(mockSubscription);
      
      // Test subscription update event
      const updateData = {
        id: 'stripe-sub-123',
        status: 'active',
        current_period_end: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60,
        cancel_at_period_end: false
      };
      
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.updated', updateData);
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'active',
        current_period_end: expect.any(Date),
        cancel_at_period_end: false
      });
      
      // Test payment success event
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'invoice.payment_succeeded', {});
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'active'
      });
      
      // Test payment failure event
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'invoice.payment_failed', {});
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'past_due'
      });
      
      // Test subscription deletion event
      await subscriptionService.handleStripeEvent('stripe-sub-123', 'customer.subscription.deleted', {});
      expect(databaseService.updateSubscription).toHaveBeenCalledWith('stripe-sub-123', {
        status: 'canceled'
      });
    });
  });

  describe('Data Persistence', () => {
    it('should verify data persistence across sessions', async () => {
      // 1. Setup: User is authenticated and has a subscription
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValueOnce({
        id: 'sub-123',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: false,
        plan: 'pro',
        stripe_subscription_id: 'stripe-sub-123',
        user_id: 'test-user-id'
      });
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValueOnce(5);
      
      // 2. Check subscription status in current session
      const initialStatus = await subscriptionService.getSubscriptionStatus('test-user-id');
      expect(initialStatus.isPro).toBe(true);
      
      // 3. Simulate logging out
      authService.logout();
      expect(localStorageMock.getItem('listosAppAuthToken')).toBeNull();
      
      // 4. Simulate logging back in
      localStorageMock.setItem('listosAppAuthToken', 'new-valid-token');
      localStorageMock.setItem('listosAppAuthExpiry', (Date.now() + 3600000).toString());
      
      // 5. Verify subscription status persists after re-login
      vi.mocked(databaseService.getActiveSubscription).mockResolvedValueOnce({
        id: 'sub-123',
        status: 'active',
        current_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancel_at_period_end: false,
        plan: 'pro',
        stripe_subscription_id: 'stripe-sub-123',
        user_id: 'test-user-id'
      });
      vi.mocked(databaseService.getUserUsageCount).mockResolvedValueOnce(5);
      
      const statusAfterRelogin = await subscriptionService.getSubscriptionStatus('test-user-id');
      expect(statusAfterRelogin.isPro).toBe(true);
      expect(statusAfterRelogin.isActive).toBe(true);
      expect(statusAfterRelogin.subscription?.id).toBe('sub-123');
    });
  });
});