import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Link } from "react-router-dom";
import { fetchVehicles } from "../vehicles/vehiclesSlice";
import { fetchGPSList } from "../gps/gpsSlice";
import { Car, Cpu, Activity, MapPin, TrendingUp } from "lucide-react";

export default function DashboardTwo() {
  const dispatch = useDispatch();
  const { vehicles } = useSelector((state) => state.vehicles);
  const { gpsList } = useSelector((state) => state.gps);

  useEffect(() => {
    dispatch(fetchVehicles());
    dispatch(fetchGPSList());
  }, [dispatch]);

  const stats = {
    totalVehicles: vehicles.length,
    withGPS: vehicles.filter((v) => v.gpsId).length,
    activeGPS: gpsList.filter((g) => g.online).length,
    moving: gpsList.filter((g) => g.lastSpeed > 5).length,
  };

  const recentVehicles = vehicles.slice(0, 5);
  const recentGPS = gpsList.slice(0, 5);

  return (
    <div className="p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600 mt-2">
          Bienvenido al sistema de rastreo GPS
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Vehículos</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.totalVehicles}
              </p>
            </div>
            <div className="p-3 bg-brand-100 rounded-lg">
              <Car className="w-8 h-8 text-brand-600" />
            </div>
          </div>
          <Link
            to="/vehicles"
            className="text-sm text-brand-600 hover:text-brand-700 mt-4 inline-block"
          >
            Ver todos →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Con GPS</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.withGPS}
              </p>
            </div>
            <div className="p-3 bg-green-100 rounded-lg">
              <Cpu className="w-8 h-8 text-green-600" />
            </div>
          </div>
          <Link
            to="/gps"
            className="text-sm text-green-600 hover:text-green-700 mt-4 inline-block"
          >
            Ver GPS →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">GPS Online</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.activeGPS}
              </p>
            </div>
            <div className="p-3 bg-blue-100 rounded-lg">
              <Activity className="w-8 h-8 text-blue-600" />
            </div>
          </div>
          <Link
            to="/tracking"
            className="text-sm text-blue-600 hover:text-blue-700 mt-4 inline-block"
          >
            Ver mapa →
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">En Movimiento</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">
                {stats.moving}
              </p>
            </div>
            <div className="p-3 bg-purple-100 rounded-lg">
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Vehicles */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              Vehículos Recientes
            </h2>
          </div>
          <div className="p-6">
            {recentVehicles.length > 0 ? (
              <div className="space-y-4">
                {recentVehicles.map((vehicle) => (
                  <div
                    key={vehicle.vehicleId}
                    className="flex items-center justify-between pb-4 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-brand-100 rounded-lg">
                        <Car className="w-5 h-5 text-brand-600" />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {vehicle.plate}
                        </p>
                        <p className="text-sm text-gray-600">
                          {vehicle.brand} {vehicle.model}
                        </p>
                      </div>
                    </div>
                    <Link
                      to={`/vehicles/${vehicle.vehicleId}`}
                      className="text-sm text-brand-600 hover:text-brand-700"
                    >
                      Ver →
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay vehículos registrados
              </p>
            )}
          </div>
        </div>

        {/* Recent GPS */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-6 border-b">
            <h2 className="text-xl font-bold text-gray-900">
              Dispositivos GPS
            </h2>
          </div>
          <div className="p-6">
            {recentGPS.length > 0 ? (
              <div className="space-y-4">
                {recentGPS.map((gps) => (
                  <div
                    key={gps.gpsId}
                    className="flex items-center justify-between pb-4 border-b last:border-b-0"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`p-2 rounded-lg ${gps.online ? "bg-green-100" : "bg-gray-100"}`}
                      >
                        <MapPin
                          className={`w-5 h-5 ${gps.online ? "text-green-600" : "text-gray-600"}`}
                        />
                      </div>
                      <div>
                        <p className="font-semibold text-gray-900">
                          {gps.deviceId}
                        </p>
                        <p className="text-sm text-gray-600">
                          {gps.brand} {gps.model}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          gps.online
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {gps.online ? "Online" : "Offline"}
                      </span>
                      <Link
                        to={`/gps/${gps.gpsId}`}
                        className="block text-sm text-brand-600 hover:text-brand-700 mt-1"
                      >
                        Ver →
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">
                No hay GPS registrados
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
