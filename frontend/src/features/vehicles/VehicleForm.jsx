import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate, useParams } from "react-router-dom";
import { vehicleSchema } from "./validations";
import {
  createVehicle,
  updateVehicle,
  fetchVehicleById,
  clearCurrentVehicle,
} from "./vehiclesSlice";
import { ArrowLeft } from "lucide-react";

export default function VehicleForm() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { currentVehicle, loading } = useSelector((state) => state.vehicles);
  const { user } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm({
    resolver: yupResolver(vehicleSchema),
  });

  useEffect(() => {
    if (id) {
      dispatch(fetchVehicleById(id));
    }
    return () => {
      dispatch(clearCurrentVehicle());
    };
  }, [id, dispatch]);

  useEffect(() => {
    if (currentVehicle && id) {
      reset(currentVehicle);
    }
  }, [currentVehicle, id, reset]);

  const onSubmit = async (data) => {
    const vehicleData = {
      ...data,
      userId: user?.userId || "user-001",
    };

    if (id) {
      await dispatch(updateVehicle({ id, data: vehicleData }));
    } else {
      await dispatch(createVehicle(vehicleData));
    }
    navigate("/vehicles");
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <button
        onClick={() => navigate("/vehicles")}
        className="flex items-center text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Volver
      </button>

      <div className="bg-white rounded-lg shadow p-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">
          {id ? "Editar Vehículo" : "Nuevo Vehículo"}
        </h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Información Básica */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información Básica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Placa *
                </label>
                <input
                  type="text"
                  {...register("plate")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="ABC123"
                />
                {errors.plate && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.plate.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo *
                </label>
                <select
                  {...register("type")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="car">Automóvil</option>
                  <option value="truck">Camión</option>
                  <option value="van">Van</option>
                  <option value="motorcycle">Motocicleta</option>
                  <option value="bus">Bus</option>
                </select>
                {errors.type && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.type.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Marca *
                </label>
                <input
                  type="text"
                  {...register("brand")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="Chevrolet"
                />
                {errors.brand && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.brand.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Modelo *
                </label>
                <input
                  type="text"
                  {...register("model")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="NPR"
                />
                {errors.model && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.model.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Año *
                </label>
                <input
                  type="number"
                  {...register("year")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="2024"
                />
                {errors.year && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.year.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Color
                </label>
                <input
                  type="text"
                  {...register("color")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="Blanco"
                />
              </div>
            </div>
          </div>

          {/* Información Técnica */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Información Técnica
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  VIN
                </label>
                <input
                  type="text"
                  {...register("vin")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="1HGBH41JXMN109186"
                />
                {errors.vin && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.vin.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Número de Motor
                </label>
                <input
                  type="text"
                  {...register("engineNumber")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Kilometraje
                </label>
                <input
                  type="number"
                  {...register("mileage")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="0"
                />
                {errors.mileage && (
                  <p className="mt-1 text-sm text-red-600">
                    {errors.mileage.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo de Combustible
                </label>
                <select
                  {...register("fuelType")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Seleccionar...</option>
                  <option value="diesel">Diesel</option>
                  <option value="gasoline">Gasolina</option>
                  <option value="electric">Eléctrico</option>
                  <option value="hybrid">Híbrido</option>
                </select>
              </div>
            </div>
          </div>

          {/* Conductor */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Conductor Asignado
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nombre del Conductor
                </label>
                <input
                  type="text"
                  {...register("driverName")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Teléfono del Conductor
                </label>
                <input
                  type="text"
                  {...register("driverPhone")}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-brand-500"
                  placeholder="+573001234567"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-4 pt-4 border-t">
            <button
              type="button"
              onClick={() => navigate("/vehicles")}
              className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 transition disabled:opacity-50"
            >
              {loading ? "Guardando..." : id ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
