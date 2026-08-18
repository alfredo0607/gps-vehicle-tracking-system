import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchVehicles } from "../vehicles/vehiclesSlice";
import { fetchGPSList } from "../gps/gpsSlice";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation, Activity, RefreshCw, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import SimulationModal from "../simulation/SimulationModal";
import {
  createTransformRequest,
  getMapStyleUrl,
} from "../../shared/services/aws/locationService";

// Frecuencia de sondeo: rápida mientras haya GPS en línea, lenta en reposo.
// La duración de la interpolación se iguala al sondeo para que el movimiento
// sea continuo y sin pausas entre actualizaciones.
const POLL_ACTIVE_MS = 3000;
const POLL_IDLE_MS = 10000;

// Saltos mayores a esto no se interpolan (reconexión, cambio de zona, primer fix)
const SNAP_THRESHOLD_M = 2000;

function lerp(a, b, t) {
  return a + (b - a) * t;
}

// Diferencia angular por el camino más corto (-180..180)
function shortestAngleDelta(from, to) {
  return ((((to - from) % 360) + 540) % 360) - 180;
}

function distanceMeters(a, b) {
  const R = 6371000;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

function buildPopupHTML(gps, vehicle) {
  return `
    <div style="padding: 8px; min-width: 200px;">
      <h3 style="font-weight: bold; font-size: 16px; margin-bottom: 4px;">
        ${vehicle?.plate || gps.deviceId}
      </h3>
      <p style="font-size: 14px; color: #6b7280; margin-bottom: 8px;">
        ${vehicle?.brand || ""} ${vehicle?.model || ""}
      </p>
      <div style="font-size: 12px; color: #9ca3af;">
        <p style="margin: 2px 0;">
          <strong>Velocidad:</strong> ${gps.lastSpeed || 0} km/h
        </p>
        <p style="margin: 2px 0;">
          <strong>Rumbo:</strong> ${gps.lastHeading || 0}°
        </p>
        <p style="margin: 2px 0;">
          <strong>Satélites:</strong> ${gps.lastSatellites || 0}
        </p>
        <p style="margin-top: 6px; font-size: 11px; color: #d1d5db;">
          ${new Date(gps.lastUpdate).toLocaleString("es-CO")}
        </p>
      </div>
    </div>
  `;
}

// El elemento raíz lo posiciona MapLibre vía transform, por eso el rumbo
// se aplica sobre un hijo (.marker-rotate) y no sobre la raíz.
function buildMarkerElement() {
  const el = document.createElement("div");
  el.className = "custom-marker";
  el.style.width = "32px";
  el.style.height = "32px";
  el.style.cursor = "pointer";

  el.innerHTML = `
    <div style="position: relative;">
      <div class="marker-body" style="
        width: 32px;
        height: 32px;
        border-radius: 50%;
        border: 4px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.3s ease;
        will-change: transform;
      ">
        <div class="marker-rotate" style="
          display: flex;
          align-items: center;
          justify-content: center;
          will-change: transform;
        ">
          <svg class="marker-icon-move" style="width: 15px; height: 15px; color: white; display: none;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2 L19 20 L12 16 L5 20 Z"/>
          </svg>
          <svg class="marker-icon-idle" style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
          </svg>
        </div>
      </div>
      <div class="marker-pulse" style="
        position: absolute;
        top: -2px;
        right: -2px;
        width: 12px;
        height: 12px;
        background-color: #10b981;
        border-radius: 50%;
        border: 2px solid white;
        animation: pulse 2s infinite;
        display: none;
      "></div>
    </div>
  `;

  el.addEventListener("mouseenter", () => {
    el.querySelector(".marker-body").style.transform = "scale(1.15)";
  });
  el.addEventListener("mouseleave", () => {
    el.querySelector(".marker-body").style.transform = "scale(1)";
  });

  return el;
}

export default function LiveMap() {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const dispatch = useDispatch();
  const { vehicles } = useSelector((state) => state.vehicles);
  const { gpsList } = useSelector((state) => state.gps);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showSimulation, setShowSimulation] = useState(false);
  const { running: simRunning } = useSelector((state) => state.simulation);
  const initialFitDone = useRef(false); // ✅ NUEVO: Bandera para controlar el fitBounds inicial
  const userInteracted = useRef(false); // ✅ NUEVO: Detectar si el usuario movió el mapa
  const pollMs = useRef(POLL_IDLE_MS); // Ritmo de sondeo actual
  const rafId = useRef(null); // Bucle de animación de los marcadores

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([dispatch(fetchVehicles()), dispatch(fetchGPSList())]);
      setLoading(false);
    };
    loadData();
  }, [dispatch]);

  // Mantener el ritmo de sondeo al día sin reiniciar el temporizador en cada ciclo
  useEffect(() => {
    pollMs.current = gpsList.some((gps) => gps.online)
      ? POLL_ACTIVE_MS
      : POLL_IDLE_MS;
  }, [gpsList]);

  // Sondeo encadenado: espera a que termine una petición antes de agendar la
  // siguiente, así no se solapan si la red va lenta
  useEffect(() => {
    let timer;
    let cancelled = false;

    const tick = async () => {
      try {
        await dispatch(fetchGPSList());
      } finally {
        if (!cancelled) timer = setTimeout(tick, pollMs.current);
      }
    };

    timer = setTimeout(tick, pollMs.current);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [dispatch]);

  // Inicializar mapa
  useEffect(() => {
    async function initMap() {
      if (!mapContainer.current || mapInstance.current) return;

      try {
        // const authHelper = await withIdentityPoolId(
        //   import.meta.env.VITE_AWS_IDENTITY_POOL_ID,
        // );

        const transformRequest = createTransformRequest();

        const newMap = new maplibregl.Map({
          container: mapContainer.current,
          style: getMapStyleUrl(),
          center: [-74.7964, 10.9639],
          zoom: 12,
          transformRequest,
        });

        newMap.addControl(new maplibregl.NavigationControl(), "top-right");
        newMap.addControl(new maplibregl.FullscreenControl(), "top-right");

        // ✅ NUEVO: Detectar interacción del usuario
        newMap.on("dragstart", () => {
          userInteracted.current = true;
        });

        newMap.on("zoomstart", () => {
          userInteracted.current = true;
        });

        newMap.on("load", () => {
          console.log("✅ Mapa cargado correctamente");
          setMapLoaded(true);
        });

        newMap.on("error", (e) => {
          console.error("❌ Error en el mapa:", e);
        });

        mapInstance.current = newMap;
      } catch (error) {
        console.error("❌ Error inicializando mapa:", error);
      }
    }

    initMap();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, []);

  // Sincronizar marcadores: se crean una sola vez y luego se actualizan en
  // sitio. Recrearlos en cada sondeo era lo que producía el salto brusco.
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || loading) return;

    const gpsWithPosition = gpsList.filter(
      (gps) => gps.lastLatitude && gps.lastLongitude,
    );

    // Retirar marcadores de GPS que ya no vienen en la lista
    const vigentes = new Set(gpsWithPosition.map((gps) => gps.gpsId));
    Object.entries(markers.current).forEach(([gpsId, entry]) => {
      if (!vigentes.has(gpsId)) {
        try {
          entry.marker.remove();
        } catch (error) {
          console.error("Error removiendo marcador:", error);
        }
        delete markers.current[gpsId];
      }
    });

    if (gpsWithPosition.length === 0) return;

    gpsWithPosition.forEach((gps) => {
      try {
        const vehicle = vehicles.find((v) => v.gpsId === gps.gpsId);
        const target = { lng: gps.lastLongitude, lat: gps.lastLatitude };
        const heading = Number(gps.lastHeading) || 0;
        const moving = (gps.lastSpeed || 0) > 5;

        let entry = markers.current[gps.gpsId];

        // ── Crear marcador la primera vez ──
        if (!entry) {
          const el = buildMarkerElement();
          const marker = new maplibregl.Marker({ element: el })
            .setLngLat([target.lng, target.lat])
            .addTo(mapInstance.current);

          const popup = new maplibregl.Popup({
            offset: 25,
            closeButton: true,
            closeOnClick: false,
          }).setHTML(buildPopupHTML(gps, vehicle));

          marker.setPopup(popup);

          entry = {
            marker,
            el,
            popup,
            current: { ...target }, // posición dibujada ahora mismo
            from: { ...target }, // origen de la interpolación
            target: { ...target }, // destino de la interpolación
            startTime: 0,
            duration: 0,
            currentHeading: heading,
            targetHeading: heading,
          };
          markers.current[gps.gpsId] = entry;

          el.addEventListener("click", () => {
            const v = markers.current[gps.gpsId];
            setSelectedVehicle(
              vehicle || { gpsId: gps.gpsId, deviceId: gps.deviceId },
            );
            popup.addTo(mapInstance.current);

            // Volar a la posición interpolada actual, no a la del último sondeo
            mapInstance.current.flyTo({
              center: [v.current.lng, v.current.lat],
              zoom: 16,
              speed: 1.2,
              curve: 1,
              essential: true,
            });

            userInteracted.current = true;
          });
        }

        // ── Actualizar apariencia ──
        const body = entry.el.querySelector(".marker-body");
        const pulse = entry.el.querySelector(".marker-pulse");
        const iconMove = entry.el.querySelector(".marker-icon-move");
        const iconIdle = entry.el.querySelector(".marker-icon-idle");

        body.style.backgroundColor = gps.online
          ? moving
            ? "#0ea5e9"
            : "#64748b"
          : "#9ca3af";
        pulse.style.display = gps.online ? "block" : "none";
        iconMove.style.display = moving ? "block" : "none";
        iconIdle.style.display = moving ? "none" : "block";

        // Refrescar el popup solo si está abierto, para no perder el foco
        if (entry.popup.isOpen()) {
          entry.popup.setHTML(buildPopupHTML(gps, vehicle));
        }

        // ── Programar la interpolación hacia la nueva posición ──
        const cambio =
          entry.target.lng !== target.lng || entry.target.lat !== target.lat;

        if (cambio) {
          const salto = distanceMeters(entry.current, target);

          if (salto > SNAP_THRESHOLD_M) {
            // Salto irreal: colocar de una vez en lugar de cruzar la ciudad
            entry.current = { ...target };
            entry.marker.setLngLat([target.lng, target.lat]);
            entry.duration = 0;
          } else {
            entry.from = { ...entry.current };
            entry.startTime = performance.now();
            entry.duration = pollMs.current;
          }
          entry.target = { ...target };
        }

        entry.targetHeading = heading;
      } catch (error) {
        console.error(`❌ Error actualizando marcador ${gps.deviceId}:`, error);
      }
    });

    // ✅ MODIFICADO: Solo hacer fitBounds automático la primera vez o si el usuario no ha interactuado
    if (
      gpsWithPosition.length > 0 &&
      !initialFitDone.current &&
      !userInteracted.current
    ) {
      try {
        const bounds = new maplibregl.LngLatBounds();
        gpsWithPosition.forEach((gps) => {
          bounds.extend([gps.lastLongitude, gps.lastLatitude]);
        });

        if (!bounds.isEmpty()) {
          mapInstance.current.fitBounds(bounds, {
            padding: 80,
            maxZoom: 15,
            duration: 1000,
          });
          initialFitDone.current = true; // ✅ Marcar como completado
        }
      } catch (error) {
        console.error("Error ajustando bounds:", error);
      }
    }
  }, [gpsList, vehicles, loading, mapLoaded]);

  // Bucle de animación: interpola posición y rumbo entre sondeos.
  // Corre una sola vez mientras el mapa vive, no uno por marcador.
  useEffect(() => {
    if (!mapLoaded) return;

    const frame = (now) => {
      Object.values(markers.current).forEach((entry) => {
        // Posición: avance lineal, que es lo que corresponde a velocidad constante
        if (entry.duration > 0) {
          const t = Math.min(1, (now - entry.startTime) / entry.duration);

          entry.current = {
            lng: lerp(entry.from.lng, entry.target.lng, t),
            lat: lerp(entry.from.lat, entry.target.lat, t),
          };
          entry.marker.setLngLat([entry.current.lng, entry.current.lat]);

          if (t >= 1) entry.duration = 0;
        }

        // Rumbo: giro suave por el camino más corto (evita el barrido 350°→10°)
        const delta = shortestAngleDelta(
          entry.currentHeading,
          entry.targetHeading,
        );
        if (Math.abs(delta) > 0.1) {
          // Se normaliza porque dar vueltas al circuito siempre en el mismo
          // sentido acumularía grados sin fin (equivalente visualmente)
          entry.currentHeading = (entry.currentHeading + delta * 0.15) % 360;
          const rot = entry.el.querySelector(".marker-rotate");
          if (rot) rot.style.transform = `rotate(${entry.currentHeading}deg)`;
        }
      });

      rafId.current = requestAnimationFrame(frame);
    };

    rafId.current = requestAnimationFrame(frame);

    return () => {
      if (rafId.current) cancelAnimationFrame(rafId.current);
      rafId.current = null;
    };
  }, [mapLoaded]);

  // Retirar marcadores al desmontar
  useEffect(() => {
    return () => {
      Object.values(markers.current).forEach((entry) => {
        try {
          entry.marker.remove();
        } catch {
          /* el mapa ya fue destruido */
        }
      });
      markers.current = {};
    };
  }, []);

  const handleRefresh = () => {
    dispatch(fetchGPSList());
    dispatch(fetchVehicles());
  };

  // ✅ NUEVA FUNCIÓN: Resetear vista
  const handleResetView = () => {
    userInteracted.current = false;
    initialFitDone.current = false;

    const gpsWithPosition = gpsList.filter(
      (gps) => gps.lastLatitude && gps.lastLongitude,
    );

    if (gpsWithPosition.length > 0 && mapInstance.current) {
      const bounds = new maplibregl.LngLatBounds();
      gpsWithPosition.forEach((gps) => {
        bounds.extend([gps.lastLongitude, gps.lastLatitude]);
      });

      if (!bounds.isEmpty()) {
        mapInstance.current.fitBounds(bounds, {
          padding: 80,
          maxZoom: 15,
          duration: 1000,
        });
      }
    }
  };

  const stats = {
    total: vehicles.length,
    withGPS: vehicles.filter((v) => v.gpsId).length,
    online: gpsList.filter((g) => g.online).length,
    offline: gpsList.filter((g) => !g.online).length,
    moving: gpsList.filter((g) => g.lastSpeed > 5).length,
  };

  return (
    <div className="relative h-[calc(100vh-4rem)]">
      {/* Map */}
      <div ref={mapContainer} className="w-full h-full" />

      {/* Loading overlay */}
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="text-center">
            <div className="spinner mb-2"></div>
            <p className="text-gray-600">Cargando mapa...</p>
          </div>
        </div>
      )}

      {/* Stats Panel */}
      <div className="absolute top-2 left-2 right-2 md:top-4 md:left-4 md:right-auto md:w-64 bg-white rounded-lg shadow-lg p-3 md:p-4 z-20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-gray-900 flex items-center">
            <Activity className="w-5 h-5 mr-2 text-brand-600" />
            Estado de la Flota
          </h3>
          <div className="flex gap-2">
            <button
              onClick={handleResetView}
              className="p-1 hover:bg-gray-100 rounded transition"
              title="Resetear vista"
            >
              <MapPin className="w-4 h-4 text-gray-600" />
            </button>
            <button
              onClick={handleRefresh}
              className="p-1 hover:bg-gray-100 rounded transition"
              title="Actualizar"
            >
              <RefreshCw className="w-4 h-4 text-gray-600" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-2 md:block gap-x-3 gap-y-1.5 md:space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total:</span>
            <span className="font-semibold text-gray-900">{stats.total}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Con GPS:</span>
            <span className="font-semibold text-gray-900">{stats.withGPS}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Online:</span>
            <span className="font-semibold text-green-600">{stats.online}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Offline:</span>
            <span className="font-semibold text-gray-400">{stats.offline}</span>
          </div>
          <div className="flex justify-between text-sm col-span-2 md:col-span-1">
            <span className="text-gray-600">En Movimiento:</span>
            <span className="font-semibold text-blue-600">{stats.moving}</span>
          </div>
        </div>

        {gpsList.filter((g) => g.lastLatitude && g.lastLongitude).length ===
          0 &&
          !loading && (
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              No hay GPS con posición disponible
            </div>
          )}

        {/* Botón simulación */}
        <button
          onClick={() => setShowSimulation(true)}
          className={`mt-3 w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition ${
            simRunning
              ? "bg-green-50 border border-green-300 text-green-700 hover:bg-green-100"
              : "bg-brand-600 text-white hover:bg-brand-700"
          }`}
        >
          <Radio className={`w-4 h-4 ${simRunning ? "animate-pulse" : ""}`} />
          {simRunning ? "Simulación activa" : "Simulación GPS"}
        </button>
      </div>

      {/* Vehicle Details Panel */}
      {selectedVehicle && (
        <div className="absolute bottom-2 left-2 right-2 md:top-4 md:bottom-auto md:right-4 md:left-auto md:w-80 bg-white rounded-lg shadow-lg p-3 md:p-4 z-20">
          <div className="flex justify-between items-start mb-3">
            <div>
              <h3 className="font-bold text-gray-900 text-lg">
                {selectedVehicle.plate || selectedVehicle.deviceId}
              </h3>
              <p className="text-sm text-gray-600">
                {selectedVehicle.brand} {selectedVehicle.model}
              </p>
            </div>
            <button
              onClick={() => setSelectedVehicle(null)}
              className="text-gray-400 hover:text-gray-600 transition"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2">
            {selectedVehicle.vehicleId && (
              <>
                <Link
                  to={`/vehicles/${selectedVehicle.vehicleId}`}
                  className="block w-full bg-brand-600 text-white text-center py-2 rounded-lg hover:bg-brand-700 transition text-sm"
                >
                  Ver Detalles del Vehículo
                </Link>
                <Link
                  to={`/tracking/history/${selectedVehicle.vehicleId}`}
                  className="flex w-full bg-gray-600 text-white text-center py-2 rounded-lg hover:bg-gray-700 transition text-sm items-center justify-center gap-2"
                >
                  <Navigation className="w-4 h-4" />
                  Ver Historial de Rutas
                </Link>
              </>
            )}

            {selectedVehicle.gpsId && !selectedVehicle.vehicleId && (
              <Link
                to={`/gps/${selectedVehicle.gpsId}`}
                className="block w-full bg-brand-600 text-white text-center py-2 rounded-lg hover:bg-brand-700 transition text-sm"
              >
                Ver Detalles del GPS
              </Link>
            )}
          </div>
        </div>
      )}

      {/* Legend */}
      <div className="hidden md:block absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-20">
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-gray-600">Online</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-gray-400 rounded-full"></div>
            <span className="text-gray-600">Offline</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
            <span className="text-gray-600">En movimiento</span>
          </div>
        </div>
      </div>

      {/* CSS para animación */}
      <style>{`
        @keyframes pulse {
          0%, 100% {
            opacity: 1;
          }
          50% {
            opacity: 0.5;
          }
        }
      `}</style>

      {/* Modal de simulación */}
      <SimulationModal
        isOpen={showSimulation}
        onClose={() => setShowSimulation(false)}
      />
    </div>
  );
}
