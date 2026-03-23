const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctor.controller");
const { authorizeRoles } = require("../middlewares/auth.middleware");

const upload = require("../middlewares/upload.middleware");

router.get("/list", authorizeRoles("DOCTOR", "PHARMA", "ADMIN"), doctorController.getDoctors);
router.get("/profile", authorizeRoles("DOCTOR"), doctorController.getDoctorProfile);
router.patch("/profile", authorizeRoles("DOCTOR"), doctorController.updateDoctorProfile);
router.post("/image",authorizeRoles("DOCTOR"),upload.single("image"),doctorController.uploadDoctorImage);
router.get("/:id", authorizeRoles("DOCTOR", "PHARMA", "ADMIN"), doctorController.getDoctorProfileById);

module.exports = router;