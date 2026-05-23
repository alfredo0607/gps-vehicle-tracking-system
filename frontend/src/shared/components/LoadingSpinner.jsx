export default function LoadingSpinner({ message = "Cargando..." }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[400px]">
      <div className="spinner"></div>
      <p className="mt-4 text-gray-600">{message}</p>
    </div>
  );
}
