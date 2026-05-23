const Joi = require("joi");

exports.commandValidation = {
  send: Joi.object({
    command: Joi.string()
      .required()
      .valid(
        "block_engine",
        "unblock_engine",
        "activate_alarm",
        "deactivate_alarm",
        "lock_doors",
        "flash_lights",
        "change_report_interval",
        "request_status",
        "set_speed_limit",
      ),
    parameters: Joi.object().optional(),
  }),
};
