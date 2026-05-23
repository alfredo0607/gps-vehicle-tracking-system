const logger = require("../utils/logger");
const response = require("../utils/response");

module.exports = (err, req, res, next) => {
  logger.error("Error:", {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    ip: req.ip,
  });

  // Errores de validación Joi
  if (err.isJoi) {
    return response.error(
      res,
      "Error de validación",
      400,
      err.details.map((d) => ({
        field: d.path.join("."),
        message: d.message,
      })),
    );
  }

  // Errores de AWS
  if (err.name === "ResourceNotFoundException") {
    return response.error(res, "Recurso no encontrado", 404);
  }

  if (err.name === "ValidationException") {
    return response.error(res, err.message, 400);
  }

  // JWT errors
  if (err.name === "JsonWebTokenError") {
    return response.error(res, "Token inválido", 401);
  }

  if (err.name === "TokenExpiredError") {
    return response.error(res, "Token expirado", 401);
  }

  // Error genérico
  const statusCode = err.statusCode || 500;
  const message = err.message || "Error interno del servidor";

  return response.error(res, message, statusCode);
};
