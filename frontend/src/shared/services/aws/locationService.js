import {
  LocationClient,
  ListDevicePositionsCommand,
  GetDevicePositionHistoryCommand,
} from "@aws-sdk/client-location";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";
import { awsConfig, trackerName, mapName } from "./config";

// Cliente y signer (singleton)
const client = new LocationClient(awsConfig);
const signer = new SignatureV4({
  credentials: awsConfig.credentials,
  region: awsConfig.region,
  service: "geo",
  sha256: Sha256,
});

// Cache simple
const cache = new Map();

/**
 * Transform request para MapLibre - Firma requests con AWS Signature V4
 */
export const createTransformRequest = () => {
  return async (url, resourceType) => {
    if (!url.includes("amazonaws.com")) {
      return { url };
    }

    // Parsear URL
    const urlObj = new URL(url);

    // Crear HttpRequest para firmar
    const request = new HttpRequest({
      method: "GET",
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: {
        host: urlObj.hostname,
      },
    });

    // Firmar request
    const signedRequest = await signer.sign(request);

    // Retornar URL firmada con headers
    return {
      url: url,
      headers: signedRequest.headers,
    };
  };
};

/**
 * Obtener lista de dispositivos
 */
export const listDevices = async () => {
  try {
    const command = new ListDevicePositionsCommand({
      TrackerName: trackerName,
      MaxResults: 100,
    });

    const response = await client.send(command);

    const devices = (response.Entries || []).map((entry) => {
      const device = {
        deviceId: entry.DeviceId,
        position: {
          latitude: entry.Position[1],
          longitude: entry.Position[0],
        },
        timestamp: entry.SampleTime,
        properties: {
          speed: entry.PositionProperties?.speed || "0",
          heading: entry.PositionProperties?.heading || "0",
          altitude: entry.PositionProperties?.altitude || "0",
        },
      };

      return device;
    });

    return devices;
  } catch (error) {
    console.error("Error:", error);
    throw new Error(`Error de AWS: ${error.message}`);
  }
};

/**
 * Obtener historial de un dispositivo
 */
export const getDeviceHistory = async (deviceId, maxResults = 100) => {
  try {
    const command = new GetDevicePositionHistoryCommand({
      TrackerName: trackerName,
      DeviceId: deviceId,
      MaxResults: maxResults,
    });

    const response = await client.send(command);

    console.log(response);

    return (response.DevicePositions || []).map((pos) => ({
      position: {
        latitude: pos.Position[1],
        longitude: pos.Position[0],
      },
      timestamp: pos.SampleTime,
    }));
  } catch (error) {
    throw new Error(`Error obteniendo historial: ${error.message}`);
  }
};

/**
 * Obtener URL del estilo de mapa
 */
export const getMapStyleUrl = () => {
  return `https://maps.geo.${awsConfig.region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor`;
};

/**
 * Limpiar caché
 */
export const clearCache = () => {
  cache.clear();
};
