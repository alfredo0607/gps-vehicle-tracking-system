import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { commandsAPI } from "@/shared/services/api";
import toast from "react-hot-toast";

const initialState = {
  availableCommands: null,
  commandHistory: [],
  currentCommand: null,
  loading: false,
  error: null,
};

export const fetchAvailableCommands = createAsyncThunk(
  "commands/fetchAvailable",
  async (_, { rejectWithValue }) => {
    try {
      const response = await commandsAPI.getAvailable();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const sendCommand = createAsyncThunk(
  "commands/send",
  async ({ gpsId, command, parameters }, { rejectWithValue }) => {
    try {
      console.log(command, parameters);

      const response = await commandsAPI.send(gpsId, { command, parameters });
      toast.success("Comando enviado exitosamente");
      return response.data.data;
    } catch (error) {
      toast.error(error.response?.data?.message || "Error enviando comando");
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchCommandHistory = createAsyncThunk(
  "commands/fetchHistory",
  async (gpsId, { rejectWithValue }) => {
    try {
      const response = await commandsAPI.getHistory(gpsId);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

export const fetchCommandStatus = createAsyncThunk(
  "commands/fetchStatus",
  async (commandId, { rejectWithValue }) => {
    try {
      const response = await commandsAPI.getStatus(commandId);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(error.response?.data?.message);
    }
  },
);

const commandsSlice = createSlice({
  name: "commands",
  initialState,
  reducers: {
    clearCurrentCommand: (state) => {
      state.currentCommand = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch Available
      .addCase(fetchAvailableCommands.fulfilled, (state, action) => {
        state.availableCommands = action.payload;
      })
      // Send Command
      .addCase(sendCommand.pending, (state) => {
        state.loading = true;
      })
      .addCase(sendCommand.fulfilled, (state, action) => {
        state.loading = false;
        state.currentCommand = action.payload;
        state.commandHistory.unshift(action.payload);
      })
      .addCase(sendCommand.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })
      // Fetch History
      .addCase(fetchCommandHistory.fulfilled, (state, action) => {
        state.commandHistory = action.payload;
      })
      // Fetch Status
      .addCase(fetchCommandStatus.fulfilled, (state, action) => {
        const index = state.commandHistory.findIndex(
          (c) => c.commandId === action.payload.commandId,
        );
        if (index !== -1) {
          state.commandHistory[index] = action.payload;
        }
      });
  },
});

export const { clearCurrentCommand } = commandsSlice.actions;
export default commandsSlice.reducer;
