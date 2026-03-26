const pharmaModel = require("../models/pharma.model");
const userModel = require("../models/user.model");

//for pharma, self profile view
const getPharmaprofile = async (req, res) => {
    try {
        const userId = req.user.id;
        const pharmaProfile = await pharmaModel.getPharmaProfileById(userId);

        if (!pharmaProfile) return res.status(404).json({ message: "Profile does not exist" });

        return res.status(200).json({ result : pharmaProfile });

    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

//for pharma profile update
const updatePharmaProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const { name, email, state_id, city_id, ...profileData } = req.body;

        if (email) {
            const existing = await userModel.getUserByEmail(email);
            if (existing && existing.id !== userId) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        let updatedUser = await userModel.getUserById(userId);

        if (name || email) {
            updatedUser = await userModel.updateUser(userId, { name, email, country_id, state_id, city_id });
        }

        const updatedProfile = await pharmaModel.updatePharmaProfile(
            userId,
            profileData
        );

        const profile = {...updatedUser, ...updatedProfile}

        return res.status(200).json({result : profile})
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

module.exports = {
    getPharmaprofile,
    updatePharmaProfile
}