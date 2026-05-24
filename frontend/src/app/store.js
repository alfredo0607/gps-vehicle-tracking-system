import { configureStore } from "@reduxjs/toolkit";
import authReducer from "@/features/auth/authSlice";
import vehiclesReducer from "@/features/vehicles/vehiclesSlice";
import gpsReducer from "@/features/gps/gpsSlice";
import trackingReducer from "@/features/tracking/trackingSlice";
import commandsReducer from "@/features/commands/commandsSlice";
import simulationReducer from "@/features/simulation/simulationSlice";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    vehicles: vehiclesReducer,
    gps: gpsReducer,
    tracking: trackingReducer,
    commands: commandsReducer,
    simulation: simulationReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});
