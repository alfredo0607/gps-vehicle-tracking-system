const vehicleService = require("../services/database/vehicles.service");
const gpsService = require("../services/database/gps.service");
const response = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Crear vehículo
 */
exports.createVehicle = async (req, res, next) => {
  try {
    const vehicleData = req.body;

    // Verificar que la placa no exista
    const plateExists = await vehicleService.plateExists(vehicleData.plate);

    if (plateExists) {
      return response.error(res, "Esta placa ya está registrada", 400);
    }

    const vehicle = await vehicleService.createVehicle(vehicleData);

    logger.info(`Vehicle created: ${vehicle.vehicleId}`);

    return response.success(res, vehicle, "Vehículo creado exitosamente", 201);
  } catch (error) {
    logger.error("Error creating vehicle:", error);
    next(error);
  }
};

/**
 * Listar vehículos
 */
exports.listVehicles = async (req, res, next) => {
  try {
    const { status, userId } = req.query;

    let vehicles;

    if (userId) {
      vehicles = await vehicleService.getVehiclesByUser(userId);
    } else {
      const filters = {};
      if (status) filters.status = status;
      vehicles = await vehicleService.listVehicles(filters);
    }

    return response.success(res, vehicles);
  } catch (error) {
    logger.error("Error listing vehicles:", error);
    next(error);
  }
};

/**
 * Obtener vehículo por ID
 */
exports.getVehicleById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await vehicleService.getVehicleById(id);

    if (!vehicle) {
      return response.error(res, "Vehículo no encontrado", 404);
    }

    // Si tiene GPS, incluir info del GPS
    if (vehicle.gpsId) {
      const gps = await gpsService.getGPSById(vehicle.gpsId);
      vehicle.gps = gps;
    }

    return response.success(res, vehicle);
  } catch (error) {
    logger.error("Error getting vehicle:", error);
    next(error);
  }
};

/**
 * Actualizar vehículo
 */
exports.updateVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    delete updates.vehicleId;
    delete updates.createdAt;

    const vehicle = await vehicleService.getVehicleById(id);
    if (!vehicle) {
      return response.error(res, "Vehículo no encontrado", 404);
    }

    // Si cambia la placa, verificar que no exista
    if (updates.plate && updates.plate !== vehicle.plate) {
      const plateExists = await vehicleService.plateExists(updates.plate);
      if (plateExists) {
        return response.error(res, "Esta placa ya está registrada", 400);
      }
    }

    const updatedVehicle = await vehicleService.updateVehicle(id, updates);

    logger.info(`Vehicle updated: ${id}`);

    return response.success(
      res,
      updatedVehicle,
      "Vehículo actualizado exitosamente",
    );
  } catch (error) {
    logger.error("Error updating vehicle:", error);
    next(error);
  }
};

/**
 * Eliminar vehículo
 */
exports.deleteVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const vehicle = await vehicleService.getVehicleById(id);
    if (!vehicle) {
      return response.error(res, "Vehículo no encontrado", 404);
    }

    // Si tiene GPS asignado, desasignar
    if (vehicle.gpsId) {
      await gpsService.unassignFromVehicle(vehicle.gpsId);
    }

    await vehicleService.deleteVehicle(id);

    logger.info(`Vehicle deleted: ${id}`);

    return response.success(res, null, "Vehículo eliminado exitosamente");
  } catch (error) {
    logger.error("Error deleting vehicle:", error);
    next(error);
  }
};

/**
 * Obtener vehículos de un usuario
 */
exports.getVehiclesByUser = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const vehicles = await vehicleService.getVehiclesByUser(userId);

    return response.success(res, vehicles);
  } catch (error) {
    logger.error("Error getting user vehicles:", error);
    next(error);
  }
};
