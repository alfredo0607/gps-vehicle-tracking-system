const { spawn } = require('child_process');
const path = require('path');
const response = require('../utils/response');
const logger = require('../utils/logger');
const gpsService = require('../services/database/gps.service');

// Apagado automático después de 60 minutos si se deja corriendo
const AUTO_STOP_MS = 60 * 60 * 1000;

// deviceId del simulador (debe coincidir con el script)
const DEVICE_ID = '1130267052';

let simulationProcess = null;
let autoStopTimer = null;
let simulationStats = {
  running: false,
  startTime: null,
  messageCount: 0,
  lastMessage: null,
  pid: null,
  autoStopAt: null,
};

// ── Helpers ────────────────────────────────────────────────────────────────

async function syncGPSStatus(online) {
  try {
    console.log(`[Simulation] Sincronizando estado GPS`);

    const gps = await gpsService.getGPSByDeviceId(DEVICE_ID);

    console.log(`[Simulation] Sincronizando estado GPS`, gps);

    if (!gps) {
      console.log(`[Simulation] No GPS found with deviceId ${DEVICE_ID}`);
      logger.warn(`[Simulation] No se encontró GPS con deviceId ${DEVICE_ID}`);
      return;
    }
    await gpsService.updateGPS(gps.gpsId, {
      online,
      lastSpeed: online ? 30 : 0, // >5 km/h → aparece como "en movimiento" en el mapa
      lastUpdate: new Date().toISOString(),
    });
    logger.info(`[Simulation] GPS ${DEVICE_ID} → ${online ? 'online / moving' : 'offline'}`);
  } catch (err) {
    console.log(`[Simulation] Error sincronizando estado GPS: ${err.message}`);
    logger.error(`[Simulation] Error sincronizando estado GPS: ${err.message}`);
  }
}

function killProcess() {
  if (autoStopTimer) {
    clearTimeout(autoStopTimer);
    autoStopTimer = null;
  }
  if (simulationProcess && simulationProcess.exitCode === null) {
    simulationProcess.kill();
  }
  simulationStats.running = false;
  simulationStats.pid = null;
  simulationStats.autoStopAt = null;
}

// ── Controladores ──────────────────────────────────────────────────────────

const start = async (req, res) => {
  if (simulationProcess && simulationProcess.exitCode === null) {
    return response.error(res, 'La simulación ya está en ejecución', 409);
  }

  try {
    const scriptPath = path.resolve(__dirname, '../../scripts/test-gps-simulation.js');
    const scriptDir = path.resolve(__dirname, '../../scripts');

    console.log('Script path:', scriptPath); // ¿existe esta ruta?
    console.log('Node path:', process.execPath); // ¿cuál node está usando?

    simulationProcess = spawn('node', [scriptPath], {
      cwd: scriptDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });

    console.log('Simulation process started with PID:', simulationProcess.pid);

    const autoStopAt = new Date(Date.now() + AUTO_STOP_MS).toISOString();

    console.log('Auto-stop programado para:', autoStopAt);

    simulationStats = {
      running: true,
      startTime: new Date().toISOString(),
      messageCount: 0,
      lastMessage: null,
      pid: simulationProcess.pid,
      autoStopAt,
    };

    console.log('Simulation stats initialized:', simulationStats);

    // Poner GPS online + en movimiento inmediatamente
    await syncGPSStatus(true);

    console.log('paso syncGPSStatus:');

    // Auto-apagado
    // autoStopTimer = setTimeout(async () => {
    //   logger.info('[Simulation] Auto-stop por timeout (60 min)');
    //   killProcess();
    //   simulationProcess = null;
    //   await syncGPSStatus(false);
    // }, AUTO_STOP_MS);

    // console.log('Auto-stop timer configurado:', autoStopTimer);

    // simulationProcess.stdout.on('data', (data) => {
    //   const text = data.toString();
    //   const match = text.match(/Mensaje #(\d+)/);
    //   if (match) {
    //     simulationStats.messageCount = parseInt(match[1], 10);
    //     simulationStats.lastMessage = new Date().toISOString();
    //   }
    //   logger.info(`[Simulation] ${text.trim()}`);
    // });

    // simulationProcess.stderr.on('data', (data) => {
    //   logger.error(`[Simulation] ${data.toString().trim()}`);
    // });

    // simulationProcess.on('close', async (code) => {
    //   // Limpieza cuando el proceso termina por cualquier razón
    //   if (autoStopTimer) {
    //     clearTimeout(autoStopTimer);
    //     autoStopTimer = null;
    //   }
    //   simulationStats.running = false;
    //   simulationStats.pid = null;
    //   simulationStats.autoStopAt = null;
    //   console.log('Simulation process terminated');
    //   simulationProcess = null;
    //   await syncGPSStatus(false);
    //   logger.info(`[Simulation] Proceso terminado con código ${code}`);
    // });

    return response.success(res, { ...simulationStats }, 'Simulación iniciada correctamente');
  } catch (err) {
    console.error(`[Simulation] Error al iniciar: ${err.message}`);
    logger.error('[Simulation] Error al iniciar:', err);
    return response.error(res, 'Error al iniciar la simulación', 500);
  }
};

const stop = async (req, res) => {
  if (!simulationProcess || simulationProcess.exitCode !== null) {
    return response.error(res, 'No hay ninguna simulación en ejecución', 404);
  }

  killProcess();
  simulationProcess = null;
  await syncGPSStatus(false);

  return response.success(res, { ...simulationStats }, 'Simulación detenida correctamente');
};

const status = async (req, res) => {
  const isRunning = simulationProcess !== null && simulationProcess.exitCode === null;
  return response.success(res, { ...simulationStats, running: isRunning });
};

module.exports = { start, stop, status };
