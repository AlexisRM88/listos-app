/**
 * =================================================================================================
 * LOGGER PARA LA APLICACIÓN
 * =================================================================================================
 * Este archivo configura un logger centralizado para la aplicación.
 */

const winston = require('winston');
const config = require('../config');

// Definir niveles y colores
const levels = {
  error: 0,
  warn: 1,
  info: 2,
  http: 3,
  debug: 4,
};

const colors = {
  error: 'red',
  warn: 'yellow',
  info: 'green',
  http: 'magenta',
  debug: 'blue',
};

// Añadir colores a winston
winston.addColors(colors);

// Formato para los logs
const format = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss:ms' }),
  winston.format.colorize({ all: true }),
  winston.format.printf(
    (info) => `${info.timestamp} ${info.level}: ${info.message}`,
  ),
);

// Transportes para los logs
const transports = [
  new winston.transports.Console(),
  new winston.transports.File({
    filename: 'logs/error.log',
    level: 'error',
  }),
  new winston.transports.File({ filename: 'logs/all.log' }),
];

// Crear el logger
const logger = winston.createLogger({
  level: config.logLevel,
  levels,
  format,
  transports,
});

// Crear directorio de logs si no existe
const fs = require('fs');
const path = require('path');
const logDir = 'logs';

if (!fs.existsSync(logDir)) {
  try {
    fs.mkdirSync(logDir);
  } catch (error) {
    console.error('No se pudo crear el directorio de logs:', error);
  }
}

module.exports = logger;