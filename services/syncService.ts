/**
 * =================================================================================================
 * SERVICIO DE SINCRONIZACIÓN
 * =================================================================================================
 * Este servicio maneja la sincronización de estado entre dispositivos, asegurando que los datos
 * del usuario sean consistentes en todas las sesiones.
 */

import { UserWithSubscription } from '../types';
import authService from './authService';
import userService from './userService';
import databaseService from './databaseService.js';

// Constantes para almacenamiento local
const SYNC_TIMESTAMP_KEY = 'listosAppSyncTimestamp';
const SYNC_DEVICE_ID_KEY = 'listosAppDeviceId';
const SYNC_INTERVAL = 30 * 1000; // 30 segundos en milisegundos

/**
 * Servicio para la sincronización de estado entre dispositivos
 */
class SyncService {
  private syncInterval: number | null = null;
  private db: any;
  private deviceId: string;
  
  constructor() {
    this.db = databaseService.getDb();
    this.deviceId = this.getOrCreateDeviceId();
  }
  
  /**
   * Inicia el servicio de sincronización
   * @param userId - ID del usuario
   */
  startSync(userId: string): void {
    // Detener sincronización existente si hay una
    this.stopSync();
    
    // Realizar sincronización inicial
    this.syncState(userId);
    
    // Configurar sincronización periódica
    this.syncInterval = window.setInterval(() => {
      this.syncState(userId);
    }, SYNC_INTERVAL);
  }
  
  /**
   * Detiene el servicio de sincronización
   */
  stopSync(): void {
    if (this.syncInterval !== null) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
  }
  
  /**
   * Sincroniza el estado del usuario entre dispositivos
   * @param userId - ID del usuario
   */
  async syncState(userId: string): Promise<void> {
    try {
      // Verificar autenticación
      if (!authService.isAuthenticated()) {
        this.stopSync();
        return;
      }
      
      // Obtener timestamp de última sincronización
      const lastSyncTimestamp = this.getLastSyncTimestamp();
      
      // Obtener cambios desde la última sincronización
      const changes = await this.getChangesSinceLastSync(userId, lastSyncTimestamp);
      
      // Aplicar cambios si hay alguno
      if (changes) {
        await this.applyChanges(changes);
      }
      
      // Actualizar timestamp de sincronización
      this.updateSyncTimestamp();
    } catch (error) {
      console.error('Error al sincronizar estado:', error);
    }
  }
  
  /**
   * Obtiene cambios desde la última sincronización
   * @param userId - ID del usuario
   * @param lastSyncTimestamp - Timestamp de última sincronización
   * @returns Cambios desde la última sincronización
   */
  private async getChangesSinceLastSync(userId: string, lastSyncTimestamp: number): Promise<any> {
    try {
      // Verificar si hay cambios en la suscripción
      const subscriptionChanges = await this.db('subscriptions')
        .where({ user_id: userId })
        .where('updated_at', '>', new Date(lastSyncTimestamp))
        .orderBy('updated_at', 'desc')
        .first();
      
      // Verificar si hay cambios en el perfil de usuario
      const userChanges = await this.db('users')
        .where({ id: userId })
        .where('last_login', '>', new Date(lastSyncTimestamp))
        .first();
      
      // Si no hay cambios, retornar null
      if (!subscriptionChanges && !userChanges) {
        return null;
      }
      
      // Retornar cambios
      return {
        subscription: subscriptionChanges,
        user: userChanges
      };
    } catch (error) {
      console.error('Error al obtener cambios:', error);
      return null;
    }
  }
  
  /**
   * Aplica cambios al estado local
   * @param changes - Cambios a aplicar
   */
  private async applyChanges(changes: any): Promise<void> {
    try {
      // Si hay cambios en la suscripción, actualizar estado Pro
      if (changes.subscription) {
        const isPro = changes.subscription.status === 'active';
        // No es necesario hacer nada aquí, ya que el estado se obtiene directamente
        // de la base de datos cuando se necesita
      }
      
      // Si hay cambios en el perfil de usuario, actualizar datos locales
      if (changes.user) {
        // No es necesario hacer nada aquí, ya que los datos se obtienen directamente
        // de la base de datos cuando se necesitan
      }
    } catch (error) {
      console.error('Error al aplicar cambios:', error);
    }
  }
  
  /**
   * Maneja conflictos de datos entre dispositivos
   * @param userId - ID del usuario
   */
  async handleConflicts(userId: string): Promise<void> {
    try {
      // En caso de conflicto, la base de datos siempre tiene prioridad
      // Simplemente sincronizamos el estado actual
      await this.syncState(userId);
    } catch (error) {
      console.error('Error al manejar conflictos:', error);
    }
  }
  
  /**
   * Obtiene o crea un ID de dispositivo único
   * @returns ID de dispositivo
   */
  private getOrCreateDeviceId(): string {
    let deviceId = localStorage.getItem(SYNC_DEVICE_ID_KEY);
    
    if (!deviceId) {
      deviceId = this.generateDeviceId();
      localStorage.setItem(SYNC_DEVICE_ID_KEY, deviceId);
    }
    
    return deviceId;
  }
  
  /**
   * Genera un ID de dispositivo único
   * @returns ID de dispositivo generado
   */
  private generateDeviceId(): string {
    return 'device_' + Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }
  
  /**
   * Obtiene el timestamp de última sincronización
   * @returns Timestamp de última sincronización
   */
  private getLastSyncTimestamp(): number {
    const timestamp = localStorage.getItem(SYNC_TIMESTAMP_KEY);
    return timestamp ? parseInt(timestamp, 10) : 0;
  }
  
  /**
   * Actualiza el timestamp de sincronización
   */
  private updateSyncTimestamp(): void {
    localStorage.setItem(SYNC_TIMESTAMP_KEY, Date.now().toString());
  }
  
  /**
   * Registra una sesión activa para el usuario
   * @param userId - ID del usuario
   */
  async registerActiveSession(userId: string): Promise<void> {
    try {
      // Registrar sesión activa en la base de datos
      await this.db('active_sessions').insert({
        user_id: userId,
        device_id: this.deviceId,
        last_active: this.db.fn.now()
      }).onConflict(['user_id', 'device_id'])
        .merge({ last_active: this.db.fn.now() });
    } catch (error) {
      console.error('Error al registrar sesión activa:', error);
    }
  }
  
  /**
   * Elimina una sesión activa para el usuario
   * @param userId - ID del usuario
   */
  async removeActiveSession(userId: string): Promise<void> {
    try {
      // Eliminar sesión activa de la base de datos
      await this.db('active_sessions')
        .where({ 
          user_id: userId,
          device_id: this.deviceId
        })
        .delete();
    } catch (error) {
      console.error('Error al eliminar sesión activa:', error);
    }
  }
}

// Exportamos una instancia del servicio
const syncService = new SyncService();
export default syncService;