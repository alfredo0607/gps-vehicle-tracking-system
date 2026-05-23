const express = require("express");
const router = express.Router();
const coordinateController = require("../controllers/coordinates.controller");

/**
 * @route   GET /api/coordinates/:gpsId/current
 * @desc    Obtener posición actual
 * @access  Private
 */
router.get("/:gpsId/current", coordinateController.getCurrentPosition);

/**
 * @route   GET /api/coordinates/:gpsId/history
 * @desc    Obtener historial (requiere startDate y endDate)
 * @access  Private
 */
router.get("/:gpsId/history", coordinateController.getHistory);

/**
 * @route   GET /api/coordinates/:gpsId/today
 * @desc    Obtener coordenadas de hoy
 * @access  Private
 */
router.get("/:gpsId/today", coordinateController.getToday);

/**
 * @route   GET /api/coordinates/:gpsId/week
 * @desc    Obtener coordenadas de esta semana
 * @access  Private
 */
router.get("/:gpsId/week", coordinateController.getWeek);

/**
 * @route   GET /api/coordinates/:gpsId/month
 * @desc    Obtener coordenadas de este mes
 * @access  Private
 */
router.get("/:gpsId/month", coordinateController.getMonth);

/**
 * @route   GET /api/coordinates/:gpsId/stats
 * @desc    Obtener estadísticas (requiere startDate y endDate)
 * @access  Private
 */
router.get("/:gpsId/stats", coordinateController.getStats);

module.exports = router;
