const Joi = require("joi");

exports.vehicleValidation = {
  create: Joi.object({
    userId: Joi.string().required(),
    plate: Joi.string().required().max(20),
    brand: Joi.string().required().max(50),
    model: Joi.string().required().max(50),
    year: Joi.number()
      .required()
      .min(1900)
      .max(new Date().getFullYear() + 1),
    color: Joi.string().optional().max(30),
    type: Joi.string()
      .required()
      .valid("car", "truck", "van", "motorcycle", "bus"),
    vin: Joi.string().optional().max(17),
    engineNumber: Joi.string().optional().max(50),
    mileage: Joi.number().optional().min(0),

    driverName: Joi.string().required().max(50),
    driverPhone: Joi.string().required().max(50),
    fuelType: Joi.string().required().max(50),
  }),

  update: Joi.object({
    plate: Joi.string().optional().max(20),
    brand: Joi.string().optional().max(50),
    model: Joi.string().optional().max(50),
    year: Joi.number()
      .optional()
      .min(1900)
      .max(new Date().getFullYear() + 1),
    color: Joi.string().optional().max(30),
    type: Joi.string()
      .optional()
      .valid("car", "truck", "van", "motorcycle", "bus"),
    status: Joi.string()
      .optional()
      .valid("active", "inactive", "maintenance", "sold"),
    mileage: Joi.number().optional().min(0),
    driverName: Joi.string().required().max(50),
    driverPhone: Joi.string().required().max(50),
    fuelType: Joi.string().required().max(50),
  }),
};
