const commandsService = require("../services/database/commands.service");
const gpsService = require("../services/database/gps.service");
const iotCommandsService = require("../services/aws/iot-commands.service");
const response = require("../utils/response");
const logger = require("../utils/logger");
const {
  AVAILABLE_COMMANDS,
  COMMAND_CATEGORIES,
} = require("../shared/utils/constants");

/**
 * Enviar comando a GPS
 */
exports.sendCommand = async (req, res, next) => {
  try {
    const { gpsId } = req.params;
    const { command, parameters } = req.body;
    const userId = req.user?.userId || "system";

    // Verificar que el GPS existe
    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    if (!gps.deviceId) {
      return response.error(res, "GPS no tiene deviceId configurado", 400);
    }

    // Crear registro del comando en DB
    const commandRecord = await commandsService.createCommand({
      gpsId: gpsId,
      vehicleId: gps.vehicleId,
      command: command,
      parameters: parameters || {},
      userId: userId,
    });

    try {
      // Construir comando Teltonika
      const teltonikaCommand = iotCommandsService.buildTeltonikaCommand(
        command,
        parameters,
      );

      // Enviar comando via MQTT
      await iotCommandsService.sendCommandToDevice(
        gps.deviceId,
        command,
        teltonikaCommand,
      );

      // Actualizar estado a "sent"
      await commandsService.updateCommandStatus(
        commandRecord.commandId,
        "sent",
      );

      logger.info(`Comando enviado: ${command} a GPS ${gpsId}`);

      return response.success(
        res,
        {
          commandId: commandRecord.commandId,
          command: command,
          status: "sent",
          deviceId: gps.deviceId,
        },
        "Comando enviado exitosamente",
      );
    } catch (error) {
      // Marcar comando como fallido
      await commandsService.updateCommandStatus(
        commandRecord.commandId,
        "failed",
        { error: error.message },
      );

      throw error;
    }
  } catch (error) {
    logger.error("Error enviando comando:", error);
    next(error);
  }
};

/**
 * Obtener historial de comandos de un GPS
 */
exports.getCommandHistory = async (req, res, next) => {
  try {
    const { gpsId } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const commands = await commandsService.getCommandsByGPS(gpsId, limit);

    return response.success(res, commands);
  } catch (error) {
    logger.error("Error obteniendo historial de comandos:", error);
    next(error);
  }
};

/**
 * Obtener estado de un comando
 */
exports.getCommandStatus = async (req, res, next) => {
  try {
    const { commandId } = req.params;

    const command = await commandsService.getCommandById(commandId);

    if (!command) {
      return response.error(res, "Comando no encontrado", 404);
    }

    return response.success(res, command);
  } catch (error) {
    logger.error("Error obteniendo estado del comando:", error);
    next(error);
  }
};

/**
 * Listar comandos disponibles
 */
exports.getAvailableCommands = async (req, res, next) => {
  try {
    return response.success(res, {
      commands: AVAILABLE_COMMANDS,
      categories: COMMAND_CATEGORIES,
    });
  } catch (error) {
    logger.error("Error obteniendo comandos disponibles:", error);
    next(error);
  }
};

/**
 * Polling para actualizar estado de comandos en tiempo real
 */
exports.pollCommandStatus = async (req, res, next) => {
  try {
    const { gpsId } = req.params;
    const { since } = req.query; // timestamp ISO

    // Obtener comandos actualizados desde una fecha
    const commands = await commandsService.getCommandsByGPS(gpsId, 20);

    // Filtrar solo los actualizados después de 'since'
    const updatedCommands = since
      ? commands.filter((cmd) => {
          const lastUpdate =
            cmd.executedAt || cmd.failedAt || cmd.timeoutAt || cmd.sentAt;
          return lastUpdate && new Date(lastUpdate) > new Date(since);
        })
      : commands;

    return response.success(res, updatedCommands);
  } catch (error) {
    logger.error("Error polling command status:", error);
    next(error);
  }
};
