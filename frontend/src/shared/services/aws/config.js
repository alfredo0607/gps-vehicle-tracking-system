export const awsConfig = {
  region: import.meta.env.VITE_AWS_REGION,
  credentials: {
    accessKeyId: import.meta.env.VITE_AWS_ACCESS_KEY_ID,
    secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY,
  },
};

export const trackerName = import.meta.env.VITE_TRACKER_NAME;
export const mapName = import.meta.env.VITE_MAP_NAME;
export const updateInterval =
  parseInt(import.meta.env.VITE_UPDATE_INTERVAL) || 5000;
