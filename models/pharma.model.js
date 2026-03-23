const pool = require("../config/db/db");

const createPharmaProfile = async (userId, data) => {
    const { company_name } = data;

    const query = `
    INSERT INTO pharma_profiles (user_id, company_name) 
    VALUES ($1, $2)
    RETURNING *;
    `;

    const values = [userId, company_name];

    const result = await pool.query(query, values);
    return result.rows[0];
}

const updatePharmaProfile = async (userId, data) => {
    const { company_name } = data;

    const query = `
    UPDATE pharma_profiles SET company_name=$1
    WHERE user_id = $2
    RETURNING *;
    `;

    const values = [company_name, userId];

    const result = await pool.query(query, values);
    return result.rows[0];
}

const getPharmaProfileById = async (id) => {
    const query = `
    SELECT * FROM pharma_profiles WHERE user_id = $1;
    `;

    const values = [id];

    const result = await pool.query(query, values);
    return result.rows[0];
}


module.exports = {
    createPharmaProfile,
    updatePharmaProfile,
    getPharmaProfileById
}