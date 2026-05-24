import axios from "axios";
import toast from "react-hot-toast";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message =
      error.response?.data?.message || error.message || "Error desconocido";

    const isLoginEndpoint = error.config?.url?.includes("/auth/login");

    if (error.response?.status === 401) {
      if (!isLoginEndpoint) {
        // Token expirado en ruta protegida → cerrar sesión
        localStorage.removeItem("token");
        window.location.href = "/login";
      }
      // Si es el endpoint de login, el authSlice maneja el error con toast.error
    } else {
      toast.error(message);
    }

    return Promise.reject(error);
  },
);

// AUTH
export const authAPI = {
  login: (credentials) => api.post("/auth/login", credentials),
  register: (data) => api.post("/auth/register", data),
  me: () => api.get("/auth/me"),
};

// VEHICLES
export const vehiclesAPI = {
  getAll: (params) => api.get("/vehicles", { params }),
  getById: (id) => api.get(`/vehicles/${id}`),
  create: (data) => api.post("/vehicles", data),
  update: (id, data) => api.put(`/vehicles/${id}`, data),
  delete: (id) => api.delete(`/vehicles/${id}`),
  getByUser: (userId) => api.get(`/vehicles/user/${userId}`),
};

// GPS
export const gpsAPI = {
  getAll: (params) => api.get("/gps", { params }),
  getById: (id) => api.get(`/gps/${id}`),
  create: (data) => api.post("/gps", data),
  update: (id, data) => api.put(`/gps/${id}`, data),
  delete: (id) => api.delete(`/gps/${id}`),
  assignToVehicle: (id, vehicleId) =>
    api.post(`/gps/${id}/assign`, { vehicleId }),
  unassignFromVehicle: (id) => api.post(`/gps/${id}/unassign`),
  getStatus: (id) => api.get(`/gps/${id}/status`),
};

// COORDINATES
export const coordinatesAPI = {
  getCurrent: (gpsId) => api.get(`/coordinates/${gpsId}/current`),
  getHistory: (gpsId, params) =>
    api.get(`/coordinates/${gpsId}/history`, { params }),
  getToday: (gpsId) => api.get(`/coordinates/${gpsId}/today`),
  getWeek: (gpsId) => api.get(`/coordinates/${gpsId}/week`),
  getMonth: (gpsId) => api.get(`/coordinates/${gpsId}/month`),
  getStats: (gpsId, params) =>
    api.get(`/coordinates/${gpsId}/stats`, { params }),
};

// CERTIFICATES
export const certificatesAPI = {
  getInfo: (gpsId) => api.get(`/certificates/${gpsId}`),
  getDownloadUrls: (gpsId) => api.get(`/certificates/${gpsId}/urls`),
  download: (gpsId) =>
    api.get(`/certificates/${gpsId}/download`, { responseType: "blob" }),
  revoke: (gpsId) => api.post(`/certificates/${gpsId}/revoke`),
};

// COMMANDS
export const commandsAPI = {
  getAvailable: () => api.get("/commands/available"),
  send: (gpsId, data) => api.post(`/commands/${gpsId}/send`, data),
  getHistory: (gpsId) => api.get(`/commands/${gpsId}/history`),
  getStatus: (commandId) => api.get(`/commands/status/${commandId}`),
};

// SIMULATION
export const simulationAPI = {
  start: () => api.post("/simulation/start"),
  stop: () => api.post("/simulation/stop"),
  status: () => api.get("/simulation/status"),
};

export default api;
