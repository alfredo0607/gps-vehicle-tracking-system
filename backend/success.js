const AWS = require('aws-sdk');
const location = new AWS.Location();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const TRACKER_NAME = 'VehicleTracker';
const TABLE_GPS = 'GPS';
const TABLE_VEHICULOS = 'Vehiculos';
const TABLE_COORDENADAS = 'Coordenadas';

exports.handler = async (event) => {
  console.log('📡 Evento recibido:', JSON.stringify(event, null, 2));

  try {
    const gpsData = await paseDataEvent(event);

    if (!gpsData) {
      console.error('❌ No se pudieron parsear los datos GPS');
      return { statusCode: 400, body: 'Error parseando datos GPS' };
    }

    console.log('✅ Datos GPS parseados correctamente:', JSON.stringify(gpsData, null, 2));

    // 2. Buscar GPS en base de datos para obtener vehicleId
    const gps = await getGPS(gpsData.deviceId);

    if (!gps) {
      console.warn('⚠️ GPS no registrado en BD:', gpsData.deviceId);
      return {
        statusCode: 400,
        body: '⚠️ GPS no registrado en BD:',
        data: gpsData.deviceId,
      };
    }

    const vehicleId = gps.vehicleId;
    const gpsId = gps.gpsId;

    // Validar coordenadas
    if (!isValidCoordinates(gpsData.latitude, gpsData.longitude)) {
      console.error('❌ Coordenadas inválidas:', {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
      });
      return { statusCode: 400, body: 'Coordenadas inválidas' };
    }

    console.log('✅ Coordenadas válidas:', {
      lat: gpsData.latitude,
      lon: gpsData.longitude,
    });

    // Guardar en Location Service
    const result = await saveToLocationService(gpsData);
    console.log('✅ Ubicación guardada en Location Service:', result);

    // Guardar coordenada completa db
    await saveCoordinate(gpsId, vehicleId, gpsData, event?.state?.reported);
    console.log('✅ Coordenada guardada');

    // 5. Actualizar última posición del GPS
    await updateGPSLastPosition(gpsId, gpsData);
    console.log('✅ GPS actualizado');

    // 6. Actualizar odómetro del vehículo (si tiene)
    if (vehicleId && event?.state?.reported['16']) {
      await updateVehicleOdometer(vehicleId, event?.state?.reported['16']);
      console.log('✅ Vehículo actualizado');
    }

    // 7. Detectar y guardar eventos
    await detectEvents(gpsId, vehicleId, gpsData, event?.state?.reported);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: 'Ubicación procesada exitosamente',
        device: gpsData.deviceId,
        location: {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
        },
      }),
    };
  } catch (error) {
    console.error('❌ Error procesando datos GPS:', error);
    console.error('Stack:', error.stack);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: error.message,
        type: error.name,
      }),
    };
  }
};

/**
 * Parsear Device Shadow de Teltonika
 */
function parseTeltonikaDeviceShadow(event) {
  try {
    const reported = event.state.reported;

    // Extraer coordenadas del campo latlng (formato: "lat,lng")
    const latlngString = reported.latlng;
    if (!latlngString) {
      console.error('❌ Campo latlng no encontrado');
      return null;
    }

    const [latStr, lonStr] = latlngString.split(',');
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    const deviceId = event.clientId;
    const timestamp = new Date().toISOString();

    return {
      deviceId,
      latitude,
      longitude,
      altitude: reported.alt || 0,
      speed: reported.sp || 0,
      heading: reported.ang || 0,
      satellites: reported.sat || 0,
      timestamp,
      accuracy: 10,
      // Datos adicionales (no se envían a Location Service)
      ignition: reported['239'] === 1,
      movement: reported['240'] === 1,
      batteryVoltage: reported['67'] || 0,
      externalVoltage: reported['66'] || 0,
    };
  } catch (error) {
    console.error('❌ Error parseando Device Shadow:', error);
    return null;
  }
}

/**
 * Parsear reporte directo de Teltonika
 */
function parseTeltonikaDirectReport(event) {
  try {
    const [latStr, lonStr] = event.latlng.split(',');

    return {
      deviceId: event.deviceId,
      latitude: parseFloat(latStr),
      longitude: parseFloat(lonStr),
      altitude: event.alt || 0,
      speed: event.sp || 0,
      heading: event.ang || 0,
      satellites: event.sat || 0,
      timestamp: new Date().toISOString(),
      accuracy: 10,
    };
  } catch (error) {
    console.error('❌ Error parseando Direct Report:', error);
    return null;
  }
}

/**
 * Parsear JSON tradicional de Teltonika
 */
function parseTeltonikaJSON(event) {
  try {
    return {
      deviceId: event.device_id,
      latitude: parseFloat(event.gps.latitude),
      longitude: parseFloat(event.gps.longitude),
      altitude: parseFloat(event.gps.altitude || 0),
      speed: parseFloat(event.gps.speed || 0),
      heading: parseFloat(event.gps.angle || event.gps.heading || 0),
      satellites: parseInt(event.gps.satellites || 0),
      timestamp: new Date().toISOString(),
      accuracy: 10,
    };
  } catch (error) {
    console.error('❌ Error parseando JSON:', error);
    return null;
  }
}

/**
 * Parsear JSON simple
 */
function parseSimpleJSON(event) {
  try {
    return {
      deviceId: event.deviceId || event.imei || 'unknown',
      latitude: parseFloat(event.latitude),
      longitude: parseFloat(event.longitude),
      altitude: parseFloat(event.altitude || 0),
      speed: parseFloat(event.speed || 0),
      heading: parseFloat(event.heading || event.course || 0),
      satellites: parseInt(event.satellites || 0),
      timestamp: new Date().toISOString(),
      accuracy: parseFloat(event.accuracy || 10),
    };
  } catch (error) {
    console.error('❌ Error parseando JSON simple:', error);
    return null;
  }
}

function paseDataEvent(event) {
  let gpsData;

  // Detectar formato de datos
  if (event.state && event.state.reported) {
    console.log('✅ Formato detectado: Teltonika Device Shadow');
    gpsData = parseTeltonikaDeviceShadow(event);
  } else if (event.latlng) {
    console.log('✅ Formato detectado: Teltonika Direct Report');
    gpsData = parseTeltonikaDirectReport(event);
  } else if (event.gps && event.gps.latitude) {
    console.log('✅ Formato detectado: Teltonika JSON GPS');
    gpsData = parseTeltonikaJSON(event);
  } else if (event.latitude && event.longitude) {
    console.log('✅ Formato detectado: JSON Simple');
    gpsData = parseSimpleJSON(event);
  } else {
    console.error('❌ Formato de datos no reconocido');
    console.error('Estructura recibida:', Object.keys(event));
    return { statusCode: 400, body: 'Formato desconocido' };
  }

  return gpsData;
}

/**
 * Validar coordenadas
 */
function isValidCoordinates(lat, lon) {
  const isValid =
    lat &&
    lon &&
    !isNaN(lat) &&
    !isNaN(lon) &&
    lat >= -90 &&
    lat <= 90 &&
    lon >= -180 &&
    lon <= 180;

  if (!isValid) {
    console.error('Validación falló:', {
      lat,
      lon,
      isNaN_lat: isNaN(lat),
      isNaN_lon: isNaN(lon),
    });
  }

  return isValid;
}

/**
 * Guardar en Location Service
 * IMPORTANTE: PositionProperties solo permite MÁXIMO 3 propiedades
 */
async function saveToLocationService(gpsData) {
  const params = {
    TrackerName: TRACKER_NAME,
    Updates: [
      {
        DeviceId: gpsData.deviceId,
        Position: [gpsData.longitude, gpsData.latitude],
        SampleTime: gpsData.timestamp,
        Accuracy: {
          Horizontal: gpsData.accuracy,
        },
        // SOLO 3 PROPIEDADES - Las más importantes
        PositionProperties: {
          speed: String(gpsData.speed),
          heading: String(gpsData.heading),
          altitude: String(gpsData.altitude),
        },
      },
    ],
  };

  console.log('📤 Enviando a Location Service');

  try {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    console.log('Cuenta Script:', identity.Account);

    const result = await location.batchUpdateDevicePosition(params).promise();

    if (result.Errors && result.Errors.length > 0) {
      console.error('⚠️ Errores:', result.Errors);
    } else {
      console.log('✅ Guardado exitosamente');
    }

    return result;
  } catch (error) {
    console.error('❌ Error en Location Service:', error.message);
    throw error;
  }
}

/**
 * Buscar GPS en base de datos
 */
async function getGPS(deviceId) {
  try {
    const result = await dynamodb
      .query({
        TableName: TABLE_GPS,
        IndexName: 'deviceId-index',
        KeyConditionExpression: 'deviceId = :deviceId',
        ExpressionAttributeValues: {
          ':deviceId': deviceId,
        },
        Limit: 1,
      })
      .promise();

    console.log('================>', result);

    return result.Items?.[0] || null;
  } catch (error) {
    console.error('Error buscando GPS:', error);
    return null;
  }
}

/**
 * Guardar coordenada
 */
async function saveCoordinate(gpsId, vehicleId, gpsData, rawData) {
  const timestamp = new Date(gpsData.timestamp).getTime();
  const date = new Date(gpsData.timestamp).toISOString().split('T')[0];
  const dateObj = new Date(gpsData.timestamp);

  const item = {
    coordenadaId: randomId(),
    gpsId: gpsId,
    vehicleId: vehicleId, // ← Nuevo campo
    timestamp: timestamp,
    date: date,
    hour: dateObj.getUTCHours(),
    dayOfWeek: dateObj.getUTCDay(),

    // Posición
    latitude: gpsData.latitude,
    longitude: gpsData.longitude,
    altitude: gpsData.altitude,

    // Movimiento
    speed: gpsData.speed,
    heading: gpsData.heading,

    // GPS
    satellites: gpsData.satellites,
    accuracy: gpsData.accuracy,

    // Telemetría
    ignition: rawData && rawData['239'] === 1,
    movement: rawData && rawData['240'] === 1,
    odometer: (rawData && rawData['16']) || 0,
    batteryVoltage: (rawData && rawData['67']) || 0,
    externalVoltage: (rawData && rawData['66']) || 0,
    gsmSignal: (rawData && rawData['21']) || 0,

    // IO completo
    io: rawData,

    // Metadata
    createdAt: new Date().toISOString(),
    processedAt: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + 90 * 24 * 60 * 60,
  };

  await dynamodb
    .put({
      TableName: TABLE_COORDENADAS,
      Item: item,
    })
    .promise();
}

/**
 * Actualizar última posición del GPS
 */
async function updateGPSLastPosition(gpsId, gpsData) {
  await dynamodb
    .update({
      TableName: TABLE_GPS,
      Key: { gpsId: gpsId },
      UpdateExpression: `
            SET lastLatitude = :lat,
                lastLongitude = :lon,
                lastSpeed = :speed,
                lastHeading = :heading,
                lastAltitude = :alt,
                lastSatellites = :sat,
                lastUpdate = :update,
                updatedAt = :now,
                #online = :online
        `,
      ExpressionAttributeNames: {
        '#online': 'online',
      },
      ExpressionAttributeValues: {
        ':lat': gpsData.latitude,
        ':lon': gpsData.longitude,
        ':speed': gpsData.speed,
        ':heading': gpsData.heading,
        ':alt': gpsData.altitude,
        ':sat': gpsData.satellites,
        ':update': gpsData.timestamp,
        ':now': new Date().toISOString(),
        ':online': true,
      },
    })
    .promise();
}

/**
 * Actualizar odómetro del vehículo
 */
async function updateVehicleOdometer(vehicleId, odometer) {
  await dynamodb
    .update({
      TableName: TABLE_VEHICULOS,
      Key: { vehicleId: vehicleId },
      UpdateExpression: 'SET mileage = :mileage, updatedAt = :now',
      ExpressionAttributeValues: {
        ':mileage': odometer,
        ':now': new Date().toISOString(),
      },
    })
    .promise();
}

/**
 * Detectar eventos (velocidad excesiva, etc)
 */
async function detectEvents(gpsId, vehicleId, gpsData, rawData) {
  // Ejemplo: Exceso de velocidad
  if (gpsData.speed > 80) {
    console.log('⚠️ ALERTA: Exceso de velocidad');
    // Aquí podrías guardar el evento o enviar notificación
  }

  // Ejemplo: Ignición encendida
  if (rawData && rawData['239'] === 1) {
    console.log('🔑 Ignición encendida');
  }
}

function randomId() {
  return Math.random().toString(36).substring(2, 10);
}
