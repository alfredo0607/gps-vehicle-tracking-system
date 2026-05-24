const express = require('express');
const router = express.Router();
const simulationController = require('../controllers/simulation.controller');

// @route  POST /api/simulation/start
// @desc   Inicia el simulador GPS (spawns test-gps-simulation.js)
// @access Private
router.post('/start', simulationController.start);

// @route  POST /api/simulation/stop
// @desc   Detiene el simulador GPS
// @access Private
router.post('/stop', simulationController.stop);

// @route  GET /api/simulation/status
// @desc   Retorna el estado actual del simulador
// @access Private
router.get('/status', simulationController.status);

module.exports = router;
