const config = require("../config/config");
const axios = require("axios");
const https = require("https");
const redisClient = require("../config/redis");
const jwt = require("jsonwebtoken");

const calculateDoctorProfileCompletion = (profile) => {
    const fields = ["specialty", "bio", "qualification", "experience", "hospital", "country_id", "profile_image_url", "registration_number", "registration_year", "state_medical_council"];

    const filled = fields.filter((field) => profile[field]).length;

    const percentage = Math.round((filled / fields.length) * 100);

    return percentage;
}

const MSD_STATE_COUNCILS = [
    { value: 0, label: "Select State Council" },
    { value: 1, label: "Andhra Pradesh Medical Council" },
    { value: 2, label: "Arunachal Pradesh Medical Council" },
    { value: 3, label: "Assam Medical Council" },
    { value: 4, label: "Bihar Medical Council" },
    { value: 28, label: "Bhopal Medical Council" },
    { value: 29, label: "Bombay Medical Council" },
    { value: 30, label: "Chandigarh Medical Council" },
    { value: 5, label: "Chhattisgarh Medical Council" },
    { value: 6, label: "Delhi Medical Council" },
    { value: 7, label: "Goa Medical Council" },
    { value: 8, label: "Gujarat Medical Council" },
    { value: 9, label: "Haryana Medical Council" },
    { value: 10, label: "Himachal Medical Council" },
    { value: 45, label: "Hyderabad Medical Council" },
    { value: 11, label: "Jammu & Kashmir Medical Council" },
    { value: 12, label: "Jharkhand Medical Council" },
    { value: 13, label: "Karnataka Medical Council" },
    { value: 15, label: "Madhya Pradesh Medical Council" },
    { value: 36, label: "Madras Medical Council" },
    { value: 35, label: "Mahakoshal Medical Council" },
    { value: 26, label: "Manipur Medical Council" },
    { value: 16, label: "Maharashtra Medical Council" },
    { value: 46, label: "Medical Council of India" },
    { value: 47, label: "Medical Council of Tanganyika" },
    { value: 42, label: "Mizoram Medical Council" },
    { value: 37, label: "Mysore Medical Council" },
    { value: 41, label: "Nagaland Medical Council" },
    { value: 17, label: "Orissa Council of Medical Registration" },
    { value: 38, label: "Pondicherry Medical Council" },
    { value: 18, label: "Punjab Medical Council" },
    { value: 19, label: "Rajasthan Medical Council" },
    { value: 20, label: "Sikkim Medical Council" },
    { value: 21, label: "Tamil Nadu Medical Council" },
    { value: 43, label: "Telnagan State Medical Council" },
    { value: 50, label: "Travancore Cochin Medical Council" },
    { value: 22, label: "Tripura State Medical Council" },
    { value: 23, label: "Uttar Pradesh Medical Council" },
    { value: 40, label: "Vidharba Medical Council" },
    { value: 24, label: "Uttarakhand Medical Council" },
    { value: 25, label: "West Bengal Medical Council" },
];

const verifyDoctorFromNMC = async (profile) => {
    try {
        let api_url = config.nmc_doc_verification_api;

        const {
            registration_number,
            state_medical_council,
            registration_year,
            name,
        } = profile;

        const council = MSD_STATE_COUNCILS.find(
            (item) =>
                item.label.toLowerCase().trim() ===
                state_medical_council.toLowerCase().trim()
        );

        if (!council) {
            throw new Error("Invalid state medical council");
        }

        const smcId = council.value;

        const cleanName = name?.toLowerCase().trim();
        const firstWord = cleanName.trim().split(/\s+/)[0];

        const encodedName = encodeURIComponent(
            encodeURIComponent(firstWord)
        );

        api_url += `&name=${encodedName}`;
        api_url += `&registrationNo=${registration_number}`;
        api_url += `&smcId=${smcId}`;
        api_url += `&start=0&length=500`;

        if (registration_year) {
            api_url += `&year=${registration_year}`;
        }

        const response = await axios.get(api_url, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
            timeout: 10000
        });

        const result = response.data;
        if (
            result.recordsFiltered &&
            result.recordsFiltered > 0 &&
            result.data &&
            result.data.length > 0
        ) {
            return result.data.some(
                item => String(item[2]) === String(registration_number)
            );
        }

        return false;
    } catch (error) {
        const isTimeout = error.code === "ECONNABORTED" || error.message?.includes("timeout");
        const isServerError = error.response?.status === 500;

        if (isTimeout || isServerError) {
            throw new Error("NMC server is down, please try again later");
        }

        console.log("NMC Verification Error:", error.message);
        throw error;
    }
};

const fetchNMCDoctors = async (year, limit, offset) => {
    try {
        let api_url = config.nmc_doc_verification_api;

        api_url += `&year=${year}`;
        api_url += `&start=${offset}`;
        api_url += `&length=${limit}`;

        const response = await axios.get(api_url, {
            httpsAgent: new https.Agent({
                rejectUnauthorized: false,
            }),
            timeout: 10000
        });

        const result = response.data;

        if (!result || !Array.isArray(result.data)) {
            throw new Error("Invalid NMC API response format");
        }

        const doctors = result.data.map((item) => ({
            registration_number: item[2],
            state_medical_council: item[3] || null,
            name: item[4],
            registration_year: item[1]
        }));

        return doctors;

    } catch (error) {
        console.log("NMC import error:", error.message);

        throw new Error(
            error?.response?.data?.message ||
            "Failed to fetch doctors from NMC"
        );
    }
};

const clearDoctorsCache = async () => {
    const keys = await redisClient.keys("doctors:*");
    if (keys.length) {
        await redisClient.del(keys);
    }
};

const getUserFromToken = async (req) => {
        const authHeader = req.headers.authorization;

        // Check if token exists
        if (!authHeader || !authHeader.startsWith("Bearer ")) return null;

        // Extract token
        const token = authHeader.split(" ")[1];

        // Verify token
        const decoded = jwt.verify(token, config.jwtSecret);

        if(decoded?.user) return decoded.user;
        
        return null;        
}


module.exports = {
    calculateDoctorProfileCompletion,
    verifyDoctorFromNMC,
    MSD_STATE_COUNCILS,
    fetchNMCDoctors,
    clearDoctorsCache,
    getUserFromToken
}