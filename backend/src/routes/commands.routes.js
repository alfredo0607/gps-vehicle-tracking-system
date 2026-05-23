const express = require("express");
const router = express.Router();
const commandsController = require("../controllers/commands.controller");
const { validate } = require("../middlewares/validate.middleware");
const { commandValidation } = require("../validators/command.validator");

/**
 * @route   GET /api/commands/available
 * @desc    Obtener lista de comandos disponibles
 * @access  Private
 */
router.get("/available", commandsController.getAvailableCommands);

/**
 * @route   POST /api/commands/:gpsId/send
 * @desc    Enviar comando a GPS
 * @access  Private
 */
router.post(
  "/:gpsId/send",
  validate(commandValidation.send),
  commandsController.sendCommand,
);

/**
 * @route   GET /api/commands/:gpsId/history
 * @desc    Obtener historial de comandos de un GPS
 * @access  Private
 */
router.get("/:gpsId/history", commandsController.getCommandHistory);

/**
 * @route   GET /api/commands/status/:commandId
 * @desc    Obtener estado de un comando específico
 * @access  Private
 */
router.get("/status/:commandId", commandsController.getCommandStatus);

/**
 * @route   GET /api/commands/:gpsId/poll
 * @desc    Polling para actualización de comandos en tiempo real
 * @access  Private
 */
router.get("/:gpsId/poll", commandsController.pollCommandStatus);

module.exports = router;
