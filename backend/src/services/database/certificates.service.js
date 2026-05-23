const {
  PutCommand,
  UpdateCommand,
  QueryCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../aws/clients");
const config = require("../../config");

const TABLE = config.tables.certificates;

/**
 * Guardar información del certificado
 */
exports.saveCertificate = async (certificateData) => {
  const item = {
    certificateId: certificateData.certificateId,
    gpsId: certificateData.gpsId,

    // AWS IoT
    certificateArn: certificateData.certificateArn,
    certificatePem: certificateData.s3Url,

    // S3
    s3Bucket: certificateData.s3Bucket,
    s3KeyPrefix: certificateData.s3Prefix,
    files: certificateData.files,

    // Thing
    thingName: certificateData.thingName,
    thingArn: certificateData.thingArn,

    // Policy
    policyName: config.iot.policyName,

    // Estado
    status: "active",
    createdAt: new Date().toISOString(),
    activatedAt: new Date().toISOString(),
    expiresAt: new Date(
      Date.now() + 10 * 365 * 24 * 60 * 60 * 1000,
    ).toISOString(), // 10 años

    // Seguridad
    downloadCount: 0,
    lastDownloadedAt: null,
    downloadedBy: null,
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    }),
  );

  return item;
};

/**
 * Obtener certificado por GPS ID
 */
exports.getCertificateByGPS = async (gpsId) => {
  const result = await docClient.send(
    new QueryCommand({
      // Cambiar GetCommand por QueryCommand
      TableName: TABLE,
      IndexName: "gpsId-index",
      KeyConditionExpression: "gpsId = :gpsId",
      ExpressionAttributeValues: {
        ":gpsId": gpsId,
      },
      Limit: 1,
    }),
  );

  return result.Items?.[0];
};
/**
 * Registrar descarga de certificado
 */
exports.recordDownload = async (certificateId, userId) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { certificateId },
      UpdateExpression:
        "SET downloadCount = downloadCount + :inc, lastDownloadedAt = :now, downloadedBy = :userId",
      ExpressionAttributeValues: {
        ":inc": 1,
        ":now": new Date().toISOString(),
        ":userId": userId,
      },
    }),
  );
};

/**
 * Marcar certificado como revocado
 */
exports.revokeCertificate = async (certificateId) => {
  await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { certificateId },
      UpdateExpression: "SET #status = :status, revokedAt = :now",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "revoked",
        ":now": new Date().toISOString(),
      },
    }),
  );
};
