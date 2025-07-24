/**
 * =================================================================================================
 * CONEXIÓN A LA BASE DE DATOS
 * =================================================================================================
 * Este archivo configura la conexión a la base de datos usando Knex.
 */

const knex = require('knex');
const config = require('./knexfile');
const logger = require('../utils/logger');

// Determinar el entorno
const environment = process.env.NODE_ENV || 'development';

// Crear la conexión
const connection = knex(config[environment]);

// Verificar la conexión
async function testConnection() {
  try {
    await connection.raw('SELECT 1');
    logger.info(`✅ Conexión a la base de datos establecida (${environment})`);
    return true;
  } catch (error) {
    logger.error(`❌ Error al conectar a la base de datos: ${error.message}`);
    return false;
  }
}

// Ejecutar migraciones
async function runMigrations() {
  try {
    logger.info('Ejecutando migraciones...');
    const [batchNo, log] = await connection.migrate.latest();
    
    if (log.length === 0) {
      logger.info('Base de datos ya actualizada');
    } else {
      logger.info(`Migraciones aplicadas (batch ${batchNo}):`);
      log.forEach(migration => logger.info(`- ${migration}`));
    }
    
    return { batchNo, log };
  } catch (error) {
    logger.error(`Error al ejecutar migraciones: ${error.message}`);
    throw error;
  }
}

// Ejecutar seeds
async function runSeeds() {
  try {
    logger.info('Ejecutando seeds...');
    await connection.seed.run();
    logger.info('Seeds ejecutados correctamente');
  } catch (error) {
    logger.error(`Error al ejecutar seeds: ${error.message}`);
    throw error;
  }
}

module.exports = {
  connection,
  testConnection,
  runMigrations,
  runSeeds
};