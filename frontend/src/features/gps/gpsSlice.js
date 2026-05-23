import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { gpsAPI } from "@/shared/services/api";
import toast from "react-hot-toast";

const initialState = {
  gpsList: [],
  currentGPS: null,
  loading: false,
  error: null,
};

export const fetchGPSList = createAsyncThunk(
  "gps/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await gpsAPI.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchGPSById = createAsyncThunk(
  "gps/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await gpsAPI.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const createGPS = createAsyncThunk(
  "gps/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await gpsAPI.create(data);
      toast.success("GPS creado exitosamente");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const updateGPS = createAsyncThunk(
  "gps/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await gpsAPI.update(id, data);
      toast.success("GPS actualizado exitosamente");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const deleteGPS = createAsyncThunk(
  "gps/delete",
  async (id, { rejectWithValue }) => {
    try {
      await gpsAPI.delete(id);
      toast.success("GPS eliminado exitosamente");
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const assignGPSToVehicle = createAsyncThunk(
  "gps/assignToVehicle",
  async ({ id, vehicleId }, { rejectWithValue }) => {
    try {
      await gpsAPI.assignToVehicle(id, vehicleId);
      toast.success("GPS asignado al vehículo");
      return { id, vehicleId };
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

const gpsSlice = createSlice({
  name: "gps",
  initialState,
  reducers: {
    clearCurrentGPS: (state) => {
      state.currentGPS = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchGPSList.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchGPSList.fulfilled, (state, action) => {
        state.loading = false;
        state.gpsList = action.payload;
      })
      .addCase(fetchGPSList.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      .addCase(fetchGPSById.fulfilled, (state, action) => {
        state.currentGPS = action.payload;
      })
      .addCase(createGPS.fulfilled, (state, action) => {
        state.gpsList.push(action.payload.gps);
      })
      .addCase(updateGPS.fulfilled, (state, action) => {
        const index = state.gpsList.findIndex(
          (g) => g.gpsId === action.payload.gpsId,
        );
        if (index !== -1) {
          state.gpsList[index] = action.payload;
        }
      })
      .addCase(deleteGPS.fulfilled, (state, action) => {
        state.gpsList = state.gpsList.filter((g) => g.gpsId !== action.payload);
      });
  },
});

export const { clearCurrentGPS } = gpsSlice.actions;
export default gpsSlice.reducer;
