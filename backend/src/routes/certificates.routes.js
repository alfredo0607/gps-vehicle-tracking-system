const express = require("express");
const router = express.Router();
const certificateController = require("../controllers/certificates.controller");

/**
 * @route   GET /api/certificates/:gpsId
 * @desc    Obtener información del certificado
 * @access  Private
 */
router.get("/:gpsId", certificateController.getCertificateInfo);

/**
 * @route   GET /api/certificates/:gpsId/urls
 * @desc    Generar URLs pre-firmadas para descarga
 * @access  Private
 */
router.get("/:gpsId/urls", certificateController.getDownloadUrls);

/**
 * @route   GET /api/certificates/:gpsId/download
 * @desc    Descargar certificados como ZIP
 * @access  Private
 */
router.get("/:gpsId/download", certificateController.downloadCertificates);

/**
 * @route   POST /api/certificates/:gpsId/revoke
 * @desc    Revocar certificado
 * @access  Private (Admin only)
 */
router.post("/:gpsId/revoke", certificateController.revokeCertificate);

module.exports = router;
