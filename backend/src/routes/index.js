const express = require("express");
const router = express.Router();

// Importar rutas
const gpsRoutes = require("./gps.routes");
const vehicleRoutes = require("./vehicles.routes");
const userRoutes = require("./users.routes");
const coordinateRoutes = require("./coordinates.routes");
const certificateRoutes = require("./certificates.routes");
const authRoutes = require("./auth.routes");
const commandRoutes = require("./commands.routes");
const simulationRoutes = require("./simulation.routes");

// API Info
router.get("/", (req, res) => {
  res.json({
    name: "Fleet Tracker API",
    version: "1.0.0",
    description: "API para sistema de rastreo GPS con AWS IoT",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      vehicles: "/api/vehicles",
      gps: "/api/gps",
      coordinates: "/api/coordinates",
      certificates: "/api/certificates",
    },
    documentation: "/api-docs",
    health: "/health",
  });
});

// Rutas
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/vehicles", vehicleRoutes);
router.use("/gps", gpsRoutes);
router.use("/coordinates", coordinateRoutes);
router.use("/certificates", certificateRoutes);
router.use("/commands", commandRoutes);
router.use("/simulation", simulationRoutes);

module.exports = router;
