import { X, AlertTriangle } from "lucide-react";

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  dangerous = false,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div
          className={`flex items-center justify-between p-6 border-b ${dangerous ? "bg-red-50" : ""}`}
        >
          <div className="flex items-center gap-3">
            {dangerous && <AlertTriangle className="w-6 h-6 text-red-600" />}
            <h3
              className={`text-xl font-bold ${dangerous ? "text-red-900" : "text-gray-900"}`}
            >
              {title}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-6">
          <p className={dangerous ? "text-red-700" : "text-gray-700"}>
            {message}
          </p>
          {dangerous && (
            <div className="mt-4 p-3 bg-red-100 border border-red-200 rounded-lg">
              <p className="text-sm text-red-800 font-medium">
                ⚠️ Esta acción es crítica y puede afectar la operación del
                vehículo.
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 p-6 border-t">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className={`px-4 py-2 rounded-lg transition ${
              dangerous
                ? "bg-red-600 text-white hover:bg-red-700"
                : "bg-brand-600 text-white hover:bg-brand-700"
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  );
}
