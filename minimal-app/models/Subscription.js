/**
 * =================================================================================================
 * MODELO DE SUSCRIPCIÓN
 * =================================================================================================
 * Este modelo maneja las operaciones relacionadas con las suscripciones.
 */

const { connection } = require('../db/connection');
const logger = require('../utils/logger');

class Subscription {
  /**
   * Obtener suscripción activa de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object|null>} - Suscripción activa o null
   */
  static async getActiveSubscription(userId) {
    try {
      return await connection('subscriptions')
        .where('user_id', userId)
        .where('status', 'active')
        .where('current_period_end', '>', connection.fn.now())
        .first();
    } catch (error) {
      logger.error(`Error al obtener suscripción activa: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Crear una nueva suscripción
   * @param {Object} subscriptionData - Datos de la suscripción
   * @returns {Promise<Object>} - Suscripción creada
   */
  static async create(subscriptionData) {
    try {
      const {
        userId,
        stripeCustomerId,
        stripeSubscriptionId,
        status,
        plan,
        priceId,
        currentPeriodStart,
        currentPeriodEnd,
        worksheetLimit
      } = subscriptionData;
      
      // Insertar suscripción
      const [id] = await connection('subscriptions').insert({
        user_id: userId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
        status,
        plan,
        price_id: priceId,
        current_period_start: currentPeriodStart,
        current_period_end: currentPeriodEnd,
        worksheet_limit: worksheetLimit,
        created_at: connection.fn.now(),
        updated_at: connection.fn.now()
      }).returning('id');
      
      logger.info(`Suscripción creada para usuario ${userId}: ${plan}`);
      
      // Obtener la suscripción creada
      return await connection('subscriptions').where('id', id).first();
    } catch (error) {
      logger.error(`Error al crear suscripción: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Actualizar una suscripción
   * @param {string} stripeSubscriptionId - ID de la suscripción en Stripe
   * @param {Object} updateData - Datos a actualizar
   * @returns {Promise<Object>} - Suscripción actualizada
   */
  static async updateByStripeId(stripeSubscriptionId, updateData) {
    try {
      // Agregar timestamp de actualización
      const dataToUpdate = {
        ...updateData,
        updated_at: connection.fn.now()
      };
      
      // Si se está cancelando, agregar timestamp de cancelación
      if (updateData.status === 'canceled') {
        dataToUpdate.canceled_at = connection.fn.now();
      }
      
      await connection('subscriptions')
        .where('stripe_subscription_id', stripeSubscriptionId)
        .update(dataToUpdate);
      
      logger.debug(`Suscripción actualizada: ${stripeSubscriptionId}`);
      
      // Obtener la suscripción actualizada
      return await connection('subscriptions')
        .where('stripe_subscription_id', stripeSubscriptionId)
        .first();
    } catch (error) {
      logger.error(`Error al actualizar suscripción: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtener una suscripción por ID de Stripe
   * @param {string} stripeSubscriptionId - ID de la suscripción en Stripe
   * @returns {Promise<Object|null>} - Suscripción o null
   */
  static async findByStripeId(stripeSubscriptionId) {
    try {
      return await connection('subscriptions')
        .where('stripe_subscription_id', stripeSubscriptionId)
        .first();
    } catch (error) {
      logger.error(`Error al obtener suscripción por Stripe ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Cancelar una suscripción
   * @param {string} userId - ID del usuario
   * @param {boolean} cancelImmediately - Si se cancela inmediatamente o al final del período
   * @returns {Promise<Object>} - Suscripción actualizada
   */
  static async cancel(userId, cancelImmediately = false) {
    try {
      // Obtener suscripción activa
      const subscription = await this.getActiveSubscription(userId);
      
      if (!subscription) {
        throw new Error('No hay suscripción activa para cancelar');
      }
      
      // Datos a actualizar
      const updateData = {
        cancel_at_period_end: !cancelImmediately,
        updated_at: connection.fn.now()
      };
      
      // Si se cancela inmediatamente, actualizar estado
      if (cancelImmediately) {
        updateData.status = 'canceled';
        updateData.canceled_at = connection.fn.now();
      }
      
      // Actualizar suscripción
      await connection('subscriptions')
        .where('id', subscription.id)
        .update(updateData);
      
      logger.info(`Suscripción ${cancelImmediately ? 'cancelada' : 'configurada para cancelar'} para usuario ${userId}`);
      
      // Obtener la suscripción actualizada
      return await connection('subscriptions')
        .where('id', subscription.id)
        .first();
    } catch (error) {
      logger.error(`Error al cancelar suscripción: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtener historial de suscripciones de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Array>} - Historial de suscripciones
   */
  static async getHistory(userId) {
    try {
      return await connection('subscriptions')
        .where('user_id', userId)
        .orderBy('created_at', 'desc');
    } catch (error) {
      logger.error(`Error al obtener historial de suscripciones: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtener todas las suscripciones (para admin)
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Object>} - Lista de suscripciones con paginación
   */
  static async findAll({ page = 1, limit = 20, status, plan } = {}) {
    try {
      const query = connection('subscriptions')
        .select('subscriptions.*', 'users.email', 'users.name')
        .leftJoin('users', 'subscriptions.user_id', 'users.id')
        .orderBy('subscriptions.created_at', 'desc');
      
      // Aplicar filtros si existen
      if (status) {
        query.where('subscriptions.status', status);
      }
      
      if (plan) {
        query.where('subscriptions.plan', plan);
      }
      
      // Aplicar paginación
      const offset = (page - 1) * limit;
      query.offset(offset).limit(limit);
      
      // Ejecutar consulta
      const subscriptions = await query;
      
      // Obtener total de registros para paginación
      const countQuery = connection('subscriptions').count('* as total');
      
      // Aplicar los mismos filtros a la consulta de conteo
      if (status) {
        countQuery.where('status', status);
      }
      
      if (plan) {
        countQuery.where('plan', plan);
      }
      
      const [{ total }] = await countQuery;
      
      return {
        subscriptions,
        pagination: {
          total: parseInt(total),
          page,
          limit,
          pages: Math.ceil(parseInt(total) / limit)
        }
      };
    } catch (error) {
      logger.error(`Error al obtener suscripciones: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Subscription;