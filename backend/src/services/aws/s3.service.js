const {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { s3Client } = require("./clients");
const config = require("../../config");
const logger = require("../../utils/logger");

const BUCKET = config.s3.certificatesBucket;

/**
 * Guardar certificados en S3
 */
exports.saveCertificates = async (gpsId, certificates) => {
  try {
    logger.info(`Saving certificates for GPS: ${gpsId}`);

    const prefix = `${gpsId}/`;
    const files = {
      certificate: `${prefix}certificate.pem.crt`,
      publicKey: `${prefix}public.pem.key`,
      privateKey: `${prefix}private.pem.key`,
      rootCA: `${prefix}AmazonRootCA1.pem`,
    };

    // Root CA de Amazon
    const rootCA = `-----BEGIN CERTIFICATE-----
MIIDQTCCAimgAwIBAgITBmyfz5m/jAo54vB4ikPmljZbyjANBgkqhkiG9w0BAQsF
ADA5MQswCQYDVQQGEwJVUzEPMA0GA1UEChMGQW1hem9uMRkwFwYDVQQDExBBbWF6
b24gUm9vdCBDQSAxMB4XDTE1MDUyNjAwMDAwMFoXDTM4MDExNzAwMDAwMFowOTEL
MAkGA1UEBhMCVVMxDzANBgNVBAoTBkFtYXpvbjEZMBcGA1UEAxMQQW1hem9uIFJv
b3QgQ0EgMTCCASIwDQYJKoZIhvcNAQEBBQADggEPADCCAQoCggEBALJ4gHHKeNXj
ca9HgFB0fW7Y14h29Jlo91ghYPl0hAEvrAIthtOgQ3pOsqTQNroBvo3bSMgHFzZM
9O6II8c+6zf1tRn4SWiw3te5djgdYZ6k/oI2peVKVuRF4fn9tBb6dNqcmzU5L/qw
IFAGbHrQgLKm+a/sRxmPUDgH3KKHOVj4utWp+UhnMJbulHheb4mjUcAwhmahRWa6
VOujw5H5SNz/0egwLX0tdHA114gk957EWW67c4cX8jJGKLhD+rcdqsq08p8kDi1L
93FcXmn/6pUCyziKrlA4b9v7LWIbxcceVOF34GfID5yHI9Y/QCB/IIDEgEw+OyQm
jgSubJrIqg0CAwEAAaNCMEAwDwYDVR0TAQH/BAUwAwEB/zAOBgNVHQ8BAf8EBAMC
AYYwHQYDVR0OBBYEFIQYzIU07LwMlJQuCFmcx7IQTgoIMA0GCSqGSIb3DQEBCwUA
A4IBAQCY8jdaQZChGsV2USggNiMOruYou6r4lK5IpDB/G/wkjUu0yKGX9rbxenDI
U5PMCCjjmCXPI6T53iHTfIUJrU6adTrCC2qJeHZERxhlbI1Bjjt/msv0tadQ1wUs
N+gDS63pYaACbvXy8MWy7Vu33PqUXHeeE6V/Uq2V8viTO96LXFvKWlJbYK8U90vv
o/ufQJVtMVT8QtPHRh8jrdkPSHCa2XV4cdFyQzR1bldZwgJcJmApzyMZFo6IQ6XU
5MsI+yMRQ+hDKXJioaldXgjUkK642M4UwtBV8ob2xJNDd2ZhwLnoQdeXeGADbkpy
rqXRfboQnoZsG4q5WTP468SQvvG5
-----END CERTIFICATE-----`;

    // Guardar archivos
    await Promise.all([
      // Certificate
      s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: files.certificate,
          Body: certificates.certificatePem,
          ContentType: "application/x-pem-file",
          ServerSideEncryption: "AES256",
        }),
      ),

      // Public Key
      s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: files.publicKey,
          Body: certificates.keyPair.publicKey,
          ContentType: "application/x-pem-file",
          ServerSideEncryption: "AES256",
        }),
      ),

      // Private Key
      s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: files.privateKey,
          Body: certificates.keyPair.privateKey,
          ContentType: "application/x-pem-file",
          ServerSideEncryption: "AES256",
        }),
      ),

      // Root CA
      s3Client.send(
        new PutObjectCommand({
          Bucket: BUCKET,
          Key: files.rootCA,
          Body: rootCA,
          ContentType: "application/x-pem-file",
          ServerSideEncryption: "AES256",
        }),
      ),
    ]);

    logger.info(`Certificates saved to S3: ${prefix}`);

    return {
      bucket: BUCKET,
      prefix,
      files,
    };
  } catch (error) {
    console.log(error);

    logger.error("Error saving certificates:", error);
    throw error;
  }
};

/**
 * Generar URLs pre-firmadas para descarga
 */
exports.getDownloadUrls = async (gpsId, expiresIn = 3600) => {
  const prefix = `${gpsId}/`;
  const files = {
    certificate: `${prefix}certificate.pem.crt`,
    publicKey: `${prefix}public.pem.key`,
    privateKey: `${prefix}private.pem.key`,
    rootCA: `${prefix}AmazonRootCA1.pem`,
  };

  const urls = {};

  for (const [name, key] of Object.entries(files)) {
    const command = new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    });

    urls[name] = await getSignedUrl(s3Client, command, { expiresIn });
  }

  return {
    urls,
    expiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
  };
};

/**
 * Eliminar certificados de S3
 */
exports.deleteCertificates = async (gpsId) => {
  try {
    const prefix = `${gpsId}/`;

    // Listar archivos
    const listCommand = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: prefix,
    });

    const { Contents } = await s3Client.send(listCommand);

    if (!Contents || Contents.length === 0) {
      return true;
    }

    // Eliminar archivos
    await Promise.all(
      Contents.map((item) =>
        s3Client.send(
          new DeleteObjectCommand({
            Bucket: BUCKET,
            Key: item.Key,
          }),
        ),
      ),
    );

    logger.info(`Certificates deleted from S3: ${prefix}`);
    return true;
  } catch (error) {
    logger.error("Error deleting certificates:", error);
    throw error;
  }
};

/**
 * Descargar archivo individual
 */
exports.downloadFile = async (key) => {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3Client.send(command);
  return response.Body;
};
