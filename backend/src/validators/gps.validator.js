const Joi = require("joi");

exports.gpsValidation = {
  create: Joi.object({
    brand: Joi.string().required().max(50),
    model: Joi.string().required().max(50),
    imei: Joi.string()
      .required()
      .length(15)
      .pattern(/^[0-9]+$/),
    simNumber: Joi.string()
      .required()
      .pattern(/^\+?[0-9]{10,15}$/),
    vehicleId: Joi.string().optional().allow(null),
    serialNumber: Joi.string().optional().max(100),
  }),

  update: Joi.object({
    brand: Joi.string().optional().max(50),
    model: Joi.string().optional().max(50),
    simNumber: Joi.string()
      .optional()
      .pattern(/^\+?[0-9]{10,15}$/),
    status: Joi.string().optional().valid("active", "inactive", "maintenance"),
    reportInterval: Joi.number().optional().min(5).max(300),
  }),

  assign: Joi.object({
    vehicleId: Joi.string().required(),
  }),
};
