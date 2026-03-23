const config = require("./config");

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
});

module.exports = cloudinary;