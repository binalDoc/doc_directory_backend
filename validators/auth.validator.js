const Joi = require("joi");

const registerUserSchema = Joi.object({
  name: Joi.string().required(),
  email: Joi.string().email().required(),
  password: Joi.string().min(6).required(),
  role: Joi.string().valid("DOCTOR", "PHARMA", "ADMIN").required(),
  verificationCode : Joi.string().optional(),
  company_name: Joi.string().optional(),
  country_id: Joi.string().required(),
  state_id: Joi.string().optional(),
  city_id: Joi.string().optional(),
});

const loginUserSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});

module.exports = {
  registerUserSchema,
  loginUserSchema
};