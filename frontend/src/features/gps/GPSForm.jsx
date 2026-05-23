import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { yupResolver } from '@hookform/resolvers/yup'
import { useDispatch, useSelector } from 'react-redux'
import { useNavigate, useParams } from 'react-router-dom'
import { gpsSchema } from './validations'
import { createGPS, updateGPS, fetchGPSById, clearCurrentGPS } from './gpsSlice'
import { fetchVehicles } from '../vehicles/vehiclesSlice'
import { ArrowLeft, Download } from 'lucide-react'
import toast from 'react-hot-toast'

export default function GPSForm() {
  const { id } = useParams()
  const dispatch = useDispatch()
  const navigate = useNavigate()
  const { currentGPS, loading } = useSelector((state) => state.gps)
  const { vehicles } = useSelector((state) => state.vehicles)
  const [certificateUrls, setCertificateUrls] = useState(null)

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(gpsSchema),
  })

  useEffect(() => {
    dispatch(fetchVehicles())
    if (id) {
      dispatch(fetchGPSById(id))
    }
    return () => {
      dispatch(clearCurrentGPS())
    }
  }, [id, dispatch])

  useEffect(() => {
    if (currentGPS && id) {
      reset(currentGPS)
    }
  }, [currentGPS, id, reset])

  const onSubmit = async (data) => {
    let result
    if (id) {
      result = await dispatch(updateGPS({ id, data }))
    } else {
      result = await dispatch(createGPS(data))
      
      // Si se creó exitosamente, mostrar URLs de certificados
      if (result.payload?.certificates?.downloadUrls) {
        setCertificateUrls(result.payload.certificates.downloadUrls)
        toast.success('GPS creado. Descarga los certificados ahora.')
        return // No navegar aún
      }
    }
    navigate('/gps')
  }

  const handleDownloadCertificates = () => {
    if (certificateUrls) {
      Object.entries(certificateUrls).forEach(([name, url]) => {
        const link = document.createElement('a')
        link.href = url
        link.download = name
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
      })
      toast.success('Certificados descargados')
    }
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate('/gps')}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {id ? 'Editar GPS' : 'Nuevo GPS'}
        </h1>

        {/* Certificados descargables (solo después de crear) */}
        {certificateUrls && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-green-900 mb-2">
                  GPS Creado Exitosamente
                </h3>
                <p className="text-sm text-green-700 mb-4">
                  Descarga los certificados ahora. Las URLs expiran en 1 hora.
                </p>
                <button
                  onClick={handleDownloadCertificates}
                  className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  Descargar Todos los Certificados
                </button>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Información del Dispositivo */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información del Dispositivo
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca *
                </label>
                <input
                  type="text"
                  {...register('brand')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="Teltonika"
                />
                {errors.brand && (
                  <p className="mt-1 text-sm text-red-600">{errors.brand.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo *
                </label>
                <input
                  type="text"
                  {...register('model')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="FMC920"
                />
                {errors.model && (
                  <p className="mt-1 text-sm text-red-600">{errors.model.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  IMEI * (15 dígitos)
                </label>
                <input
                  type="text"
                  {...register('imei')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 font-mono"
                  placeholder="123456789012345"
                  maxLength={15}
                />
                {errors.imei && (
                  <p className="mt-1 text-sm text-red-600">{errors.imei.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Serie
                </label>
                <input
                  type="text"
                  {...register('serialNumber')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>
            </div>
          </div>

          {/* SIM Card */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Tarjeta SIM</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número SIM *
                </label>
                <input
                  type="text"
                  {...register('simNumber')}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="+573001234567"
                />
                {errors.simNumber && (
                  <p className="mt-1 text-sm text-red-600">{errors.simNumber.message}</p>
                )}
              </div>
            </div>
          </div>

          {/* Asignar a Vehículo */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Asignación</h2>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Vehículo (opcional)
              </label>
              <select
                {...register('vehicleId')}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
              >
                <option value="">Sin asignar</option>
                {vehicles
                  .filter((v) => !v.gpsId || v.gpsId === currentGPS?.gpsId)
                  .map((vehicle) => (
                    <option key={vehicle.vehicleId} value={vehicle.vehicleId}>
                      {vehicle.plate} - {vehicle.brand} {vehicle.model}
                    </option>
                  ))}
              </select>
              <p className="mt-1 text-sm text-gray-500">
                Solo se muestran vehículos sin GPS asignado
              </p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate('/gps')}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition disabled:opacity-50"
            >
              {loading ? 'Guardando...' : id ? 'Actualizar' : 'Crear GPS'}
            </button>
          </div>
        </form>

        {/* Info sobre el proceso */}
        {!id && (
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-blue-900 mb-2">
              ℹ️ Proceso de creación
            </h3>
            <ul className="text-sm text-blue-700 space-y-1 list-disc list-inside">
              <li>Se creará automáticamente un Thing en AWS IoT Core</li>
              <li>Se generarán certificados de seguridad</li>
              <li>Los certificados se guardarán en S3</li>
              <li>Se asignará el GPS al Thing Group de la flota</li>
              <li>Podrás descargar los certificados inmediatamente</li>
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}