const {
  PutCommand,
  GetCommand,
  UpdateCommand,
  DeleteCommand,
  QueryCommand,
  ScanCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../aws/clients");
const config = require("../../config");
const { v4: uuidv4 } = require("uuid");

const TABLE = config.tables.vehicles;

/**
 * Crear vehículo
 */
exports.createVehicle = async (vehicleData) => {
  const item = {
    vehicleId: vehicleData.vehicleId || `vehicle-${uuidv4()}`,
    userId: vehicleData.userId,

    // Info del vehículo
    plate: vehicleData.plate,
    brand: vehicleData.brand,
    model: vehicleData.model,
    year: vehicleData.year,
    color: vehicleData.color,
    type: vehicleData.type,

    // Documentación
    vin: vehicleData.vin || null,
    engineNumber: vehicleData.engineNumber || null,

    // GPS
    // gpsId: vehicleData.gpsId || null,
    gpsInstallDate: vehicleData.gpsInstallDate || null,

    // Mantenimiento
    mileage: vehicleData.mileage || 0,

    // Estado
    status: vehicleData.status || "active",

    // Metadata
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),

    ...vehicleData,
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
 * Obtener vehículo por ID
 */
exports.getVehicleById = async (vehicleId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { vehicleId },
    }),
  );

  return result.Item;
};

/**
 * Obtener vehículos por usuario
 */
exports.getVehiclesByUser = async (userId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "userId-index",
      KeyConditionExpression: "userId = :userId",
      ExpressionAttributeValues: {
        ":userId": userId,
      },
    }),
  );

  return result.Items || [];
};

/**
 * Obtener vehículo por placa
 */
exports.getVehicleByPlate = async (plate) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "plate-index",
      KeyConditionExpression: "plate = :plate",
      ExpressionAttributeValues: {
        ":plate": plate,
      },
    }),
  );

  return result.Items?.[0];
};

/**
 * Listar todos los vehículos
 */
exports.listVehicles = async (filters = {}) => {
  const params = {
    TableName: TABLE,
  };

  if (filters.status) {
    params.FilterExpression = "#status = :status";
    params.ExpressionAttributeNames = { "#status": "status" };
    params.ExpressionAttributeValues = { ":status": filters.status };
  }

  const result = await docClient.send(new ScanCommand(params));
  return result.Items || [];
};

/**
 * Actualizar vehículo
 */
exports.updateVehicle = async (vehicleId, updates) => {
  const updateExpressions = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {};

  Object.keys(updates).forEach((key, index) => {
    const attrName = `#attr${index}`;
    const attrValue = `:val${index}`;

    updateExpressions.push(`${attrName} = ${attrValue}`);
    expressionAttributeNames[attrName] = key;
    expressionAttributeValues[attrValue] = updates[key];
  });

  updateExpressions.push("#updatedAt = :updatedAt");
  expressionAttributeNames["#updatedAt"] = "updatedAt";
  expressionAttributeValues[":updatedAt"] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { vehicleId },
      UpdateExpression: `SET ${updateExpressions.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};

/**
 * Eliminar vehículo
 */
exports.deleteVehicle = async (vehicleId) => {
  await docClient.send(
    new DeleteCommand({
      TableName: TABLE,
      Key: { vehicleId },
    }),
  );

  return true;
};

/**
 * Verificar si placa existe
 */
exports.plateExists = async (plate) => {
  const vehicle = await exports.getVehicleByPlate(plate);
  return !!vehicle;
};
