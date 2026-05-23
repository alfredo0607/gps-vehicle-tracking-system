import { useEffect, useRef, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import {
  fetchAvailableCommands,
  sendCommand,
  fetchCommandHistory,
} from "./commandsSlice";
import {
  Lock,
  Unlock,
  Bell,
  BellOff,
  Zap,
  Clock,
  Info,
  Gauge,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Loader,
} from "lucide-react";
import ConfirmDialog from "@/shared/components/ConfirmDialog";
import toast from "react-hot-toast";

const ICON_MAP = {
  lock: Lock,
  unlock: Unlock,
  bell: Bell,
  "bell-off": BellOff,
  zap: Zap,
  clock: Clock,
  info: Info,
  gauge: Gauge,
};

export default function CommandPanel({ gpsId }) {
  const dispatch = useDispatch();
  const { availableCommands, commandHistory, loading } = useSelector(
    (state) => state.commands,
  );
  const [selectedCommand, setSelectedCommand] = useState(null);
  const [commandParams, setCommandParams] = useState({});
  const [confirmDialog, setConfirmDialog] = useState(null);

  const pollingInterval = useRef(null);

  useEffect(() => {
    dispatch(fetchAvailableCommands());
    if (gpsId) {
      dispatch(fetchCommandHistory(gpsId));

      pollingInterval.current = setInterval(() => {
        dispatch(fetchCommandHistory(gpsId));
      }, 3000);
    }

    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
      }
    };
  }, [dispatch, gpsId]);

  const handleCommandClick = (commandKey, commandData) => {
    console.log(commandKey, commandData);

    setSelectedCommand({ key: commandKey, data: commandData });

    // Inicializar parámetros con valores por defecto
    const defaultParams = {};
    if (commandData.parameters) {
      commandData.parameters.forEach((param) => {
        defaultParams[param.name] = param.default;
      });
    }
    setCommandParams(defaultParams);

    // Si requiere confirmación, mostrar diálogo
    if (commandData.requiresConfirmation) {
      setConfirmDialog({
        title: commandData.name,
        message: `¿Estás seguro de que deseas ${commandData.name.toLowerCase()}?`,
        dangerous: commandData.dangerous,
      });
    } else {
      // Enviar directamente si no requiere confirmación
      handleSendCommand(commandKey, defaultParams);
    }
  };

  const handleSendCommand = async (commandKey, params) => {
    try {
      await dispatch(
        sendCommand({
          gpsId: gpsId,
          command: commandKey || selectedCommand.key,
          parameters: params || commandParams,
        }),
      ).unwrap();

      setSelectedCommand(null);
      setCommandParams({});
      setConfirmDialog(null);

      // Actualizar historial después de 2 segundos
      setTimeout(() => {
        dispatch(fetchCommandHistory(gpsId));
      }, 2000);
    } catch (error) {
      console.error("Error sending command:", error);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending":
        return <Loader className="w-4 h-4 text-yellow-600 animate-spin" />;
      case "sent":
        return <Loader className="w-4 h-4 text-blue-600 animate-spin" />;
      case "executed":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "failed":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Info className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: "bg-yellow-100 text-yellow-800",
      sent: "bg-blue-100 text-blue-800",
      executed: "bg-green-100 text-green-800",
      failed: "bg-red-100 text-red-800",
      timeout: "bg-gray-100 text-gray-800",
    };

    const labels = {
      pending: "Pendiente",
      sent: "Enviado",
      executed: "Ejecutado",
      failed: "Fallido",
      timeout: "Timeout",
    };

    return (
      <span
        className={`px-2 py-1 text-xs font-semibold rounded-full ${badges[status]}`}
      >
        {labels[status]}
      </span>
    );
  };

  if (!availableCommands) return null;

  const commandsByCategory = Object.entries(availableCommands.commands).reduce(
    (acc, [key, command]) => {
      if (!acc[command.category]) {
        acc[command.category] = [];
      }
      acc[command.category].push({ key, ...command });
      return acc;
    },
    {},
  );

  return (
    <div className="space-y-6">
      {/* Comandos por categoría */}
      {Object.entries(commandsByCategory).map(([category, commands]) => {
        const categoryInfo = availableCommands.categories[category];

        return (
          <div key={category} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-4 capitalize">
              {categoryInfo.name}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {commands.map((command) => {
                const Icon = ICON_MAP[command.icon] || Info;

                return (
                  <button
                    key={command.key}
                    onClick={() => handleCommandClick(command.code, command)}
                    disabled={loading}
                    className={`p-4 rounded-lg border-2 transition hover:shadow-md text-left ${
                      command.dangerous
                        ? "border-red-200 hover:border-red-400 bg-red-50"
                        : "border-gray-200 hover:border-brand-400 bg-white"
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                  >
                    <div className="flex items-start gap-3">
                      <div
                        className={`p-2 rounded-lg ${
                          command.dangerous ? "bg-red-100" : "bg-brand-100"
                        }`}
                      >
                        <Icon
                          className={`w-5 h-5 ${
                            command.dangerous
                              ? "text-red-600"
                              : "text-brand-600"
                          }`}
                        />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-gray-900">
                          {command.name}
                        </h4>
                        <p className="text-xs text-gray-600 mt-1">
                          {command.description}
                        </p>
                        {command.dangerous && (
                          <div className="flex items-center gap-1 mt-2">
                            <AlertTriangle className="w-3 h-3 text-red-600" />
                            <span className="text-xs text-red-600 font-medium">
                              Requiere confirmación
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {/* Historial de comandos con auto-refresh */}
      {commandHistory.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-900">
              Historial de Comandos
            </h3>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              Actualizando en tiempo real
            </div>
          </div>

          <div className="space-y-2">
            {commandHistory.slice(0, 10).map((cmd) => {
              const cmdData =
                availableCommands?.commands[cmd.command.toUpperCase()];
              const isRecent =
                new Date(cmd.createdAt) > new Date(Date.now() - 60000); // Último minuto

              return (
                <div
                  key={cmd.commandId}
                  className={`flex items-center justify-between p-3 rounded-lg transition ${
                    isRecent
                      ? "bg-blue-50 border border-blue-200"
                      : "bg-gray-50"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {getStatusIcon(cmd.status)}
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {cmdData?.name || cmd.command}
                      </p>
                      <p className="text-xs text-gray-500">
                        {new Date(cmd.createdAt).toLocaleString("es-CO")}
                      </p>
                      {cmd.response?.message && (
                        <p className="text-xs text-gray-600 mt-1">
                          💬 {cmd.response.message}
                        </p>
                      )}
                      {cmd.response?.error && (
                        <p className="text-xs text-red-600 mt-1">
                          ⚠️ {cmd.response.error}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {getStatusBadge(cmd.status)}
                    {cmd.executedAt && (
                      <span className="text-xs text-gray-500">
                        {new Date(cmd.executedAt).toLocaleTimeString("es-CO")}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {/* Confirm Dialog */}
      {confirmDialog && (
        <ConfirmDialog
          isOpen={!!confirmDialog}
          onClose={() => {
            setConfirmDialog(null);
            setSelectedCommand(null);
          }}
          onConfirm={() => handleSendCommand()}
          title={confirmDialog.title}
          message={confirmDialog.message}
          dangerous={confirmDialog.dangerous}
        />
      )}
    </div>
  );
}
