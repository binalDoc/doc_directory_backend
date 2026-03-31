const XLSX = require("xlsx");
const bcrypt = require("bcrypt");
const userModel = require("../models/user.model")
const doctorModel = require("../models/doctor.model")
const pharmaModel = require("../models/pharma.model")
const activityModel = require("../models/activity.model");
const nmcImportModel = require("../models/nmcImport.model");

const pool = require("../config/db/db");
const { MSD_STATE_COUNCILS, fetchNMCDoctors, clearDoctorsCache, verifyDoctorFromNMC } = require("../utils/helper");

const createUserByAdmin = async (req, res) => {
    try {
        const { name, email, password, role, country_id, state_id, city_id, ...profileData } = req.body;

        //Check email
        const existing = await userModel.getUserByEmail(email);
        if (existing) {
            return res.status(400).json({ message: "Email already exists" });
        }

        if (profileData?.registration_number && profileData?.registration_year && profileData?.state_medical_council) {
            const existing = await doctorModel.getDoctorProfileByRegNoCouncilRegYear(profileData?.registration_number, profileData?.registration_year, profileData?.state_medical_council);
            if (existing) throw new Error("Doctor already exists");
        }

        //Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        //Create user
        const user = await userModel.createUser({
            name,
            email,
            hashedPassword,
            role,
            country_id,
            state_id,
            city_id
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

        await clearDoctorsCache();

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
        const { name, email, country_id, state_id, city_id, ...rest } = req.body;

        const toIntOrNull = (val) => {
            const parsed = parseInt(val);
            return isNaN(parsed) ? null : parsed;
        };

        const existingUser = await userModel.getUserById(id);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        if (rest?.registration_number && rest?.registration_year && rest?.state_medical_council) {
            const existing = await doctorModel.getDoctorProfileByRegNoCouncilRegYear(rest?.registration_number, rest?.registration_year, rest?.state_medical_council);
            if (existing && String(existing.user_id)!==String(id)) throw new Error("Doctor already exists");
        }


        const updatedUser = await userModel.updateUser(id, {
            name,
            email,
            country_id: toIntOrNull(country_id),
            state_id: toIntOrNull(state_id),
            city_id: toIntOrNull(city_id),
        });

        let profile = null;
        let profileData = { ...updatedUser, ...rest };

        if (existingUser.role === "DOCTOR") {
            profile = await doctorModel.updateDoctorProfile(id, profileData || {});
        }

        if (existingUser.role === "PHARMA") {
            profile = await pharmaModel.updatePharmaProfile(id, profileData || {});
        }

        await clearDoctorsCache();

        return res.status(200).json({
            message: "User updated successfully",
            result: { ...updatedUser, ...profile }
        });

    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
};

const verifyDoctorOnNMC = async (req, res) => {
    try {
        const { id } = req.params;

        const existingUser = await userModel.getUserById(id);
        if (!existingUser) {
            return res.status(404).json({ message: "User not found" });
        }

        const profile = await doctorModel.getDoctorProfileByUserId(id);
        if (!profile || profile.nmc_verified) {
            return res.status(404).json({ message: "Invalid doctor profile" });
        }

        let nmc_verified = profile?.nmc_verified || false;
        let profileData = { ...existingUser, ...profile };

        const keyFields = [
            "name",
            "registration_number",
            "state_medical_council",
            "registration_year"
        ];

        const isReadyForVerification = keyFields.every(
            (key) => profileData[key] && String(profileData[key]).trim() !== ""
        );

        if (isReadyForVerification) {
            try {
                console.log("NMC API called")
                const isVerified = await verifyDoctorFromNMC(profileData);
                nmc_verified = isVerified;
            } catch (error) {
                console.error("Verification failed:", error.message);
                throw new Error(error?.message || error);
            }

        } else {
            throw new Error("Incomplete profile");
        }

        const result = await doctorModel.updateDoctorNMCFlag(nmc_verified, id);

        await clearDoctorsCache();

        return res.status(200).json({
            message: "NMC verification done",
            result
        });

    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
}

const deleteUserByAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        await userModel.deleteUser(id);

        await clearDoctorsCache();

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

        const workbook = XLSX.read(file.buffer, { type: "buffer" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);

        if (data.length > 5) return res.status(400).json({ message: "You can upload maximum 5 doctors at a time", code: "LIMIT_EXCEEDED" });

        const success = [];
        const failed = [];

        const countriesResult = await pool.query(
            `SELECT id, LOWER(TRIM(name)) AS name FROM countries`
        );
        const countryMap = {}; // { "india": 1, "usa": 2, ... }
        countriesResult.rows.forEach((c) => {
            countryMap[c.name] = c.id;
        });

        const VALID_STATE_COUNCILS = new Set(
            MSD_STATE_COUNCILS.filter(c => c.value !== 0).map(c => c.label.trim().toLowerCase())
        );

        const client = await pool.connect();

        try {
            for (let i = 0; i < data.length; i++) {
                const row = data[i];

                try {
                    await client.query("BEGIN");

                    // Required field validation
                    const requiredFields = [
                        "name", "email", "password",
                        "registration_number", "registration_year", "country"
                    ];
                    for (const field of requiredFields) {
                        if (!row[field] || String(row[field]).trim() === "") {
                            throw new Error(`${field} is required`);
                        }
                    }

                    if (row.experience && isNaN(Number(row.experience))) {
                        throw new Error("Invalid experience");
                    }

                    const year = Number(row.registration_year);
                    if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear()) {
                        throw new Error("Invalid registration year");
                    }

                    row.email = row.email?.trim().toLowerCase();
                    if (!/\S+@\S+\.\S+/.test(row.email)) throw new Error("Invalid email format");

                    if (row.state_medical_council) {
                        const council = String(row.state_medical_council).trim().toLowerCase();

                        if (!VALID_STATE_COUNCILS.has(council)) {
                            throw new Error(
                                `Invalid state medical council: "${row.state_medical_council}"`
                            );
                        }
                    }

                    // ── Resolve country name → id
                    const countryKey = String(row.country).trim().toLowerCase();
                    const country_id = countryMap[countryKey];
                    if (!country_id) throw new Error(`Country "${row.country}" not found`);

                    const hashedPassword = await bcrypt.hash(row.password, 10);

                    const existing = await userModel.getUserByEmail(row.email, client);
                    if (existing) throw new Error("Email already exists");

                    if (row?.registration_number && row?.registration_year && row?.state_medical_council) {
                        const existing = await doctorModel.getDoctorProfileByRegNoCouncilRegYear(row?.registration_number, row?.registration_year, row?.state_medical_council);
                        if (existing) throw new Error("Doctor already exists");
                    }

                    const user = await userModel.createUser({
                        name: row.name,
                        email: row.email,
                        hashedPassword,
                        role: "DOCTOR",
                        country_id,
                    }, client);

                    await doctorModel.createDoctorProfile(user.id, client);

                    await doctorModel.updateDoctorProfile(user.id, {
                        experience: Number(row.experience) || null,
                        registration_number: row.registration_number,
                        registration_year: Number(row.registration_year),
                        state_medical_council: row.state_medical_council || null,
                    }, client);

                    await client.query("COMMIT");

                    success.push({ row: i + 1, email: row.email });
                } catch (err) {
                    await client.query("ROLLBACK");
                    failed.push({ row: i + 1, email: row.email, error: err.message });
                }
            }
        } finally {
            client.release();
        }

        await clearDoctorsCache();

        return res.status(201).json({
            message: "Bulk upload completed",
            successCount: success.length,
            failedCount: failed.length,
            failed,
        });

    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
};

const importDoctorsFromNMC = async (req, res) => {
    const { year, limit } = req.query;
    const adminId = req.user.id;

    if (!year || !limit) {
        return res.status(400).json({ message: "Year and limit are required" });
    }

    if (limit > 5) {
        return res.status(400).json({ message: "Limit cannot exceed 5" });
    }

    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        const alreadyUsed = await nmcImportModel.checkTodayUsage(adminId, client);

        if (alreadyUsed) {
            return res.status(400).json({
                message: "You can import from NMC only once per day"
            });
        }

        const offset = await nmcImportModel.getLastOffset(adminId, year, client);

        const nmcDoctors = await fetchNMCDoctors(year, limit, offset);

        if (!nmcDoctors || nmcDoctors.length === 0) {
            return res.status(400).json({
                message: "No more doctors available for this year"
            });
        }

        const success = [];
        const failed = [];

        for (let i = 0; i < nmcDoctors.length; i++) {
            const doc = nmcDoctors[i];

            try {
                // Example mapping (adjust based on your API)
                const email = `${doc.registration_number}@nmc.temp`;
                const password = "Doctor@123";

                const hashedPassword = await bcrypt.hash(password, 10);

                if (doc?.registration_number && year && doc?.state_medical_council) {
                    const existing = await doctorModel.getDoctorProfileByRegNoCouncilRegYear(doc?.registration_number, year, doc?.state_medical_council);
                    if (existing) throw new Error("Doctor already exists");
                }

                const cleanName = (name) => {
                    return name
                        ?.trim()
                        .replace(/\s+/g, " ");
                };

                const user = await userModel.createUser({
                    name: cleanName(doc?.name || ""),
                    email,
                    hashedPassword,
                    role: "DOCTOR",
                    country_id: 1 // India default
                }, client);

                await doctorModel.createDoctorProfile(user.id, client);

                await doctorModel.updateDoctorProfile(user.id, {
                    registration_number: doc.registration_number,
                    registration_year: Number(year),
                    state_medical_council: doc.state_medical_council || null
                }, client);

                success.push({ name: doc.name });

            } catch (err) {
                failed.push({ name: doc.name, error: err.message });
                throw err;
            }
        }

        await nmcImportModel.createImportLog(
            adminId,
            year,
            offset + nmcDoctors.length,
            client
        );

        await client.query("COMMIT");

        await clearDoctorsCache();

        return res.status(201).json({
            message: "Doctors imported successfully",
            successCount: success.length,
            failedCount: failed.length,
            failed
        });

    } catch (error) {
        await client.query("ROLLBACK");

        return res.status(500).json({
            message: error.message || "Something went wrong"
        });
    } finally {
        client.release();
    }
};

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

// GET /admin/search-analytics/summary
// Returns: total searches, unique searchers, top specialty, most searched name
const getSearchAnalyticsSummary = async (req, res) => {
    try {
        const data = await activityModel.getSearchAnalyticsSummary();
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
};

// GET /admin/search-analytics/top-searches?limit=10
// Returns: top specialties, top names, top locations searched
const getTopSearchTerms = async (req, res) => {
    try {
        const { limit = 10 } = req.query;
        const data = await activityModel.getTopSearchTerms(Number(limit));
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
};

// GET /admin/search-analytics/recent?page=1&limit=20
// Returns: raw paginated search log
const getRecentSearches = async (req, res) => {
    try {
        const { page = 1, limit = 20 } = req.query;
        const data = await activityModel.getRecentSearches(Number(page), Number(limit));
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
};

// GET /admin/search-analytics/by-date?days=14
// Returns: daily search count for the last N days (for trend chart)
const getSearchesByDate = async (req, res) => {
    try {
        const { days = 14 } = req.query;
        const data = await activityModel.getSearchesByDate(Number(days));
        return res.status(200).json(data);
    } catch (error) {
        return res.status(500).json({ message: error?.message || error });
    }
};

module.exports = {
    createUserByAdmin,
    updateUserByAdmin,
    verifyDoctorOnNMC,
    deleteUserByAdmin,
    getAllUsers,
    uploadBulkDoctors,
    importDoctorsFromNMC,
    getProfileViewAnalyticsDashboard,
    getDoctorViewCount,
    getRecentViews,
    getMostViewedDoctors,
    getViewsByDate,
    getSearchAnalyticsSummary,
    getTopSearchTerms,
    getRecentSearches,
    getSearchesByDate
}