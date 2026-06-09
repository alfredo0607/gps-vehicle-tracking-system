import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useParams, useNavigate, Link } from "react-router-dom";
import { fetchGPSById, clearCurrentGPS } from "./gpsSlice";
import { certificatesAPI } from "@/shared/services/api";
import {
  ArrowLeft,
  Edit,
  Download,
  Activity,
  AlertCircle,
  MapPin,
  Command,
} from "lucide-react";
import LoadingSpinner from "@/shared/components/LoadingSpinner";
import CommandPanel from "@/features/commands/CommandPanel";
import toast from "react-hot-toast";
import { useRole } from "@/features/auth/useRole";

export default function GPSDetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentGPS, loading } = useSelector((state) => state.gps);
  const [downloadingCerts, setDownloadingCerts] = useState(false);
  const [activeTab, setActiveTab] = useState("info");
  const { isAdmin } = useRole();

  useEffect(() => {
    dispatch(fetchGPSById(id));
    return () => {
      dispatch(clearCurrentGPS());
    };
  }, [id, dispatch]);

  const handleDownloadCertificates = async () => {
    try {
      setDownloadingCerts(true);
      const response = await certificatesAPI.download(id);

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${currentGPS.deviceId}-certificates.zip`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success("Certificados descargados");
    } catch (error) {
      toast.error("Error al descargar certificados");
    } finally {
      setDownloadingCerts(false);
    }
  };

  if (loading) return <LoadingSpinner />;
  if (!currentGPS) return <div className="p-6">GPS no encontrado</div>;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate("/gps")}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver
      </button>

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="bg-linear-to-r from-brand-600 to-brand-700 text-white p-4 md:p-6 rounded-t-lg">
          <div className="flex flex-col sm:flex-row justify-between items-start gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="text-2xl md:text-3xl font-bold">{currentGPS.deviceId}</h1>
                {currentGPS.online ? (
                  <span className="px-3 py-1 bg-green-500 rounded-full text-sm font-semibold flex items-center gap-1">
                    <Activity className="w-4 h-4" />
                    Online
                  </span>
                ) : (
                  <span className="px-3 py-1 bg-gray-500 rounded-full text-sm font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" />
                    Offline
                  </span>
                )}
              </div>
              <p className="text-brand-100">
                {currentGPS.brand} {currentGPS.model}
              </p>
            </div>
            {isAdmin && (
              <div className="flex gap-2 shrink-0">
                <button
                  onClick={handleDownloadCertificates}
                  disabled={downloadingCerts}
                  className="bg-white text-brand-600 px-4 py-2 rounded-lg hover:bg-brand-50 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {downloadingCerts ? "Descargando..." : "Certificados"}
                </button>
                <Link
                  to={`/gps/${id}/edit`}
                  className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-400 transition flex items-center gap-2"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex">
            <button
              onClick={() => setActiveTab("info")}
              className={`px-6 py-3 font-medium transition ${
                activeTab === "info"
                  ? "border-b-2 border-brand-600 text-brand-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              Información
            </button>
            <button
              onClick={() => setActiveTab("commands")}
              className={`px-6 py-3 font-medium transition flex items-center gap-2 ${
                activeTab === "commands"
                  ? "border-b-2 border-brand-600 text-brand-600"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              <Command className="w-4 h-4" />
              Comandos Remotos
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === "info" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Información del Dispositivo */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Información del Dispositivo
                </h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">IMEI</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {currentGPS.imei}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Número de Serie
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentGPS.serialNumber || "N/A"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Número SIM
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentGPS.simNumber}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Estado
                    </dt>
                    <dd className="mt-1">
                      <span
                        className={`px-2 py-1 text-xs font-semibold rounded-full ${
                          currentGPS.status === "active"
                            ? "bg-green-100 text-green-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {currentGPS.status === "active" ? "Activo" : "Inactivo"}
                      </span>
                    </dd>
                  </div>
                </dl>
              </div>

              {/* AWS IoT */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  AWS IoT Core
                </h2>
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Thing Name
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono">
                      {currentGPS.iotThingName}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Certificate ID
                    </dt>
                    <dd className="mt-1 text-xs text-gray-900 font-mono">
                      {currentGPS.iotCertificateId?.substring(0, 20)}...
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">
                      Server
                    </dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentGPS.serverAddress}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Port</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentGPS.serverPort || 8883}
                    </dd>
                  </div>
                </dl>
              </div>

              {/* Última Posición */}
              {currentGPS.lastLatitude && currentGPS.lastLongitude && (
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <MapPin className="w-5 h-5 mr-2" />
                    Última Posición
                  </h2>
                  <dl className="space-y-3">
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Coordenadas
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900 font-mono">
                        {currentGPS.lastLatitude.toFixed(6)},{" "}
                        {currentGPS.lastLongitude.toFixed(6)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Velocidad
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {currentGPS.lastSpeed || 0} km/h
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Rumbo
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {currentGPS.lastHeading || 0}°
                      </dd>
                    </div>
                    <div>
                      <dt className="text-sm font-medium text-gray-500">
                        Última Actualización
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {new Date(currentGPS.lastUpdate).toLocaleString(
                          "es-CO",
                        )}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}

              {/* Vehículo Asignado */}
              <div>
                <h2 className="text-lg font-semibold text-gray-900 mb-4">
                  Vehículo Asignado
                </h2>
                {currentGPS.vehicleId ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <p className="text-sm font-medium text-green-800">
                      GPS Asignado
                    </p>
                    <p className="text-sm text-green-600 mt-1">
                      Vehicle ID: {currentGPS.vehicleId}
                    </p>
                    <Link
                      to={`/vehicles/${currentGPS.vehicleId}`}
                      className="text-sm text-green-700 hover:text-green-900 font-medium mt-2 inline-block"
                    >
                      Ver vehículo →
                    </Link>
                  </div>
                ) : (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-sm text-gray-600">
                      No asignado a ningún vehículo
                    </p>
                    <Link
                      to={`/gps/${id}/edit`}
                      className="text-sm text-brand-600 hover:text-brand-700 font-medium mt-2 inline-block"
                    >
                      Asignar a vehículo →
                    </Link>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === "commands" && (
            <div>
              {currentGPS.online ? (
                <CommandPanel
                  gpsId={currentGPS.gpsId}
                  deviceId={currentGPS.deviceId}
                />
              ) : (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6 text-center">
                  <AlertCircle className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-yellow-900 mb-2">
                    GPS Offline
                  </h3>
                  <p className="text-yellow-700">
                    El dispositivo GPS está desconectado. Los comandos no pueden
                    ser enviados hasta que el dispositivo vuelva a estar online.
                  </p>
                  <p className="text-sm text-yellow-600 mt-2">
                    Última conexión:{" "}
                    {new Date(currentGPS.lastUpdate).toLocaleString("es-CO")}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
