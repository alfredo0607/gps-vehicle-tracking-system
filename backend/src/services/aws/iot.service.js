const {
  CreateThingCommand,
  DeleteThingCommand,
  CreateKeysAndCertificateCommand,
  AttachPolicyCommand,
  AttachThingPrincipalCommand,
  DetachThingPrincipalCommand,
  UpdateCertificateCommand,
  DeleteCertificateCommand,
  AddThingToThingGroupCommand,
  RemoveThingFromThingGroupCommand,
  DescribeThingCommand,
} = require("@aws-sdk/client-iot");
const { iotClient } = require("./clients");
const config = require("../../config");
const logger = require("../../utils/logger");

/**
 * Crear Thing completo con certificados
 */
exports.createThingWithCertificates = async (thingName) => {
  try {
    logger.info(`Creating IoT Thing: ${thingName}`);

    // 1. Crear Thing
    const createThingCommand = new CreateThingCommand({
      thingName: thingName,
      attributePayload: {
        attributes: {
          createdAt: new Date().toISOString(),
          type: "gps-tracker",
        },
      },
    });

    const thing = await iotClient.send(createThingCommand);
    logger.info(`Thing created: ${thing.thingName}`);

    // 2. Crear certificados
    const createCertCommand = new CreateKeysAndCertificateCommand({
      setAsActive: true,
    });

    const certificate = await iotClient.send(createCertCommand);
    logger.info(`Certificate created: ${certificate.certificateId}`);

    // 3. Adjuntar policy al certificado
    const attachPolicyCommand = new AttachPolicyCommand({
      policyName: config.iot.policyName,
      target: certificate.certificateArn,
    });

    await iotClient.send(attachPolicyCommand);
    logger.info(`Policy attached: ${config.iot.policyName}`);

    // 4. Adjuntar certificado al Thing
    const attachThingCommand = new AttachThingPrincipalCommand({
      thingName: thingName,
      principal: certificate.certificateArn,
    });

    await iotClient.send(attachThingCommand);
    logger.info(`Certificate attached to Thing`);

    // 5. Agregar a Thing Group
    try {
      const addToGroupCommand = new AddThingToThingGroupCommand({
        thingName: thingName,
        thingGroupName: config.iot.thingGroupName,
      });

      await iotClient.send(addToGroupCommand);
      logger.info(`Thing added to group: ${config.iot.thingGroupName}`);
    } catch (error) {
      logger.warn(`Could not add to Thing Group: ${error.message}`);
    }

    return {
      thingName: thing.thingName,
      thingArn: thing.thingArn,
      thingId: thing.thingId,
      certificateId: certificate.certificateId,
      certificateArn: certificate.certificateArn,
      certificatePem: certificate.certificatePem,
      keyPair: {
        publicKey: certificate.keyPair.PublicKey,
        privateKey: certificate.keyPair.PrivateKey,
      },
    };
  } catch (error) {
    logger.error("Error creating Thing:", error);
    throw error;
  }
};

/**
 * Eliminar Thing y revocar certificados
 */
exports.deleteThing = async (thingName, certificateArn) => {
  try {
    logger.info(`Deleting Thing: ${thingName}`);

    // 1. Detach certificado del Thing
    if (certificateArn) {
      await iotClient.send(
        new DetachThingPrincipalCommand({
          thingName,
          principal: certificateArn,
        }),
      );
    }

    // 2. Remover de Thing Group
    try {
      await iotClient.send(
        new RemoveThingFromThingGroupCommand({
          thingName,
          thingGroupName: config.iot.thingGroupName,
        }),
      );
    } catch (error) {
      logger.warn(`Could not remove from group: ${error.message}`);
    }

    // 3. Eliminar Thing
    await iotClient.send(new DeleteThingCommand({ thingName }));

    // 4. Desactivar y eliminar certificado
    if (certificateArn) {
      const certId = certificateArn.split("/")[1];

      // Desactivar
      await iotClient.send(
        new UpdateCertificateCommand({
          certificateId: certId,
          newStatus: "INACTIVE",
        }),
      );

      // Eliminar
      await iotClient.send(
        new DeleteCertificateCommand({
          certificateId: certId,
          forceDelete: true,
        }),
      );
    }

    logger.info(`Thing deleted: ${thingName}`);
    return true;
  } catch (error) {
    logger.error("Error deleting Thing:", error);
    throw error;
  }
};

/**
 * Obtener info del Thing
 */
exports.describeThing = async (thingName) => {
  const command = new DescribeThingCommand({ thingName });
  return await iotClient.send(command);
};

/**
 * Verificar si Thing existe
 */
exports.thingExists = async (thingName) => {
  try {
    await exports.describeThing(thingName);
    return true;
  } catch (error) {
    if (error.name === "ResourceNotFoundException") {
      return false;
    }
    throw error;
  }
};
