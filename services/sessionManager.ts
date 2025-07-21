/**
 * =================================================================================================
 * SERVICIO DE GESTIÓN DE SESIONES
 * =================================================================================================
 * Este servicio maneja la sincronización de sesiones entre dispositivos y la gestión del estado
 * de la aplicación. Reemplaza la implementación anterior basada en localStorage con una solución
 * que utiliza la base de datos SQL para persistencia y sincronización.
 */

import { UserProfile, UserWithSubscription } from '../types';
import authService from './authService';
import userService from './userService';
import databaseService from './databaseService.js';

// Constantes para almacenamiento local
const SESSION_SYNC_TIMESTAMP_KEY = 'listosAppLastSync';
const SESSION_SYNC_INTERVAL = 60 * 1000; // 1 minuto en milisegundos

/**
 * Interfaz para los datos de sesión
 */
interface SessionData {
  userProfile: UserWithSubscription | null;
  isPro: boolean;
  worksheetCount: number;
}

/**
 * Servicio para la gestión de sesiones
 */
class SessionManager {
  private syncInterval: number | null = null;
  private db: any;
  
  constructor() {
    this.db = databaseService.getDb();
  }
  
  /**
   * Carga todos los datos de sesión para un usuario
   * @returns Datos de sesión del usuario
   */
  async loadSession(): Promise<SessionData> {
    try {
      // Verificar si hay un usuario autenticado
      if (!authService.isAuthenticated()) {
        return { userProfile: null, isPro: false, worksheetCount: 0 };
      }
      
      // Obtener token de autenticación
      const token = authService.getAuthToken();
      if (!token) {
        return { userProfile: null, isPro: false, worksheetCount: 0 };
      }
      
      // Decodificar token para obtener ID de usuario
      const decodedToken = this.decodeJwt(token);
      if (!decodedToken || !decodedToken.sub) {
        return { userProfile: null, isPro: false, worksheetCount: 0 };
      }
      
      const userId = decodedToken.sub;
      
      // Obtener perfil de usuario con suscripción
      const userProfile = await userService.getUserProfile(userId);
      if (!userProfile) {
        return { userProfile: null, isPro: false, worksheetCount: 0 };
      }
      
      // Obtener contador de hojas de trabajo
      const user = await userService.getUserById(userId);
      const worksheetCount = user?.worksheet_count || 0;
      
      // Determinar si el usuario es Pro
      const isPro = !!userProfile.subscription;
      
      // Iniciar sincronización periódica
      this.startSyncInterval(userId);
      
      return { userProfile, isPro, worksheetCount };
    } catch (error) {
      console.error('Error al cargar sesión:', error);
      return { userProfile: null, isPro: false, worksheetCount: 0 };
    }
  }
  
  /**
   * Guarda el perfil de usuario y carga sus datos asociados
   * @param user - Perfil de usuario a guardar
   * @returns Estado Pro y contador de hojas del usuario
   */
  async saveSession(user: UserProfile): Promise<{ isPro: boolean, worksheetCount: number }> {
    try {
      // Crear o actualizar usuario en la base de datos
      await userService.createOrUpdateUser(user);
      
      // Migrar datos de localStorage si existen
      await userService.migrateUserDataFromLocalStorage(user.id);
      
      // Cargar datos actualizados
      const { isPro, worksheetCount } = await this.loadSession();
      
      // Iniciar sincronización periódica
      this.startSyncInterval(user.id);
      
      return { isPro, worksheetCount };
    } catch (error) {
      console.error('Error al guardar sesión:', error);
      return { isPro: false, worksheetCount: 0 };
    }
  }
  
  /**
   * Limpia todos los datos de sesión
   */
  clearSession(): void {
    // Detener sincronización periódica
    this.stopSyncInterval();
    
    // Cerrar sesión en el servicio de autenticación
    authService.logout();
  }
  
  /**
   * Actualiza el estado Pro de un usuario
   * @param userId - ID del usuario
   * @param isPro - Nuevo estado Pro
   * @returns Nuevo estado Pro
   */
  async setUserAsPro(userId: string, isPro: boolean): Promise<boolean> {
    try {
      if (isPro) {
        // Crear suscripción si no existe
        const subscription = await this.db('subscriptions')
          .where({ 
            user_id: userId,
            status: 'active'
          })
          .first();
          
        if (!subscription) {
          await this.db('subscriptions').insert({
            user_id: userId,
            status: 'active',
            created_at: this.db.fn.now(),
            plan: 'pro',
            cancel_at_period_end: false
          });
        }
      } else {
        // Cancelar suscripciones activas
        await this.db('subscriptions')
          .where({ 
            user_id: userId,
            status: 'active'
          })
          .update({ 
            status: 'canceled',
            cancel_at_period_end: true
          });
      }
      
      return isPro;
    } catch (error) {
      console.error('Error al actualizar estado Pro:', error);
      return false;
    }
  }
  
  /**
   * Incrementa el contador de hojas de trabajo para un usuario
   * @param userId - ID del usuario
   * @returns Nuevo contador
   */
  async incrementWorksheetCount(userId: string): Promise<number> {
    return await userService.incrementWorksheetCount(userId);
  }
  
  /**
   * Sincroniza el estado de la sesión con la base de datos
   * @param userId - ID del usuario
   */
  private async syncSessionState(userId: string): Promise<void> {
    try {
      // Actualizar timestamp de última sincronización
      localStorage.setItem(SESSION_SYNC_TIMESTAMP_KEY, Date.now().toString());
      
      // Obtener perfil actualizado
      const userProfile = await userService.getUserProfile(userId);
      
      // Si el usuario ya no existe o no está autenticado, limpiar sesión
      if (!userProfile || !authService.isAuthenticated()) {
        this.clearSession();
        return;
      }
      
      // No es necesario hacer nada más, ya que los datos se obtienen directamente
      // de la base de datos cuando se necesitan
    } catch (error) {
      console.error('Error al sincronizar estado de sesión:', error);
    }
  }
  
  /**
   * Inicia la sincronización periódica de la sesión
   * @param userId - ID del usuario
   */
  private startSyncInterval(userId: string): void {
    // Detener intervalo existente si hay uno
    this.stopSyncInterval();
    
    // Crear nuevo intervalo
    this.syncInterval = window.setInterval(() => {
      this.syncSessionState(userId);
    }, SESSION_SYNC_INTERVAL);
  }
  
  /**
   * Detiene la sincronización periódica de la sesión
   */
  private stopSyncInterval(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
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
  
  /**
   * Maneja conflictos de datos entre dispositivos
   * @param userId - ID del usuario
   */
  async handleDataConflicts(userId: string): Promise<void> {
    try {
      // En caso de conflicto, la base de datos siempre tiene prioridad
      // Simplemente sincronizamos el estado actual
      await this.syncSessionState(userId);
    } catch (error) {
      console.error('Error al manejar conflictos de datos:', error);
    }
  }
}

// Exportamos una instancia del servicio
const sessionManager = new SessionManager();
export default sessionManager;