const pool = require("../config/db/db");
const { calculateDoctorProfileCompletion, verifyDoctorFromNMC } = require("../utils/helper");

const createDoctorProfile = async (userId, client = null) => {
    const db = client || pool;
    const query = `
        INSERT INTO doctor_profiles (user_id) 
        VALUES ($1)
        RETURNING *;
    `;
    const result = await db.query(query, [userId]);
    return result.rows[0];
};

const updateDoctorProfile = async (userId, data, client = null) => {
    const db = client || pool;

    const existingRes = await db.query(
        `SELECT dp.*, u.name
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        WHERE dp.user_id = $1
        `,
        [userId]
    );

    const existing = existingRes.rows[0];

    const updatedData = { ...existing, ...data };

    let nmc_verified = existing.nmc_verified;

    const keyFields = [
        "name",
        "registration_number",
        "state_medical_council",
        "registration_year"
    ];

    const isReadyForVerification = keyFields.every(
        (key) => updatedData[key] && String(updatedData[key]).trim() !== ""
    );

    let status = existing.status;

    if (isReadyForVerification) {
        const isKeyFieldChanged = keyFields.some(
            (field) =>
                String(existing[field] || "").trim() !==
                String(updatedData[field] || "").trim()
        );

        if (isKeyFieldChanged) {
            status = "PENDING"
            try {
                console.log("NMC API called")
                const isVerified = await verifyDoctorFromNMC(updatedData);
                nmc_verified = isVerified;
            } catch (error) {
                console.error("Verification failed:", error.message);
                nmc_verified = false;
            }
        }
    } else {
        nmc_verified = false;
    }

    const query = `
        UPDATE doctor_profiles SET
            specialty             = $1,
            bio                   = $2,
            qualification         = $3,
            experience            = $4,
            hospital              = $5,
            profile_image_url     = $6,
            registration_number   = $7,
            registration_year     = $8,
            state_medical_council = $9,
            nmc_verified          = $10,
            status                = $11
        WHERE user_id = $12
        RETURNING *;
    `;

    const values = [
        updatedData.specialty || null,
        updatedData.bio || null,
        updatedData.qualification || null,
        parseInt(updatedData.experience) || null,
        updatedData.hospital || null,
        updatedData.profile_image_url || null,
        updatedData.registration_number || null,
        parseInt(updatedData.registration_year) || null,
        updatedData.state_medical_council || null,
        nmc_verified,
        status,
        userId
    ];

    const result = await db.query(query, values);
    return result.rows[0];
};

const getDoctorProfileById = async (id) => {
    const query = `
        SELECT 
            dp.*,
            u.name,
            u.email,
            u.country_id,
            u.state_id,
            u.city_id,
            co.name AS country_name,
            co.code AS country_code,
            st.name AS state_name,
            ci.name AS city_name
        FROM doctor_profiles dp
        JOIN  users      u  ON dp.user_id    = u.id
        LEFT JOIN countries co ON u.country_id = co.id
        LEFT JOIN states    st ON u.state_id   = st.id
        LEFT JOIN cities    ci ON u.city_id    = ci.id
        WHERE dp.id = $1;
    `;
    const result = await pool.query(query, [id]);
    return result.rows[0];
};

const getDoctorProfileByUserId = async (user_id) => {
    const query = `
        SELECT 
            dp.*,
            u.name,
            u.email,
            u.country_id,
            u.state_id,
            u.city_id,
            co.name AS country_name,
            co.code AS country_code,
            st.name AS state_name,
            ci.name AS city_name
        FROM doctor_profiles dp
        JOIN  users      u  ON dp.user_id    = u.id
        LEFT JOIN countries co ON u.country_id = co.id
        LEFT JOIN states    st ON u.state_id   = st.id
        LEFT JOIN cities    ci ON u.city_id    = ci.id
        WHERE dp.user_id = $1;
    `;
    const result = await pool.query(query, [user_id]);
    return result.rows[0];
};

const getDoctors = async (filters) => {
    const {
        page = 1,
        limit = 10,
        status,
        specialty,
        city_id,
        state_id,
        country_id,
        name,
        minExperience,
        sortBy,
        order,
    } = filters;

    let query = `
        SELECT 
            dp.*,
            u.name,
            u.email,
            u.country_id,
            u.state_id,
            u.city_id,
            co.name AS country_name,
            co.code AS country_code,
            st.name AS state_name,
            ci.name AS city_name
        FROM doctor_profiles dp
        JOIN  users      u  ON dp.user_id    = u.id
        LEFT JOIN countries co ON u.country_id = co.id
        LEFT JOIN states    st ON u.state_id   = st.id
        LEFT JOIN cities    ci ON u.city_id    = ci.id
        WHERE 1=1
    `;

    let values = [];
    let index = 1;

    if (status) {
        query += ` AND dp.status = $${index++}`;
        values.push(status);
    }

    if (specialty) {
        query += ` AND dp.specialty ILIKE $${index++}`;
        values.push(`%${specialty}%`);
    }

    if (city_id) {
        query += ` AND u.city_id = $${index++}`;
        values.push(Number(city_id));
    }

    if (state_id) {
        query += ` AND u.state_id = $${index++}`;
        values.push(Number(state_id));
    }

    if (country_id) {
        query += ` AND u.country_id = $${index++}`;
        values.push(Number(country_id));
    }

    if (name) {
        query += ` AND u.name ILIKE $${index++}`;
        values.push(`%${name}%`);
    }

    if (minExperience) {
        query += ` AND dp.experience >= $${index++}`;
        values.push(Number(minExperience));
    }

    const sortMap = {
        created_at: "dp.created_at",
        experience: "dp.experience",
        name: "u.name"
    };
    const allowedOrder = ["ASC", "DESC"];

    const safeSortBy = sortMap[sortBy] || "dp.created_at";
    const safeOrder = allowedOrder.includes((order || "").toUpperCase()) ? order.toUpperCase() : "DESC";

    query += ` ORDER BY ${safeSortBy} ${safeOrder}`;

    const offset = (page - 1) * limit;
    query += ` LIMIT $${index++} OFFSET $${index++}`;
    values.push(Number(limit), offset);

    const result = await pool.query(query, values);

    const doctorListWithProfileCompletionPercentage = result.rows.map((doctor) => ({
        ...doctor,
        completionPercentage: calculateDoctorProfileCompletion(doctor)
    }));

    return {
        page: Number(page),
        limit: Number(limit),
        doctor_list: doctorListWithProfileCompletionPercentage
    };
};

const updateDoctorStatus = async (id, status) => {
    const existing = await pool.query(
        `SELECT * FROM doctor_profiles WHERE id = $1`,
        [id]
    );

    const doctor = existing.rows[0];

    if (!doctor.nmc_verified && status === "VERIFIED") {
        throw new Error("Cannot verify doctor without NMC verification");
    }

    const query = `
        UPDATE doctor_profiles
        SET status = $1
        WHERE id = $2
        RETURNING *;
    `;
    const result = await pool.query(query, [status, id]);
    return result.rows[0];
};

const getDoctorStatusCounts = async () => {
    const query = `
        SELECT status, COUNT(*) as count
        FROM doctor_profiles
        GROUP BY status
    `;

    const result = await pool.query(query);

    const counts = { ALL: 0, PENDING: 0, VERIFIED: 0, REJECTED: 0 };
    result.rows.forEach(row => {
        counts[row.status] = Number(row.count);
        counts.ALL += Number(row.count);
    });

    return counts;
};

module.exports = {
    createDoctorProfile,
    updateDoctorProfile,
    getDoctorProfileById,
    getDoctorProfileByUserId,
    getDoctors,
    updateDoctorStatus,
    getDoctorStatusCounts
};