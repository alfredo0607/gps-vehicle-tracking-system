const express = require("express");
const router = express.Router();
const gpsController = require("../controllers/gps.controller");
const { validate } = require("../middlewares/validate.middleware");
const { gpsValidation } = require("../validators/gps.validator");

/**
 * @route   GET /api/gps
 * @desc    Listar GPS
 * @access  Private
 */
router.get("/", gpsController.listGPS);

/**
 * @route   GET /api/gps/:id
 * @desc    Obtener GPS por ID
 * @access  Private
 */
router.get("/:id", gpsController.getGPSById);

/**
 * @route   POST /api/gps
 * @desc    Crear GPS (Thing + Certificados + DB)
 * @access  Private
 */
router.post("/", validate(gpsValidation.create), gpsController.createGPS);

/**
 * @route   PUT /api/gps/:id
 * @desc    Actualizar GPS
 * @access  Private
 */
router.put("/:id", validate(gpsValidation.update), gpsController.updateGPS);

/**
 * @route   DELETE /api/gps/:id
 * @desc    Eliminar GPS (Thing + Certificados + DB)
 * @access  Private
 */
router.delete("/:id", gpsController.deleteGPS);

/**
 * @route   POST /api/gps/:id/assign
 * @desc    Asignar GPS a vehículo
 * @access  Private
 */
router.post(
  "/:id/assign",
  validate(gpsValidation.assign),
  gpsController.assignToVehicle,
);

/**
 * @route   POST /api/gps/:id/unassign
 * @desc    Desasignar GPS de vehículo
 * @access  Private
 */
router.post("/:id/unassign", gpsController.unassignFromVehicle);

/**
 * @route   GET /api/gps/:id/status
 * @desc    Obtener estado del GPS
 * @access  Private
 */
router.get("/:id/status", gpsController.getGPSStatus);

module.exports = router;
