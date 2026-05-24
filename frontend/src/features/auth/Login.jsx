import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useDispatch, useSelector } from "react-redux";
import { login } from "./authSlice";
import { LogIn } from "lucide-react";

const schema = yup.object({
  email: yup.string().email("Email inválido").required("Email requerido"),
  password: yup
    .string()
    .min(6, "Mínimo 6 caracteres")
    .required("Contraseña requerida"),
});

export default function Login() {
  const dispatch = useDispatch();
  const { loading } = useSelector((state) => state.auth);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: yupResolver(schema),
  });

  const onSubmit = (data) => {
    dispatch(login(data));
  };

  const loginAsGuest = () => {
    dispatch(login({ email: "invitado@gmail.com", password: "12345678" }));
  };

  return (
    <div className="min-h-screen bg-brand-900 flex items-center justify-center p-4">
      <div className="bg-brand-800 rounded-lg shadow-2xl p-8 w-full max-w-md border border-gray-700">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-brand-500 rounded-full mb-4">
            <LogIn className="w-8 h-8 text-brand-900" />
          </div>
          <h1 className="text-3xl font-bold text-white">Fleet Tracker</h1>
          <p className="text-gray-400 mt-2">Ingresa a tu cuenta</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              {...register("email")}
              className="w-full px-4 py-2 bg-brand-900 border border-gray-600 text-white rounded-lg placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="tu@email.com"
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-400">
                {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              Contraseña
            </label>
            <input
              type="password"
              {...register("password")}
              className="w-full px-4 py-2 bg-brand-900 border border-gray-600 text-white rounded-lg placeholder-gray-500 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-400">
                {errors.password.message}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-500 text-brand-900 py-3 rounded-lg font-bold hover:bg-brand-400 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Iniciando sesión..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-4">
          <div className="relative flex items-center">
            <div className="grow border-t border-gray-700"></div>
            <span className="mx-3 text-xs text-gray-500 uppercase tracking-wide">o</span>
            <div className="grow border-t border-gray-700"></div>
          </div>
          <button
            onClick={loginAsGuest}
            disabled={loading}
            className="mt-4 w-full bg-transparent border border-gray-600 text-gray-300 py-3 rounded-lg font-medium hover:bg-brand-700 hover:border-gray-500 hover:text-white transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Acceder como invitado (Demo)
          </button>
        </div>
      </div>
    </div>
  );
}
