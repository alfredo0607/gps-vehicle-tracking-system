// COMANDOS DISPONIBLES
module.exports.AVAILABLE_COMMANDS = {
  // Seguridad
  BLOCK_ENGINE: {
    code: "block_engine",
    name: "Bloquear Motor",
    description:
      "Inmovilizar el vehículo cortando el suministro de combustible",
    category: "security",
    icon: "lock",
    dangerous: true,
    requiresConfirmation: true,
    parameters: [],
  },
  UNBLOCK_ENGINE: {
    code: "unblock_engine",
    name: "Desbloquear Motor",
    description: "Restaurar el suministro de combustible",
    category: "security",
    icon: "unlock",
    dangerous: false,
    requiresConfirmation: true,
    parameters: [],
  },
  ACTIVATE_ALARM: {
    code: "activate_alarm",
    name: "Activar Alarma",
    description: "Activar sirena del vehículo",
    category: "security",
    icon: "bell",
    dangerous: false,
    requiresConfirmation: false,
    parameters: [
      {
        name: "duration",
        type: "number",
        label: "Duración (segundos)",
        default: 30,
        min: 5,
        max: 300,
      },
    ],
  },
  DEACTIVATE_ALARM: {
    code: "deactivate_alarm",
    name: "Desactivar Alarma",
    description: "Apagar sirena del vehículo",
    category: "security",
    icon: "bell-off",
    dangerous: false,
    requiresConfirmation: false,
    parameters: [],
  },
  LOCK_DOORS: {
    code: "lock_doors",
    name: "Bloquear Puertas",
    description: "Cerrar seguros centralizados",
    category: "security",
    icon: "lock",
    dangerous: false,
    requiresConfirmation: false,
    parameters: [],
  },

  // Luces
  FLASH_LIGHTS: {
    code: "flash_lights",
    name: "Flash de Luces",
    description: "Parpadear luces para localizar vehículo",
    category: "lights",
    icon: "zap",
    dangerous: false,
    requiresConfirmation: false,
    parameters: [
      {
        name: "count",
        type: "number",
        label: "Cantidad de parpadeos",
        default: 3,
        min: 1,
        max: 10,
      },
    ],
  },

  // Configuración
  CHANGE_REPORT_INTERVAL: {
    code: "change_report_interval",
    name: "Cambiar Intervalo de Reporte",
    description: "Ajustar frecuencia de envío de coordenadas",
    category: "config",
    icon: "clock",
    dangerous: false,
    requiresConfirmation: false,
    parameters: [
      {
        name: "interval",
        type: "select",
        label: "Intervalo",
        options: [
          { value: 5, label: "5 segundos (Alta frecuencia)" },
          { value: 10, label: "10 segundos (Normal)" },
          { value: 30, label: "30 segundos (Ahorro)" },
          { value: 60, label: "1 minuto (Bajo consumo)" },
          { value: 300, label: "5 minutos (Muy bajo consumo)" },
        ],
        default: 10,
      },
    ],
  },
  REQUEST_STATUS: {
    code: "request_status",
    name: "Solicitar Estado",
    description: "Obtener reporte completo del GPS",
    category: "diagnostic",
    icon: "info",
    dangerous: false,
    requiresConfirmation: false,
    parameters: [],
  },
  SET_SPEED_LIMIT: {
    code: "set_speed_limit",
    name: "Configurar Alerta de Velocidad",
    description: "Notificar cuando se exceda velocidad límite",
    category: "config",
    icon: "gauge",
    dangerous: false,
    requiresConfirmation: false,
    parameters: [
      {
        name: "limit",
        type: "number",
        label: "Velocidad máxima (km/h)",
        default: 80,
        min: 20,
        max: 200,
        step: 5,
      },
      {
        name: "enabled",
        type: "boolean",
        label: "Activar alerta",
        default: true,
      },
    ],
  },
};

module.exports.COMMAND_CATEGORIES = {
  security: { name: "Seguridad", color: "red" },
  lights: { name: "Luces", color: "yellow" },
  config: { name: "Configuración", color: "blue" },
  diagnostic: { name: "Diagnóstico", color: "gray" },
};

module.exports.COMMAND_STATUS = {
  PENDING: "pending",
  SENT: "sent",
  ACKNOWLEDGED: "acknowledged",
  EXECUTED: "executed",
  FAILED: "failed",
  TIMEOUT: "timeout",
};
