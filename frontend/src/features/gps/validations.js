import * as yup from "yup";

export const gpsSchema = yup.object({
  brand: yup.string().required("Marca requerida"),
  model: yup.string().required("Modelo requerido"),
  imei: yup
    .string()
    .required("IMEI requerido")
    .matches(/^[0-9]{10}$/, "IMEI debe tener 10 dígitos"),
  simNumber: yup
    .string()
    .required("Número SIM requerido")
    .matches(/^\+?[0-9]{10,15}$/, "Número SIM inválido"),
  vehicleId: yup.string(),
  serialNumber: yup.string(),
});
