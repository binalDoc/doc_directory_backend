const express = require("express");
const router = express.Router();

const geographyController = require("../controllers/geography.controller");

router.get("/countries", geographyController.getCountries);
router.get("/states/:countryId", geographyController.getStates);
router.get("/cities/:stateId", geographyController.getCities);

module.exports = router;