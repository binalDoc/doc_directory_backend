const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const userModel = require("../models/user.model")
const doctorModel = require("../models/doctor.model")
const pharmaModel = require("../models/pharma.model")
const activityModel = require("../models/activity.model");

const createUserByAdmin = async (req, res) => {
    try {
        const { name, email, password, role, ...profileData } = req.body;

        //Check email
        const existing = await userModel.getUserByEmail(email);
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        //Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        //Create user
        const user = await userModel.createUser({
            name,
            email,
            hashedPassword,
            role
        });

        let profile = null;

        // Create role-based profile
        if (role === "DOCTOR") {
            await doctorModel.createDoctorProfile(user.id);

            profile = await doctorModel.updateDoctorProfile(
                user.id,
                profileData || {}
            );
        }

        if (role === "PHARMA") {
            profile = await pharmaModel.createPharmaProfile(
                user.id,
                profileData || {}
            );
        }

        return res.status(201).json({
            message: "User created successfully",
            result: {
                ...user,
                ...profile
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
};

const updateUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, email, ...profileData } = req.body;

        //Get existing user
        const existingUser = await userModel.getUserById(id);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        //Update user
        const updatedUser = await userModel.updateUser(id, {
            name,
            email
        });

        let profile = null;

        console.log(profileData)

        //Update role-based profile
        if (existingUser.role === "DOCTOR") {
            profile = await doctorModel.updateDoctorProfile(
                id,
                profileData || {}
            );
        }

        if (existingUser.role === "PHARMA") {
            profile = await pharmaModel.updatePharmaProfile(
                id,
                profileData || {}
            );
        }

        return res.status(200).json({
            message: "User updated successfully",
            result: {
                ...updatedUser,
                ...profile
            }
        });

    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
};

const deleteUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        await userModel.deleteUser(id);

        return res.status(200).json({
            message: "User deleted successfully"
        });

    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
};

const getAllUsers = async (req, res) => {
    try {
        const result = await userModel.getAllUsers(req.query);

        return res.status(200).json({ result });
    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
};

const uploadBulkDoctors = async (req, res) => {
    try {

        const file = req.file;
        if (!file) return res.status(400).json({ message: "File is required" });

        //parse excel file
        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        const success = [];
        const failed = [];

        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            try {
                if (!row.name || !row.email || !row.password) throw new Error("Missing required fileds");

                const hashedPassword = await bcrypt.hash(row.password, 10);

                const existing = await userModel.getUserByEmail(row.email);
                if (existing) throw new Error("Email already exists");

                const user = await userModel.createUser({
                    name: row.name,
                    email: row.email,
                    hashedPassword,
                    role: "DOCTOR"
                });

                await doctorModel.createDoctorProfile(user.id);

                await doctorModel.updateDoctorProfile(user.id, {
                    specialty: row.specialty,
                    experience: Number(row.experience),
                    city: row.city,
                    state: row.state,
                    registration_number: row.registration_number,
                    registration_year: Number(row.registration_year),
                });

                success.push({ row: i + 1, email: row.email });
            } catch (err) {
                failed.push({
                    row: i + 1,
                    email: row.email,
                    error: err.message
                })
            }
        }

        return res.status(201).json({
            message: "Bulk upload completed",
            successCount: success.length,
            failedCount: failed.length,
            failed
        });
    } catch (error) {
        return res.status(500).json({
            message: error?.message || error
        });
    }
}

const getProfileViewAnalyticsDashboard = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const [recentViews, topDoctors, graph] = await Promise.all([
      activityModel.getRecentViews(limit),
      activityModel.getMostViewedDoctors(limit),
      activityModel.getViewsByDate()
    ]);

    return res.status(200).json({
      result: {
        recentViews,
        topDoctors,
        graph
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: error?.message || error
    });
  }
};

const getDoctorViewCount = async (req, res) => {
  try {
    const { doctorId } = req.params;

    const totalViews = await activityModel.getDoctorViewCount(doctorId);

    return res.status(200).json({
      result: {
        doctorId,
        totalViews
      }
    });

  } catch (error) {
    return res.status(500).json({
      message: error?.message || error
    });
  }
};

const getRecentViews = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await activityModel.getRecentViews(limit);

    return res.status(200).json({ result });

  } catch (error) {
    return res.status(500).json({
      message: error?.message || error
    });
  }
};

const getMostViewedDoctors = async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const result = await activityModel.getMostViewedDoctors(limit);

    return res.status(200).json({ result });

  } catch (error) {
    return res.status(500).json({
      message: error?.message || error
    });
  }
};

const getViewsByDate = async (req, res) => {
  try {
    const result = await activityModel.getViewsByDate();

    return res.status(200).json({ result });

  } catch (error) {
    return res.status(500).json({
      message: error?.message || error
    });
  }
};

module.exports = {
    createUserByAdmin,
    updateUserByAdmin,
    deleteUserByAdmin,
    getAllUsers,
    uploadBulkDoctors,
    getProfileViewAnalyticsDashboard,
    getDoctorViewCount,
    getRecentViews,
    getMostViewedDoctors,
    getViewsByDate
}