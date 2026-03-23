const express = require("express");
const router = express.Router();
const { authenticate } = require("../middlewares/auth.middleware");

const authRoutes = require("./auth.routes");
const doctorRoutes = require("./doctor.routes");
const pharmaRoutes = require("./pharma.routes");
const adminRoutes = require("./admin.routes");

router.use("/auth", authRoutes);
router.use("/doctor", authenticate, doctorRoutes);
router.use("/pharma", authenticate, pharmaRoutes);
router.use("/admin", authenticate, adminRoutes);

module.exports = router;