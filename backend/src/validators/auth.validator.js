const Joi = require('joi');

exports.loginSchema = Joi.object({
  email:    Joi.string().email().lowercase().required().messages({
    'string.email': 'El email no tiene un formato válido',
    'any.required': 'El email es requerido',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'La contraseña debe tener al menos 6 caracteres',
    'any.required': 'La contraseña es requerida',
  }),
});
