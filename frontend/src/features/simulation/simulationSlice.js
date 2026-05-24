import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { simulationAPI } from "../../shared/services/api";
import toast from "react-hot-toast";

export const startSimulation = createAsyncThunk(
  "simulation/start",
  async (_, { rejectWithValue }) => {
    try {
      const res = await simulationAPI.start();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error al iniciar la simulación");
    }
  }
);

export const stopSimulation = createAsyncThunk(
  "simulation/stop",
  async (_, { rejectWithValue }) => {
    try {
      const res = await simulationAPI.stop();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error al detener la simulación");
    }
  }
);

export const fetchSimulationStatus = createAsyncThunk(
  "simulation/status",
  async (_, { rejectWithValue }) => {
    try {
      const res = await simulationAPI.status();
      return res.data.data;
    } catch (err) {
      return rejectWithValue(err.response?.data?.message || "Error al obtener estado");
    }
  }
);

const simulationSlice = createSlice({
  name: "simulation",
  initialState: {
    running: false,
    startTime: null,
    messageCount: 0,
    lastMessage: null,
    pid: null,
    autoStopAt: null,
    loading: false,
    error: null,
  },
  reducers: {},
  extraReducers: (builder) => {
    builder
      // start
      .addCase(startSimulation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(startSimulation.fulfilled, (state, action) => {
        state.loading = false;
        Object.assign(state, action.payload);
        toast.success("Simulación iniciada correctamente");
      })
      .addCase(startSimulation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // stop
      .addCase(stopSimulation.pending, (state) => {
        state.loading = true;
      })
      .addCase(stopSimulation.fulfilled, (state) => {
        state.loading = false;
        state.running = false;
        state.pid = null;
        toast.success("Simulación detenida");
      })
      .addCase(stopSimulation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // status
      .addCase(fetchSimulationStatus.fulfilled, (state, action) => {
        Object.assign(state, action.payload);
      });
  },
});

export default simulationSlice.reducer;
