import { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { fetchMe } from "./features/auth/authSlice";
import Login from "./features/auth/Login";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import RoleRoute from "./features/auth/RoleRoute";
import VehiclesList from "./features/vehicles/VehiclesList";
import VehicleForm from "./features/vehicles/VehicleForm";
import VehicleDetail from "./features/vehicles/VehicleDetail";
import GPSList from "./features/gps/GPSList";
import GPSForm from "./features/gps/GPSForm";
import GPSDetail from "./features/gps/GPSDetail";
import LiveMap from "./features/tracking/LiveMap";
import VehicleHistory from "./features/tracking/VehicleHistory";
import Layout from "./shared/components/Layout";
import DashboardTwo from "./features/dashboard/DashboardTwo";

const ADMIN_ONLY = ["ADMIN"];

function App() {
  const dispatch = useDispatch();
  const { isAuthenticated, token, user } = useSelector((state) => state.auth);

  // Al recargar la página: si hay token pero no hay usuario, recuperarlo desde la API
  useEffect(() => {
    if (token && !user) {
      dispatch(fetchMe());
    }
  }, [token, user, dispatch]);

  return (
    <Routes>
      {/* Public */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
      />

      {/* Protected */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<DashboardTwo />} />

        {/* Vehicles — listado y detalle: ambos roles / formularios: solo ADMIN */}
        <Route path="vehicles">
          <Route index element={<VehiclesList />} />
          <Route
            path="new"
            element={
              <RoleRoute roles={ADMIN_ONLY}>
                <VehicleForm />
              </RoleRoute>
            }
          />
          <Route path=":id" element={<VehicleDetail />} />
          <Route
            path=":id/edit"
            element={
              <RoleRoute roles={ADMIN_ONLY}>
                <VehicleForm />
              </RoleRoute>
            }
          />
        </Route>

        {/* GPS — listado y detalle: ambos roles / formularios: solo ADMIN */}
        <Route path="gps">
          <Route index element={<GPSList />} />
          <Route
            path="new"
            element={
              <RoleRoute roles={ADMIN_ONLY}>
                <GPSForm />
              </RoleRoute>
            }
          />
          <Route path=":id" element={<GPSDetail />} />
          <Route
            path=":id/edit"
            element={
              <RoleRoute roles={ADMIN_ONLY}>
                <GPSForm />
              </RoleRoute>
            }
          />
        </Route>

        {/* Tracking — ambos roles */}
        <Route path="tracking">
          <Route index element={<LiveMap />} />
          <Route path="history/:vehicleId" element={<VehicleHistory />} />
        </Route>
      </Route>

      {/* 404 */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default App;
