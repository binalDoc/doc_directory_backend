const express = require("express");
const router = express.Router();

const pharmaController = require("../controllers/pharma.controller");
const { authorizeRoles } = require("../middlewares/auth.middleware");

router.get("/profile", authorizeRoles("PHARMA"), pharmaController.getPharmaprofile);
router.patch("/profile", authorizeRoles("PHARMA"), pharmaController.updatePharmaProfile);

module.exports = router;