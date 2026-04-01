const express = require("express");
const router = express.Router();
const { authenticate, authorizeRoles } = require("../middlewares/auth.middleware");

const authRoutes = require("./auth.routes");
const doctorRoutes = require("./doctor.routes");
const pharmaRoutes = require("./pharma.routes");
const adminRoutes = require("./admin.routes");
const geographyRoutes = require("./geography.routes");

const doctorController = require("../controllers/doctor.controller");

router.use("/auth", authRoutes);
router.use("/geography", geographyRoutes);

router.get("/doctors/list", doctorController.getDoctors);
router.get("/doctors/:id", doctorController.getDoctorProfileById);


router.use("/doctor", authenticate, doctorRoutes);
router.use("/pharma", authenticate, pharmaRoutes);
router.use("/admin", authenticate, authorizeRoles("ADMIN"), adminRoutes);

module.exports = router;