import { useEffect, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Link } from 'react-router-dom'
import { fetchGPSList, deleteGPS } from './gpsSlice'
import { Plus, Edit, Trash2, Activity, AlertCircle, Search } from 'lucide-react'
import LoadingSpinner from '@/shared/components/LoadingSpinner'
import ConfirmDialog from '@/shared/components/ConfirmDialog'
import { useRole } from '@/features/auth/useRole'

export default function GPSList() {
  const dispatch = useDispatch()
  const { gpsList, loading } = useSelector((state) => state.gps)
  const [search, setSearch] = useState('')
  const [deleteId, setDeleteId] = useState(null)
  const { isAdmin } = useRole()

  useEffect(() => {
    dispatch(fetchGPSList())
  }, [dispatch])

  const filteredGPS = gpsList.filter(
    (g) =>
      g.deviceId?.toLowerCase().includes(search.toLowerCase()) ||
      g.imei?.toLowerCase().includes(search.toLowerCase()) ||
      g.brand?.toLowerCase().includes(search.toLowerCase())
  )

  const handleDelete = async () => {
    if (deleteId) {
      await dispatch(deleteGPS(deleteId))
      setDeleteId(null)
    }
  }

  if (loading) return <LoadingSpinner />

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dispositivos GPS</h1>
          <p className="text-gray-600 mt-1">Gestiona los GPS de tu flota</p>
        </div>
        {isAdmin && (
          <Link
            to="/gps/new"
            className="bg-brand-600 text-white px-4 py-2 rounded-lg hover:bg-brand-700 transition flex items-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Nuevo GPS
          </Link>
        )}
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Buscar por IMEI, Device ID o marca..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Device ID
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                GPS
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                IMEI
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Vehículo
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                Estado
              </th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                Acciones
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredGPS.map((gps) => (
              <tr key={gps.gpsId} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900">{gps.deviceId}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900">
                    {gps.brand} {gps.model}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-500 font-mono">{gps.imei}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                  {gps.vehicleId ? (
                    <Link
                      to={`/vehicles/${gps.vehicleId}`}
                      className="text-brand-600 hover:text-brand-900"
                    >
                      Ver vehículo
                    </Link>
                  ) : (
                    <span className="text-gray-400">Sin asignar</span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  {gps.online ? (
                    <span className="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      <Activity className="w-3 h-3 mr-1" />
                      Online
                    </span>
                  ) : (
                    <span className="px-2 inline-flex items-center text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                      <AlertCircle className="w-3 h-3 mr-1" />
                      Offline
                    </span>
                  )}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <Link to={`/gps/${gps.gpsId}`} className="text-brand-600 hover:text-brand-900 mr-4">
                    Ver
                  </Link>
                  {isAdmin && (
                    <>
                      <Link
                        to={`/gps/${gps.gpsId}/edit`}
                        className="text-blue-600 hover:text-blue-900 mr-4"
                      >
                        <Edit className="w-4 h-4 inline" />
                      </Link>
                      <button
                        onClick={() => setDeleteId(gps.gpsId)}
                        className="text-red-600 hover:text-red-900"
                      >
                        <Trash2 className="w-4 h-4 inline" />
                      </button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {filteredGPS.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500">No se encontraron dispositivos GPS</p>
          </div>
        )}
      </div>

      <ConfirmDialog
        isOpen={!!deleteId}
        onClose={() => setDeleteId(null)}
        onConfirm={handleDelete}
        title="Eliminar GPS"
        message="¿Estás seguro? Esto eliminará el Thing de IoT Core, los certificados y todos los datos asociados."
      />
    </div>
  )
}