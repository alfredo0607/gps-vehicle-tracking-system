import { useStore } from "@/app/store";
import { useAutoRefresh } from "@/shared/hooks/useAutoRefresh";
import { MapView } from "@/features/map/MapView";
import { StatCard } from "@/shared/components/StatCard";
import { ErrorMessage } from "@/shared/components/ErrorMessage";
import { RefreshCw, Navigation, TrendingUp, Activity } from "lucide-react";
import { updateInterval } from "@/shared/services/aws/config";
import LoadingSpinner from "../../shared/components/LoadingSpinner";

export function Dashboard() {
  const {
    vehicles,
    loading,
    error,
    lastUpdate,
    selectedId,
    fetchVehicles,
    selectVehicle,
    getStats,
  } = useStore();

  useAutoRefresh(fetchVehicles, updateInterval);

  const stats = getStats();

  if (error) {
    return <ErrorMessage error={error} onRetry={fetchVehicles} />;
  }

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-600 to-brand-700 text-white shadow-lg">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Fleet Tracker Pro</h1>
              <p className="text-sm text-brand-100 mt-1">
                AWS Location Service · Real-time tracking
              </p>
            </div>

            <div className="flex items-center gap-8">
              <div className="hidden md:flex gap-6">
                <StatCard icon={Activity} label="Total" value={stats.total} />
                <StatCard
                  icon={TrendingUp}
                  label="En movimiento"
                  value={stats.moving}
                />
                <StatCard
                  icon={Navigation}
                  label="Activos"
                  value={stats.active}
                />
              </div>

              <button
                onClick={fetchVehicles}
                disabled={loading}
                className="p-2 hover:bg-brand-500 rounded-lg transition"
                title="Actualizar"
              >
                <RefreshCw
                  className={`w-5 h-5 ${loading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {lastUpdate && (
            <p className="text-xs text-brand-200 mt-2">
              Última actualización: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
        </div>
      </header>

      {/* Main */}
      <main className="flex-1">
        {loading && vehicles.length === 0 ? (
          <LoadingSpinner message="Cargando vehículos..." />
        ) : (
          <MapView
            vehicles={vehicles}
            selectedId={selectedId}
            onVehicleClick={selectVehicle}
          />
        )}
      </main>
    </div>
  );
}
