/**
 * =================================================================================================
 * CONFIGURACIÓN DE BASE DE DATOS CLOUD SQL
 * =================================================================================================
 * Este archivo contiene la configuración para conectarse a Cloud SQL en Google Cloud.
 * Las credenciales se obtienen de variables de entorno por seguridad.
 */

import dotenv from 'dotenv';

dotenv.config();

// Validación de variables de entorno requeridas para la base de datos
const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_INSTANCE_CONNECTION_NAME, // Para conexión mediante socket en Google Cloud
  NODE_ENV
} = process.env;

// Configuración para conexión a Cloud SQL
const dbConfig = {
  // Configuración para PostgreSQL
  postgres: {
    client: 'pg',
    connection: NODE_ENV === 'production' 
      ? {
          // En producción, usamos el socket de Cloud SQL para mayor seguridad
          host: `/cloudsql/${DB_INSTANCE_CONNECTION_NAME}`,
          user: DB_USER,
          password: DB_PASSWORD,
          database: DB_NAME,
        }
      : {
          // En desarrollo, usamos conexión TCP/IP
          host: DB_HOST || 'localhost',
          port: parseInt(DB_PORT || '5432'),
          user: DB_USER || 'postgres',
          password: DB_PASSWORD || 'postgres',
          database: DB_NAME || 'listosapp',
        },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
  },
  
  // Configuración para MySQL
  mysql: {
    client: 'mysql2',
    connection: NODE_ENV === 'production'
      ? {
          // En producción, usamos el socket de Cloud SQL para mayor seguridad
          socketPath: `/cloudsql/${DB_INSTANCE_CONNECTION_NAME}`,
          user: DB_USER,
          password: DB_PASSWORD,
          database: DB_NAME,
        }
      : {
          // En desarrollo, usamos conexión TCP/IP
          host: DB_HOST || 'localhost',
          port: parseInt(DB_PORT || '3306'),
          user: DB_USER || 'root',
          password: DB_PASSWORD || 'root',
          database: DB_NAME || 'listosapp',
        },
    pool: {
      min: 2,
      max: 10,
    },
    migrations: {
      tableName: 'knex_migrations',
      directory: './migrations',
    },
  }
};

// Exportamos la configuración según el tipo de base de datos seleccionado
// Por defecto usamos PostgreSQL, pero se puede cambiar mediante la variable DB_TYPE
const dbType = process.env.DB_TYPE || 'postgres';
export default dbConfig[dbType];