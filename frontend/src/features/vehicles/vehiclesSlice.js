import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { vehiclesAPI } from "@/shared/services/api";
import toast from "react-hot-toast";

const initialState = {
  vehicles: [],
  currentVehicle: null,
  loading: false,
  error: null,
};

export const fetchVehicles = createAsyncThunk(
  "vehicles/fetchAll",
  async (params, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchVehicleById = createAsyncThunk(
  "vehicles/fetchById",
  async (id, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const createVehicle = createAsyncThunk(
  "vehicles/create",
  async (data, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.create(data);
      toast.success("Vehículo creado exitosamente");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const updateVehicle = createAsyncThunk(
  "vehicles/update",
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await vehiclesAPI.update(id, data);
      toast.success("Vehículo actualizado exitosamente");
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const deleteVehicle = createAsyncThunk(
  "vehicles/delete",
  async (id, { rejectWithValue }) => {
    try {
      await vehiclesAPI.delete(id);
      toast.success("Vehículo eliminado exitosamente");
      return id;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

const vehiclesSlice = createSlice({
  name: "vehicles",
  initialState,
  reducers: {
    clearCurrentVehicle: (state) => {
      state.currentVehicle = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(fetchVehicles.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVehicles.fulfilled, (state, action) => {
        state.loading = false;
        state.vehicles = action.payload;
      })
      .addCase(fetchVehicles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch By ID
      .addCase(fetchVehicleById.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchVehicleById.fulfilled, (state, action) => {
        state.loading = false;
        state.currentVehicle = action.payload;
      })
      .addCase(fetchVehicleById.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Create
      .addCase(createVehicle.fulfilled, (state, action) => {
        state.vehicles.push(action.payload);
      })
      // Update
      .addCase(updateVehicle.fulfilled, (state, action) => {
        const index = state.vehicles.findIndex(
          (v) => v.vehicleId === action.payload.vehicleId,
        );
        if (index !== -1) {
          state.vehicles[index] = action.payload;
        }
        state.currentVehicle = action.payload;
      })
      // Delete
      .addCase(deleteVehicle.fulfilled, (state, action) => {
        state.vehicles = state.vehicles.filter(
          (v) => v.vehicleId !== action.payload,
        );
      });
  },
});

export const { clearCurrentVehicle } = vehiclesSlice.actions;
export default vehiclesSlice.reducer;
