const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const config = require('../config');
const usersService = require('../services/database/users.service');
const response = require('../utils/response');
const logger = require('../utils/logger');

// Campos del usuario que se devuelven al frontend (nunca el password)
const safeUser = (user) => ({
  userId: user.userId,
  name: user.name,
  email: user.email,
  cedula: user.cedula,
  phone: user.phone,
  rol: user.rol,
  isActive: user.isActive,
});

/**
 * POST /api/auth/login
 * Body: { email, password }
 */
exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await usersService.getUserByEmail(email.toLowerCase());

    if (!user) {
      return response.error(res, 'Credenciales incorrectas', 401);
    }

    if (user.isActive === false) {
      return response.error(res, 'Tu cuenta está desactivada. Contacta al administrador.', 403);
    }

    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return response.error(res, 'Credenciales incorrectas', 401);
    }

    const token = jwt.sign(
      { userId: user.userId, email: user.email, name: user.name, rol: user.rol },
      config.jwt.secret,
      { expiresIn: config.jwt.expiresIn }
    );

    logger.info(`[Auth] Login exitoso: ${user.email} (${user.rol})`);

    return res.json({ token, user: safeUser(user) });
  } catch (err) {
    logger.error('[Auth] Error en login:', err);
    next(err);
  }
};

/**
 * GET /api/auth/me
 * Header: Authorization: Bearer <token>
 */
exports.me = async (req, res, next) => {
  try {
    const user = await usersService.getUserById(req.user.userId);

    if (!user) {
      return response.error(res, 'Usuario no encontrado', 404);
    }

    return response.success(res, safeUser(user), 'Usuario obtenido');
  } catch (err) {
    logger.error('[Auth] Error en /me:', err);
    next(err);
  }
};
