const geographyModel = require("../models/geography.model")

const getCountries = async (req, res) => {
    try {
        const result = await geographyModel.getCountries();
        return res.status(200).json({ result })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

const getStates  = async (req, res) => {
    try {
        const {countryId} = req.params;
        const result = await geographyModel.getStates(countryId);
        return res.status(200).json({ result })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}


const getCities  = async (req, res) => {
    try {
        const {stateId} = req.params;
        const result = await geographyModel.getCities(stateId);
        return res.status(200).json({ result })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

module.exports = {
    getCountries,
    getStates,
    getCities
}