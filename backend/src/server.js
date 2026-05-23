const app = require("./app");
const config = require("./config");
const logger = require("./utils/logger");

const PORT = config.port;

const server = app.listen(PORT, () => {
  logger.info(`
╔════════════════════════════════════════════════╗
║     🚀 Fleet Tracker API Server                ║
╚════════════════════════════════════════════════╝

✅ Server running on port ${PORT}
📍 Environment: ${config.env}
🗺️  Tracker: ${config.location.trackerName}
🌐 CORS enabled for: ${config.cors.origin}

📡 API Documentation: http://localhost:${PORT}/api-docs
🏥 Health check: http://localhost:${PORT}/health

Press CTRL+C to stop
  `);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  logger.info("SIGTERM signal received: closing HTTP server");
  server.close(() => {
    logger.info("HTTP server closed");
    process.exit(0);
  });
});

process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});
