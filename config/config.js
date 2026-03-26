const Joi = require('joi');
require('dotenv').config();

// validation for all the env vars
const envVarsSchema = Joi.object({
    SERVER_PORT: Joi.number()
        .default(5000),
    DATABASE_URL: Joi.string().required()
        .description('POSTGRESQL DB host url'),
    JWT_SECRET: Joi.string().required()
        .description('JWT Secret required to sign'),
    NMC_DOCTOR_VERIFICATION_API: Joi.string().required()
        .description('NMC vrification api is required to sign'),
    CLOUDINARY_CLOUD_NAME: Joi.string().required()
        .description('Cloudinary clound name is required'),
    CLOUDINARY_API_KEY: Joi.string().required()
        .description('Cloudinary api key is required'),
    CLOUDINARY_API_SECRET: Joi.string().required()
        .description('Cloudinary api secret is required'),
    
    // WASABI_PUBLIC_BUCKET_ACCESS_KEY: Joi.string().required(),
    // WASABI_PUBLIC_BUCKET_SECRET_KEY: Joi.string().required(),
    // WASABI_PUBLIC_BUCKET_REGION: Joi.string().required(),
    // WASABI_PUBLIC_BUCKET_NAME: Joi.string().required(),
    // ASSET_WASABI_BASE_URL: Joi.string().required(),
    // ASSET_STORAGE: Joi.string().required(),
}).unknown()
    .required();

const { error, value: envVars } = envVarsSchema.validate(process.env);

if (error) {
    throw new Error(`Config validation error: ${error.message}`);
}

const config = {
    port: envVars.SERVER_PORT,
    db_url: envVars.DATABASE_URL,
    jwtSecret: envVars.JWT_SECRET,
    jwtUserExpire: envVars.JWT_USER_EXPIRE,
    pharma_codes: envVars.PHARMA_CODES,
    cloudinary: {
        cloudName: envVars.CLOUDINARY_CLOUD_NAME,
        apiKey: envVars.CLOUDINARY_API_KEY,
        apiSecret: envVars.CLOUDINARY_API_SECRET
    },
    nmc_doc_verification_api: envVars.NMC_DOCTOR_VERIFICATION_API
    // asset_storage: envVars.ASSET_STORAGE,
    // AWS_S3: {
    //     access_key: envVars.S3_PUBLIC_BUCKET_ACCESS_KEY,
    //     secret_key: envVars.S3_PUBLIC_BUCKET_SECRET_KEY,
    //     region: envVars.S3_PUBLIC_BUCKET_REGION,
    //     bucket_name: envVars.S3_PUBLIC_BUCKET_NAME,
    //     public_base_url: envVars.ASSET_S3_BASE_URL
    // },
    // WASABI: {
    //     access_key: envVars.WASABI_PUBLIC_BUCKET_ACCESS_KEY,
    //     secret_key: envVars.WASABI_PUBLIC_BUCKET_SECRET_KEY,
    //     region: envVars.WASABI_PUBLIC_BUCKET_REGION,
    //     bucket_name: envVars.WASABI_PUBLIC_BUCKET_NAME,
    //     public_base_url: envVars.ASSET_WASABI_BASE_URL
    // }
};

module.exports = config;
