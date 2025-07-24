/**
 * =================================================================================================
 * CONFIGURACIÓN DE KNEX
 * =================================================================================================
 * Este archivo configura la conexión a la base de datos para diferentes entornos.
 */

require('dotenv').config({ path: '../.env' });

// Obtener variables de entorno
const {
  DB_HOST,
  DB_PORT,
  DB_USER,
  DB_PASSWORD,
  DB_NAME,
  DB_INSTANCE_CONNECTION_NAME,
  NODE_ENV
} = process.env;

// Configuración base para todos los entornos
const baseConfig = {
  client: 'pg', // PostgreSQL por defecto
  migrations: {
    directory: './migrations',
    tableName: 'knex_migrations'
  },
  seeds: {
    directory: './seeds'
  },
  pool: {
    min: 2,
    max: 10
  }
};

// Configuración específica para cada entorno
module.exports = {
  // Entorno de desarrollo
  development: {
    ...baseConfig,
    connection: {
      host: DB_HOST || 'localhost',
      port: parseInt(DB_PORT || '5432'),
      user: DB_USER || 'postgres',
      password: DB_PASSWORD || 'postgres',
      database: DB_NAME || 'listosapp_dev'
    },
    debug: true
  },

  // Entorno de pruebas
  test: {
    ...baseConfig,
    connection: {
      host: DB_HOST || 'localhost',
      port: parseInt(DB_PORT || '5432'),
      user: DB_USER || 'postgres',
      password: DB_PASSWORD || 'postgres',
      database: DB_NAME || 'listosapp_test'
    },
    seeds: {
      directory: './seeds/test'
    }
  },

  // Entorno de producción
  production: {
    ...baseConfig,
    connection: NODE_ENV === 'production' && DB_INSTANCE_CONNECTION_NAME
      ? {
          // En producción con Cloud SQL, usamos el socket de Cloud SQL
          host: `/cloudsql/${DB_INSTANCE_CONNECTION_NAME}`,
          user: DB_USER,
          password: DB_PASSWORD,
          database: DB_NAME,
        }
      : {
          // Conexión estándar para otros casos
          host: DB_HOST,
          port: parseInt(DB_PORT || '5432'),
          user: DB_USER,
          password: DB_PASSWORD,
          database: DB_NAME,
        },
    pool: {
      min: 2,
      max: 20
    },
    debug: false
  }
};