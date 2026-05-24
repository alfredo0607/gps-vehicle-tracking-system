import { useEffect, useState, useRef } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate } from "react-router-dom";
import { fetchVehicleById } from "../vehicles/vehiclesSlice";
import { fetchHistory, fetchStats } from "./trackingSlice";
import {
  ArrowLeft,
  Calendar,
  TrendingUp,
  Clock,
  MapPin,
  Map as MapIcon,
  X,
} from "lucide-react";
import { format, subDays } from "date-fns";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import {
  createTransformRequest,
  getMapStyleUrl,
} from "../../shared/services/aws/locationService";
import LoadingSpinner from "@/shared/components/LoadingSpinner";

export default function VehicleHistory() {
  const { vehicleId } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const { currentVehicle } = useSelector((state) => state.vehicles);
  const { history, stats, loading } = useSelector((state) => state.tracking);

  const coordinates = history[currentVehicle?.gpsId]?.coordinates || [];

  const [dateRange, setDateRange] = useState({
    startDate: format(subDays(new Date(), 7), "yyyy-MM-dd"),
    endDate: format(new Date(), "yyyy-MM-dd"),
  });

  const [showMap, setShowMap] = useState(false);

  const mapContainer = useRef(null);
  const mapInstance = useRef(null);

  useEffect(() => {
    dispatch(fetchVehicleById(vehicleId));
  }, [vehicleId, dispatch]);

  useEffect(() => {
    if (currentVehicle?.gpsId) {
      const params = {
        startDate: dateRange.startDate,
        endDate: dateRange.endDate,
      };
      dispatch(fetchHistory({ gpsId: currentVehicle.gpsId, params }));
      dispatch(fetchStats({ gpsId: currentVehicle.gpsId, params }));
    }
  }, [currentVehicle, dateRange, dispatch]);

  // Inicializar mapa cuando se muestra
  useEffect(() => {
    if (!showMap || !mapContainer.current || mapInstance.current) return;

    async function initMap() {
      try {
        // const authHelper = await withIdentityPoolId(
        //   import.meta.env.VITE_AWS_IDENTITY_POOL_ID,
        // );

        const transformRequest = createTransformRequest();

        const map = new maplibregl.Map({
          container: mapContainer.current,
          style: getMapStyleUrl(),
          center: [-74.7964, 10.9639],
          zoom: 12,
          transformRequest,
        });

        map.addControl(new maplibregl.NavigationControl(), "top-right");
        map.addControl(new maplibregl.FullscreenControl(), "top-right");

        map.on("load", () => {
          console.log("✅ Mapa de ruta cargado");
          drawRoute(map);
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
  }, [showMap]);

  // Redibujar ruta cuando cambien las coordenadas
  useEffect(() => {
    if (showMap && mapInstance.current && coordinates.length > 0) {
      drawRoute(mapInstance.current);
    }
  }, [coordinates, showMap]);

  const drawRoute = (map) => {
    if (!map || coordinates.length === 0) return;

    // Limpiar capas anteriores
    if (map.getLayer("route")) {
      map.removeLayer("route");
    }
    if (map.getSource("route")) {
      map.removeSource("route");
    }

    // Crear línea de ruta
    const routeCoordinates = coordinates.map((coord) => [
      coord.longitude,
      coord.latitude,
    ]);

    map.addSource("route", {
      type: "geojson",
      data: {
        type: "Feature",
        properties: {},
        geometry: {
          type: "LineString",
          coordinates: routeCoordinates,
        },
      },
    });

    map.addLayer({
      id: "route",
      type: "line",
      source: "route",
      layout: {
        "line-join": "round",
        "line-cap": "round",
      },
      paint: {
        "line-color": "#0ea5e9",
        "line-width": 4,
        "line-opacity": 0.8,
      },
    });

    // Marcador de inicio (verde)
    if (coordinates.length > 0) {
      const start = coordinates[coordinates.length - 1];
      new maplibregl.Marker({ color: "#10b981" })
        .setLngLat([start.longitude, start.latitude])
        .setPopup(
          new maplibregl.Popup().setHTML(`
            <div style="padding: 8px;">
              <p style="font-weight: bold; margin-bottom: 4px;">Inicio del Recorrido</p>
              <p style="font-size: 12px; color: #6b7280;">
                ${format(new Date(start.timestamp), "dd/MM/yyyy HH:mm:ss")}
              </p>
            </div>
          `),
        )
        .addTo(map);
    }

    // Marcador de fin (rojo)
    if (coordinates.length > 0) {
      const end = coordinates[0];
      new maplibregl.Marker({ color: "#ef4444" })
        .setLngLat([end.longitude, end.latitude])
        .setPopup(
          new maplibregl.Popup().setHTML(`
            <div style="padding: 8px;">
              <p style="font-weight: bold; margin-bottom: 4px;">Fin del Recorrido</p>
              <p style="font-size: 12px; color: #6b7280;">
                ${format(new Date(end.timestamp), "dd/MM/yyyy HH:mm:ss")}
              </p>
            </div>
          `),
        )
        .addTo(map);
    }

    // Marcadores de paradas (puntos donde la velocidad fue 0)
    const stops = coordinates.filter((coord) => coord?.speed === 0);
    stops.forEach((stop, index) => {
      const el = document.createElement("div");
      el.style.width = "10px";
      el.style.height = "10px";
      el.style.backgroundColor = "#f59e0b";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      new maplibregl.Marker({ element: el })
        .setLngLat([stop.longitude, stop.latitude])
        .setPopup(
          new maplibregl.Popup({ offset: 10 }).setHTML(`
            <div style="padding: 8px;">
              <p style="font-weight: bold; margin-bottom: 4px;">Parada ${index + 1}</p>
              <p style="font-size: 12px; color: #6b7280;">
                ${format(new Date(stop.timestamp), "dd/MM/yyyy HH:mm:ss")}
              </p>
            </div>
          `),
        )
        .addTo(map);
    });

    // Ajustar vista para mostrar toda la ruta
    const bounds = new maplibregl.LngLatBounds();
    routeCoordinates.forEach((coord) => bounds.extend(coord));
    map.fitBounds(bounds, { padding: 50 });
  };

  const handleDateChange = (e) => {
    setDateRange({
      ...dateRange,
      [e.target.name]: e.target.value,
    });
  };

  const chartData = coordinates
    .slice(0, 100)
    .reverse()
    .map((coord) => ({
      time: format(new Date(coord.timestamp), "HH:mm"),
      speed: coord.speed,
    }));

  if (loading && !coordinates.length) return <LoadingSpinner />;
  if (!currentVehicle) return <div className="p-6">Vehículo no encontrado</div>;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <button
        onClick={() => navigate("/tracking")}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver al Mapa
      </button>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {currentVehicle.plate}
            </h1>
            <p className="text-gray-600 mt-1">
              {currentVehicle.brand} {currentVehicle.model} (
              {currentVehicle.year})
            </p>
          </div>
          <div className="flex gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Desde
              </label>
              <input
                type="date"
                name="startDate"
                value={dateRange.startDate}
                onChange={handleDateChange}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Hasta
              </label>
              <input
                type="date"
                name="endDate"
                value={dateRange.endDate}
                onChange={handleDateChange}
                className="px-3 py-2 border border-gray-300 rounded-lg"
              />
            </div>
            <div className="flex items-end">
              <button
                onClick={() => setShowMap(true)}
                disabled={coordinates.length === 0}
                className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <MapIcon className="w-5 h-5" />
                Ver Ruta en Mapa
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Distancia Total</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.distance} km
                </p>
              </div>
              <MapPin className="w-8 h-8 text-brand-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Velocidad Máx</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.maxSpeed} km/h
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-green-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Tiempo en Movimiento</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.timeMoving} min
                </p>
              </div>
              <Clock className="w-8 h-8 text-blue-600" />
            </div>
          </div>

          <div className="bg-white rounded-lg shadow p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Velocidad Promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.avgSpeed} km/h
                </p>
              </div>
              <Calendar className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      )}

      {/* Speed Chart */}
      {chartData.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Velocidad en el Tiempo
          </h2>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="time" />
              <YAxis />
              <Tooltip />
              <Line
                type="monotone"
                dataKey="speed"
                stroke="#0ea5e9"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Coordinates Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-xl font-bold text-gray-900">
            Historial de Coordenadas ({coordinates.length})
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fecha/Hora
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Coordenadas
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Velocidad
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Rumbo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Estado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {coordinates.slice(0, 500).map((coord, index) => (
                <tr key={index} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {format(new Date(coord.timestamp), "dd/MM/yyyy HH:mm:ss")}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {coord.latitude.toFixed(6)}, {coord.longitude.toFixed(6)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coord.speed} km/h
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {coord.heading}°
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        coord.speed > 5
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {coord.speed > 5 ? "En movimiento" : "Detenido"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {coordinates.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500">
                No hay coordenadas en el rango seleccionado
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Modal del Mapa */}
      {showMap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl h-[80vh] flex flex-col">
            {/* Header del Modal */}
            <div className="flex items-center justify-between p-4 border-b">
              <div>
                <h2 className="text-xl font-bold text-gray-900">
                  Ruta de {currentVehicle.plate}
                </h2>
                <p className="text-sm text-gray-600">
                  {format(new Date(dateRange.startDate), "dd/MM/yyyy")} -{" "}
                  {format(new Date(dateRange.endDate), "dd/MM/yyyy")}
                </p>
              </div>
              <button
                onClick={() => setShowMap(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Mapa */}
            <div ref={mapContainer} className="flex-1" />

            {/* Leyenda */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-500 rounded-full"></div>
                  <span className="text-gray-700">Inicio</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-red-500 rounded-full"></div>
                  <span className="text-gray-700">Fin</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                  <span className="text-gray-700">Paradas</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-1 bg-brand-500"></div>
                  <span className="text-gray-700">Ruta recorrida</span>
                </div>
                <div className="ml-auto text-gray-600">
                  <strong>{coordinates.length}</strong> puntos registrados
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
