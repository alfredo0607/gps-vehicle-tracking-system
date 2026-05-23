import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import {
  getVehicleStatus,
  STATUS_COLORS,
  STATUS_TEXT,
} from "@/shared/utils/vehicle";
import "maplibre-gl/dist/maplibre-gl.css";
import "./map.css";
import { withIdentityPoolId } from "@aws/amazon-location-utilities-auth-helper";
import { getMapStyleUrl } from "../../shared/services/aws/locationService";

export function MapView({ vehicles, selectedId, onVehicleClick }) {
  const mapRef = useRef(null);
  const mapInstance = useRef(null);
  const markers = useRef({});
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    async function initMap() {
      if (!mapRef.current || mapInstance.current) return;

      try {
        // 3️⃣ Crear mapa
        const authHelper = await withIdentityPoolId(
          import.meta.env.VITE_AWS_IDENTITY_POOL_ID,
          import.meta.env.VITE_AWS_REGION,
        );

        const map = new maplibregl.Map({
          container: mapRef.current,
          style: getMapStyleUrl(), // `https://maps.geo.${awsConfig.region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor`;
          center: [0, 0],
          zoom: 2,
          ...authHelper.getMapAuthenticationOptions(),
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(new maplibregl.FullscreenControl(), "top-right");

        map.on("load", () => {
          console.log("✅ Mapa cargado correctamente");
          setLoaded(true);
        });

        map.on("error", (e) => {
          console.error("❌ Error en el mapa:", e);
        });

        mapInstance.current = map;
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
    if (!mapInstance.current || !loaded) return;

    // Limpiar marcadores viejos
    Object.keys(markers.current).forEach((id) => {
      if (!vehicles.find((v) => v.deviceId === id)) {
        markers.current[id].remove();
        delete markers.current[id];
      }
    });

    // Agregar/actualizar marcadores
    vehicles.forEach((vehicle) => {
      const { deviceId, position } = vehicle;
      const { longitude, latitude } = position;

      if (markers.current[deviceId]) {
        markers.current[deviceId].setLngLat([longitude, latitude]);
        const popup = markers.current[deviceId].getPopup();
        if (popup) popup.setHTML(createPopupHTML(vehicle));
      } else {
        const el = createMarker(vehicle);
        const popup = createPopup(vehicle);

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([longitude, latitude])
          .setPopup(popup)
          .addTo(mapInstance.current);

        el.addEventListener("click", () => onVehicleClick?.(deviceId));
        markers.current[deviceId] = marker;
      }
    });
  }, [vehicles, loaded, onVehicleClick]);

  // Centrar en vehículo seleccionado
  useEffect(() => {
    if (!mapInstance.current || !loaded || !selectedId) return;

    const vehicle = vehicles.find((v) => v.deviceId === selectedId);
    if (vehicle && markers.current[selectedId]) {
      mapInstance.current.flyTo({
        center: [vehicle.position.longitude, vehicle.position.latitude],
        zoom: 16,
        duration: 1500,
      });
      markers.current[selectedId].togglePopup();
    }
  }, [selectedId, vehicles, loaded]);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center p-8 max-w-md">
          <div className="text-6xl mb-4">⚠️</div>
          <h3 className="text-xl font-bold mb-2">Error en el Mapa</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <div className="text-sm text-left bg-gray-100 p-4 rounded">
            <p className="font-semibold mb-2">Verifica:</p>
            <ul className="list-disc list-inside space-y-1 text-gray-700">
              <li>VITE_AWS_ACCESS_KEY_ID está configurado</li>
              <li>VITE_AWS_SECRET_ACCESS_KEY está configurado</li>
              <li>Las credenciales son correctas</li>
              <li>El usuario tiene permisos geo:GetMap*</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative">
      <div ref={mapRef} className="w-full h-full" />
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="text-center">
            <div className="w-12 h-12 border-4 border-brand-200 border-t-brand-600 rounded-full animate-spin mx-auto"></div>
            <p className="mt-4 text-gray-600">Cargando mapa de AWS...</p>
            <p className="mt-2 text-xs text-gray-500">
              Firmando requests con AWS Signature V4
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

function createMarker(vehicle) {
  const status = getVehicleStatus(vehicle);
  const color = STATUS_COLORS[status];
  const heading = parseFloat(vehicle.properties?.heading || 0);

  const el = document.createElement("div");
  el.className = "vehicle-marker";
  el.innerHTML = `
    <div class="marker-dot" style="background: ${color}; transform: rotate(${heading}deg)">
      <svg width="16" height="16" viewBox="0 0 16 16" fill="white" style="transform: rotate(-${heading}deg)">
        <path d="M8 2l2 6h4l-3 4 2 6-5-4-5 4 2-6-3-4h4z"/>
      </svg>
    </div>
  `;
  return el;
}

function createPopup(vehicle) {
  return new maplibregl.Popup({
    offset: 25,
    closeButton: false,
    className: "vehicle-popup",
  }).setHTML(createPopupHTML(vehicle));
}

function createPopupHTML(vehicle) {
  const status = getVehicleStatus(vehicle);
  const statusText = STATUS_TEXT[status];
  const statusColor = STATUS_COLORS[status];

  return `
    <div class="p-3 min-w-[200px]">
      <h3 class="font-bold text-sm mb-2">${vehicle.deviceId}</h3>
      <div class="inline-block px-2 py-1 rounded text-xs font-medium mb-2" style="background: ${statusColor}20; color: ${statusColor}">
        ${statusText}
      </div>
      <div class="text-xs space-y-1">
        <div class="flex justify-between gap-4">
          <span class="text-gray-600">Velocidad:</span>
          <strong>${vehicle.properties.speed} km/h</strong>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-gray-600">Rumbo:</span>
          <strong>${vehicle.properties.heading}°</strong>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-gray-600">Altitud:</span>
          <strong>${vehicle.properties.altitude} m</strong>
        </div>
        <div class="flex justify-between gap-4">
          <span class="text-gray-600">Última act.:</span>
          <strong>${new Date(vehicle.timestamp).toLocaleTimeString("es-CO")}</strong>
        </div>
      </div>
    </div>
  `;
}
