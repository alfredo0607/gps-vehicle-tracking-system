const response = require("../utils/response");

/**
 * Middleware de validación con Joi
 */
exports.validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join("."),
        message: detail.message,
      }));

      return response.error(res, "Error de validación", 400, errors);
    }

    req.body = value;
    next();
  };
};
