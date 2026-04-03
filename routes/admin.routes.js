const express = require("express");
const router = express.Router();
const upload = require("../config/multer");

const doctorController = require("../controllers/doctor.controller");
const adminController = require("../controllers/admin.controller");

router.post("/bulk-doctors", upload.single("file"), adminController.uploadBulkDoctors);
router.get("/import-doctors", adminController.importDoctorsFromNMC);
router.put("/nmc-verify-doctor/:id", adminController.verifyDoctorOnNMC);
router.patch("/doctor-status/bulk", doctorController.updateDoctorStatus);
router.patch("/doctor-status/:id", doctorController.updateDoctorStatus);
router.get("/doctor-stats", doctorController.getDoctorStatusCounts);
router.get("/users", adminController.getAllUsers);
router.post("/users", adminController.createUserByAdmin);
router.put("/users/:id", adminController.updateUserByAdmin);
router.delete("/users/:id", adminController.deleteUserByAdmin);

router.get("/profile-view-dashboard", adminController.getProfileViewAnalyticsDashboard);
router.get("/doctor/:doctorId/views", adminController.getDoctorViewCount);
router.get("/recent-views", adminController.getRecentViews);
router.get("/top-doctors", adminController.getMostViewedDoctors);
router.get("/views-by-date", adminController.getViewsByDate);

router.get("/search-analytics/summary", adminController.getSearchAnalyticsSummary);
router.get("/search-analytics/top-searches", adminController.getTopSearchTerms);
router.get("/search-analytics/recent", adminController.getRecentSearches);
router.get("/search-analytics/by-date", adminController.getSearchesByDate);

module.exports = router;