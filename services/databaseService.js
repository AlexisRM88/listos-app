/**
 * =================================================================================================
 * SERVICIO DE BASE DE DATOS
 * =================================================================================================
 * Este servicio proporciona una interfaz para interactuar con la base de datos Cloud SQL.
 * Utiliza Knex.js como query builder para soportar múltiples bases de datos SQL.
 */

import knex from 'knex';
import dbConfig from '../db-config.js';

// Inicializar la conexión a la base de datos
const db = knex(dbConfig);

/**
 * Servicio para operaciones de base de datos
 */
class DatabaseService {
  /**
   * Verifica la conexión a la base de datos
   * @returns {Promise<boolean>} - true si la conexión es exitosa
   */
  async testConnection() {
    try {
      await db.raw('SELECT 1');
      return true;
    } catch (error) {
      console.error('Error al verificar conexión a la base de datos:', error);
      return false;
    }
  }

  /**
   * Obtiene información sobre las tablas en la base de datos
   * @returns {Promise<Array>} - Lista de tablas
   */
  async getTables() {
    try {
      // La consulta varía según el tipo de base de datos
      if (dbConfig.client === 'pg') {
        const result = await db.raw("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public'");
        return result.rows;
      } else if (dbConfig.client === 'mysql2') {
        const result = await db.raw(`SHOW TABLES FROM \`${dbConfig.connection.database}\``);
        return result[0];
      }
      return [];
    } catch (error) {
      console.error('Error al obtener tablas:', error);
      throw error;
    }
  }

  /**
   * Ejecuta una migración para crear las tablas necesarias
   * @returns {Promise<void>}
   */
  async runMigrations() {
    try {
      console.log('Iniciando migraciones de base de datos...');
      
      // Ejecutamos las migraciones
      const [batchNo, log] = await db.migrate.latest();
      
      if (log.length === 0) {
        console.log('La base de datos ya está actualizada');
      } else {
        console.log(`Batch ${batchNo} completado. ${log.length} migraciones aplicadas:`);
        log.forEach(migrationName => console.log(`- ${migrationName}`));
      }
      
      return { batchNo, log };
    } catch (error) {
      console.error('Error al ejecutar migraciones:', error);
      throw error;
    }
  }
  
  /**
   * Revierte la última migración
   * @returns {Promise<void>}
   */
  async rollbackMigration() {
    try {
      const [batchNo, log] = await db.migrate.rollback();
      
      if (log.length === 0) {
        console.log('No hay migraciones para revertir');
      } else {
        console.log(`Batch ${batchNo} revertido. ${log.length} migraciones revertidas:`);
        log.forEach(migrationName => console.log(`- ${migrationName}`));
      }
      
      return { batchNo, log };
    } catch (error) {
      console.error('Error al revertir migraciones:', error);
      throw error;
    }
  }
  
  /**
   * Obtiene el estado actual de las migraciones
   * @returns {Promise<Array>} - Lista de migraciones y su estado
   */
  async getMigrationStatus() {
    try {
      return await db.migrate.status();
    } catch (error) {
      console.error('Error al obtener estado de migraciones:', error);
      throw error;
    }
  }

  /**
   * Obtiene la instancia de la base de datos
   * @returns {Object} - Instancia de Knex
   */
  getDb() {
    return db;
  }

  // ===== MÉTODOS DE USUARIOS =====

  /**
   * Crea o actualiza un usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} - Usuario creado/actualizado
   */
  async upsertUser(userData) {
    try {
      const { id, email, name, picture } = userData;
      
      const existingUser = await db('users').where('id', id).first();
      
      if (existingUser) {
        // Actualizar usuario existente
        await db('users')
          .where('id', id)
          .update({
            email,
            name,
            picture,
            last_login: db.fn.now(),
          });
      } else {
        // Crear nuevo usuario
        await db('users').insert({
          id,
          email,
          name,
          picture,
          created_at: db.fn.now(),
          last_login: db.fn.now(),
          role: 'user',
          worksheet_count: 0,
        });
      }
      
      return await db('users').where('id', id).first();
    } catch (error) {
      console.error('Error al crear/actualizar usuario:', error);
      throw error;
    }
  }

  /**
   * Obtiene un usuario por ID
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} - Usuario o null si no existe
   */
  async getUserById(userId) {
    try {
      // Optimización: Seleccionar solo las columnas necesarias
      return await db('users')
        .select(
          'id',
          'email',
          'name',
          'picture',
          'role',
          'worksheet_count',
          'created_at',
          'last_login'
        )
        .where('id', userId)
        .first();
    } catch (error) {
      console.error('Error al obtener usuario:', error);
      throw error;
    }
  }

  // ===== MÉTODOS DE SUSCRIPCIONES =====

  /**
   * Obtiene la suscripción activa de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} - Suscripción activa o null
   */
  async getActiveSubscription(userId) {
    try {
      // Optimización: Seleccionar solo las columnas necesarias
      return await db('subscriptions')
        .select(
          'id',
          'user_id',
          'status',
          'stripe_customer_id',
          'stripe_subscription_id',
          'current_period_end',
          'cancel_at_period_end',
          'plan',
          'price_id'
        )
        .where('user_id', userId)
        .where('status', 'active')
        .where('current_period_end', '>', db.fn.now())
        .first();
    } catch (error) {
      console.error('Error al obtener suscripción activa:', error);
      throw error;
    }
  }

  /**
   * Crea una nueva suscripción
   * @param {Object} subscriptionData - Datos de la suscripción
   * @returns {Promise<Object>} - Suscripción creada
   */
  async createSubscription(subscriptionData) {
    try {
      const {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        status,
        currentPeriodEnd,
        plan,
        priceId
      } = subscriptionData;

      const [subscriptionId] = await db('subscriptions').insert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status,
        current_period_end: currentPeriodEnd,
        plan,
        price_id: priceId,
        created_at: db.fn.now(),
        cancel_at_period_end: false,
      });

      return await db('subscriptions').where('id', subscriptionId).first();
    } catch (error) {
      console.error('Error al crear suscripción:', error);
      throw error;
    }
  }

  /**
   * Actualiza una suscripción
   * @param {string} stripeSubscriptionId - ID de la suscripción en Stripe
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Suscripción actualizada
   */
  async updateSubscription(stripeSubscriptionId, updateData) {
    try {
      await db('subscriptions')
        .where('stripe_subscription_id', stripeSubscriptionId)
        .update(updateData);

      return await db('subscriptions')
        .where('stripe_subscription_id', stripeSubscriptionId)
        .first();
    } catch (error) {
      console.error('Error al actualizar suscripción:', error);
      throw error;
    }
  }

  /**
   * Obtiene una suscripción por ID de Stripe
   * @param {string} stripeSubscriptionId - ID de la suscripción en Stripe
   * @returns {Promise<Object|null>} - Suscripción o null
   */
  async getSubscriptionByStripeId(stripeSubscriptionId) {
    try {
      return await db('subscriptions')
        .where('stripe_subscription_id', stripeSubscriptionId)
        .first();
    } catch (error) {
      console.error('Error al obtener suscripción por Stripe ID:', error);
      throw error;
    }
  }

  // ===== MÉTODOS DE USO =====

  /**
   * Registra el uso de un documento
   * @param {Object} usageData - Datos del uso
   * @returns {Promise<Object>} - Registro de uso creado
   */
  async recordUsage(usageData) {
    try {
      const { userId, documentType, subject, grade, language } = usageData;

      const [usageId] = await db('usage').insert({
        user_id: userId,
        document_type: documentType,
        subject,
        grade,
        language,
        created_at: db.fn.now(),
      });

      // Incrementar contador para usuarios gratuitos
      const subscription = await this.getActiveSubscription(userId);
      if (!subscription) {
        await db('users')
          .where('id', userId)
          .increment('worksheet_count', 1);
      }

      return await db('usage').where('id', usageId).first();
    } catch (error) {
      console.error('Error al registrar uso:', error);
      throw error;
    }
  }

  /**
   * Obtiene el conteo de uso de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} - Número de documentos generados
   */
  async getUserUsageCount(userId) {
    try {
      // Optimización: Usar índice en user_id para mejorar rendimiento
      const result = await db('usage')
        .where('user_id', userId)
        .count('id as count')  // Contar solo la columna id es más eficiente
        .first();

      return parseInt(result.count) || 0;
    } catch (error) {
      console.error('Error al obtener conteo de uso:', error);
      throw error;
    }
  }
}

// Exportamos una instancia del servicio
const databaseService = new DatabaseService();
export default databaseService;