const path = require("path");
const doctorModel = require("../models/doctor.model");
const activityModel = require("../models/activity.model");
const userModel = require("../models/user.model");
const redisClient = require("../config/redis");

const { createExcelWorkbook, addExcelWorksheet, setExcelResponseHeaders, sendExcelWorkbookAsDownload } = require("./export.controller");
const { calculateDoctorProfileCompletion, clearDoctorsCache, getUserFromToken } = require("../utils/helper");

//for doctor, self profile view
const getDoctorProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const doctorProfile = await doctorModel.getDoctorProfileByUserId(userId);

        if (!doctorProfile) return res.status(404).json({ message: "Profile does not exist" });

        const completionPercentage = calculateDoctorProfileCompletion(doctorProfile);

        const result = {
            ...doctorProfile,
            completionPercentage
        }

        return res.status(200).json({ result })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

//for doctor profile update
const updateDoctorProfile = async (req, res) => {
    try {
        const userId = req.user.id;

        const { name, email, country_id, state_id, city_id, ...rest } = req.body;

        if (email) {
            const existing = await userModel.getUserByEmail(email);
            if (existing && existing.id !== userId) {
                return res.status(400).json({ message: "Email already in use" });
            }
        }

        if (rest?.registration_number && rest?.registration_year && rest?.state_medical_council) {
            const existing = await doctorModel.getDoctorProfileByRegNoCouncilRegYear(rest?.registration_number, rest?.registration_year, rest?.state_medical_council);
            if (existing && String(existing.user_id) !== String(userId)) throw new Error("Doctor already exists");
        }

        let updatedUser = await userModel.getUserById(userId);

        if (name || email) {
            updatedUser = await userModel.updateUser(userId, { name, email, country_id, state_id, city_id });
        }

        let profileData = {
            ...updatedUser,
            ...rest
        }

        const updatedProfile = await doctorModel.updateDoctorProfile(
            userId,
            profileData
        );

        const profile = { ...updatedUser, ...updatedProfile }

        const completionPercentage = calculateDoctorProfileCompletion(updatedProfile);

        await clearDoctorsCache();

        const result = {
            ...profile,
            completionPercentage
        }

        return res.status(200).json({ result })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

//uoload doctor image
const uploadDoctorImage = async (req, res) => {
    try {
        const userId = req.user.id;

        if (!req.file) return res.status(404).json({ message: "No file uploaded" });

        // const imageUrl = `/uploads/${req.file.filename}`;
        const imageUrl = req.file.path

        const doctor_profile = await doctorModel.getDoctorProfileByUserId(userId);

        const updatedProfile = await doctorModel.updateDoctorProfile(
            userId,
            { ...doctor_profile, profile_image_url: imageUrl }
        );

        const completionPercentage = calculateDoctorProfileCompletion(updatedProfile);

        const result = {
            ...updatedProfile,
            completionPercentage
        }

        await clearDoctorsCache();

        return res.status(200).json({ result })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

//for public profile view
const getDoctorProfileById = async (req, res) => {
    try {
        let viewerId = req?.user?.id || null; // pharma/admin
        if (!viewerId) {
            const user = await getUserFromToken(req);
            viewerId = user?.id
        }
        const doctorId = req.params.id;

        const doctorProfile = await doctorModel.getDoctorProfileById(doctorId);

        if (!doctorProfile) return res.status(404).json({ message: "Doctor Profile does not exist" });

        const userProfile = await userModel.getUserById(doctorProfile?.user_id);
        // log activity (avoid self view)
        if (String(viewerId) !== String(doctorId)) {
            await activityModel.logProfileView(viewerId, doctorId);
        }

        return res.status(200).json({ result: { ...userProfile, ...doctorProfile } })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

const getDoctors = async (req, res) => {
    try {
        let userId = req?.user?.id || null;
        if (!userId) {
            const user = await getUserFromToken(req);
            userId = user?.id
        }

        const sortedQuery = Object.keys(req.query)
            .sort()
            .reduce((acc, key) => {
                acc[key] = req.query[key];
                return acc;
            }, {});

        const cacheKey = `doctors:${JSON.stringify(sortedQuery)}`;

        const cachedData = await redisClient.get(cacheKey);

        if (cachedData) {
            console.log("Cache HIT");
            return res.status(200).json(JSON.parse(cachedData));
        }

        console.log("Cache MISS");
        const result = await doctorModel.getDoctors(req.query, userId);

        const response = { result };

        await redisClient.setEx(
            cacheKey,
            300, // 5 minutes
            JSON.stringify(response)
        );

        return res.status(200).json(response);

    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
};

// const updateDoctorStatus = async (req, res) => {
//     try {
//         const { id } = req.params;
//         const { status } = req.body;

//         if (!["VERIFIED", "REJECTED", "PENDING"].includes(status)) {
//             return res.status(400).json({ message: "Invalid status" });
//         }

//         const result = await doctorModel.updateDoctorStatus(id, status);

//         await clearDoctorsCache();

//         return res.status(200).json({
//             message: "Status updated",
//             result
//         });
//     } catch (error) {
//         return res.status(500).json({
//             message: error?.message || error
//         });
//     }
// };

const updateDoctorStatus = async (req, res) => {
    try {
        const { status, ids } = req.body;
        const singleId = req.params.id;

        if (!["VERIFIED", "REJECTED", "PENDING"].includes(status)) {
            return res.status(400).json({ message: "Invalid status" });
        }

        // Normalize to always work with an array
        let targetIds = singleId ? [singleId] : ids;

        if (!Array.isArray(targetIds) || targetIds.length === 0) {
            return res.status(400).json({ message: "No doctor IDs provided" });
        }

        // For VERIFIED — filter out non-NMC verified doctors
        let skipped = 0;
        if (status === "VERIFIED") {
            const doctors = await doctorModel.getDoctorsByIds(targetIds);
            const eligible = doctors.filter(d => d.nmc_verified).map(d => d.id);
            skipped = targetIds.length - eligible.length;
            targetIds = eligible;

            if (targetIds.length === 0) {
                return res.status(400).json({
                    message: "No eligible doctors — all selected must be NMC verified to approve"
                });
            }
        }

        const result = await doctorModel.updateDoctorStatus(targetIds, status);

        await clearDoctorsCache();

        return res.status(200).json({
            message: skipped > 0
                ? `${targetIds.length} doctor(s) updated. ${skipped} skipped (not NMC verified).`
                : `${targetIds.length} doctor(s) updated successfully.`,
            skipped,
            result
        });

    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
};

const getDoctorStatusCounts = async (req, res) => {
    try {
        const result = await doctorModel.getDoctorStatusCounts();
        return res.status(200).json({ result });
    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
}

const exportDoctors = async (req, res) => {
    try {
        const doctors = await doctorModel.getDoctorsForExport(req.query);

        if (!doctors.length) {
            return res.status(404).json({ message: "No doctors found to export" });
        }

        const exportData = doctors.map((d) => ({
            Name: d.name,
            Email: d.email,
            Specialty: d.specialty || "-",
            Qualification: d.qualification || "-",
            Experience_Years: Number(d.experience) || "-",
            Hospital: d.hospital || "-",
            City: d.city_name || "-",
            State: d.state_name || "-",
            Country: d.country_name || "-",
            Registration_Number: d.registration_number || "-",
            Registration_Year: Number(d.registration_year) || "-",
            State_Medical_Council: d.state_medical_council || "-",
            Status: d.status,
            Profile_Completion: `${d.completionPercentage}%`,
            NMC_verified: d.nmc_verified
        }));

        const workbook = createExcelWorkbook();
        addExcelWorksheet(workbook, "Doctors", exportData);
        setExcelResponseHeaders(res, `doctors_export_${Date.now()}`);
        await sendExcelWorkbookAsDownload(res, workbook);

    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
};

module.exports = {
    getDoctorProfile,
    updateDoctorProfile,
    uploadDoctorImage,
    getDoctorProfileById,
    getDoctors,
    updateDoctorStatus,
    getDoctorStatusCounts,
    exportDoctors
}

