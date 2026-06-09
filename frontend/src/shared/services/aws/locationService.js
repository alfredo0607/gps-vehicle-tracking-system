import {
  LocationClient,
  ListDevicePositionsCommand,
  GetDevicePositionHistoryCommand,
} from "@aws-sdk/client-location";
import { SignatureV4 } from "@smithy/signature-v4";
import { Sha256 } from "@aws-crypto/sha256-js";
import { HttpRequest } from "@smithy/protocol-http";
import {
  CognitoIdentityClient,
  GetIdCommand,
  GetCredentialsForIdentityCommand,
} from "@aws-sdk/client-cognito-identity";
import { awsConfig, trackerName, mapName } from "./config";

// Obtener credenciales temporales desde Cognito Identity Pool
const getCredentials = async () => {
  const cognitoClient = new CognitoIdentityClient({ region: awsConfig.region });

  const { IdentityId } = await cognitoClient.send(
    new GetIdCommand({
      IdentityPoolId:
        import.meta.env.VITE_AWS_IDENTITY_POOL_ID ||
        "us-east-1:0f62588e-efa7-4b5d-8d44-546439aa34ca",
    }),
  );

  const { Credentials } = await cognitoClient.send(
    new GetCredentialsForIdentityCommand({ IdentityId }),
  );

  return {
    accessKeyId: Credentials.AccessKeyId,
    secretAccessKey: Credentials.SecretKey,
    sessionToken: Credentials.SessionToken,
    expiration: Credentials.Expiration,
  };
};

// Credenciales cacheadas
let cachedCredentials = null;

const getValidCredentials = async () => {
  if (
    !cachedCredentials ||
    new Date() >= new Date(cachedCredentials.expiration)
  ) {
    cachedCredentials = await getCredentials();
  }
  return cachedCredentials;
};

// Cliente Location (se crea con credenciales frescas)
const getClient = async () => {
  const credentials = await getValidCredentials();
  return new LocationClient({ region: awsConfig.region, credentials });
};

// Signer para MapLibre
const getSigner = async () => {
  const credentials = await getValidCredentials();
  return new SignatureV4({
    credentials,
    region: awsConfig.region,
    service: "geo",
    sha256: Sha256,
  });
};

export const createTransformRequest = () => {
  return async (url) => {
    if (!url.includes("amazonaws.com")) return { url };
    const signer = await getSigner();
    const urlObj = new URL(url);
    const request = new HttpRequest({
      method: "GET",
      protocol: urlObj.protocol,
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      headers: { host: urlObj.hostname },
    });
    const signed = await signer.sign(request);
    return { url, headers: signed.headers };
  };
};

export const listDevices = async () => {
  const client = await getClient();
  const response = await client.send(
    new ListDevicePositionsCommand({
      TrackerName: trackerName,
      MaxResults: 100,
    }),
  );
  return (response.Entries || []).map((entry) => ({
    deviceId: entry.DeviceId,
    position: { latitude: entry.Position[1], longitude: entry.Position[0] },
    timestamp: entry.SampleTime,
    properties: {
      speed: entry.PositionProperties?.speed || "0",
      heading: entry.PositionProperties?.heading || "0",
      altitude: entry.PositionProperties?.altitude || "0",
    },
  }));
};

export const getDeviceHistory = async (deviceId, maxResults = 100) => {
  const client = await getClient();
  const response = await client.send(
    new GetDevicePositionHistoryCommand({
      TrackerName: trackerName,
      DeviceId: deviceId,
      MaxResults: maxResults,
    }),
  );
  return (response.DevicePositions || []).map((pos) => ({
    position: { latitude: pos.Position[1], longitude: pos.Position[0] },
    timestamp: pos.SampleTime,
  }));
};

export const getMapStyleUrl = () =>
  `https://maps.geo.${awsConfig.region}.amazonaws.com/maps/v0/maps/${mapName}/style-descriptor`;

export const clearCache = () => {
  cachedCredentials = null;
};
