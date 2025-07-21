/**
 * =================================================================================================
 * SERVICIO DE AUTENTICACIÓN
 * =================================================================================================
 * Este servicio maneja la autenticación de usuarios con Google y la gestión de tokens.
 * Mejora el manejo de sesiones y la seguridad de la autenticación.
 */

import { UserProfile, UserWithSubscription } from '../types';
import databaseService from './databaseService.js';

// Constantes para almacenamiento local
const AUTH_TOKEN_KEY = 'listosAppAuthToken';
const AUTH_EXPIRY_KEY = 'listosAppAuthExpiry';
const SESSION_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5 minutos en milisegundos

/**
 * Servicio para manejar la autenticación y gestión de usuarios
 */
class AuthService {
  private db: any;
  
  constructor() {
    this.db = databaseService.getDb();
  }

  /**
   * Inicializa el servicio de autenticación de Google
   * @param clientId - ID de cliente de Google
   * @param callback - Función de callback para manejar la respuesta
   * @returns Promise que se resuelve cuando la inicialización está completa
   */
  async initGoogleAuth(clientId: string, callback: (response: any) => void): Promise<void> {
    return new Promise((resolve) => {
      if (!window.google?.accounts?.id) {
        console.error('Google Identity Services no está disponible');
        resolve();
        return;
      }

      // Configurar opciones avanzadas para mejorar la seguridad y experiencia
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: callback
      });

      // Verificar si hay un token existente y si está próximo a expirar
      this.refreshTokenIfNeeded();
      
      resolve();
    });
  }

  /**
   * Renderiza el botón de inicio de sesión de Google
   * @param container - Elemento DOM donde renderizar el botón
   * @param options - Opciones de personalización del botón
   */
  renderGoogleButton(container: HTMLElement, options: any = {}): void {
    if (!window.google?.accounts?.id) {
      console.error('Google Identity Services no está disponible');
      return;
    }

    const defaultOptions = {
      theme: 'outline',
      size: 'large',
      type: 'standard',
      text: 'continue_with',
      shape: 'pill',
      width: 280
    };

    window.google.accounts.id.renderButton(
      container,
      { ...defaultOptions, ...options }
    );
  }

  /**
   * Procesa la respuesta de autenticación de Google
   * @param response - Respuesta de Google que contiene el token ID
   * @returns Objeto con el perfil de usuario y estado de la operación
   */
  async processGoogleAuthResponse(response: any): Promise<{ 
    user: UserWithSubscription | null, 
    success: boolean, 
    message?: string 
  }> {
    try {
      const idToken = response.credential;
      if (!idToken) {
        return { user: null, success: false, message: 'Token de autenticación no recibido' };
      }

      // Decodificar el token para obtener información del usuario
      const userObject = this.decodeJwt(idToken);
      if (!userObject) {
        return { user: null, success: false, message: 'No se pudo decodificar el token' };
      }

      // Crear objeto de perfil de usuario
      const userProfile: UserProfile = {
        id: userObject.sub,
        email: userObject.email,
        name: userObject.name,
        picture: userObject.picture,
        idToken: idToken,
      };

      // Guardar el token con tiempo de expiración
      this.saveAuthToken(idToken, userObject.exp * 1000);

      // Actualizar o crear usuario en la base de datos
      await this.saveUserToDatabase(userProfile);

      // Obtener información completa del usuario con su suscripción
      const userWithSubscription = await this.getUserWithSubscription(userProfile.id);

      return { 
        user: userWithSubscription, 
        success: true 
      };
    } catch (error) {
      console.error('Error al procesar la autenticación:', error);
      return { 
        user: null, 
        success: false, 
        message: 'Error al procesar la autenticación' 
      };
    }
  }

  /**
   * Guarda el usuario en la base de datos
   * @param userProfile - Perfil del usuario a guardar
   */
  private async saveUserToDatabase(userProfile: UserProfile): Promise<void> {
    try {
      // Verificar si el usuario ya existe
      const existingUser = await this.db('users').where({ id: userProfile.id }).first();
      
      if (existingUser) {
        // Actualizar último inicio de sesión
        await this.db('users')
          .where({ id: userProfile.id })
          .update({ 
            last_login: this.db.fn.now(),
            name: userProfile.name,
            picture: userProfile.picture
          });
      } else {
        // Crear nuevo usuario
        await this.db('users').insert({
          id: userProfile.id,
          email: userProfile.email,
          name: userProfile.name,
          picture: userProfile.picture,
          created_at: this.db.fn.now(),
          last_login: this.db.fn.now(),
          role: 'user',
          worksheet_count: 0
        });
      }
    } catch (error) {
      console.error('Error al guardar usuario en la base de datos:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario con su información de suscripción
   * @param userId - ID del usuario
   * @returns Usuario con información de suscripción
   */
  async getUserWithSubscription(userId: string): Promise<UserWithSubscription | null> {
    try {
      // Obtener usuario de la base de datos
      const user = await this.db('users').where({ id: userId }).first();
      
      if (!user) {
        return null;
      }

      // Obtener suscripción activa si existe
      const subscription = await this.db('subscriptions')
        .where({ 
          user_id: userId,
          status: 'active'
        })
        .orderBy('created_at', 'desc')
        .first();

      // Obtener token de autenticación almacenado
      const idToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';

      // Crear objeto de usuario con suscripción
      const userWithSubscription: UserWithSubscription = {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || '',
        idToken: idToken,
        subscription: subscription || undefined,
        is_pro: !!subscription
      };

      return userWithSubscription;
    } catch (error) {
      console.error('Error al obtener usuario con suscripción:', error);
      return null;
    }
  }

  /**
   * Cierra la sesión del usuario actual
   */
  logout(): void {
    // Eliminar tokens de autenticación
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_EXPIRY_KEY);
    
    // Desactivar selección automática de Google para permitir cambio de cuentas
    if (window.google?.accounts?.id) {
      window.google.accounts.id.disableAutoSelect();
    }
  }

  /**
   * Verifica si hay un usuario autenticado actualmente
   * @returns true si hay un usuario autenticado
   */
  isAuthenticated(): boolean {
    const token = localStorage.getItem(AUTH_TOKEN_KEY);
    const expiry = localStorage.getItem(AUTH_EXPIRY_KEY);
    
    if (!token || !expiry) {
      return false;
    }
    
    // Verificar si el token ha expirado
    const expiryTime = parseInt(expiry, 10);
    return Date.now() < expiryTime;
  }

  /**
   * Obtiene el token de autenticación actual
   * @returns Token de autenticación o null si no hay sesión
   */
  getAuthToken(): string | null {
    if (!this.isAuthenticated()) {
      return null;
    }
    
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }

  /**
   * Guarda el token de autenticación con su tiempo de expiración
   * @param token - Token de autenticación
   * @param expiryTime - Tiempo de expiración en milisegundos (timestamp)
   */
  private saveAuthToken(token: string, expiryTime: number): void {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
    localStorage.setItem(AUTH_EXPIRY_KEY, expiryTime.toString());
  }

  /**
   * Refresca el token si está próximo a expirar
   */
  private refreshTokenIfNeeded(): void {
    if (!this.isAuthenticated()) {
      return;
    }
    
    const expiry = parseInt(localStorage.getItem(AUTH_EXPIRY_KEY) || '0', 10);
    const timeToExpiry = expiry - Date.now();
    
    // Si el token expira en menos del umbral, intentar refrescarlo
    if (timeToExpiry < SESSION_REFRESH_THRESHOLD) {
      // El token está próximo a expirar, se podría implementar refresh automático aquí
      console.log('Token próximo a expirar, considerar renovación');
    }
  }

  /**
   * Decodifica un token JWT
   * @param token - Token JWT a decodificar
   * @returns Payload del token decodificado o null si hay error
   */
  private decodeJwt(token: string): any {
    try {
      const base64Url = token.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      console.error('Error al decodificar JWT:', error);
      return null;
    }
  }
}

// Exportamos una instancia del servicio
const authService = new AuthService();
export default authService;