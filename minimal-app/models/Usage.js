/**
 * =================================================================================================
 * MODELO DE USO
 * =================================================================================================
 * Este modelo maneja las operaciones relacionadas con el uso de la aplicación.
 */

const { connection } = require('../db/connection');
const logger = require('../utils/logger');
const User = require('./User');

class Usage {
  /**
   * Registrar uso de un documento
   * @param {Object} usageData - Datos del uso
   * @returns {Promise<Object>} - Registro de uso creado
   */
  static async record(usageData) {
    try {
      const { userId, documentType, subject, grade, language, metadata } = usageData;
      
      // Insertar registro de uso
      const [id] = await connection('usage').insert({
        user_id: userId,
        document_type: documentType,
        subject,
        grade,
        language,
        metadata: metadata || {},
        created_at: connection.fn.now()
      }).returning('id');
      
      logger.debug(`Uso registrado para usuario ${userId}: ${documentType}`);
      
      // Incrementar contador de hojas de trabajo del usuario
      await User.incrementWorksheetCount(userId);
      
      // Obtener el registro creado
      return await connection('usage').where('id', id).first();
    } catch (error) {
      logger.error(`Error al registrar uso: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtener conteo de uso de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<number>} - Número de documentos generados
   */
  static async getUserUsageCount(userId) {
    try {
      const result = await connection('usage')
        .where('user_id', userId)
        .count('id as count')
        .first();
      
      return parseInt(result.count) || 0;
    } catch (error) {
      logger.error(`Error al obtener conteo de uso: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas de uso de un usuario
   * @param {string} userId - ID del usuario
   * @returns {Promise<Object>} - Estadísticas de uso
   */
  static async getUserStats(userId) {
    try {
      // Obtener conteo total
      const totalCount = await this.getUserUsageCount(userId);
      
      // Obtener conteo por tipo de documento
      const byDocumentType = await connection('usage')
        .where('user_id', userId)
        .select('document_type')
        .count('* as count')
        .groupBy('document_type');
      
      // Obtener conteo por materia
      const bySubject = await connection('usage')
        .where('user_id', userId)
        .whereNotNull('subject')
        .select('subject')
        .count('* as count')
        .groupBy('subject')
        .orderBy('count', 'desc')
        .limit(5);
      
      // Obtener actividad reciente
      const recentActivity = await connection('usage')
        .where('user_id', userId)
        .select('*')
        .orderBy('created_at', 'desc')
        .limit(10);
      
      // Obtener conteo por mes (últimos 6 meses)
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      
      const byMonth = await connection('usage')
        .where('user_id', userId)
        .where('created_at', '>=', sixMonthsAgo)
        .select(
          connection.raw("to_char(created_at, 'YYYY-MM') as month")
        )
        .count('* as count')
        .groupBy('month')
        .orderBy('month');
      
      return {
        totalCount,
        byDocumentType,
        bySubject,
        byMonth,
        recentActivity
      };
    } catch (error) {
      logger.error(`Error al obtener estadísticas de uso: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtener estadísticas globales (para admin)
   * @returns {Promise<Object>} - Estadísticas globales
   */
  static async getGlobalStats() {
    try {
      // Obtener conteo total
      const [{ count: totalCount }] = await connection('usage').count('* as count');
      
      // Obtener conteo por tipo de documento
      const byDocumentType = await connection('usage')
        .select('document_type')
        .count('* as count')
        .groupBy('document_type');
      
      // Obtener conteo por materia
      const bySubject = await connection('usage')
        .whereNotNull('subject')
        .select('subject')
        .count('* as count')
        .groupBy('subject')
        .orderBy('count', 'desc')
        .limit(10);
      
      // Obtener conteo por día (últimos 30 días)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      
      const byDay = await connection('usage')
        .where('created_at', '>=', thirtyDaysAgo)
        .select(
          connection.raw("to_char(created_at, 'YYYY-MM-DD') as day")
        )
        .count('* as count')
        .groupBy('day')
        .orderBy('day');
      
      // Obtener usuarios más activos
      const topUsers = await connection('usage')
        .select('users.id', 'users.name', 'users.email')
        .count('usage.id as count')
        .leftJoin('users', 'usage.user_id', 'users.id')
        .groupBy('users.id', 'users.name', 'users.email')
        .orderBy('count', 'desc')
        .limit(10);
      
      return {
        totalCount: parseInt(totalCount),
        byDocumentType,
        bySubject,
        byDay,
        topUsers
      };
    } catch (error) {
      logger.error(`Error al obtener estadísticas globales: ${error.message}`);
      throw error;
    }
  }
}

module.exports = Usage;