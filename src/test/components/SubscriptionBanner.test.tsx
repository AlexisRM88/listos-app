import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import SubscriptionBanner from '../../../components/SubscriptionBanner';
import subscriptionService from '../../../services/subscriptionService';

// Mock the subscription service
vi.mock('../../../services/subscriptionService', () => ({
  default: {
    getSubscriptionStatus: vi.fn(),
    canGenerateDocument: vi.fn()
  }
}));

describe('SubscriptionBanner', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should display free tier information for non-pro users', async () => {
    // Mock subscription status for free user
    vi.mocked(subscriptionService.getSubscriptionStatus).mockResolvedValue({
      isActive: false,
      isPro: false,
      usage: {
        current: 1,
        limit: 2,
        unlimited: false
      }
    });

    render(<SubscriptionBanner userId="user-123" onUpgradeClick={vi.fn()} />);
    
    // Wait for async operations
    expect(await screen.findByText(/Plan Gratuito/i)).toBeInTheDocument();
    expect(await screen.findByText(/1 de 2 documentos/i)).toBeInTheDocument();
    expect(await screen.findByText(/Actualizar a Pro/i)).toBeInTheDocument();
  });

  it('should display pro tier information for pro users', async () => {
    // Mock subscription status for pro user
    vi.mocked(subscriptionService.getSubscriptionStatus).mockResolvedValue({
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

    render(<SubscriptionBanner userId="user-123" onUpgradeClick={vi.fn()} />);
    
    // Wait for async operations
    expect(await screen.findByText(/Plan Pro/i)).toBeInTheDocument();
    expect(await screen.findByText(/Documentos ilimitados/i)).toBeInTheDocument();
    expect(screen.queryByText(/Actualizar a Pro/i)).not.toBeInTheDocument();
  });

  it('should display cancellation notice for users who have cancelled', async () => {
    // Mock subscription status for user who has cancelled
    vi.mocked(subscriptionService.getSubscriptionStatus).mockResolvedValue({
      isActive: true,
      isPro: true,
      subscription: {
        id: 'sub-123',
        status: 'active',
        currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        cancelAtPeriodEnd: true,
        plan: 'pro'
      },
      usage: {
        current: 10,
        limit: -1,
        unlimited: true
      }
    });

    render(<SubscriptionBanner userId="user-123" onUpgradeClick={vi.fn()} />);
    
    // Wait for async operations
    expect(await screen.findByText(/Plan Pro/i)).toBeInTheDocument();
    expect(await screen.findByText(/Tu suscripción finalizará el/i)).toBeInTheDocument();
    expect(await screen.findByText(/Reactivar suscripción/i)).toBeInTheDocument();
  });

  it('should call onUpgradeClick when upgrade button is clicked', async () => {
    // Mock subscription status for free user
    vi.mocked(subscriptionService.getSubscriptionStatus).mockResolvedValue({
      isActive: false,
      isPro: false,
      usage: {
        current: 1,
        limit: 2,
        unlimited: false
      }
    });

    const mockUpgradeClick = vi.fn();
    render(<SubscriptionBanner userId="user-123" onUpgradeClick={mockUpgradeClick} />);
    
    // Wait for button to appear and click it
    const upgradeButton = await screen.findByText(/Actualizar a Pro/i);
    fireEvent.click(upgradeButton);
    
    expect(mockUpgradeClick).toHaveBeenCalledTimes(1);
  });

  it('should handle loading state', async () => {
    // Mock a delayed response to simulate loading
    vi.mocked(subscriptionService.getSubscriptionStatus).mockImplementation(
      () => new Promise(resolve => setTimeout(() => resolve({
        isActive: false,
        isPro: false,
        usage: {
          current: 1,
          limit: 2,
          unlimited: false
        }
      }), 100))
    );

    render(<SubscriptionBanner userId="user-123" onUpgradeClick={vi.fn()} />);
    
    // Check for loading indicator
    expect(screen.getByText(/Cargando.../i)).toBeInTheDocument();
    
    // Wait for content to load
    expect(await screen.findByText(/Plan Gratuito/i)).toBeInTheDocument();
  });

  it('should handle error state', async () => {
    // Mock an error response
    vi.mocked(subscriptionService.getSubscriptionStatus).mockRejectedValue(
      new Error('Failed to fetch subscription status')
    );

    render(<SubscriptionBanner userId="user-123" onUpgradeClick={vi.fn()} />);
    
    // Wait for error message
    expect(await screen.findByText(/Error al cargar información de suscripción/i)).toBeInTheDocument();
  });
});