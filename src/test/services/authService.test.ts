import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import authService from '../../../services/authService';

// Mock dependencies
vi.mock('../../../services/databaseService.js', () => ({
  default: {
    getDb: vi.fn(() => ({
      fn: {
        now: vi.fn(() => new Date())
      },
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
        }))
      }
    }))
  }
}));

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

// Mock Google Identity Services
const mockGoogle = {
  accounts: {
    id: {
      initialize: vi.fn(),
      renderButton: vi.fn(),
      disableAutoSelect: vi.fn()
    }
  }
};

Object.defineProperty(window, 'google', { value: mockGoogle });

describe('AuthService', () => {
  beforeEach(() => {
    localStorageMock.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('initGoogleAuth', () => {
    it('should initialize Google Auth with correct parameters', async () => {
      const clientId = 'test-client-id';
      const callback = vi.fn();
      
      await authService.initGoogleAuth(clientId, callback);
      
      expect(mockGoogle.accounts.id.initialize).toHaveBeenCalledWith({
        client_id: clientId,
        callback
      });
    });

    it('should handle case when Google Identity Services is not available', async () => {
      const originalGoogle = window.google;
      // @ts-ignore - Intentionally removing google for test
      window.google = undefined;
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const clientId = 'test-client-id';
      const callback = vi.fn();
      
      await authService.initGoogleAuth(clientId, callback);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google Identity Services no está disponible');
      expect(callback).not.toHaveBeenCalled();
      
      // Restore google object
      window.google = originalGoogle;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('renderGoogleButton', () => {
    it('should render Google button with default options', () => {
      const container = document.createElement('div');
      
      authService.renderGoogleButton(container);
      
      expect(mockGoogle.accounts.id.renderButton).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'outline',
          size: 'large',
          type: 'standard'
        })
      );
    });

    it('should render Google button with custom options', () => {
      const container = document.createElement('div');
      const customOptions = { theme: 'filled_blue', size: 'medium' };
      
      authService.renderGoogleButton(container, customOptions);
      
      expect(mockGoogle.accounts.id.renderButton).toHaveBeenCalledWith(
        container,
        expect.objectContaining({
          theme: 'filled_blue',
          size: 'medium'
        })
      );
    });

    it('should handle case when Google Identity Services is not available', () => {
      const originalGoogle = window.google;
      // @ts-ignore - Intentionally removing google for test
      window.google = undefined;
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const container = document.createElement('div');
      
      authService.renderGoogleButton(container);
      
      expect(consoleErrorSpy).toHaveBeenCalledWith('Google Identity Services no está disponible');
      expect(mockGoogle.accounts.id.renderButton).not.toHaveBeenCalled();
      
      // Restore google object
      window.google = originalGoogle;
      consoleErrorSpy.mockRestore();
    });
  });

  describe('processGoogleAuthResponse', () => {
    it('should process valid Google auth response', async () => {
      // Create a mock JWT token with payload
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwicGljdHVyZSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vcHJvZmlsZS5qcGciLCJleHAiOjk5OTk5OTk5OTl9.signature';
      
      const response = { credential: mockToken };
      
      const result = await authService.processGoogleAuthResponse(response);
      
      expect(result.success).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user?.id).toBe('test-user-id');
      expect(result.user?.email).toBe('test@example.com');
      expect(result.user?.is_pro).toBe(true);
    });

    it('should handle missing credential', async () => {
      const response = { };
      
      const result = await authService.processGoogleAuthResponse(response);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Token de autenticación no recibido');
    });

    it('should handle invalid JWT token', async () => {
      const response = { credential: 'invalid-token' };
      
      const result = await authService.processGoogleAuthResponse(response);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('No se pudo decodificar el token');
    });

    it('should handle database error when saving user', async () => {
      // Create a mock JWT token with payload
      const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ0ZXN0LXVzZXItaWQiLCJlbWFpbCI6InRlc3RAZXhhbXBsZS5jb20iLCJuYW1lIjoiVGVzdCBVc2VyIiwicGljdHVyZSI6Imh0dHBzOi8vZXhhbXBsZS5jb20vcHJvZmlsZS5qcGciLCJleHAiOjk5OTk5OTk5OTl9.signature';
      
      const response = { credential: mockToken };
      
      // Mock database error
      const db = vi.mocked(authService['db']);
      const usersWhere = vi.fn(() => ({
        first: vi.fn(() => Promise.reject(new Error('Database error')))
      }));
      db.users = { where: usersWhere };
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await authService.processGoogleAuthResponse(response);
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Error al procesar la autenticación');
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('getUserWithSubscription', () => {
    it('should return user with subscription when user exists', async () => {
      const userId = 'test-user-id';
      
      const result = await authService.getUserWithSubscription(userId);
      
      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-user-id');
      expect(result?.email).toBe('test@example.com');
      expect(result?.is_pro).toBe(true);
      expect(result?.subscription).toBeDefined();
    });

    it('should return null when user does not exist', async () => {
      const userId = 'non-existent-user';
      
      // Mock user not found
      const db = vi.mocked(authService['db']);
      const usersWhere = vi.fn(() => ({
        first: vi.fn(() => Promise.resolve(null))
      }));
      db.users = { where: usersWhere };
      
      const result = await authService.getUserWithSubscription(userId);
      
      expect(result).toBeNull();
    });

    it('should handle database error', async () => {
      const userId = 'test-user-id';
      
      // Mock database error
      const db = vi.mocked(authService['db']);
      const usersWhere = vi.fn(() => ({
        first: vi.fn(() => Promise.reject(new Error('Database error')))
      }));
      db.users = { where: usersWhere };
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      const result = await authService.getUserWithSubscription(userId);
      
      expect(result).toBeNull();
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });

  describe('isAuthenticated', () => {
    it('should return false when no token exists', () => {
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return false when token is expired', () => {
      localStorageMock.setItem('listosAppAuthToken', 'expired-token');
      localStorageMock.setItem('listosAppAuthExpiry', (Date.now() - 1000).toString());
      
      expect(authService.isAuthenticated()).toBe(false);
    });

    it('should return true when valid token exists', () => {
      localStorageMock.setItem('listosAppAuthToken', 'valid-token');
      localStorageMock.setItem('listosAppAuthExpiry', (Date.now() + 3600000).toString());
      
      expect(authService.isAuthenticated()).toBe(true);
    });

    it('should return false when expiry is not a valid number', () => {
      localStorageMock.setItem('listosAppAuthToken', 'valid-token');
      localStorageMock.setItem('listosAppAuthExpiry', 'not-a-number');
      
      expect(authService.isAuthenticated()).toBe(false);
    });
  });

  describe('logout', () => {
    it('should clear auth tokens and disable auto select', () => {
      localStorageMock.setItem('listosAppAuthToken', 'token');
      localStorageMock.setItem('listosAppAuthExpiry', '123456789');
      
      authService.logout();
      
      expect(localStorageMock.getItem('listosAppAuthToken')).toBeNull();
      expect(localStorageMock.getItem('listosAppAuthExpiry')).toBeNull();
      expect(mockGoogle.accounts.id.disableAutoSelect).toHaveBeenCalled();
    });

    it('should handle case when Google Identity Services is not available', () => {
      localStorageMock.setItem('listosAppAuthToken', 'token');
      localStorageMock.setItem('listosAppAuthExpiry', '123456789');
      
      const originalGoogle = window.google;
      // @ts-ignore - Intentionally removing google for test
      window.google = undefined;
      
      authService.logout();
      
      expect(localStorageMock.getItem('listosAppAuthToken')).toBeNull();
      expect(localStorageMock.getItem('listosAppAuthExpiry')).toBeNull();
      
      // Restore google object
      window.google = originalGoogle;
    });
  });

  describe('getAuthToken', () => {
    it('should return null when not authenticated', () => {
      expect(authService.getAuthToken()).toBeNull();
    });

    it('should return token when authenticated', () => {
      localStorageMock.setItem('listosAppAuthToken', 'valid-token');
      localStorageMock.setItem('listosAppAuthExpiry', (Date.now() + 3600000).toString());
      
      expect(authService.getAuthToken()).toBe('valid-token');
    });
  });

  describe('saveUserToDatabase', () => {
    it('should update existing user', async () => {
      const userProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/profile.jpg',
        idToken: 'test-token'
      };
      
      // Mock existing user
      const db = vi.mocked(authService['db']);
      const usersWhere = vi.fn(() => ({
        first: vi.fn(() => Promise.resolve({ id: 'test-user-id' }))
      }));
      const usersUpdate = vi.fn(() => Promise.resolve());
      db.users = { 
        where: usersWhere,
        update: usersUpdate
      };
      
      // Use private method through any casting
      await (authService as any).saveUserToDatabase(userProfile);
      
      expect(usersUpdate).toHaveBeenCalled();
    });

    it('should create new user when user does not exist', async () => {
      const userProfile = {
        id: 'new-user-id',
        email: 'new@example.com',
        name: 'New User',
        picture: 'https://example.com/new-profile.jpg',
        idToken: 'new-token'
      };
      
      // Mock user not found
      const db = vi.mocked(authService['db']);
      const usersWhere = vi.fn(() => ({
        first: vi.fn(() => Promise.resolve(null))
      }));
      const usersInsert = vi.fn(() => Promise.resolve());
      db.users = { 
        where: usersWhere,
        insert: usersInsert
      };
      
      // Use private method through any casting
      await (authService as any).saveUserToDatabase(userProfile);
      
      expect(usersInsert).toHaveBeenCalled();
    });

    it('should handle database error', async () => {
      const userProfile = {
        id: 'test-user-id',
        email: 'test@example.com',
        name: 'Test User',
        picture: 'https://example.com/profile.jpg',
        idToken: 'test-token'
      };
      
      // Mock database error
      const db = vi.mocked(authService['db']);
      const usersWhere = vi.fn(() => ({
        first: vi.fn(() => Promise.reject(new Error('Database error')))
      }));
      db.users = { where: usersWhere };
      
      const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      
      // Use private method through any casting
      await expect((authService as any).saveUserToDatabase(userProfile)).rejects.toThrow();
      
      expect(consoleErrorSpy).toHaveBeenCalled();
      
      consoleErrorSpy.mockRestore();
    });
  });
});