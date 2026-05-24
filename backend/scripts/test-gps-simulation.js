// test-gps-simulation.js
// Simulador GPS Teltonika FMC920 que sigue una ruta real via OSRM → AWS IoT Core

const mqtt = require('mqtt');
const fs = require('fs');
const https = require('https');

// ============================================
// CONFIGURACIÓN
// ============================================

const CONFIG = {
  // AWS IoT Core
  endpoint: 'a26nyy2azt7l87-ats.iot.us-east-1.amazonaws.com',
  deviceId: '1130267052',
  certPath: './certificate/certificate.pem.crt',
  keyPath: './certificate/private.pem.key',
  caPath: './certificate/AmazonRootCA1.pem',
  topic: 'vehicles/1130267052/data',

  // Envío
  intervalSeconds: 5,

  // ── RUTA ──────────────────────────────────
  // Cambia estas coordenadas para definir inicio y fin
  startPoint: { lat: 10.867347, lon: -74.775408 }, // Inicio
  endPoint: { lat: 10.9639, lon: -74.7964 }, // Fin

  avgSpeed: 40, // km/h promedio en ruta
  loopRoute: true, // Al llegar al fin, volver a empezar
};

// ============================================
// ESTADO DE LA RUTA
// ============================================

let waypoints = []; // [{lat, lon}, ...] obtenidos de OSRM
let waypointIndex = 0; // Índice del waypoint actual
let currentPos = { lat: CONFIG.startPoint.lat, lon: CONFIG.startPoint.lon };
let currentSpeed = CONFIG.avgSpeed;
let currentHeading = 0;
let odometer = 23246;
let messageCount = 0;
let publishInterval = null;

// ============================================
// HELPERS DE GEOMETRÍA
// ============================================

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

// Distancia Haversine entre dos puntos (km)
function haversineKm(a, b) {
  const R = 6371;
  const dLat = toRad(b.lat - a.lat);
  const dLon = toRad(b.lon - a.lon);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

// Rumbo inicial de a → b (grados, Norte=0°)
function bearingDeg(a, b) {
  const dLon = toRad(b.lon - a.lon);
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ============================================
// OBTENER RUTA REAL DESDE OSRM
// ============================================

function fetchRoute(start, end) {
  return new Promise((resolve, reject) => {
    const url =
      `https://router.project-osrm.org/route/v1/driving/` +
      `${start.lon},${start.lat};${end.lon},${end.lat}` +
      `?overview=full&geometries=geojson`;

    console.log('🗺️  Obteniendo ruta real desde OSRM...');
    console.log(`   Inicio: ${start.lat}, ${start.lon}`);
    console.log(`   Fin:    ${end.lat}, ${end.lon}`);

    https
      .get(url, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          try {
            const json = JSON.parse(data);
            if (json.code !== 'Ok') {
              return reject(new Error(`OSRM respondió: ${json.code} — ${json.message || ''}`));
            }
            const coords = json.routes[0].geometry.coordinates; // [[lon, lat], ...]
            const pts = coords.map(([lon, lat]) => ({ lat, lon }));
            const totalKm = json.routes[0].distance / 1000;
            console.log(`   ✅ Ruta obtenida: ${pts.length} puntos, ${totalKm.toFixed(1)} km\n`);
            resolve(pts);
          } catch (err) {
            reject(new Error(`Error parseando respuesta OSRM: ${err.message}`));
          }
        });
      })
      .on('error', (err) => {
        reject(new Error(`No se pudo contactar OSRM: ${err.message}`));
      });
  });
}

// ============================================
// AVANZAR A LO LARGO DE LA RUTA
// ============================================

function advanceAlongRoute() {
  if (waypoints.length === 0) return;

  // Velocidad varía levemente alrededor del promedio
  currentSpeed = CONFIG.avgSpeed + (Math.random() - 0.5) * 14;
  currentSpeed = Math.max(10, Math.min(90, currentSpeed));

  let remainingKm = (currentSpeed * CONFIG.intervalSeconds) / 3600;

  while (remainingKm > 0) {
    if (waypointIndex >= waypoints.length - 1) {
      if (CONFIG.loopRoute) {
        console.log('\n🔄 Ruta completada — reiniciando desde el origen...');
        waypointIndex = 0;
        currentPos = { ...waypoints[0] };
      } else {
        currentSpeed = 0;
        remainingKm = 0;
      }
      break;
    }

    const next = waypoints[waypointIndex + 1];
    const segKm = haversineKm(currentPos, next);

    if (remainingKm >= segKm) {
      // Supera este segmento: saltar al siguiente waypoint
      currentHeading = bearingDeg(currentPos, next);
      currentPos = { ...next };
      odometer += Math.round(segKm * 1000);
      remainingKm -= segKm;
      waypointIndex++;
    } else {
      // Avance parcial dentro del segmento
      const fraction = remainingKm / segKm;
      currentHeading = bearingDeg(currentPos, next);
      currentPos = {
        lat: currentPos.lat + (next.lat - currentPos.lat) * fraction,
        lon: currentPos.lon + (next.lon - currentPos.lon) * fraction,
      };
      odometer += Math.round(remainingKm * 1000);
      remainingKm = 0;
    }
  }
}

// ============================================
// PUBLICAR DATOS GPS
// ============================================

function sendGPSData() {
  messageCount++;
  advanceAlongRoute();

  const isMoving = currentSpeed > 1;

  const gpsData = {
    deviceId: CONFIG.deviceId,
    state: {
      reported: {
        16: odometer,
        21: 3 + Math.floor(Math.random() * 3),
        66: 12400 + Math.round(Math.random() * 800),
        67: 3900 + Math.round(Math.random() * 300),
        68: 0,
        69: 1,
        181: 8 + Math.round(Math.random() * 8),
        182: 4 + Math.round(Math.random() * 6),
        200: 0,
        239: isMoving ? 1 : 0,
        240: isMoving ? 1 : 0,
        241: 732101,

        ts: Date.now(),
        pr: 0,

        latlng: `${currentPos.lat.toFixed(6)},${currentPos.lon.toFixed(6)}`,

        alt: Math.round(20 + Math.random() * 10),
        ang: Math.round(currentHeading),
        sat: 12 + Math.floor(Math.random() * 4),
        sp: Math.round(currentSpeed),
        evt: 240,
      },
    },
  };

  const r = gpsData.state.reported;
  const progress = waypoints.length > 1 ? `waypoint ${waypointIndex + 1}/${waypoints.length}` : '';

  console.log(`\n📍 Mensaje #${messageCount} | ${new Date().toLocaleTimeString()} | ${progress}`);
  console.log(`   📊 latlng: ${r.latlng}  alt: ${r.alt}m`);
  console.log(`   🚗 sp: ${r.sp} km/h  ang: ${r.ang}°  mov: ${r['240']}`);
  console.log(`   🛰️  sat: ${r.sat}  HDOP: ${r['182']}  PDOP: ${r['181']}`);
  console.log(`   🔋 V.ext: ${r['66']}mV  V.bat: ${r['67']}mV  ign: ${r['239']}`);
  console.log(`   📏 Odómetro: ${r['16']}m  ts: ${r.ts}`);

  client.publish(CONFIG.topic, JSON.stringify(gpsData), { qos: 1 }, (err) => {
    if (err) console.error('   ❌ Error al publicar:', err.message);
    else console.log('   ✅ Publicado exitosamente');
  });
}

// ============================================
// INICIO
// ============================================

console.log('╔════════════════════════════════════════════════╗');
console.log('║   Simulador GPS Teltonika FMC920 → AWS IoT    ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Verificar certificados
const requiredFiles = [
  { path: CONFIG.certPath, name: 'Certificado' },
  { path: CONFIG.keyPath, name: 'Clave privada' },
  { path: CONFIG.caPath, name: 'CA raíz' },
];

let missingFiles = false;
requiredFiles.forEach((file) => {
  if (!fs.existsSync(file.path)) {
    console.error(`❌ ERROR: No se encuentra ${file.name}: ${file.path}`);
    missingFiles = true;
  } else {
    console.log(`✅ ${file.name} encontrado`);
  }
});

if (missingFiles) {
  console.error('\n⚠️  Coloca los certificados en la misma carpeta que este script.\n');
  process.exit(1);
}

// Obtener ruta real y luego conectar
fetchRoute(CONFIG.startPoint, CONFIG.endPoint)
  .then((pts) => {
    waypoints = pts;
    currentPos = { ...waypoints[0] };
    currentHeading = waypoints.length > 1 ? bearingDeg(waypoints[0], waypoints[1]) : 0;

    console.log('📡 Configuración:');
    console.log(`   Endpoint:  ${CONFIG.endpoint}`);
    console.log(`   Device ID: ${CONFIG.deviceId}`);
    console.log(`   Topic:     ${CONFIG.topic}`);
    console.log(`   Intervalo: ${CONFIG.intervalSeconds}s`);
    console.log(`   Loop:      ${CONFIG.loopRoute ? 'sí' : 'no'}\n`);
    console.log('🔌 Conectando a AWS IoT Core...\n');

    connectMQTT();
  })
  .catch((err) => {
    console.error(`\n❌ No se pudo obtener la ruta: ${err.message}`);
    console.error('   Verifica tu conexión a internet e intenta de nuevo.\n');
    process.exit(1);
  });

// ============================================
// MQTT
// ============================================

let client;

function connectMQTT() {
  client = mqtt.connect({
    host: CONFIG.endpoint,
    port: 8883,
    clientId: CONFIG.deviceId,
    protocol: 'mqtts',
    cert: fs.readFileSync(CONFIG.certPath),
    key: fs.readFileSync(CONFIG.keyPath),
    ca: fs.readFileSync(CONFIG.caPath),
    rejectUnauthorized: true,
    reconnectPeriod: 1000,
    keepalive: 60,
  });

  client.on('connect', () => {
    console.log('╔════════════════════════════════════════════════╗');
    console.log('║          ✅ CONECTADO A AWS IOT CORE          ║');
    console.log('╚════════════════════════════════════════════════╝\n');
    console.log(`🚀 Iniciando simulación GPS (${CONFIG.intervalSeconds}s por mensaje)`);
    console.log('🎮 Presiona Ctrl+C para detener\n');
    console.log('─'.repeat(60));

    sendGPSData();
    publishInterval = setInterval(sendGPSData, CONFIG.intervalSeconds * 1000);
  });

  client.on('error', (error) => {
    console.error('\n❌ ERROR DE CONEXIÓN:', error.message);
    if (error.message.includes('ENOTFOUND'))
      console.error('💡 Verifica que el endpoint sea correcto');
    else if (error.message.includes('certificate'))
      console.error('💡 Verifica que los certificados .pem sean correctos');
    process.exit(1);
  });

  client.on('close', () => console.log('\n🔌 Conexión cerrada'));
  client.on('offline', () => console.log('\n⚠️  Cliente offline — reconectando...'));
  client.on('reconnect', () => console.log('🔄 Reconectando...'));
}

process.on('SIGINT', () => {
  console.log('\n\n🛑 Deteniendo simulación...');
  if (publishInterval) clearInterval(publishInterval);
  if (client) {
    client.end(true, {}, () => {
      console.log('✅ Desconectado de AWS IoT Core');
      console.log(`📊 Mensajes enviados: ${messageCount}\n`);
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('uncaughtException', (error) => {
  console.error('\n❌ Error no controlado:', error.message);
  process.exit(1);
});
