const coordinateService = require("../services/database/coordinates.service");
const gpsService = require("../services/database/gps.service");
const locationService = require("../services/aws/location.service");
const response = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Obtener coordenada actual
 */
exports.getCurrentPosition = async (req, res, next) => {
  try {
    const { gpsId } = req.params;

    const gps = await gpsService.getGPSById(gpsId);

    
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    // Obtener desde Location Service
    const position = await locationService.getDevicePosition(gps.deviceId);

    if (!position) {
      return response.error(res, "No hay posición disponible", 404);
    }

    return response.success(res, position, "Posición actual obtenida");
  } catch (error) {
    logger.error("Error getting current position:", error);
    next(error);
  }
};

/**
 * Obtener historial de coordenadas
 */
exports.getHistory = async (req, res, next) => {
  try {
    const { gpsId } = req.params;
    const { startDate, endDate, limit = 1000 } = req.query;

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    if (!startDate || !endDate) {
      return response.error(res, "startDate y endDate son requeridos", 400);
    }

    const startTime = new Date(startDate).getTime();
    const endTime = new Date(endDate).getTime();

    const coordinates = await coordinateService.getCoordinates(
      gpsId,
      startTime,
      endTime,
      parseInt(limit),
    );

    return response.success(
      res,
      {
        gpsId,
        count: coordinates.length,
        coordinates,
      },
      "Historial obtenido exitosamente",
    );
  } catch (error) {
    logger.error("Error getting history:", error);
    next(error);
  }
};

/**
 * Obtener coordenadas de hoy
 */
exports.getToday = async (req, res, next) => {
  try {
    const { gpsId } = req.params;

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const coordinates = await coordinateService.getTodayCoordinates(gpsId);

    return response.success(
      res,
      {
        gpsId,
        date: new Date().toISOString().split("T")[0],
        count: coordinates.length,
        coordinates,
      },
      "Coordenadas de hoy obtenidas",
    );
  } catch (error) {
    logger.error("Error getting today coordinates:", error);
    next(error);
  }
};

/**
 * Obtener coordenadas de esta semana
 */
exports.getWeek = async (req, res, next) => {
  try {
    const { gpsId } = req.params;

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);

    const coordinates = await coordinateService.getCoordinates(
      gpsId,
      startOfWeek.getTime(),
      now.getTime(),
    );

    return response.success(
      res,
      {
        gpsId,
        startDate: startOfWeek.toISOString().split("T")[0],
        endDate: now.toISOString().split("T")[0],
        count: coordinates.length,
        coordinates,
      },
      "Coordenadas de la semana obtenidas",
    );
  } catch (error) {
    logger.error("Error getting week coordinates:", error);
    next(error);
  }
};

/**
 * Obtener coordenadas de este mes
 */
exports.getMonth = async (req, res, next) => {
  try {
    const { gpsId } = req.params;

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);

    const coordinates = await coordinateService.getCoordinates(
      gpsId,
      startOfMonth.getTime(),
      now.getTime(),
    );

    return response.success(
      res,
      {
        gpsId,
        month: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
        count: coordinates.length,
        coordinates,
      },
      "Coordenadas del mes obtenidas",
    );
  } catch (error) {
    logger.error("Error getting month coordinates:", error);
    next(error);
  }
};

/**
 * Obtener estadísticas
 */
exports.getStats = async (req, res, next) => {
  try {
    const { gpsId } = req.params;
    const { startDate, endDate } = req.query;

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    if (!startDate || !endDate) {
      return response.error(res, "startDate y endDate son requeridos", 400);
    }

    const stats = await coordinateService.calculateStats(
      gpsId,
      new Date(startDate).getTime(),
      new Date(endDate).getTime(),
    );

    return response.success(res, stats, "Estadísticas calculadas");
  } catch (error) {
    logger.error("Error calculating stats:", error);
    next(error);
  }
};
