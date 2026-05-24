import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { coordinatesAPI } from "@/shared/services/api";

const initialState = {
  currentPositions: {},
  history: {},
  stats: null,
  loading: false,
  error: null,
};

export const fetchCurrentPosition = createAsyncThunk(
  "tracking/fetchCurrent",
  async (gpsId, { rejectWithValue }) => {
    try {
      const response = await coordinatesAPI.getCurrent(gpsId);

      console.log("Current position response:", response.data);

      return { gpsId, data: response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchHistory = createAsyncThunk(
  "tracking/fetchHistory",
  async ({ gpsId, params }, { rejectWithValue }) => {
    try {
      params.startDate = params.startDate.replaceAll("-", "/");
      params.endDate = params.endDate.replaceAll("-", "/");

      const response = await coordinatesAPI.getHistory(gpsId, params);

      return { gpsId, data: response.data.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchTodayCoordinates = createAsyncThunk(
  "tracking/fetchToday",
  async (gpsId, { rejectWithValue }) => {
    try {
      const response = await coordinatesAPI.getToday(gpsId);
      return { gpsId, data: response.data };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchStats = createAsyncThunk(
  "tracking/fetchStats",
  async ({ gpsId, params }, { rejectWithValue }) => {
    try {
      const response = await coordinatesAPI.getStats(gpsId, params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

const trackingSlice = createSlice({
  name: "tracking",
  initialState,
  reducers: {
    clearHistory: (state) => {
      state.history = {};
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchCurrentPosition.fulfilled, (state, action) => {
        state.currentPositions[action.payload.gpsId] = action.payload.data;
      })
      .addCase(fetchHistory.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.history[action.payload.gpsId] = action.payload.data;
      })
      .addCase(fetchHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchTodayCoordinates.fulfilled, (state, action) => {
        state.history[action.payload.gpsId] = action.payload.data;
      })
      .addCase(fetchStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const { clearHistory } = trackingSlice.actions;
export default trackingSlice.reducer;
