// const multer = require("multer");
// const path = require("path");

// // Storage config
// const storage = multer.diskStorage({
//   destination: function (req, file, cb) {
//     cb(null, "uploads/"); // folder
//   },
//   filename: function (req, file, cb) {
//     const uniqueName =
//       Date.now() + "-" + Math.round(Math.random() * 1e9);

//     cb(null, uniqueName + path.extname(file.originalname));
//   },
// });

// // File filter (only images)
// const fileFilter = (req, file, cb) => {
//   if (file.mimetype.startsWith("image/")) {
//     cb(null, true);
//   } else {
//     cb(new Error("Only image files allowed"), false);
//   }
// };

// const upload = multer({
//   storage,
//   fileFilter,
//   limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
// });

// module.exports = upload;

const multer = require("multer");
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const cloudinary = require("../config/cloudinary");

// Cloudinary storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "doctor_profiles", // folder in cloudinary
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 500, height: 500, crop: "limit" } // optimize size
    ],
  },
});

// multer config
const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB
});

module.exports = upload;