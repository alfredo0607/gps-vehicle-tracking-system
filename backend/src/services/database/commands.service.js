const {
  PutCommand,
  GetCommand,
  QueryCommand,
  UpdateCommand,
} = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../aws/clients");
const config = require("../../config");
const { v4: uuidv4 } = require("uuid");

const TABLE = config.tables.commands || "Comandos";

/**
 * Crear nuevo comando
 */
exports.createCommand = async (commandData) => {
  const item = {
    commandId: `cmd-${uuidv4()}`,
    gpsId: commandData.gpsId,
    vehicleId: commandData.vehicleId,
    command: commandData.command,
    parameters: commandData.parameters || {},
    status: "pending",
    createdAt: new Date().toISOString(),
    sentAt: null,
    acknowledgedAt: null,
    executedAt: null,
    failedAt: null,
    response: null,
    userId: commandData.userId,
    ttl: Math.floor(Date.now() / 1000) + 30 * 24 * 60 * 60, // 30 días
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
 * Obtener comando por ID
 */
exports.getCommandById = async (commandId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { commandId },
    }),
  );

  return result.Item;
};

/**
 * Obtener comandos de un GPS
 */
exports.getCommandsByGPS = async (gpsId, limit = 50) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "gpsId-createdAt-index",
      KeyConditionExpression: "gpsId = :gpsId",
      ExpressionAttributeValues: {
        ":gpsId": gpsId,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );

  return result.Items || [];
};

/**
 * Obtener comandos pendientes
 */
exports.getPendingCommands = async () => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "status-index",
      KeyConditionExpression: "#status = :status",
      ExpressionAttributeNames: {
        "#status": "status",
      },
      ExpressionAttributeValues: {
        ":status": "pending",
      },
    }),
  );

  return result.Items || [];
};

/**
 * Actualizar estado del comando
 */
exports.updateCommandStatus = async (commandId, status, response = null) => {
  const now = new Date().toISOString();
  const statusField = `${status}At`;

  const updateExpression = ["#status = :status", `${statusField} = :now`];

  const expressionAttributeNames = {
    "#status": "status",
  };

  const expressionAttributeValues = {
    ":status": status,
    ":now": now,
  };

  if (response) {
    updateExpression.push("response = :response");
    expressionAttributeValues[":response"] = response;
  }

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { commandId },
      UpdateExpression: `SET ${updateExpression.join(", ")}`,
      ExpressionAttributeNames: expressionAttributeNames,
      ExpressionAttributeValues: expressionAttributeValues,
      ReturnValues: "ALL_NEW",
    }),
  );

  return result.Attributes;
};
