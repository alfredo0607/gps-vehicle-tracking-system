const {
  IoTDataPlaneClient,
  PublishCommand,
} = require("@aws-sdk/client-iot-data-plane");
const config = require("../../config");

const iotDataClient = new IoTDataPlaneClient({
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
});

/**
 * Mapeo de comandos a formato Teltonika
 */
const TELTONIKA_COMMAND_MAP = {
  block_engine: "setdigout 1", // Activa DOUT1
  unblock_engine: "setdigout 0", // Desactiva DOUT1

  activate_alarm: "setdigout 1 1", // Si usa misma salida
  deactivate_alarm: "setdigout 1 0",

  lock_doors: "setdigout 1 1", // Solo si está cableado ahí

  flash_lights: "setdigout 1 1 40", // Enciende 1 segundo

  change_report_interval: null,

  request_status: "getio",

  set_speed_limit: null,

  get_version: "getver",
  get_gps: "getgps",

  get_records: "getrecords", // OJO: es getrecords (plural)
};

/**
 * Construir comando Teltonika con parámetros
 */
function buildTeltonikaCommand(command, parameters = {}) {
  // Comandos que requieren construcción especial
  if (command === "change_report_interval") {
    const interval = parameters.interval || 10;
    return `setparam 2001:${interval}`;
  }

  if (command === "set_speed_limit") {
    const limit = parameters.limit || 80;

    return `setparam 11001:${limit}`;
  }

  if (command === "flash_lights") {
    // Para parpadear N veces, podemos usar setdigout con parámetros

    // Nota: Esto puede requerir configuración adicional en el GPS
    return `setdigout 1 1 1`;
  }

  // Comandos simples del mapa
  const cmd = TELTONIKA_COMMAND_MAP[command];

  if (!cmd) {
    console.warn(
      `⚠️ Comando no mapeado: ${command}, usando 'getinfo' por defecto`,
    );
    return "getinfo";
  }

  return cmd;
}

/**
 * Enviar comando a dispositivo GPS via MQTT
 * FORMATO TELTONIKA: {"CMD": "comando"}
 */
exports.sendCommandToDevice = async (deviceId, command, parameters = {}) => {
  const topic = `vehicles/${deviceId}/commands`;

  // ✅ Construir comando en formato Teltonika
  const teltonikaCommand = buildTeltonikaCommand(command, parameters);

  // ✅ Formato requerido: {"CMD": "comando"}
  const payload = {
    CMD: teltonikaCommand,
  };

  const params = {
    topic: topic,
    qos: 1,
    payload: JSON.stringify(payload),
  };

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📤 ENVIANDO COMANDO AL GPS:");
  console.log("Topic:", topic);
  console.log("Comando original:", command);
  console.log("Comando Teltonika:", teltonikaCommand);
  console.log("Payload:", JSON.stringify(payload, null, 2));
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  try {
    const result = await iotDataClient.send(new PublishCommand(params));
    console.log(`✅ Comando enviado exitosamente a topic: ${topic}`);
    return result;
  } catch (error) {
    console.error(`❌ Error enviando comando:`, error);
    throw error;
  }
};

/**
 * Exportar función de construcción para testing
 */
exports.buildTeltonikaCommand = buildTeltonikaCommand;
