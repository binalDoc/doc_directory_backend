const express = require("express");
const router = express.Router();

const doctorController = require("../controllers/doctor.controller");
const adminController = require("../controllers/admin.controller");

const { authorizeRoles } = require("../middlewares/auth.middleware");

router.patch("/doctor-status/:id", authorizeRoles("ADMIN"), doctorController.updateDoctorStatus);
router.get("/doctor-stats", authorizeRoles("ADMIN"), doctorController.getDoctorStatusCounts);
router.get("/users", authorizeRoles("ADMIN"), adminController.getAllUsers);
router.post("/users", authorizeRoles("ADMIN"), adminController.createUserByAdmin);
router.put("/users/:id", authorizeRoles("ADMIN"), adminController.updateUserByAdmin);
router.delete("/users/:id", authorizeRoles("ADMIN"), adminController.deleteUserByAdmin);

module.exports = router;