const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../aws/clients');
const config = require('../../config');
const { v4: uuidv4 } = require('uuid');

const TABLE = config.tables.gps;

/**
 * Crear GPS en DynamoDB
 */
exports.createGPS = async (gpsData) => {
  const item = {
    gpsId: gpsData.gpsId || `gps-${uuidv4()}`,
    vehicleId: gpsData.vehicleId || null,
    brand: gpsData.brand,
    model: gpsData.model,
    deviceId: gpsData.deviceId,
    imei: gpsData.imei,
    simNumber: gpsData.simNumber,
    serialNumber: gpsData.serialNumber || null,

    // AWS IoT
    iotThingName: gpsData.iotThingName,
    iotThingArn: gpsData.iotThingArn,
    iotCertificateId: gpsData.iotCertificateId,
    iotCertificateArn: gpsData.iotCertificateArn,

    // Configuración
    reportInterval: gpsData.reportInterval || 10,
    serverAddress: gpsData.serverAddress || config.iot.endpoint,
    serverPort: 8883,

    // Estado
    status: gpsData.status || 'active',
    online: false,

    // Última posición
    lastLatitude: null,
    lastLongitude: null,
    lastSpeed: null,
    lastHeading: null,
    lastUpdate: null,

    // Metadata
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  await docClient.send(
    new PutCommand({
      TableName: TABLE,
      Item: item,
    })
  );

  return item;
};

/**
 * Obtener GPS por ID
 */
exports.getGPSById = async (gpsId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { gpsId },
    })
  );

  return result.Item;
};

/**
 * Obtener GPS por deviceId
 */
exports.getGPSByDeviceId = async (deviceId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'deviceId-index',
      KeyConditionExpression: 'deviceId = :deviceId',
      ExpressionAttributeValues: {
        ':deviceId': deviceId,
      },
    })
  );

  return result.Items?.[0];
};

/**
 * Obtener GPS por vehículo
 */
exports.getGPSByVehicle = async (vehicleId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: 'vehicleId-index',
      KeyConditionExpression: 'vehicleId = :vehicleId',
      ExpressionAttributeValues: {
        ':vehicleId': vehicleId,
      },
    })
  );

  return result.Items?.[0];
};

/**
 * Listar todos los GPS
 */
exports.listGPS = async (filters = {}) => {
  const params = {
    TableName: TABLE,
  };

  // Filtros opcionales
  if (filters.status) {
    params.FilterExpression = '#status = :status';
    params.ExpressionAttributeNames = { '#status': 'status' };
    params.ExpressionAttributeValues = { ':status': filters.status };
  }

  const result = await docClient.send(new ScanCommand(params));
  return result.Items;
};

/**
 * Actualizar GPS
 */
exports.updateGPS = async (gpsId, updates) => {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  // Construir expresión de actualización
  Object.keys(updates).forEach((key, index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;

    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = updates[key];
  });

  // Agregar updatedAt
  updateExpressions.push('#updatedAt = :updatedAt');
  expressionAttributeNames['#updatedAt'] = 'updatedAt';
  expressionAttributeValues[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { gpsId },
      UpdateExpression: `SET ${updateExpressions.join(', ')}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: 'ALL_NEW',
    })
  );

  return result.Attributes;
};

/**
 * Actualizar última posición
 */
exports.updateLastPosition = async (gpsId, position) => {
  return await exports.updateGPS(gpsId, {
    lastLatitude: position.latitude,
    lastLongitude: position.longitude,
    lastSpeed: position.speed,
    lastHeading: position.heading,
    lastAltitude: position.altitude,
    lastSatellites: position.satellites,
    lastUpdate: position.timestamp,
    online: true,
  });
};

/**
 * Asignar GPS a vehículo
 */
exports.assignToVehicle = async (gpsId, vehicleId) => {
  return await exports.updateGPS(gpsId, {
    vehicleId,
    assignedAt: new Date().toISOString(),
  });
};

/**
 * Desasignar GPS de vehículo
 */
exports.unassignFromVehicle = async (gpsId) => {
  return await exports.updateGPS(gpsId, {
    vehicleId: null,
    assignedAt: null,
  });
};

/**
 * Eliminar GPS
 */
exports.deleteGPS = async (gpsId) => {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { gpsId },
    })
  );

  return true;
};

/**
 * Verificar si GPS existe
 */
exports.gpsExists = async (gpsId) => {
  const gps = await exports.getGPSById(gpsId);
  return !!gps;
};

/**
 * Verificar si deviceId ya está en uso
 */
exports.deviceIdExists = async (deviceId) => {
  const gps = await exports.getGPSByDeviceId(deviceId);
  return !!gps;
};
