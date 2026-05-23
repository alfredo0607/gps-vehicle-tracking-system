const fs = require('fs');
// query-locations.js
// Script para consultar las ubicaciones guardadas en Amazon Location Service

const AWS = require('aws-sdk');

// Configuración
const REGION = 'us-east-1'; // Cambiar por tu región
const TRACKER_NAME = 'VehicleTracker';
const DEVICE_ID = 'teltonika-fmc920-001'; // Cambiar por tu device ID

// Inicializar cliente
AWS.config.update({ region: REGION });

const location = new AWS.Location({
  region: REGION,
});

console.log('╔════════════════════════════════════════════════╗');
console.log('║   Consultar Ubicaciones - Location Service    ║');
console.log('╚════════════════════════════════════════════════╝\n');

async function getAllDevicePositions() {
  try {
    console.log(`📡 Consultando TODO el historial del dispositivo: ${DEVICE_ID}`);
    console.log(`📍 Tracker: ${TRACKER_NAME}`);
    console.log(`🌎 Región: ${REGION}\n`);

    let allPositions = [];
    let nextToken = null;
    let page = 1;

    do {
      console.log(`🔎 Consultando página ${page}...`);

      const params = {
        TrackerName: TRACKER_NAME,
        DeviceId: DEVICE_ID,
        MaxResults: 100,
        NextToken: nextToken || undefined,
      };

      const result = await location.getDevicePositionHistory(params).promise();

      if (result.DevicePositions) {
        allPositions = allPositions.concat(result.DevicePositions);
      }

      nextToken = result.NextToken;
      page++;
    } while (nextToken);

    console.log(`\n✅ Total posiciones recuperadas: ${allPositions.length}`);

    // Ordenar por fecha ascendente
    allPositions.sort((a, b) => new Date(a.SampleTime) - new Date(b.SampleTime));

    // Transformar datos para JSON limpio
    const formattedData = allPositions.map((position) => {
      const [lon, lat] = position.Position;
      return {
        deviceId: position.DeviceId,
        sampleTime: position.SampleTime,
        receivedTime: position.ReceivedTime,
        latitude: lat,
        longitude: lon,
        accuracy: position.Accuracy?.Horizontal || null,
        properties: position.PositionProperties || {},
      };
    });

    // Guardar archivo JSON
    const fileName = `gps-history-${DEVICE_ID}.json`;
    fs.writeFileSync(fileName, JSON.stringify(formattedData, null, 2));

    console.log(`\n📁 Archivo JSON creado: ${fileName}`);
    console.log('✅ Exportación completada correctamente\n');
  } catch (error) {
    console.error('❌ Error obteniendo historial completo:', error.message);
  }
}

// Función para consultar ubicaciones
async function getDevicePositions() {
  try {
    console.log(`📡 Consultando ubicaciones del dispositivo: ${DEVICE_ID}`);
    console.log(`📍 Tracker: ${TRACKER_NAME}`);
    console.log(`🌎 Región: ${REGION}\n`);

    const params = {
      TrackerName: TRACKER_NAME,
      DeviceId: DEVICE_ID,
      MaxResults: 100,
    };

    let result = null;

    try {
      result = await location.getDevicePositionHistory(params).promise();
    } catch (error) {
      console.log(error);
    }

    console.log('=========>', result);

    if (result.DevicePositions && result.DevicePositions.length > 0) {
      console.log(`✅ Se encontraron ${result.DevicePositions.length} ubicaciones:\n`);
      console.log('═'.repeat(80));

      result.DevicePositions.forEach((position, index) => {
        const timestamp = new Date(position.SampleTime);
        const [lon, lat] = position.Position;
        const props = position.PositionProperties || {};

        console.log(`\n📍 Ubicación #${index + 1}`);
        console.log(`   🕐 Timestamp:  ${timestamp.toLocaleString('es-CO')}`);
        console.log(`   📊 Latitud:    ${lat.toFixed(6)}`);
        console.log(`   📊 Longitud:   ${lon.toFixed(6)}`);
        console.log(`   🚗 Velocidad:  ${props.speed || 'N/A'} km/h`);
        console.log(`   🧭 Rumbo:      ${props.heading || 'N/A'}°`);
        console.log(`   ⛰️  Altitud:    ${props.altitude || 'N/A'} m`);
        console.log(`   🎯 Precisión:  ${position.Accuracy?.Horizontal || 'N/A'} m`);

        // Generar link a Google Maps
        const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
        console.log(`   🗺️  Google Maps: ${mapsUrl}`);
        console.log('   ' + '─'.repeat(70));
      });

      console.log('\n═'.repeat(80));
      console.log(`\n✅ Total de ubicaciones recuperadas: ${result.DevicePositions.length}`);

      // Mostrar estadísticas
      if (result.DevicePositions.length > 1) {
        const speeds = result.DevicePositions.map((p) =>
          parseFloat(p.PositionProperties?.speed || 0)
        ).filter((s) => s > 0);

        if (speeds.length > 0) {
          const avgSpeed = speeds.reduce((a, b) => a + b, 0) / speeds.length;
          const maxSpeed = Math.max(...speeds);

          console.log('\n📈 Estadísticas:');
          console.log(`   Velocidad promedio: ${avgSpeed.toFixed(1)} km/h`);
          console.log(`   Velocidad máxima:   ${maxSpeed.toFixed(1)} km/h`);
        }

        // Calcular distancia recorrida (aproximada)
        let totalDistance = 0;
        for (let i = 1; i < result.DevicePositions.length; i++) {
          const [lon1, lat1] = result.DevicePositions[i - 1].Position;
          const [lon2, lat2] = result.DevicePositions[i].Position;
          totalDistance += calculateDistance(lat1, lon1, lat2, lon2);
        }

        console.log(`   Distancia recorrida: ${totalDistance.toFixed(2)} km`);
      }
    } else {
      console.log('⚠️  No se encontraron ubicaciones para este dispositivo');
      console.log('\nPosibles causas:');
      console.log('  1. El dispositivo aún no ha enviado datos');
      console.log('  2. El Device ID es incorrecto');
      console.log('  3. Lambda no está guardando correctamente los datos');
      console.log('\nVerifica:');
      console.log('  - CloudWatch Logs de Lambda');
      console.log('  - MQTT Test Client en IoT Core');
    }
  } catch (error) {
    console.error('\n❌ ERROR al consultar ubicaciones:');
    console.error(`   ${error.message}`);

    if (error.code === 'ResourceNotFoundException') {
      console.error('\n💡 El tracker no existe o el nombre es incorrecto');
      console.error('   Verifica que el tracker se llame exactamente: VehicleTracker');
    } else if (error.code === 'AccessDeniedException') {
      console.error('\n💡 No tienes permisos para acceder a Location Service');
      console.error('   Verifica tus credenciales de AWS CLI');
    }
  }
}

// Función para obtener la última posición del dispositivo
async function getLatestPosition() {
  try {
    const sts = new AWS.STS();
    const identity = await sts.getCallerIdentity().promise();
    console.log('Cuenta Script:', identity.Account);

    const params = {
      TrackerName: TRACKER_NAME,
      DeviceIds: [DEVICE_ID],
    };

    const result = await location.batchGetDevicePosition(params).promise();

    if (result.DevicePositions && result.DevicePositions.length > 0) {
      const position = result.DevicePositions[0];
      const timestamp = new Date(position.SampleTime);
      const [lon, lat] = position.Position;

      console.log('\n╔════════════════════════════════════════════════╗');
      console.log('║          📍 ÚLTIMA POSICIÓN CONOCIDA          ║');
      console.log('╚════════════════════════════════════════════════╝\n');

      console.log(`   Device ID:    ${position.DeviceId}`);
      console.log(`   Timestamp:    ${timestamp.toLocaleString('es-CO')}`);
      console.log(`   Latitud:      ${lat.toFixed(6)}`);
      console.log(`   Longitud:     ${lon.toFixed(6)}`);

      const timeDiff = Date.now() - timestamp.getTime();
      const minutesAgo = Math.floor(timeDiff / 60000);

      if (minutesAgo < 1) {
        console.log(`   Actualización: Hace ${Math.floor(timeDiff / 1000)} segundos ✅`);
      } else if (minutesAgo < 60) {
        console.log(`   Actualización: Hace ${minutesAgo} minutos`);
      } else {
        console.log(`   Actualización: Hace ${Math.floor(minutesAgo / 60)} horas`);
      }

      const mapsUrl = `https://www.google.com/maps?q=${lat},${lon}`;
      console.log(`\n   🗺️  Ver en Google Maps:\n   ${mapsUrl}\n`);
    } else {
      console.log('\n⚠️  No se encontró ninguna posición para este dispositivo\n');
    }
  } catch (error) {
    console.error('\n❌ ERROR al obtener última posición:', error.message);
  }
}

// Calcular distancia entre dos puntos (fórmula Haversine)
function calculateDistance(lat1, lon1, lat2, lon2) {
  const R = 6371; // Radio de la Tierra en km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees) {
  return degrees * (Math.PI / 180);
}

// Ejecutar consultas
async function main() {
  console.log('Iniciando consulta...\n');

  // Primero obtener la última posición
  await getLatestPosition();

  // Luego el historial
  await getDevicePositions();

  getAllDevicePositions();

  console.log('\n✅ Consulta completada\n');
}

// Ejecutar
main().catch((error) => {
  console.error('\n❌ Error fatal:', error);
  process.exit(1);
});
