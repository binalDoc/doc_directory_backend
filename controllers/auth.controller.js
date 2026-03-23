const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken")
const Joi = require("joi");

const userModel = require("../models/user.model")
const doctorModel = require("../models/doctor.model")
const pharmaModel = require("../models/pharma.model");

const { generateJWTToken } = require("../utils/jwt");
const { registerUserSchema, loginUserSchema } = require("../validators/auth.validator");
const config = require("../config/config");

const registerUser = async (req, res) => {
    try {
        //payload validation
        const { error, value } = registerUserSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { name, email, password, role, verificationCode, company_name } = value;

        const pharmaCodes = config.pharma_codes;
        if (role === "PHARMA") {
            if (!verificationCode || !pharmaCodes.includes(verificationCode)) return res.status(400).json({ message: "Invalid verification code" })
        }

        //exist user check
        const existUser = await userModel.getUserByEmail(email);
        if (existUser) return res.status(400).json({ message: "Email already exist" });

        //password hashing
        const hashedPassword = await bcrypt.hash(password, 10);

        //new user create
        const user = await userModel.createUser({ name, email, hashedPassword, role });

        //role based profile create
        if (role === "DOCTOR") await doctorModel.createDoctorProfile(user.id);
        else if (role === "PHARMA") await pharmaModel.createPharmaProfile(user.id, { company_name });

        //jwt access token
        const token = generateJWTToken(user);
        delete user.password;

        return res.status(201).json({
            message: "Registeration successful",
            user,
            token
        });
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

const loginUser = async (req, res) => {
    try {
        //payload validation
        const { error, value } = loginUserSchema.validate(req.body);
        if (error) return res.status(400).json({ message: error.details[0].message });

        const { email, password } = value;

        //exist user check
        const user = await userModel.getUserByEmail(email);
        if (!user) return res.status(404).json({ message: "Email does not exist" });

        //password match
        const isPasswordMatch = await bcrypt.compare(password, user.password);
        if (!isPasswordMatch) return res.status(400).json({ message: "Invalid credentials" });

        //jwt access token
        const token = generateJWTToken(user);
        delete user.password;

        let userData = {};

        if (user?.role === "DOCTOR") userData = await doctorModel.getDoctorProfileByUserId(user.id);
        else if (user?.role === "PHARMA") userData = await pharmaModel.getPharmaProfileById(user.id);

        return res.status(200).json({
            message: "Login successful",
            user: { ...userData, ...user },
            token
        });
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

module.exports = {
    registerUser,
    loginUser
}