import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector,  } from "react-redux";
import { fetchVehicles } from "../vehicles/vehiclesSlice";
import { fetchGPSList } from "../gps/gpsSlice";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { MapPin, Navigation, Activity, RefreshCw, Radio } from "lucide-react";
import { Link } from "react-router-dom";
import SimulationModal from "../simulation/SimulationModal";
import { withIdentityPoolId } from "@aws/amazon-location-utilities-auth-helper";
import { getMapStyleUrl } from "../../shared/services/aws/locationService";

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

  // Cargar datos iniciales
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([dispatch(fetchVehicles()), dispatch(fetchGPSList())]);
      setLoading(false);
    };
    loadData();

    // Actualizar cada 10 segundos
    const interval = setInterval(() => {
      dispatch(fetchGPSList());
    }, 10000);

    return () => clearInterval(interval);
  }, [dispatch]);

  // Inicializar mapa
  useEffect(() => {
    async function initMap() {
      if (!mapContainer.current || mapInstance.current) return;

      try {
        const authHelper = await withIdentityPoolId(
          import.meta.env.VITE_AWS_IDENTITY_POOL_ID,
        );

        const newMap = new maplibregl.Map({
          container: mapContainer.current,
          style: getMapStyleUrl(),
          center: [-74.7964, 10.9639],
          zoom: 12,
          ...authHelper.getMapAuthenticationOptions(),
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

  // Actualizar marcadores
  useEffect(() => {
    if (!mapInstance.current || !mapLoaded || loading) return;

    console.log("🔄 Actualizando marcadores...");

    // Limpiar marcadores anteriores
    Object.values(markers.current).forEach((marker) => {
      try {
        marker.remove();
      } catch (error) {
        console.error("Error removiendo marcador:", error);
      }
    });
    markers.current = {};

    const gpsWithPosition = gpsList.filter(
      (gps) => gps.lastLatitude && gps.lastLongitude,
    );

    console.log(
      `📍 GPS con posición: ${gpsWithPosition.length}`,
      gpsWithPosition,
    );

    if (gpsWithPosition.length === 0) {
      console.log("⚠️ No hay GPS con posición disponible");
      return;
    }

    // Agregar marcadores
    gpsWithPosition.forEach((gps) => {
      try {
        const el = document.createElement("div");
        el.className = "custom-marker";
        el.style.width = "32px";
        el.style.height = "32px";
        el.style.cursor = "pointer";

        el.innerHTML = `
          <div style="position: relative;">
            <div style="
              width: 32px;
              height: 32px;
              background-color: ${gps.online ? "#0ea5e9" : "#9ca3af"};
              border-radius: 50%;
              border: 4px solid white;
              box-shadow: 0 2px 8px rgba(0,0,0,0.3);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: transform 0.2s;
            "
            onmouseover="this.style.transform='scale(1.1)'"
            onmouseout="this.style.transform='scale(1)'"
            >
              <svg style="width: 16px; height: 16px; color: white;" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            ${
              gps.online
                ? `<div style="
                    position: absolute;
                    top: -2px;
                    right: -2px;
                    width: 12px;
                    height: 12px;
                    background-color: #10b981;
                    border-radius: 50%;
                    border: 2px solid white;
                    animation: pulse 2s infinite;
                  "></div>`
                : ""
            }
          </div>
        `;

        console.log(
          `➕ Creando marcador para ${gps.deviceId} en [${gps.lastLongitude}, ${gps.lastLatitude}]`,
        );

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([gps.lastLongitude, gps.lastLatitude])
          .addTo(mapInstance.current);

        const vehicle = vehicles.find((v) => v.gpsId === gps.gpsId);
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: true,
          closeOnClick: false,
        }).setHTML(`
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
        `);

        marker.setPopup(popup);
        markers.current[gps.gpsId] = marker;

        // ✅ NUEVO: Click handler con animación flyTo
        el.addEventListener("click", () => {
          setSelectedVehicle(
            vehicle || { gpsId: gps.gpsId, deviceId: gps.deviceId },
          );
          popup.addTo(mapInstance.current);

          // ✅ Volar suavemente a la posición del GPS
          mapInstance.current.flyTo({
            center: [gps.lastLongitude, gps.lastLatitude],
            zoom: 16,
            speed: 1.2,
            curve: 1,
            essential: true,
          });

          // ✅ Marcar como interacción del usuario para prevenir auto-zoom
          userInteracted.current = true;
        });

        console.log(`✅ Marcador creado para ${gps.deviceId}`);
      } catch (error) {
        console.error(`❌ Error creando marcador para ${gps.deviceId}:`, error);
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
      <div className="absolute top-4 left-4 bg-white rounded-lg shadow-lg p-4 w-64 z-20">
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
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Vehículos:</span>
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
          <div className="flex justify-between text-sm">
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
        <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-4 w-80 z-20">
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
                  className="block w-full bg-gray-600 text-white text-center py-2 rounded-lg hover:bg-gray-700 transition text-sm flex items-center justify-center gap-2"
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
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-3 z-20">
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
