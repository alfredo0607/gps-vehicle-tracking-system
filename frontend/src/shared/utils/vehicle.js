export function getVehicleStatus(vehicle) {
  const now = new Date();
  const lastUpdate = new Date(vehicle.timestamp);

  const minutes = (now - lastUpdate) / 1000 / 60;

  if (minutes > 10) return "offline";
  const speed = parseFloat(vehicle.properties?.speed || 0);
  return speed > 5 ? "moving" : "stopped";
}

export const STATUS_COLORS = {
  moving: "#22c55e",
  stopped: "#f59e0b",
  offline: "#ef4444",
};

export const STATUS_TEXT = {
  moving: "En movimiento",
  stopped: "Detenido",
  offline: "Sin conexión",
};
