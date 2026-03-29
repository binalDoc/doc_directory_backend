const path = require("path");
const doctorModel = require("../models/doctor.model");
const activityModel = require("../models/activity.model");
const userModel = require("../models/user.model");
const {createExcelWorkbook, addExcelWorksheet, setExcelResponseHeaders, sendExcelWorkbookAsDownload} = require("./export.controller");
const { calculateDoctorProfileCompletion } = require("../utils/helper");

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

        return res.status(200).json({ result })
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

//for public profile view
const getDoctorProfileById = async (req, res) => {
    try {
        const viewerId = req.user.id; // pharma/admin
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
        const userId = req.user.id;
        const result = await doctorModel.getDoctors(req.query, userId);
        return res.status(200).json({ result });
    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
};

const updateDoctorStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!["VERIFIED", "REJECTED", "PENDING"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    const result = await doctorModel.updateDoctorStatus(id, status);

    return res.status(200).json({
      message: "Status updated",
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
            Name:                    d.name,
            Email:                   d.email,
            Specialty:               d.specialty || "-",
            Qualification:           d.qualification || "-",
            Experience_Years:        Number(d.experience) || "-",
            Hospital:                d.hospital || "-",
            City:                    d.city_name || "-",
            State:                   d.state_name || "-",
            Country:                 d.country_name || "-",
            Registration_Number:     d.registration_number || "-",
            Registration_Year:       Number(d.registration_year) || "-",
            State_Medical_Council:   d.state_medical_council || "-",
            Status:                  d.status,
            Profile_Completion:      `${d.completionPercentage}%`,
            NMC_verified:            d.nmc_verified
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

