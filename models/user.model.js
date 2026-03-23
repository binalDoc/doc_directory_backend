const pool = require("../config/db/db");

const createUser = async ({ name, email, hashedPassword, role }) => {
  const query = `
    INSERT INTO users (name, email, password, role) 
    VALUES ($1, $2, $3, $4)
    RETURNING id, name, email, password, role, created_at;
    `;

  const values = [name, email, hashedPassword, role];

  const result = await pool.query(query, values);
  return result.rows[0];
}

const updateUser = async (userId, data) => {
  const { name, email } = data;

  const query = `
    UPDATE users
    SET name = COALESCE($1, name),
        email = COALESCE($2, email)
    WHERE id = $3
    RETURNING id, name, email, role;
  `;

  const values = [name || null, email || null, userId];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getUserByEmail = async (email) => {
  const query = `
    SELECT * FROM users WHERE email = $1;
    `;

  const values = [email];

  const result = await pool.query(query, values);
  return result.rows[0];
}

const getUserById = async (id) => {
  const query = `
    SELECT * FROM users WHERE id = $1;
    `;

  const values = [id];

  const result = await pool.query(query, values);
  return result.rows[0];
}

const getAllUsers = async ({ page = 1, limit = 10, role, name }) => {
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
  u.id AS user_id,
  u.name,
  u.email,
  u.role,
  u.created_at,

  dp.id AS doctor_profile_id,
  dp.user_id AS doctor_user_id,
  dp.registration_number,
  dp.registration_year,
  dp.state_medical_council,
  dp.specialty,
  dp.bio,
  dp.qualification,
  dp.hospital,
  dp.state,
  dp.city,
  dp.experience,
  dp.status AS doctor_status,

  pp.id AS pharma_profile_id,
  pp.user_id AS pharma_user_id,
  pp.company_name

FROM users u

LEFT JOIN doctor_profiles dp 
  ON u.id = dp.user_id

LEFT JOIN pharma_profiles pp 
  ON u.id = pp.user_id

WHERE 1=1
  `;

  const values = [];
  let index = 1;

  if (role) {
    query += ` AND u.role = $${index++}`;
    values.push(role);
  }

  if (name) {
    query += ` AND u.name ILIKE $${index++}`;
    values.push(`%${name}%`);
  }

  query += ` ORDER BY u.created_at DESC`;

  query += ` LIMIT $${index++} OFFSET $${index++}`;
  values.push(limit, offset);

  const result = await pool.query(query, values);
  return result.rows;
};

const deleteUser = async (userId) => {
  const query = `
    DELETE FROM users
    WHERE id = $1
    RETURNING *;
  `;
  
  const values = [userId];

  const result = await pool.query(query, values);
  return result.rows[0];
};

module.exports = {
  createUser,
  updateUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  deleteUser
}