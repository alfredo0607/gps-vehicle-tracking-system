import * as yup from 'yup'

export const vehicleSchema = yup.object({
  plate: yup
    .string()
    .required('Placa requerida')
    .matches(/^[A-Z0-9]{6}$/, 'Formato inválido (6 caracteres alfanuméricos)'),
  brand: yup.string().required('Marca requerida'),
  model: yup.string().required('Modelo requerido'),
  year: yup
    .number()
    .required('Año requerido')
    .min(1900, 'Año inválido')
    .max(new Date().getFullYear() + 1, 'Año inválido'),
  color: yup.string(),
  type: yup
    .string()
    .required('Tipo requerido')
    .oneOf(['car', 'truck', 'van', 'motorcycle', 'bus'], 'Tipo inválido'),
  vin: yup.string().max(17, 'VIN debe tener máximo 17 caracteres'),
  engineNumber: yup.string(),
  mileage: yup.number().min(0, 'Kilometraje no puede ser negativo'),
  fuelType: yup.string().oneOf(['diesel', 'gasoline', 'electric', 'hybrid']),
  driverName: yup.string(),
  driverPhone: yup.string(),
})