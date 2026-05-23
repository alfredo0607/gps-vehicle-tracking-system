const { QueryCommand } = require("@aws-sdk/lib-dynamodb");
const { docClient } = require("../aws/clients");
const config = require("../../config");

const TABLE = config.tables.coordinates;

/**
 * Obtener coordenadas en un rango de tiempo
 */
exports.getCoordinates = async (gpsId, startTime, endTime, limit = 1000) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      IndexName: "gpsId-timestamp-index", // 👈 AGREGAR ESTO
      KeyConditionExpression: "gpsId = :gpsId AND #ts BETWEEN :start AND :end",
      ExpressionAttributeNames: {
        "#ts": "timestamp",
      },
      ExpressionAttributeValues: {
        ":gpsId": gpsId,
        ":start": startTime,
        ":end": endTime,
      },
      ScanIndexForward: false,
      Limit: limit,
    }),
  );

  return result.Items || [];
};

/**
 * Obtener coordenadas de hoy
 */
exports.getTodayCoordinates = async (gpsId) => {
  const now = new Date();
  const startOfDay = new Date(now.setHours(0, 0, 0, 0));
  const endOfDay = new Date(now.setHours(23, 59, 59, 999));

  return await exports.getCoordinates(
    gpsId,
    startOfDay.getTime(),
    endOfDay.getTime(),
  );
};

/**
 * Obtener última coordenada
 */
exports.getLastCoordinate = async (gpsId) => {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE,
      KeyConditionExpression: "gpsId = :gpsId",
      ExpressionAttributeValues: {
        ":gpsId": gpsId,
      },
      ScanIndexForward: false,
      Limit: 1,
    }),
  );

  return result.Items?.[0];
};

/**
 * Calcular estadísticas
 */
exports.calculateStats = async (gpsId, startTime, endTime) => {
  const coordinates = await exports.getCoordinates(
    gpsId,
    startTime,
    endTime,
    10000,
  );

  if (coordinates.length === 0) {
    return {
      totalPoints: 0,
      distance: 0,
      duration: 0,
      maxSpeed: 0,
      avgSpeed: 0,
      timeMoving: 0,
      timeStopped: 0,
    };
  }

  let totalDistance = 0;
  let maxSpeed = 0;
  let totalSpeed = 0;
  let timeMoving = 0;
  let timeStopped = 0;

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];

    // Distancia
    const dist = calculateDistance(
      prev.latitude,
      prev.longitude,
      curr.latitude,
      curr.longitude,
    );
    totalDistance += dist;

    // Velocidad
    const speed = parseFloat(curr.speed || 0);
    maxSpeed = Math.max(maxSpeed, speed);
    totalSpeed += speed;

    // Tiempo
    const timeDiff =
      Math.abs(new Date(prev.timestamp) - new Date(curr.timestamp)) / 1000; // segundos
    if (speed > 5) {
      timeMoving += timeDiff;
    } else {
      timeStopped += timeDiff;
    }
  }

  const duration =
    Math.abs(
      new Date(coordinates[0].timestamp) -
        new Date(coordinates[coordinates.length - 1].timestamp),
    ) / 1000;

  return {
    totalPoints: coordinates.length,
    distance: parseFloat(totalDistance.toFixed(2)), // km
    duration: Math.floor(duration / 60), // minutos
    maxSpeed: parseFloat(maxSpeed.toFixed(1)),
    avgSpeed: parseFloat((totalSpeed / coordinates.length).toFixed(1)),
    timeMoving: Math.floor(timeMoving / 60), // minutos
    timeStopped: Math.floor(timeStopped / 60), // minutos
  };
};

/**
 * Calcular distancia entre dos puntos (Haversine)
 */
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}
