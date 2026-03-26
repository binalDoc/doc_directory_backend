const pool = require("../config/db/db");

const createUser = async ({ name, email, hashedPassword, role, country_id = null, state_id = null, city_id = null }, client = null) => {
  const db = client || pool;

  const query = `
    INSERT INTO users (name, email, password, role, country_id, state_id, city_id) 
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING id, name, email, role, created_at;
  `;

  const values = [name, email, hashedPassword, role, country_id || null, state_id || null, city_id || null];

  const result = await db.query(query, values);
  return result.rows[0];
};

const updateUser = async (userId, data) => {
  const { name, email, country_id, state_id, city_id } = data;

  const query = `
    UPDATE users
    SET name       = COALESCE($1, name),
        email      = COALESCE($2, email),
        country_id = COALESCE($3, country_id),
        state_id   = COALESCE($4, state_id),
        city_id    = COALESCE($5, city_id)
    WHERE id = $6
    RETURNING id, name, email, role, country_id, state_id, city_id;
  `;

  const values = [name || null, email || null, country_id || null, state_id || null, city_id || null, userId];

  const result = await pool.query(query, values);
  return result.rows[0];
};

const getUserByEmail = async (email, client = null) => {
  const db = client || pool;

  const query = `
    SELECT 
      u.*,
      co.name  AS country_name,
      co.code  AS country_code,
      st.name  AS state_name,
      ci.name  AS city_name
    FROM users u
    LEFT JOIN countries co ON u.country_id = co.id
    LEFT JOIN states    st ON u.state_id   = st.id
    LEFT JOIN cities    ci ON u.city_id    = ci.id
    WHERE u.email = $1;
  `;

  const result = await db.query(query, [email]);
  return result.rows[0];
};

const getUserById = async (id) => {
  const query = `
    SELECT 
      u.*,
      co.name  AS country_name,
      co.code  AS country_code,
      st.name  AS state_name,
      ci.name  AS city_name
    FROM users u
    LEFT JOIN countries co ON u.country_id = co.id
    LEFT JOIN states    st ON u.state_id   = st.id
    LEFT JOIN cities    ci ON u.city_id    = ci.id
    WHERE u.id = $1;
  `;

  const result = await pool.query(query, [id]);
  return result.rows[0];
};

const getAllUsers = async ({ page = 1, limit = 10, role, name }) => {
  const offset = (page - 1) * limit;

  let query = `
    SELECT 
      u.id AS user_id,
      u.name,
      u.email,
      u.role,
      u.created_at,

      u.country_id,
      u.state_id,
      u.city_id,
      co.name  AS country_name,
      co.code  AS country_code,
      
      u.state_id,
      st.name  AS state_name,

      u.city_id,
      ci.name  AS city_name,

      dp.id                    AS doctor_profile_id,
      dp.user_id               AS doctor_user_id,
      dp.registration_number,
      dp.registration_year,
      dp.state_medical_council,
      dp.specialty,
      dp.bio,
      dp.qualification,
      dp.hospital,
      dp.experience,
      dp.status                AS doctor_status,

      pp.id          AS pharma_profile_id,
      pp.user_id     AS pharma_user_id,
      pp.company_name

    FROM users u

    LEFT JOIN countries co ON u.country_id = co.id
    LEFT JOIN states    st ON u.state_id   = st.id
    LEFT JOIN cities    ci ON u.city_id    = ci.id

    LEFT JOIN doctor_profiles dp ON u.id = dp.user_id
    LEFT JOIN pharma_profiles pp ON u.id = pp.user_id

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

  const result = await pool.query(query, [userId]);
  return result.rows[0];
};

module.exports = {
  createUser,
  updateUser,
  getUserByEmail,
  getUserById,
  getAllUsers,
  deleteUser,
};