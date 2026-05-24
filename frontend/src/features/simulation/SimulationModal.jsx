import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  startSimulation,
  stopSimulation,
  fetchSimulationStatus,
} from "./simulationSlice";
import {
  X,
  Play,
  Square,
  Radio,
  ChevronDown,
  ChevronUp,
  MapPin,
  Cpu,
  Wifi,
  Clock,
  Hash,
  Timer,
} from "lucide-react";

const DEVICE_ID   = "1130267052";
const TOPIC       = `vehicles/${DEVICE_ID}/data`;
const INTERVAL_S  = 5;
const START_COORD = "10.867347, -74.775408";
const END_COORD   = "10.963900, -74.796400";

function formatTime(isoString) {
  if (!isoString) return "—";
  return new Date(isoString).toLocaleTimeString("es-CO");
}

function elapsed(isoString) {
  if (!isoString) return "—";
  const secs = Math.floor((Date.now() - new Date(isoString).getTime()) / 1000);
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}m ${s}s`;
}

function remaining(isoString) {
  if (!isoString) return "—";
  const secs = Math.floor((new Date(isoString).getTime() - Date.now()) / 1000);
  if (secs <= 0) return "0s";
  if (secs < 60) return `${secs}s`;
  const m = Math.floor(secs / 60);
  return `${m} min`;
}

export default function SimulationModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const { running, startTime, messageCount, lastMessage, autoStopAt, loading, error } =
    useSelector((state) => state.simulation);

  const [showTech, setShowTech] = useState(false);
  const [tick, setTick]         = useState(0); // para re-render del tiempo transcurrido

  // Polling del estado mientras está abierto
  useEffect(() => {
    if (!isOpen) return;
    dispatch(fetchSimulationStatus());
    const poll = setInterval(() => dispatch(fetchSimulationStatus()), 3000);
    return () => clearInterval(poll);
  }, [isOpen, dispatch]);

  // Re-render cada segundo para actualizar "elapsed"
  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  if (!isOpen) return null;

  const handleStart = () => dispatch(startSimulation());
  const handleStop  = () => dispatch(stopSimulation());

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">

        {/* Header */}
        <div className="bg-linear-to-r from-brand-600 to-brand-700 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-white bg-opacity-20 rounded-lg p-2">
              <Radio className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">
                Simulación GPS
              </h2>
              <p className="text-brand-100 text-xs">Teltonika FMC920 → AWS IoT Core</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {running && (
              <span className="flex items-center gap-1.5 bg-green-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                EN VIVO
              </span>
            )}
            <button
              onClick={onClose}
              className="text-white hover:text-brand-100 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="px-6 py-5 space-y-4">

          {/* Descripción */}
          {!running ? (
            <p className="text-gray-600 text-sm leading-relaxed">
              Esta función inicia un simulador que emula un dispositivo GPS{" "}
              <strong className="text-gray-800">Teltonika FMC920</strong> moviéndose
              por una ruta real obtenida de OpenStreetMap. Los datos se envían cada{" "}
              <strong className="text-gray-800">{INTERVAL_S} segundos</strong> a{" "}
              <strong className="text-gray-800">AWS IoT Core</strong> via MQTT seguro,
              donde son procesados y persistidos en DynamoDB en tiempo real.
            </p>
          ) : (
            <p className="text-gray-600 text-sm leading-relaxed">
              El vehículo simulado está transmitiendo datos en tiempo real. Puedes
              ver el marcador actualizarse en el mapa cada vez que lleguen nuevas
              coordenadas al sistema.
            </p>
          )}

          {/* Configuración de ruta */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-2.5 border border-gray-100">
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-green-500 shrink-0" />
              <span className="text-gray-500 w-14 shrink-0">Inicio</span>
              <span className="font-mono text-gray-800 text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                {START_COORD}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <MapPin className="w-4 h-4 text-red-500 shrink-0" />
              <span className="text-gray-500 w-14 shrink-0">Fin</span>
              <span className="font-mono text-gray-800 text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                {END_COORD}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Clock className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="text-gray-500 w-14 shrink-0">Intervalo</span>
              <span className="text-gray-800 font-medium">
                {INTERVAL_S} seg / mensaje · Loop activado
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Cpu className="w-4 h-4 text-brand-500 shrink-0" />
              <span className="text-gray-500 w-14 shrink-0">Device ID</span>
              <span className="font-mono text-gray-800 text-xs bg-white border border-gray-200 rounded px-2 py-0.5">
                {DEVICE_ID}
              </span>
            </div>
          </div>

          {/* Stats en vivo (solo cuando corre) */}
          {running && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-green-50 border border-green-100 rounded-xl p-3 text-center">
                  <Hash className="w-4 h-4 text-green-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-green-700">{messageCount}</p>
                  <p className="text-xs text-green-600">Mensajes</p>
                </div>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-center">
                  <Clock className="w-4 h-4 text-blue-600 mx-auto mb-1" />
                  <p className="text-xl font-bold text-blue-700">{elapsed(startTime)}</p>
                  <p className="text-xs text-blue-600">Tiempo</p>
                </div>
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3 text-center">
                  <Wifi className="w-4 h-4 text-purple-600 mx-auto mb-1" />
                  <p className="text-base font-bold text-purple-700 leading-tight pt-0.5">
                    {formatTime(lastMessage)}
                  </p>
                  <p className="text-xs text-purple-600">Último envío</p>
                </div>
              </div>

              {autoStopAt && (
                <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 text-xs text-amber-700">
                  <Timer className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    Auto-apagado a las <strong>{formatTime(autoStopAt)}</strong>
                    {" "}— faltan <strong>{remaining(autoStopAt)}</strong>
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-2 text-sm text-red-700">
              {error}
            </div>
          )}

          {/* Detalles técnicos (colapsable) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button
              onClick={() => setShowTech((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition text-sm font-medium text-gray-700"
            >
              <span className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-gray-500" />
                Detalles técnicos
              </span>
              {showTech ? (
                <ChevronUp className="w-4 h-4 text-gray-400" />
              ) : (
                <ChevronDown className="w-4 h-4 text-gray-400" />
              )}
            </button>

            {showTech && (
              <div className="px-4 py-4 space-y-3 text-xs text-gray-600 bg-white">

                <div>
                  <p className="font-semibold text-gray-800 mb-1">Protocolo y transporte</p>
                  <ul className="space-y-1 pl-2">
                    <li>• <strong>MQTT over TLS</strong> — puerto 8883 hacia AWS IoT Core</li>
                    <li>• Autenticación por <strong>certificados X.509</strong> (mTLS)</li>
                    <li>• Topic: <code className="bg-gray-100 px-1 rounded">{TOPIC}</code></li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-gray-800 mb-1">Formato del payload</p>
                  <p className="mb-1">
                    Estructura <strong>AWS IoT Device Shadow</strong> (<code className="bg-gray-100 px-1 rounded">state.reported</code>)
                    con elementos I/O del protocolo Teltonika:
                  </p>
                  <ul className="space-y-1 pl-2">
                    <li>• <code className="bg-gray-100 px-1 rounded">latlng</code> — coordenadas <em>"lat,lon"</em></li>
                    <li>• <code className="bg-gray-100 px-1 rounded">sp / ang / alt / sat</code> — velocidad, rumbo, altitud, satélites</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">I/O 239</code> — ignición &nbsp;·&nbsp; <code className="bg-gray-100 px-1 rounded">I/O 240</code> — movimiento</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">I/O 66 / 67</code> — voltaje externo / batería (mV)</li>
                    <li>• <code className="bg-gray-100 px-1 rounded">I/O 16</code> — odómetro (metros) &nbsp;·&nbsp; <code className="bg-gray-100 px-1 rounded">ts</code> — timestamp ms</li>
                  </ul>
                </div>

                <div>
                  <p className="font-semibold text-gray-800 mb-1">Pipeline en AWS</p>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {["IoT Core", "→", "IoT Rules", "→", "Lambda", "→", "DynamoDB"].map((s, i) => (
                      s === "→" ? (
                        <span key={i} className="text-gray-400">→</span>
                      ) : (
                        <span key={i} className="bg-brand-50 text-brand-700 border border-brand-100 rounded px-2 py-0.5 font-medium">
                          {s}
                        </span>
                      )
                    ))}
                  </div>
                </div>

                <div>
                  <p className="font-semibold text-gray-800 mb-1">Ruta real</p>
                  <p>
                    Waypoints obtenidos de <strong>OSRM</strong> (OpenStreetMap) al iniciar
                    el script. El vehículo avanza por las vías reales calculando el
                    desplazamiento con la fórmula de <strong>Haversine</strong>.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer con acciones */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-100 transition"
          >
            Cerrar
          </button>

          {!running ? (
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Iniciar simulación
            </button>
          ) : (
            <button
              onClick={handleStop}
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white text-sm font-semibold rounded-lg transition"
            >
              {loading ? (
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              Detener simulación
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
