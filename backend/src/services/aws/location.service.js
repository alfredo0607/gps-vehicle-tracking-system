const {
  ListDevicePositionsCommand,
  GetDevicePositionCommand,
} = require("@aws-sdk/client-location");
const { locationClient } = require("./clients");
const config = require("../../config");

const TRACKER_NAME = config.location.trackerName;

/**
 * Obtener posición de un dispositivo
 */
exports.getDevicePosition = async (deviceId) => {
  try {
    const command = new GetDevicePositionCommand({
      TrackerName: TRACKER_NAME,
      DeviceId: deviceId,
    });

    const response = await locationClient.send(command);

    return {
      deviceId: response.DeviceId,
      position: {
        latitude: response.Position[1],
        longitude: response.Position[0],
      },
      timestamp: response.SampleTime,
      accuracy: response.Accuracy?.Horizontal,
      properties: response.PositionProperties,
    };
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return null;
    }
    throw error;
  }
};

/**
 * Listar todas las posiciones
 */
exports.listAllPositions = async () => {
  const command = new ListDevicePositionsCommand({
    TrackerName: TRACKER_NAME,
    MaxResults: 100,
  });

  const response = await locationClient.send(command);

  return (response.Entries || []).map((entry) => ({
    deviceId: entry.DeviceId,
    position: {
      latitude: entry.Position[1],
      longitude: entry.Position[0],
    },
    timestamp: entry.SampleTime,
    accuracy: entry.Accuracy?.Horizontal,
    properties: entry.PositionProperties,
  }));
};
