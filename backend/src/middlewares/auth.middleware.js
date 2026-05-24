const jwt = require('jsonwebtoken');
const config = require('../config');
const response = require('../utils/response');

/**
 * Verifica el JWT del header Authorization: Bearer <token>
 * Adjunta req.user = { userId, email, name, rol } si es válido
 */
const verifyToken = (req, res, next) => {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    return response.error(res, 'Acceso denegado: token no proporcionado', 401);
  }

  const token = header.split(' ')[1];

  try {
    req.user = jwt.verify(token, config.jwt.secret);
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return response.error(res, 'Token expirado, inicia sesión nuevamente', 401);
    }
    return response.error(res, 'Token inválido', 401);
  }
};

/**
 * Restringe el acceso a ciertos roles
 * Uso: requireRole('ADMIN') o requireRole(['ADMIN', 'INVITADO'])
 */
const requireRole = (...roles) => (req, res, next) => {
  const allowed = roles.flat();
  if (!req.user || !allowed.includes(req.user.rol)) {
    return response.error(res, 'No tienes permiso para realizar esta acción', 403);
  }
  next();
};

module.exports = { verifyToken, requireRole };
