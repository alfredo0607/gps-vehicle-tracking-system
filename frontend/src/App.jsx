import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import Login from "./features/auth/Login";
import VehiclesList from "./features/vehicles/VehiclesList";
import VehicleForm from "./features/vehicles/VehicleForm";
import VehicleDetail from "./features/vehicles/VehicleDetail";
import GPSList from "./features/gps/GPSList";
import GPSForm from "./features/gps/GPSForm";
import GPSDetail from "./features/gps/GPSDetail";
import LiveMap from "./features/tracking/LiveMap";
import VehicleHistory from "./features/tracking/VehicleHistory";
import Layout from "./shared/components/Layout";
import ProtectedRoute from "./features/auth/ProtectedRoute";
import DashboardTwo from "./features/dashboard/DashboardTwo";

function App() {
  const { isAuthenticated } = useSelector((state) => state.auth);

  return (
    <Routes>
      {/* Public Routes */}
      <Route
        path="/login"
        element={isAuthenticated ? <Navigate to="/dashboard" /> : <Login />}
      />

      {/* Protected Routes */}
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

        {/* Vehicles */}
        <Route path="vehicles">
          <Route index element={<VehiclesList />} />
          <Route path="new" element={<VehicleForm />} />
          <Route path=":id" element={<VehicleDetail />} />
          <Route path=":id/edit" element={<VehicleForm />} />
        </Route>

        {/* GPS */}
        <Route path="gps">
          <Route index element={<GPSList />} />
          <Route path="new" element={<GPSForm />} />
          <Route path=":id" element={<GPSDetail />} />
          <Route path=":id/edit" element={<GPSForm />} />
        </Route>

        {/* Tracking */}
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
