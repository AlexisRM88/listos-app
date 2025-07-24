/**
 * =================================================================================================
 * MODELO DE USUARIO
 * =================================================================================================
 * Este modelo maneja las operaciones relacionadas con los usuarios.
 */

const { connection } = require('../db/connection');
const logger = require('../utils/logger');

class User {
  /**
   * Crear o actualizar un usuario
   * @param {Object} userData - Datos del usuario
   * @returns {Promise<Object>} - Usuario creado/actualizado
   */
  static async upsert(userData) {
    try {
      const { id, email, name, picture, email_verified } = userData;
      
      // Verificar si el usuario ya existe
      const existingUser = await connection('users').where('id', id).first();
      
      if (existingUser) {
        // Actualizar usuario existente
        await connection('users')
          .where('id', id)
          .update({
            email,
            name,
            picture,
            email_verified,
            last_login: connection.fn.now(),
            updated_at: connection.fn.now()
          });
        
        logger.debug(`Usuario actualizado: ${email}`);
      } else {
        // Crear nuevo usuario
        await connection('users').insert({
          id,
          email,
          name,
          picture,
          email_verified,
          created_at: connection.fn.now(),
          updated_at: connection.fn.now(),
          last_login: connection.fn.now()
        });
        
        logger.info(`Nuevo usuario creado: ${email}`);
      }
      
      // Obtener el usuario actualizado
      return await this.findById(id);
    } catch (error) {
      logger.error(`Error al crear/actualizar usuario: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Buscar un usuario por ID
   * @param {string} id - ID del usuario
   * @returns {Promise<Object|null>} - Usuario encontrado o null
   */
  static async findById(id) {
    try {
      return await connection('users').where('id', id).first();
    } catch (error) {
      logger.error(`Error al buscar usuario por ID: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Buscar un usuario por email
   * @param {string} email - Email del usuario
   * @returns {Promise<Object|null>} - Usuario encontrado o null
   */
  static async findByEmail(email) {
    try {
      return await connection('users').where('email', email).first();
    } catch (error) {
      logger.error(`Error al buscar usuario por email: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Actualizar perfil de usuario
   * @param {string} id - ID del usuario
   * @param {Object} profileData - Datos del perfil a actualizar
   * @returns {Promise<Object>} - Usuario actualizado
   */
  static async updateProfile(id, profileData) {
    try {
      const { name, preferences } = profileData;
      
      const updateData = {
        updated_at: connection.fn.now()
      };
      
      if (name) updateData.name = name;
      if (preferences) updateData.preferences = preferences;
      
      await connection('users')
        .where('id', id)
        .update(updateData);
      
      logger.debug(`Perfil actualizado para usuario ID: ${id}`);
      
      return await this.findById(id);
    } catch (error) {
      logger.error(`Error al actualizar perfil: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Eliminar un usuario
   * @param {string} id - ID del usuario
   * @returns {Promise<boolean>} - true si se eliminó correctamente
   */
  static async delete(id) {
    try {
      // Eliminar usuario (las suscripciones y uso se eliminarán en cascada)
      const deleted = await connection('users')
        .where('id', id)
        .delete();
      
      if (deleted) {
        logger.info(`Usuario eliminado: ${id}`);
        return true;
      } else {
        logger.warn(`Usuario no encontrado para eliminar: ${id}`);
        return false;
      }
    } catch (error) {
      logger.error(`Error al eliminar usuario: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Incrementar contador de hojas de trabajo
   * @param {string} id - ID del usuario
   * @returns {Promise<number>} - Nuevo contador
   */
  static async incrementWorksheetCount(id) {
    try {
      const result = await connection('users')
        .where('id', id)
        .increment('worksheet_count', 1)
        .returning('worksheet_count');
      
      const newCount = result[0]?.worksheet_count || 0;
      logger.debug(`Contador de hojas incrementado para usuario ${id}: ${newCount}`);
      
      return newCount;
    } catch (error) {
      logger.error(`Error al incrementar contador: ${error.message}`);
      throw error;
    }
  }
  
  /**
   * Obtener todos los usuarios (para admin)
   * @param {Object} options - Opciones de paginación y filtrado
   * @returns {Promise<Array>} - Lista de usuarios
   */
  static async findAll({ page = 1, limit = 20, role, search } = {}) {
    try {
      const query = connection('users')
        .select('*')
        .orderBy('created_at', 'desc');
      
      // Aplicar filtros si existen
      if (role) {
        query.where('role', role);
      }
      
      if (search) {
        query.where(function() {
          this.where('name', 'ilike', `%${search}%`)
            .orWhere('email', 'ilike', `%${search}%`);
        });
      }
      
      // Aplicar paginación
      const offset = (page - 1) * limit;
      query.offset(offset).limit(limit);
      
      // Ejecutar consulta
      const users = await query;
      
      // Obtener total de registros para paginación
      const countQuery = connection('users').count('* as total');
      
      // Aplicar los mismos filtros a la consulta de conteo
      if (role) {
        countQuery.where('role', role);
      }
      
      if (search) {
        countQuery.where(function() {
          this.where('name', 'ilike', `%${search}%`)
            .orWhere('email', 'ilike', `%${search}%`);
        });
      }
      
      const [{ total }] = await countQuery;
      
      return {
        users,
        pagination: {
          total: parseInt(total),
          page,
          limit,
          pages: Math.ceil(parseInt(total) / limit)
        }
      };
    } catch (error) {
      logger.error(`Error al obtener usuarios: ${error.message}`);
      throw error;
    }
  }
}

module.exports = User;