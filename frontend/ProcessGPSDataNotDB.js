const AWS = require("aws-sdk");
const location = new AWS.Location();

const TRACKER_NAME = "VehicleTracker";

exports.handler = async (event) => {
  console.log("📡 Evento recibido:", JSON.stringify(event, null, 2));

  try {
    let gpsData;

    // Detectar formato de datos
    if (event.state && event.state.reported) {
      console.log("✅ Formato detectado: Teltonika Device Shadow");
      gpsData = parseTeltonikaDeviceShadow(event);
    } else if (event.latlng) {
      console.log("✅ Formato detectado: Teltonika Direct Report");
      gpsData = parseTeltonikaDirectReport(event);
    } else if (event.gps && event.gps.latitude) {
      console.log("✅ Formato detectado: Teltonika JSON GPS");
      gpsData = parseTeltonikaJSON(event);
    } else if (event.latitude && event.longitude) {
      console.log("✅ Formato detectado: JSON Simple");
      gpsData = parseSimpleJSON(event);
    } else {
      console.error("❌ Formato de datos no reconocido");
      console.error("Estructura recibida:", Object.keys(event));
      return { statusCode: 400, body: "Formato desconocido" };
    }

    if (!gpsData) {
      console.error("❌ No se pudieron parsear los datos GPS");
      return { statusCode: 400, body: "Error parseando datos GPS" };
    }

    console.log(
      "✅ Datos GPS parseados correctamente:",
      JSON.stringify(gpsData, null, 2),
    );

    // Validar coordenadas
    if (!isValidCoordinates(gpsData.latitude, gpsData.longitude)) {
      console.error("❌ Coordenadas inválidas:", {
        latitude: gpsData.latitude,
        longitude: gpsData.longitude,
      });
      return { statusCode: 400, body: "Coordenadas inválidas" };
    }

    console.log("✅ Coordenadas válidas:", {
      lat: gpsData.latitude,
      lon: gpsData.longitude,
    });

    // Guardar en Location Service
    const result = await saveToLocationService(gpsData);
    console.log("✅ Ubicación guardada en Location Service:", result);

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Ubicación procesada exitosamente",
        device: gpsData.deviceId,
        location: {
          latitude: gpsData.latitude,
          longitude: gpsData.longitude,
        },
      }),
    };
  } catch (error) {
    console.error("❌ Error procesando datos GPS:", error);
    console.error("Stack:", error.stack);
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
      console.error("❌ Campo latlng no encontrado");
      return null;
    }

    const [latStr, lonStr] = latlngString.split(",");
    const latitude = parseFloat(latStr);
    const longitude = parseFloat(lonStr);

    const deviceId = event.clientId || "teltonika-fmc920-001";
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
      ignition: reported["239"] === 1,
      movement: reported["240"] === 1,
      batteryVoltage: reported["67"] || 0,
      externalVoltage: reported["66"] || 0,
    };
  } catch (error) {
    console.error("❌ Error parseando Device Shadow:", error);
    return null;
  }
}

/**
 * Parsear reporte directo de Teltonika
 */
function parseTeltonikaDirectReport(event) {
  try {
    const [latStr, lonStr] = event.latlng.split(",");

    return {
      deviceId: event.deviceId || "teltonika-fmc920-001",
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
    console.error("❌ Error parseando Direct Report:", error);
    return null;
  }
}

/**
 * Parsear JSON tradicional de Teltonika
 */
function parseTeltonikaJSON(event) {
  try {
    return {
      deviceId: event.device_id || event.imei || "teltonika-fmc920-001",
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
    console.error("❌ Error parseando JSON:", error);
    return null;
  }
}

/**
 * Parsear JSON simple
 */
function parseSimpleJSON(event) {
  try {
    return {
      deviceId: event.deviceId || event.imei || "unknown",
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
    console.error("❌ Error parseando JSON simple:", error);
    return null;
  }
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
    console.error("Validación falló:", {
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

  console.log("📤 Enviando a Location Service");

  try {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    console.log("Cuenta Script:", identity.Account);

    const result = await location.batchUpdateDevicePosition(params).promise();

    if (result.Errors && result.Errors.length > 0) {
      console.error("⚠️ Errores:", result.Errors);
    } else {
      console.log("✅ Guardado exitosamente");
    }

    return result;
  } catch (error) {
    console.error("❌ Error en Location Service:", error.message);
    throw error;
  }
}
