const gpsService = require("../services/database/gps.service");
const vehicleService = require("../services/database/vehicles.service");
const certificateService = require("../services/database/certificates.service");
const iotService = require("../services/aws/iot.service");
const s3Service = require("../services/aws/s3.service");
const response = require("../utils/response");
const logger = require("../utils/logger");

/**
 * Crear GPS completo (Thing + Certificados + DB)
 */
exports.createGPS = async (req, res, next) => {
  try {
    const { brand, model, imei, simNumber, vehicleId, serialNumber } = req.body;

    // Validar que el IMEI no exista
    const deviceId = imei;
    const exists = await gpsService.deviceIdExists(deviceId);

    if (exists) {
      return response.error(res, "Este IMEI ya está registrado", 400);
    }

    // Si se asigna a vehículo, validar que exista y no tenga GPS
    if (vehicleId) {
      const vehicle = await vehicleService.getVehicleById(vehicleId);
      if (!vehicle) {
        return response.error(res, "Vehículo no encontrado", 404);
      }

      const existingGPS = await gpsService.getGPSByVehicle(vehicleId);
      if (existingGPS) {
        return response.error(res, "El vehículo ya tiene un GPS asignado", 400);
      }
    }

    logger.info("Creating GPS with AWS IoT integration...");

    // 1. Crear Thing en IoT Core con certificados
    const iotThing = await iotService.createThingWithCertificates(deviceId);

    logger.info(`IoT Thing created: ${iotThing.thingName}`);

    // 2. Guardar certificados en S3
    const s3Result = await s3Service.saveCertificates(deviceId, {
      certificatePem: iotThing.certificatePem,
      keyPair: iotThing.keyPair,
    });

    logger.info(`Certificates saved to S3: ${s3Result.prefix}`);

    // 3. Crear registro en DynamoDB GPS
    const gps = await gpsService.createGPS({
      brand,
      model,
      deviceId,
      imei,
      simNumber,
      serialNumber,
      vehicleId,
      iotThingName: iotThing.thingName,
      iotThingArn: iotThing.thingArn,
      iotCertificateId: iotThing.certificateId,
      iotCertificateArn: iotThing.certificateArn,
    });

    logger.info(`GPS created in database: ${gps.gpsId}`);

    // 4. Guardar info del certificado en DynamoDB
    await certificateService.saveCertificate({
      certificateId: iotThing.certificateId,
      gpsId: gps.gpsId,
      certificateArn: iotThing.certificateArn,
      s3Bucket: s3Result.bucket,
      s3Prefix: s3Result.prefix,
      s3Url: `s3://${s3Result.bucket}/${s3Result.files.certificate}`,
      files: s3Result.files,
      thingName: iotThing.thingName,
      thingArn: iotThing.thingArn,
    });

    logger.info(`Certificate info saved`);

    // 5. Actualizar vehículo si se asignó
    if (vehicleId) {
      await vehicleService.updateVehicle(vehicleId, {
        gpsId: gps.gpsId,
        gpsInstallDate: new Date().toISOString().split("T")[0],
      });

      logger.info(`Vehicle updated: ${vehicleId}`);
    }

    // 6. Generar URLs de descarga
    const downloadUrls = await s3Service.getDownloadUrls(deviceId);

    return response.success(
      res,
      {
        gps,
        iot: {
          thingName: iotThing.thingName,
          endpoint: `${iotThing.thingName.split("-")[0]}-ats.iot.${process.env.AWS_REGION}.amazonaws.com`,
        },
        certificates: {
          downloadUrls: downloadUrls.urls,
          expiresAt: downloadUrls.expiresAt,
        },
      },
      "GPS creado exitosamente con Thing IoT y certificados",
      201,
    );
  } catch (error) {
    logger.error("Error creating GPS:", error);
    next(error);
  }
};

/**
 * Listar GPS
 */
exports.listGPS = async (req, res, next) => {
  try {
    const { status } = req.query;

    const filters = {};
    if (status) filters.status = status;

    const gpsList = await gpsService.listGPS(filters);

    return response.success(res, gpsList, "GPS obtenidos exitosamente");
  } catch (error) {
    logger.error("Error listing GPS:", error);
    next(error);
  }
};

/**
 * Obtener GPS por ID
 */
exports.getGPSById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gps = await gpsService.getGPSById(id);

    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    return response.success(res, gps);
  } catch (error) {
    logger.error("Error getting GPS:", error);
    next(error);
  }
};

/**
 * Actualizar GPS
 */
exports.updateGPS = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // No permitir actualizar ciertos campos
    delete updates.gpsId;
    delete updates.deviceId;
    delete updates.iotThingName;
    delete updates.iotCertificateId;
    delete updates.createdAt;

    const gps = await gpsService.getGPSById(id);

    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const updatedGPS = await gpsService.updateGPS(id, updates);

    return response.success(res, updatedGPS, "GPS actualizado exitosamente");
  } catch (error) {
    logger.error("Error updating GPS:", error);
    next(error);
  }
};

/**
 * Eliminar GPS (completo: Thing + Certificados + DB)
 */
exports.deleteGPS = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gps = await gpsService.getGPSById(id);

    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    logger.info(`Deleting GPS: ${id}`);

    // 1. Eliminar Thing y certificados de IoT
    if (gps.iotThingName && gps.iotCertificateArn) {
      await iotService.deleteThing(gps.iotThingName, gps.iotCertificateArn);
      logger.info(`IoT Thing deleted: ${gps.iotThingName}`);
    }

    // 2. Eliminar certificados de S3
    if (gps.deviceId) {
      await s3Service.deleteCertificates(gps.deviceId);
      logger.info(`S3 certificates deleted`);
    }

    // 3. Marcar certificado como revocado en DB
    if (gps.iotCertificateId) {
      await certificateService.revokeCertificate(gps.iotCertificateId);
    }

    // 4. Si está asignado a vehículo, desasignar
    if (gps.vehicleId) {
      await vehicleService.updateVehicle(gps.vehicleId, {
        gpsId: null,
        gpsInstallDate: null,
      });
    }

    // 5. Eliminar de DynamoDB
    await gpsService.deleteGPS(id);

    logger.info(`GPS deleted completely: ${id}`);

    return response.success(res, null, "GPS eliminado exitosamente");
  } catch (error) {
    logger.error("Error deleting GPS:", error);
    next(error);
  }
};

/**
 * Asignar GPS a vehículo
 */
exports.assignToVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { vehicleId } = req.body;

    const gps = await gpsService.getGPSById(id);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const vehicle = await vehicleService.getVehicleById(vehicleId);
    if (!vehicle) {
      return response.error(res, "Vehículo no encontrado", 404);
    }

    // Verificar que el vehículo no tenga GPS
    const existingGPS = await gpsService.getGPSByVehicle(vehicleId);
    if (existingGPS && existingGPS.gpsId !== id) {
      return response.error(res, "El vehículo ya tiene un GPS asignado", 400);
    }

    // Asignar
    await gpsService.assignToVehicle(id, vehicleId);
    await vehicleService.updateVehicle(vehicleId, {
      gpsId: id,
      gpsInstallDate: new Date().toISOString().split("T")[0],
    });

    return response.success(res, null, "GPS asignado al vehículo exitosamente");
  } catch (error) {
    logger.error("Error assigning GPS:", error);
    next(error);
  }
};

/**
 * Desasignar GPS de vehículo
 */
exports.unassignFromVehicle = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gps = await gpsService.getGPSById(id);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    if (!gps.vehicleId) {
      return response.error(res, "GPS no está asignado a ningún vehículo", 400);
    }

    // Desasignar
    await gpsService.unassignFromVehicle(id);
    await vehicleService.updateVehicle(gps.vehicleId, {
      gpsId: null,
      gpsInstallDate: null,
    });

    return response.success(
      res,
      null,
      "GPS desasignado del vehículo exitosamente",
    );
  } catch (error) {
    logger.error("Error unassigning GPS:", error);
    next(error);
  }
};

/**
 * Obtener estado del GPS (online/offline)
 */
exports.getGPSStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const gps = await gpsService.getGPSById(id);

    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const now = new Date();

    const lastUpdate = gps.lastUpdate ? new Date(gps.lastUpdate) : null;

    const minutesSinceUpdate = lastUpdate
      ? Math.floor((now - lastUpdate) / 1000 / 60)
      : null;

    const status = {
      gpsId: gps.gpsId,
      deviceId: gps.deviceId,
      online: gps.online && minutesSinceUpdate < 10,
      lastUpdate: gps.lastUpdate,
      minutesSinceUpdate,
      lastPosition:
        gps.lastLatitude && gps.lastLongitude
          ? {
              latitude: gps.lastLatitude,
              longitude: gps.lastLongitude,
              speed: gps.lastSpeed,
              heading: gps.lastHeading,
            }
          : null,
    };

    return response.success(res, status);
  } catch (error) {
    logger.error("Error getting GPS status:", error);
    next(error);
  }
};
