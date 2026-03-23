const bcrypt = require("bcrypt");
const userModel = require("../models/user.model")
const doctorModel = require("../models/doctor.model")
const pharmaModel = require("../models/pharma.model")

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

        console.log(id)

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

module.exports = {
  createUserByAdmin,
  updateUserByAdmin,
  deleteUserByAdmin,
  getAllUsers
}