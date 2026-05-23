import { useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { fetchVehicleById, clearCurrentVehicle } from './vehiclesSlice'
import { ArrowLeft, Edit, MapPin, Calendar, Gauge } from 'lucide-react'
import LoadingSpinner from '@/shared/components/LoadingSpinner'

export default function VehicleDetail() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { currentVehicle, loading } = useSelector((state) => state.vehicles)

  useEffect(() => {
    dispatch(fetchVehicleById(id))
    return () => {
      dispatch(clearCurrentVehicle())
    }
  }, [id, dispatch])

  if (loading) return <LoadingSpinner />
  if (!currentVehicle) return <div className="p-6">Vehículo no encontrado</div>

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <button
        onClick={() => navigate('/vehicles')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver
      </button>

      <div className="bg-white rounded-lg shadow">
        {/* Header */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white p-6 rounded-t-lg">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold">{currentVehicle.plate}</h1>
              <p className="text-brand-100 mt-2">
                {currentVehicle.brand} {currentVehicle.model} ({currentVehicle.year})
              </p>
            </div>
            <div className="flex gap-2">
              <Link
                to={`/vehicles/${id}/edit`}
                className="bg-white text-brand-600 px-4 py-2 rounded-lg hover:bg-brand-50 transition flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                Editar
              </Link>
              {currentVehicle.gpsId && (
                <Link
                  to={`/tracking/history/${id}`}
                  className="bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-400 transition flex items-center gap-2"
                >
                  <MapPin className="w-4 h-4" />
                  Ver Historial
                </Link>
              )}
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Información General */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Información General
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tipo</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">{currentVehicle.type}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Color</dt>
                  <dd className="mt-1 text-sm text-gray-900">{currentVehicle.color || 'N/A'}</dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">VIN</dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {currentVehicle.vin || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Número de Motor</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentVehicle.engineNumber || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Estado</dt>
                  <dd className="mt-1">
                    <span
                      className={`px-2 py-1 text-xs font-semibold rounded-full ${
                        currentVehicle.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}
                    >
                      {currentVehicle.status === 'active' ? 'Activo' : 'Inactivo'}
                    </span>
                  </dd>
                </div>
              </dl>
            </div>

            {/* Especificaciones Técnicas */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Gauge className="w-5 h-5 mr-2" />
                Especificaciones Técnicas
              </h2>
              <dl className="space-y-3">
                <div>
                  <dt className="text-sm font-medium text-gray-500">Kilometraje</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentVehicle.mileage?.toLocaleString() || 0} km
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Tipo de Combustible</dt>
                  <dd className="mt-1 text-sm text-gray-900 capitalize">
                    {currentVehicle.fuelType || 'N/A'}
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Capacidad de Combustible</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentVehicle.fuelCapacity || 'N/A'} litros
                  </dd>
                </div>
                <div>
                  <dt className="text-sm font-medium text-gray-500">Capacidad de Carga</dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {currentVehicle.loadCapacity || 'N/A'} kg
                  </dd>
                </div>
              </dl>
            </div>

            {/* GPS Asignado */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <MapPin className="w-5 h-5 mr-2" />
                GPS
              </h2>
              {currentVehicle.gpsId ? (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-green-800">GPS Asignado</p>
                  <p className="text-sm text-green-600 mt-1">ID: {currentVehicle.gpsId}</p>
                  <p className="text-sm text-green-600">
                    Instalado: {currentVehicle.gpsInstallDate || 'N/A'}
                  </p>
                  <Link
                    to={`/gps/${currentVehicle.gpsId}`}
                    className="text-sm text-green-700 hover:text-green-900 font-medium mt-2 inline-block"
                  >
                    Ver detalles del GPS →
                  </Link>
                </div>
              ) : (
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                  <p className="text-sm text-gray-600">No hay GPS asignado</p>
                  <Link
                    to="/gps/new"
                    className="text-sm text-brand-600 hover:text-brand-700 font-medium mt-2 inline-block"
                  >
                    Asignar GPS →
                  </Link>
                </div>
              )}
            </div>

            {/* Conductor */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Conductor Asignado</h2>
              {currentVehicle.driverName ? (
                <dl className="space-y-3">
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Nombre</dt>
                    <dd className="mt-1 text-sm text-gray-900">{currentVehicle.driverName}</dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Licencia</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentVehicle.driverLicense || 'N/A'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Teléfono</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {currentVehicle.driverPhone || 'N/A'}
                    </dd>
                  </div>
                </dl>
              ) : (
                <p className="text-sm text-gray-500">No hay conductor asignado</p>
              )}
            </div>
          </div>

          {/* Mantenimiento */}
          {(currentVehicle.lastMaintenance || currentVehicle.nextMaintenance) && (
            <div className="mt-6 pt-6 border-t">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Mantenimiento</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {currentVehicle.lastMaintenance && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Último Mantenimiento</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(currentVehicle.lastMaintenance).toLocaleDateString('es-CO')}
                    </dd>
                  </div>
                )}
                {currentVehicle.nextMaintenance && (
                  <div>
                    <dt className="text-sm font-medium text-gray-500">Próximo Mantenimiento</dt>
                    <dd className="mt-1 text-sm text-gray-900">
                      {new Date(currentVehicle.nextMaintenance).toLocaleDateString('es-CO')}
                    </dd>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}