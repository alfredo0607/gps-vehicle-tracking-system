const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');
const config = require('../config');
const path = require('path');

// Crear directorio de logs si no existe
const fs = require('fs');
if (!fs.existsSync(config.logging.directory)) {
  fs.mkdirSync(config.logging.directory, { recursive: true });
}

const logger = winston.createLogger({
  level: config.logging.level,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.json()
  ),
  defaultMeta: { service: 'fleet-tracker-api' },
  transports: [
    // Error logs
    new DailyRotateFile({
      filename: path.join(config.logging.directory, 'error-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxFiles: '30d',
      maxSize: '20m',
    }),
    // Combined logs
    new DailyRotateFile({
      filename: path.join(config.logging.directory, 'combined-%DATE%.log'),
      datePattern: 'YYYY-MM-DD',
      maxFiles: '30d',
      maxSize: '20m',
    }),
  ],
});

// Console en desarrollo
if (config.env !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
    })
  );
}

module.exports = logger;
