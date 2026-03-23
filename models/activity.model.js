const pool = require("../config/db/db");

//LOG PROFILE VIEW
const logProfileView = async(viewerId,doctorId) => {
    const query = `
    INSERT INTO profile_views (viewer_user_id, doctor_profile_id)
    VALUES ($1, $2)
    RETURNING *;
    `;

    const values = [viewerId,doctorId];
    const result = await pool.query(query,values);

    return result.rows[0];
}

//GET TOTAL VIEWS FOR DOCTOR
const getDoctorViewCount = async (doctorProfileId) => {
  const query = `
    SELECT COUNT(*) AS total_views
    FROM profile_views
    WHERE doctor_profile_id = $1;
  `;

  const result = await pool.query(query, [doctorProfileId]);
  return parseInt(result.rows[0].total_views, 10);
};


//GET RECENT DOCTOR PROFILE VIEWS
const getRecentViews = async (limit = 10) => {
  const query = `
    SELECT pv.*, u.name AS viewer_name
    FROM profile_views pv
    LEFT JOIN users u ON pv.viewer_user_id = u.id
    ORDER BY pv.viewed_at DESC
    LIMIT $1;
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};


//MOST VIEWED DOCTORS
const getMostViewedDoctors = async (limit = 10) => {
  const query = `
    SELECT doctor_profile_id, COUNT(*) AS views
    FROM profile_views
    GROUP BY doctor_profile_id
    ORDER BY views DESC
    LIMIT $1;
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};


//VIEWS BY DATE (FOR GRAPH)
const getViewsByDate = async () => {
  const query = `
    SELECT DATE(viewed_at) AS date, COUNT(*) AS views
    FROM profile_views
    GROUP BY DATE(viewed_at)
    ORDER BY date ASC;
  `;

  const result = await pool.query(query);
  return result.rows;
};


module.exports = {
  logProfileView,
  getDoctorViewCount,
  getRecentViews,
  getMostViewedDoctors,
  getViewsByDate,
};