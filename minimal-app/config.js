/**
 * =================================================================================================
 * CONFIGURACIÓN DE LA APLICACIÓN
 * =================================================================================================
 * Este archivo contiene la configuración centralizada de la aplicación.
 */

// Cargar variables de entorno
require('dotenv').config();

// Configuración por entorno
const env = process.env.NODE_ENV || 'development';

// Configuración base
const config = {
  // Configuración común para todos los entornos
  common: {
    port: process.env.PORT || 8080,
    logLevel: process.env.LOG_LEVEL || 'info',
    corsOrigins: process.env.CORS_ORIGINS || '*',
  },
  
  // Configuración específica para desarrollo
  development: {
    db: {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'listosapp',
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY || 'sk_test_...',
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || 'whsec_...',
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY || '',
    }
  },
  
  // Configuración específica para producción
  production: {
    db: {
      host: process.env.DB_HOST,
      port: process.env.DB_PORT || 5432,
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      socketPath: process.env.DB_INSTANCE_CONNECTION_NAME 
        ? `/cloudsql/${process.env.DB_INSTANCE_CONNECTION_NAME}` 
        : undefined,
    },
    stripe: {
      secretKey: process.env.STRIPE_SECRET_KEY,
      webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
    },
    gemini: {
      apiKey: process.env.GEMINI_API_KEY,
    }
  },
  
  // Configuración específica para testing
  test: {
    db: {
      host: process.env.TEST_DB_HOST || 'localhost',
      port: process.env.TEST_DB_PORT || 5432,
      user: process.env.TEST_DB_USER || 'postgres',
      password: process.env.TEST_DB_PASSWORD || 'postgres',
      database: process.env.TEST_DB_NAME || 'listosapp_test',
    },
    stripe: {
      secretKey: 'sk_test_...',
      webhookSecret: 'whsec_...',
    },
    gemini: {
      apiKey: 'test_key',
    }
  }
};

// Exportar configuración combinada para el entorno actual
module.exports = {
  ...config.common,
  ...config[env],
  env
};