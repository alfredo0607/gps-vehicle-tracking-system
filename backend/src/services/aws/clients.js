const { DynamoDBClient } = require("@aws-sdk/client-dynamodb");
const { DynamoDBDocumentClient } = require("@aws-sdk/lib-dynamodb");
const { IoTClient } = require("@aws-sdk/client-iot");
const { S3Client } = require("@aws-sdk/client-s3");
const { LocationClient } = require("@aws-sdk/client-location");
const config = require("../../config");

const awsConfig = {
  region: config.aws.region,
  credentials: {
    accessKeyId: config.aws.accessKeyId,
    secretAccessKey: config.aws.secretAccessKey,
  },
};

// DynamoDB
const dynamoClient = new DynamoDBClient(awsConfig);
const docClient = DynamoDBDocumentClient.from(dynamoClient, {
  marshallOptions: {
    removeUndefinedValues: true,
    convertClassInstanceToMap: true,
  },
});

// IoT
const iotClient = new IoTClient(awsConfig);

// S3
const s3Client = new S3Client(awsConfig);

// Location Service
const locationClient = new LocationClient(awsConfig);

module.exports = {
  docClient,
  iotClient,
  s3Client,
  locationClient,
};
