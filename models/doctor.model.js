const pool = require("../config/db/db");
const {calculateDoctorProfileCompletion} = require("../utils/helper")
// Create empty doctor profile (on signup)
const createDoctorProfile = async (userId) => {
    const query = `
    INSERT INTO doctor_profiles (user_id) 
    VALUES ($1)
    RETURNING *;
    `;

    const values = [userId];

    const result = await pool.query(query, values);
    return result.rows[0];
}

const updateDoctorProfile = async (userId, data) => {
    //Get existing profile
    const existingQuery = `
        SELECT * FROM doctor_profiles WHERE user_id = $1
    `;
    const existingRes = await pool.query(existingQuery, [userId]);
    const existing = existingRes.rows[0];

    //Merge old + new data
    const updatedData = {
        ...existing,
        ...data
    };

    // Check if any important field changed
    const fieldsToCheck = [
        "experience",
        "registration_number",
        "registration_year",
        "state_medical_council"
    ];

    const isChanged = fieldsToCheck.some(
        (field) => existing[field] !== updatedData[field]
    );

    // Decide status
    const status = isChanged ? "PENDING" : existing.status;

    // Update query
    const query = `
        UPDATE doctor_profiles SET
            specialty=$1,
            bio=$2,
            qualification=$3,
            experience=$4,
            hospital=$5,
            city=$6,
            state=$7,
            profile_image_url=$8,
            registration_number=$9,
            registration_year=$10,
            state_medical_council=$11,
            status=$12
        WHERE user_id=$13
        RETURNING *;
    `;

    const values = [
        updatedData.specialty,
        updatedData.bio,
        updatedData.qualification,
        updatedData.experience,
        updatedData.hospital,
        updatedData.city,
        updatedData.state,
        updatedData.profile_image_url,
        updatedData.registration_number,
        updatedData.registration_year,
        updatedData.state_medical_council,
        status,
        userId
    ];

    const result = await pool.query(query, values);
    return result.rows[0];
};

const getDoctorProfileById = async (id) => {
    const query = `
    SELECT * FROM doctor_profiles WHERE id = $1;
    `;

    const values = [id];

    const result = await pool.query(query, values);
    return result.rows[0];
}

const getDoctorProfileByUserId = async (user_id) => {
    const query = `
    SELECT * FROM doctor_profiles WHERE user_id = $1;
    `;

    const values = [user_id];

    const result = await pool.query(query, values);
    return result.rows[0];
}

const getDoctors = async (filters) => {
    const {
        page = 1,
        limit = 10,
        status,
        specialty,
        city,
        state,
        name,
        minExperience,
        sortBy,
        order,
    } = filters;

    let query = `
        SELECT dp.*, u.name, u.email
        FROM doctor_profiles dp
        JOIN users u ON dp.user_id = u.id
        WHERE 1=1
    `;

    let values = [];
    let index = 1;

    //STATUS FILTER (main difference)
    if (status) {
        query += ` AND dp.status = $${index++}`;
        values.push(status);
    }

    if (specialty) {
        query += ` AND dp.specialty ILIKE $${index++}`;
        values.push(`%${specialty}%`);
    }

    if (city) {
        query += ` AND dp.city ILIKE $${index++}`;
        values.push(`%${city}%`);
    }

    if (state) {
        query += ` AND dp.state ILIKE $${index++}`;
        values.push(`%${state}%`);
    }

    if (name) {
        query += ` AND u.name ILIKE $${index++}`;
        values.push(`%${name}%`);
    }

    if (minExperience) {
        query += ` AND dp.experience >= $${index++}`;
        values.push(minExperience);
    }

    //SAFE SORT
    const allowedSortFields = ["created_at", "experience", "name"];
    const allowedOrder = ["ASC", "DESC"];

    const safeSortBy = allowedSortFields.includes(sortBy)
        ? sortBy
        : "created_at";

    const safeOrder = allowedOrder.includes((order || "").toUpperCase())
        ? order.toUpperCase()
        : "DESC";

    query += ` ORDER BY ${safeSortBy} ${safeOrder}`;

    //PAGINATION
    const offset = (page - 1) * limit;
    query += ` LIMIT $${index++} OFFSET $${index++}`;
    values.push(limit, offset);

    const result = await pool.query(query, values);

    const doctorListWithProfileCompletionPercentage = result.rows.map((doctor) => {
        return {
            ...doctor,
            completionPercentage: calculateDoctorProfileCompletion(doctor)
        };
    });

    return {
        page: Number(page),
        limit: Number(limit),
        doctor_list: doctorListWithProfileCompletionPercentage
    };
};

const updateDoctorStatus = async (id, status) => {
    const query = `
    UPDATE doctor_profiles
    SET status = $1
    WHERE id = $2
    RETURNING *
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

    const counts = {
        ALL: 0,
        PENDING: 0,
        VERIFIED: 0,
        REJECTED: 0
    };

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
}