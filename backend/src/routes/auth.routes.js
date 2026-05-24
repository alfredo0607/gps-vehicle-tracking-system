const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { verifyToken } = require('../middlewares/auth.middleware');
const { loginSchema } = require('../validators/auth.validator');
const { validate } = require('../middlewares/validate.middleware');

/**
 * @route   POST /api/auth/login
 * @desc    Inicia sesión y devuelve JWT + datos del usuario
 * @access  Public
 */
router.post('/login', validate(loginSchema), authController.login);

/**
 * @route   GET /api/auth/me
 * @desc    Devuelve los datos del usuario autenticado
 * @access  Private
 */
router.get('/me', verifyToken, authController.me);

module.exports = router;
