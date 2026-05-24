require('dotenv').config();

/**
 * Validar que las variables de entorno críticas existan
 */
const requiredEnvVars = [
  'AWS_REGION',
  'AWS_ACCESS_KEY_ID',
  'AWS_SECRET_ACCESS_KEY',
  'IOT_ENDPOINT',
  'S3_CERTIFICATES_BUCKET',
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ ERROR: Faltan variables de entorno requeridas:');
  missingVars.forEach((varName) => {
    console.error(`   - ${varName}`);
  });
  console.error('\nCrea un archivo .env con todas las variables necesarias.');
  console.error('Ver .env.example para referencia.\n');
  process.exit(1);
}

module.exports = {
  // ============================================
  // SERVER
  // ============================================
  port: parseInt(process.env.PORT) || 5000,
  env: process.env.NODE_ENV || 'development',

  // ============================================
  // AWS CREDENTIALS
  // ============================================
  aws: {
    region: process.env.AWS_REGION,
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },

  // ============================================
  // DYNAMODB TABLES
  // ============================================
  tables: {
    users: process.env.TABLE_USERS || 'Usuarios',
    vehicles: process.env.TABLE_VEHICLES || 'Vehiculos',
    gps: process.env.TABLE_GPS || 'GPS',
    coordinates: process.env.TABLE_COORDINATES || 'Coordenadas',
    certificates: process.env.TABLE_CERTIFICATES || 'certificados',
  },

  // ============================================
  // AWS IOT CORE
  // ============================================
  iot: {
    endpoint: process.env.IOT_ENDPOINT,
    thingGroupName: process.env.IOT_THING_GROUP || 'FleetGPSDevices',
    policyName: process.env.IOT_POLICY_NAME || 'VehicleGPSPolicy',
  },

  // ============================================
  // AWS S3
  // ============================================
  s3: {
    certificatesBucket: process.env.S3_CERTIFICATES_BUCKET,
    region: process.env.AWS_REGION,
  },

  // ============================================
  // AWS LOCATION SERVICE
  // ============================================
  location: {
    trackerName: process.env.LOCATION_TRACKER_NAME || 'VehicleTracker',
    mapName: process.env.LOCATION_MAP_NAME || 'StandardLight',
  },

  // ============================================
  // JWT (AUTHENTICATION)
  // ============================================
  jwt: {
    secret: process.env.JWT_SECRET || 'change-this-in-production-min-32-chars',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'change-refresh-secret-too',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  },

  // ============================================
  // CORS
  // ============================================
  cors: {
    origin: process.env.CORS_ORIGIN?.split(',') || 'http://localhost:3000',
    credentials: true,
    optionsSuccessStatus: 200,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  },

  // ============================================
  // RATE LIMITING
  // ============================================
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 1000000, // máximo 100 requests por ventana
    message: 'Demasiadas solicitudes desde esta IP, intenta de nuevo más tarde.',
    standardHeaders: true,
    legacyHeaders: false,
  },

  // ============================================
  // PAGINATION
  // ============================================
  pagination: {
    defaultLimit: 20,
    maxLimit: 100,
  },

  // ============================================
  // LOGGING
  // ============================================
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    directory: process.env.LOG_DIRECTORY || 'logs',
  },

  // ============================================
  // GPS CONFIGURATION
  // ============================================
  gps: {
    defaultReportInterval: 10, // segundos
    offlineThreshold: 10, // minutos sin reporte = offline
    maxHistoryDays: 90, // días de retención de historial
  },

  // ============================================
  // CERTIFICATES
  // ============================================
  certificates: {
    downloadUrlExpiration: 3600, // 1 hora (en segundos)
    expirationYears: 10, // Los certificados IoT duran 10 años
  },

  // ============================================
  // FILE UPLOAD (si lo necesitas)
  // ============================================
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10 MB
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png'],
  },
};
