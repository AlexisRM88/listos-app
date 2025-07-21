/**
 * =================================================================================================
 * SERVICIO DE GESTIÓN DE USUARIOS
 * =================================================================================================
 * Este servicio maneja la gestión de usuarios, incluyendo la creación, actualización y recuperación
 * de perfiles de usuario, así como la migración de datos desde localStorage a la base de datos SQL.
 */

import { DbUser, UserProfile, UserWithSubscription } from '../types';
import databaseService from './databaseService.js';
import authService from './authService';

// Constantes para almacenamiento local
const USER_PROFILE_KEY = 'listosAppUserProfile';
const PRO_STATUS_KEY = 'listosAppIsPro';
const WORKSHEET_COUNTS_KEY = 'listosAppWorksheetCounts';

/**
 * Servicio para la gestión de usuarios
 */
class UserService {
  private db: any;
  
  constructor() {
    this.db = databaseService.getDb();
  }

  /**
   * Obtiene un usuario por su ID
   * @param userId - ID del usuario
   * @returns Usuario o null si no existe
   */
  async getUserById(userId: string): Promise<DbUser | null> {
    try {
      return await this.db('users').where({ id: userId }).first();
    } catch (error) {
      console.error('Error al obtener usuario por ID:', error);
      return null;
    }
  }

  /**
   * Obtiene un usuario por su email
   * @param email - Email del usuario
   * @returns Usuario o null si no existe
   */
  async getUserByEmail(email: string): Promise<DbUser | null> {
    try {
      return await this.db('users').where({ email }).first();
    } catch (error) {
      console.error('Error al obtener usuario por email:', error);
      return null;
    }
  }

  /**
   * Crea o actualiza un perfil de usuario
   * @param userProfile - Perfil del usuario a crear o actualizar
   * @returns Usuario actualizado o null si hay error
   */
  async createOrUpdateUser(userProfile: UserProfile): Promise<DbUser | null> {
    try {
      const { id, email, name, picture } = userProfile;
      
      // Verificar si el usuario ya existe
      const existingUser = await this.getUserById(id);
      
      if (existingUser) {
        // Actualizar usuario existente
        await this.db('users')
          .where({ id })
          .update({
            name,
            picture,
            last_login: this.db.fn.now()
          });
          
        return await this.getUserById(id);
      } else {
        // Crear nuevo usuario
        await this.db('users').insert({
          id,
          email,
          name,
          picture,
          created_at: this.db.fn.now(),
          last_login: this.db.fn.now(),
          role: 'user',
          worksheet_count: 0
        });
        
        return await this.getUserById(id);
      }
    } catch (error) {
      console.error('Error al crear o actualizar usuario:', error);
      return null;
    }
  }

  /**
   * Incrementa el contador de hojas de trabajo para un usuario
   * @param userId - ID del usuario
   * @returns Nuevo contador o -1 si hay error
   */
  async incrementWorksheetCount(userId: string): Promise<number> {
    try {
      // Obtener usuario actual
      const user = await this.getUserById(userId);
      if (!user) {
        return -1;
      }
      
      // Incrementar contador
      const newCount = (user.worksheet_count || 0) + 1;
      
      // Actualizar en la base de datos
      await this.db('users')
        .where({ id: userId })
        .update({ worksheet_count: newCount });
        
      return newCount;
    } catch (error) {
      console.error('Error al incrementar contador de hojas:', error);
      return -1;
    }
  }

  /**
   * Migra los datos de usuario desde localStorage a la base de datos SQL
   * @param userId - ID del usuario actual
   * @returns true si la migración fue exitosa
   */
  async migrateUserDataFromLocalStorage(userId: string): Promise<boolean> {
    try {
      // Verificar si el usuario existe en la base de datos
      const dbUser = await this.getUserById(userId);
      if (!dbUser) {
        console.error('Usuario no encontrado en la base de datos para migración');
        return false;
      }
      
      // Obtener datos de localStorage
      const allProStatus = JSON.parse(localStorage.getItem(PRO_STATUS_KEY) || '{}');
      const isPro = allProStatus[userId] || false;
      
      const allCounts = JSON.parse(localStorage.getItem(WORKSHEET_COUNTS_KEY) || '{}');
      const worksheetCount = allCounts[userId] || 0;
      
      // Actualizar contador de hojas en la base de datos si es mayor que el actual
      if (worksheetCount > dbUser.worksheet_count) {
        await this.db('users')
          .where({ id: userId })
          .update({ worksheet_count: worksheetCount });
      }
      
      // Si el usuario era Pro en localStorage, crear una suscripción en la base de datos
      if (isPro) {
        const existingSubscription = await this.db('subscriptions')
          .where({ 
            user_id: userId,
            status: 'active'
          })
          .first();
          
        if (!existingSubscription) {
          // Crear suscripción con datos básicos
          await this.db('subscriptions').insert({
            user_id: userId,
            status: 'active',
            created_at: this.db.fn.now(),
            plan: 'pro',
            cancel_at_period_end: false
          });
        }
      }
      
      return true;
    } catch (error) {
      console.error('Error al migrar datos de usuario desde localStorage:', error);
      return false;
    }
  }

  /**
   * Obtiene el perfil completo de un usuario con su estado de suscripción
   * @param userId - ID del usuario
   * @returns Usuario con información de suscripción o null si hay error
   */
  async getUserProfile(userId: string): Promise<UserWithSubscription | null> {
    try {
      // Obtener usuario de la base de datos
      const user = await this.getUserById(userId);
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
      
      // Obtener token de autenticación
      const idToken = authService.getAuthToken() || '';
      
      // Crear objeto de usuario con suscripción
      const userWithSubscription: UserWithSubscription = {
        id: user.id,
        email: user.email,
        name: user.name,
        picture: user.picture || '',
        idToken,
        subscription: subscription || undefined,
        is_pro: !!subscription
      };
      
      return userWithSubscription;
    } catch (error) {
      console.error('Error al obtener perfil de usuario:', error);
      return null;
    }
  }

  /**
   * Actualiza el rol de un usuario
   * @param userId - ID del usuario
   * @param role - Nuevo rol ('user' o 'admin')
   * @returns true si la actualización fue exitosa
   */
  async updateUserRole(userId: string, role: 'user' | 'admin'): Promise<boolean> {
    try {
      await this.db('users')
        .where({ id: userId })
        .update({ role });
        
      return true;
    } catch (error) {
      console.error('Error al actualizar rol de usuario:', error);
      return false;
    }
  }

  /**
   * Elimina los datos de localStorage después de migrarlos
   * @param userId - ID del usuario
   */
  cleanupLocalStorage(userId: string): void {
    try {
      // Obtener datos actuales
      const allProStatus = JSON.parse(localStorage.getItem(PRO_STATUS_KEY) || '{}');
      const allCounts = JSON.parse(localStorage.getItem(WORKSHEET_COUNTS_KEY) || '{}');
      
      // Eliminar datos del usuario específico
      delete allProStatus[userId];
      delete allCounts[userId];
      
      // Guardar datos actualizados
      localStorage.setItem(PRO_STATUS_KEY, JSON.stringify(allProStatus));
      localStorage.setItem(WORKSHEET_COUNTS_KEY, JSON.stringify(allCounts));
    } catch (error) {
      console.error('Error al limpiar localStorage:', error);
    }
  }
}

// Exportamos una instancia del servicio
const userService = new UserService();
export default userService;