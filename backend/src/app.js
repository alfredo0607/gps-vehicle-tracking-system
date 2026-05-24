/* eslint-disable no-undef */
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const config = require('./config');
const logger = require('./utils/logger');
const errorMiddleware = require('./middlewares/error.middleware');

const app = express();

// ============================================
// MIDDLEWARES DE SEGURIDAD
// ============================================

// Helmet - Headers de seguridad
app.use(helmet());

// CORS
app.use(cors(config.cors));

// Rate Limiting
const limiter = rateLimit(config.rateLimit);
app.use('/api/', limiter);

// ============================================
// MIDDLEWARES GENERALES
// ============================================

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Compression
app.use(compression());

// Logging HTTP requests
if (config.env === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(
    morgan('combined', {
      stream: { write: (message) => logger.info(message.trim()) },
    })
  );
}

// ============================================
// HEALTH CHECK
// ============================================

app.get('/health', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.env,
    version: require('../package.json').version,
  });
});

// ============================================
// RUTAS API
// ============================================

const routes = require('./routes');
app.use('/api', routes);

// ============================================
// 404 HANDLER
// ============================================

app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta no encontrada',
    path: req.originalUrl,
  });
});

// ============================================
// ERROR HANDLER
// ============================================

app.use(errorMiddleware);

module.exports = app;
