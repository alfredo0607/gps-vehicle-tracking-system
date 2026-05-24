const { GetCommand, UpdateCommand, ScanCommand } = require('@aws-sdk/lib-dynamodb');
const { docClient } = require('../aws/clients');
const config = require('../../config');

const TABLE = config.tables.users; // 'Usuarios'

/**
 * Buscar usuario por email (Scan con FilterExpression)
 * Para mejor performance en producción, agregar un GSI sobre el campo email
 */
exports.getUserByEmail = async (email) => {
  const result = await docClient.send(
    new ScanCommand({
      TableName: TABLE,
      FilterExpression: 'email = :email',
      ExpressionAttributeValues: { ':email': email },
    })
  );
  return result.Items?.[0] || null;
};

/**
 * Buscar usuario por userId (clave primaria)
 */
exports.getUserById = async (userId) => {
  const result = await docClient.send(
    new GetCommand({
      TableName: TABLE,
      Key: { userId },
    })
  );
  return result.Item || null;
};

/**
 * Actualizar campos del usuario
 */
exports.updateUser = async (userId, updates) => {
  const expressions = [];
  const names = {};
  const values = {};

  Object.entries(updates).forEach(([key, val], i) => {
    expressions.push(`#k${i} = :v${i}`);
    names[`#k${i}`] = key;
    values[`:v${i}`] = val;
  });

  expressions.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();

  const result = await docClient.send(
    new UpdateCommand({
      TableName: TABLE,
      Key: { userId },
      UpdateExpression: `SET ${expressions.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ReturnValues: 'ALL_NEW',
    })
  );
  return result.Attributes;
};
