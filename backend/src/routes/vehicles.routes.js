const express = require("express");
const router = express.Router();
const vehicleController = require("../controllers/vehicles.controller");
const { validate } = require("../middlewares/validate.middleware");
const { vehicleValidation } = require("../validators/vehicle.validator");

/**
 * @route   GET /api/vehicles
 * @desc    Listar vehículos
 * @access  Private
 */
router.get("/", vehicleController.listVehicles);

/**
 * @route   GET /api/vehicles/:id
 * @desc    Obtener vehículo por ID
 * @access  Private
 */
router.get("/:id", vehicleController.getVehicleById);

/**
 * @route   POST /api/vehicles
 * @desc    Crear vehículo
 * @access  Private
 */
router.post(
  "/",
  validate(vehicleValidation.create),
  vehicleController.createVehicle,
);

/**
 * @route   PUT /api/vehicles/:id
 * @desc    Actualizar vehículo
 * @access  Private
 */
router.put(
  "/:id",
  validate(vehicleValidation.update),
  vehicleController.updateVehicle,
);

/**
 * @route   DELETE /api/vehicles/:id
 * @desc    Eliminar vehículo
 * @access  Private
 */
router.delete("/:id", vehicleController.deleteVehicle);

/**
 * @route   GET /api/vehicles/user/:userId
 * @desc    Obtener vehículos de un usuario
 * @access  Private
 */
router.get("/user/:userId", vehicleController.getVehiclesByUser);

module.exports = router;
