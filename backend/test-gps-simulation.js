// test-gps-simulation.js
// Script para probar la conexión MQTT con AWS IoT Core

const mqtt = require('mqtt');
const fs = require('fs');

// ============================================
// CONFIGURACIÓN - ACTUALIZA ESTOS VALORES
// ============================================

const CONFIG = {
  // 1. Endpoint de IoT Core (sin https://)
  endpoint: 'a28bbd2b4768x7-ats.iot.us-east-1.amazonaws.com',

  // 2. ID del dispositivo (Thing Name)
  deviceId: '863238073517528',

  // 3. Ruta a los certificados (pon los archivos en la misma carpeta)
  certPath: './certificate/certificate.pem.crt',
  keyPath: './certificate/private.pem.key',
  caPath: './certificate/AmazonRootCA1.pem',

  // 4. Topic MQTT
  topic: 'vehicles/863238073517528/data',

  // 5. Configuración de envío
  intervalSeconds: 5, // Enviar cada 5 segundos
};

// ============================================
// CÓDIGO PRINCIPAL
// ============================================

console.log('╔════════════════════════════════════════════════╗');
console.log('║   Simulador GPS Teltonika FMC920 → AWS IoT    ║');
console.log('╚════════════════════════════════════════════════╝\n');

// Verificar que existen los certificados
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
  console.error('\n⚠️  Coloca los certificados en la misma carpeta que este script');
  console.error('   y actualiza las rutas en CONFIG si es necesario.\n');
  process.exit(1);
}

// Configuración MQTT
const options = {
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
};

console.log('\n📡 Configuración:');
console.log(`   Endpoint: ${CONFIG.endpoint}`);
console.log(`   Device ID: ${CONFIG.deviceId}`);
console.log(`   Topic: ${CONFIG.topic}`);
console.log(`   Intervalo: ${CONFIG.intervalSeconds}s\n`);

console.log('🔌 Conectando a AWS IoT Core...\n');

const client = mqtt.connect(options);

// Ubicación inicial (Barranquilla, Colombia)
let currentLocation = {
  lat: 10.9639,
  lon: -74.7964,
  speed: 0,
  heading: 0,
};

let messageCount = 0;
let publishInterval = null;

// Simular movimiento del vehículo
function simulateMovement() {
  // Movimiento aleatorio
  const deltaLat = (Math.random() - 0.5) * 0.001; // ~100m
  const deltaLon = (Math.random() - 0.5) * 0.001;

  currentLocation.lat += deltaLat;
  currentLocation.lon += deltaLon;
  currentLocation.speed = 20 + Math.random() * 40; // 20-60 km/h
  currentLocation.heading = (currentLocation.heading + Math.random() * 20 - 10 + 360) % 360;
}

function sendGPSData() {
  messageCount++;

  // Simular movimiento
  simulateMovement();

  // Crear payload GPS (formato compatible con FMC920)
  const gpsData = {
    deviceId: CONFIG.deviceId,
    // imei: "352094080000001",
    timestamp: new Date().toISOString(),

    // Coordenadas
    latitude: Number(currentLocation.lat.toFixed(7)),
    longitude: Number(currentLocation.lon.toFixed(7)),
    altitude: 10 + Math.random() * 5,

    // Movimiento
    speed: Number(currentLocation.speed.toFixed(1)),
    heading: Math.round(currentLocation.heading),

    // Calidad GPS
    satellites: 8 + Math.floor(Math.random() * 4),
    accuracy: 5 + Math.random() * 3,

    // Estado del vehículo
    ignition: currentLocation.speed > 1,
    battery_voltage: 12.5 + Math.random() * 0.5,
    external_voltage: 24 + Math.random() * 2,

    // Datos adicionales
    odometer: messageCount * 100,
    messageNumber: messageCount,
  };

  console.log(gpsData);

  const payload = JSON.stringify(gpsData);

  console.log(`\n📍 Mensaje #${messageCount} | ${new Date().toLocaleTimeString()}`);
  console.log(`   📊 Lat: ${gpsData.latitude.toFixed(6)}  Lon: ${gpsData.longitude.toFixed(6)}`);
  console.log(`   🚗 Velocidad: ${gpsData.speed} km/h  Rumbo: ${gpsData.heading}°`);
  console.log(
    `   🛰️  Satélites: ${gpsData.satellites}  Precisión: ${gpsData.accuracy.toFixed(1)}m`
  );

  client.publish(CONFIG.topic, payload, { qos: 1 }, (error) => {
    if (error) {
      console.error('   ❌ Error al publicar:', error.message);
    } else {
      console.log('   ✅ Publicado exitosamente');
    }
  });
}

// Eventos MQTT
client.on('connect', () => {
  console.log('╔════════════════════════════════════════════════╗');
  console.log('║          ✅ CONECTADO A AWS IOT CORE          ║');
  console.log('╚════════════════════════════════════════════════╝\n');

  console.log(`🚀 Iniciando simulación GPS (${CONFIG.intervalSeconds}s por mensaje)`);
  console.log('📍 Ubicación inicial: Barranquilla, Colombia');
  console.log('🎮 Presiona Ctrl+C para detener\n');
  console.log('─'.repeat(60));

  // Enviar primer mensaje inmediatamente
  sendGPSData();

  // Luego enviar periódicamente
  publishInterval = setInterval(sendGPSData, CONFIG.intervalSeconds * 1000);
});

client.on('error', (error) => {
  console.error('\n❌ ERROR DE CONEXIÓN:');
  console.error('   ', error.message);

  if (error.message.includes('ENOTFOUND')) {
    console.error('\n💡 Verifica que el endpoint sea correcto');
    console.error('   Formato: xxxxxxx-ats.iot.REGION.amazonaws.com');
  } else if (error.message.includes('certificate')) {
    console.error('\n💡 Problema con los certificados');
    console.error('   Verifica que los archivos .pem estén correctos');
  }

  process.exit(1);
});

client.on('close', () => {
  console.log('\n🔌 Conexión cerrada');
});

client.on('offline', () => {
  console.log('\n⚠️  Cliente offline - Intentando reconectar...');
});

client.on('reconnect', () => {
  console.log('🔄 Reconectando...');
});

// Manejo de cierre limpio
process.on('SIGINT', () => {
  console.log('\n\n🛑 Deteniendo simulación...');

  if (publishInterval) {
    clearInterval(publishInterval);
  }

  client.end(true, {}, () => {
    console.log('✅ Desconectado limpiamente de AWS IoT Core');
    console.log(`📊 Total de mensajes enviados: ${messageCount}\n`);
    process.exit(0);
  });
});

// Capturar errores no controlados
process.on('uncaughtException', (error) => {
  console.error('\n❌ Error no controlado:', error.message);
  process.exit(1);
});

function randomId() {
  return Math.random().toString(36).substring(2, 10);
}

console.log(randomId());
