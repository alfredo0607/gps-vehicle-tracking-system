const certificateService = require("../services/database/certificates.service");
const gpsService = require("../services/database/gps.service");
const s3Service = require("../services/aws/s3.service");
const response = require("../utils/response");
const logger = require("../utils/logger");
const archiver = require("archiver");

/**
 * Obtener información del certificado
 */
exports.getCertificateInfo = async (req, res, next) => {
  try {
    const { gpsId } = req.params;

    const gps = await gpsService.getGPSById(gpsId);

    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const certificate = await certificateService.getCertificateByGPS(gpsId);

    if (!certificate) {
      return response.error(res, "Certificado no encontrado", 404);
    }

    return response.success(res, certificate);
  } catch (error) {
    logger.error("Error getting certificate info:", error);
    next(error);
  }
};

/**
 * Generar URLs pre-firmadas para descarga
 */
exports.getDownloadUrls = async (req, res, next) => {
  try {
    const { gpsId } = req.params;
    const expiresIn = parseInt(req.query.expiresIn) || 3600; // 1 hora por defecto

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    const urls = await s3Service.getDownloadUrls(gps.deviceId, expiresIn);

    // Registrar descarga
    if (gps.iotCertificateId) {
      await certificateService.recordDownload(
        gps.iotCertificateId,
        req.user?.userId || "anonymous",
      );
    }

    return response.success(res, urls, "URLs generadas exitosamente");
  } catch (error) {
    logger.error("Error generating download URLs:", error);
    next(error);
  }
};

/**
 * Descargar certificados como ZIP
 */
exports.downloadCertificates = async (req, res, next) => {
  try {
    const { gpsId } = req.params;

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    logger.info(`Downloading certificates for GPS: ${gpsId}`);

    const deviceId = gps.deviceId;
    const prefix = `${deviceId}/`;

    // Archivos a descargar
    const files = [
      { key: `${prefix}certificate.pem.crt`, name: "certificate.pem.crt" },
      { key: `${prefix}public.pem.key`, name: "public.pem.key" },
      { key: `${prefix}private.pem.key`, name: "private.pem.key" },
      { key: `${prefix}AmazonRootCA1.pem`, name: "AmazonRootCA1.pem" },
    ];

    // Crear archivo ZIP
    const archive = archiver("zip", { zlib: { level: 9 } });

    // Headers para descarga
    res.attachment(`${deviceId}-certificates.zip`);
    res.setHeader("Content-Type", "application/zip");

    // Pipe archive a response
    archive.pipe(res);

    // Agregar archivos al ZIP
    for (const file of files) {
      try {
        const stream = await s3Service.downloadFile(file.key);
        archive.append(stream, { name: file.name });
      } catch (error) {
        logger.error(`Error downloading file ${file.key}:`, error);
      }
    }

    // Agregar archivo de configuración
    const configContent = `# Configuración GPS ${deviceId}
# AWS IoT Endpoint
ENDPOINT=${gps.serverAddress}
PORT=${gps.serverPort}
THING_NAME=${gps.iotThingName}
DEVICE_ID=${deviceId}

# Archivos de certificados
CERTIFICATE=certificate.pem.crt
PRIVATE_KEY=private.pem.key
PUBLIC_KEY=public.pem.key
ROOT_CA=AmazonRootCA1.pem

# MQTT Topic
TOPIC=vehicles/${deviceId}/data

# Configuración Teltonika
REPORT_INTERVAL=${gps.reportInterval}
`;

    archive.append(configContent, { name: "config.txt" });

    // Finalizar ZIP
    await archive.finalize();

    // Registrar descarga
    if (gps.iotCertificateId) {
      await certificateService.recordDownload(
        gps.iotCertificateId,
        req.user?.userId || "anonymous",
      );
    }

    logger.info(`Certificates downloaded for GPS: ${gpsId}`);
  } catch (error) {
    logger.error("Error downloading certificates:", error);
    next(error);
  }
};

/**
 * Revocar certificado
 */
exports.revokeCertificate = async (req, res, next) => {
  try {
    const { gpsId } = req.params;

    const gps = await gpsService.getGPSById(gpsId);
    if (!gps) {
      return response.error(res, "GPS no encontrado", 404);
    }

    if (!gps.iotCertificateId) {
      return response.error(res, "GPS no tiene certificado asociado", 400);
    }

    // Marcar como revocado en DB
    await certificateService.revokeCertificate(gps.iotCertificateId);

    // Actualizar estado del GPS
    await gpsService.updateGPS(gpsId, { status: "inactive" });

    logger.info(`Certificate revoked for GPS: ${gpsId}`);

    return response.success(res, null, "Certificado revocado exitosamente");
  } catch (error) {
    logger.error("Error revoking certificate:", error);
    next(error);
  }
};
