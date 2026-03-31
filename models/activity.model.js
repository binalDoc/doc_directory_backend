const pool = require("../config/db/db");

//LOG PROFILE VIEW
const logProfileView = async(viewerId,doctorId) => {
    const query = `
    INSERT INTO profile_views (viewer_user_id, doctor_profile_id)
    VALUES ($1, $2)
    RETURNING *;
    `;

    const values = [viewerId || null,doctorId];
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
    SELECT 
      pv.*,
      u.name AS viewer_name,
      duser.name AS doctor_name
    FROM profile_views pv

    LEFT JOIN users u 
      ON pv.viewer_user_id = u.id

    LEFT JOIN doctor_profiles dp 
      ON pv.doctor_profile_id = dp.id

    LEFT JOIN users duser 
      ON dp.user_id = duser.id

    ORDER BY pv.viewed_at DESC
    LIMIT $1;
  `;

  const result = await pool.query(query, [limit]);
  return result.rows;
};

//MOST VIEWED DOCTORS
const getMostViewedDoctors = async (limit = 10) => {
  const query = `
    SELECT 
      pv.doctor_profile_id,
      COUNT(*) AS views,
      u.name AS doctor_name

    FROM profile_views pv

    JOIN doctor_profiles dp 
      ON pv.doctor_profile_id = dp.id

    JOIN users u 
      ON dp.user_id = u.id

    GROUP BY pv.doctor_profile_id, u.name

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

const getSearchAnalyticsSummary = async () => {
    const result = await pool.query(`
        SELECT
            COUNT(*) AS total_searches,
            COUNT(DISTINCT user_id) AS unique_searchers,
            COUNT(*) FILTER (WHERE name IS NOT NULL) AS name_searches,
            COUNT(*) FILTER (WHERE specialty IS NOT NULL) AS specialty_searches,
            COUNT(*) FILTER (WHERE city_id IS NOT NULL
                              OR state_id IS NOT NULL
                              OR country_id IS NOT NULL) AS location_searches,
 
            -- Top specialty searched
            (
                SELECT specialty FROM search_analytics
                WHERE specialty IS NOT NULL
                GROUP BY specialty
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS top_specialty,
 
            -- Top name searched
            (
                SELECT name FROM search_analytics
                WHERE name IS NOT NULL
                GROUP BY name
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS top_name,
 
            -- Most active day
            (
                SELECT TO_CHAR(searched_at, 'YYYY-MM-DD') FROM search_analytics
                GROUP BY TO_CHAR(searched_at, 'YYYY-MM-DD')
                ORDER BY COUNT(*) DESC
                LIMIT 1
            ) AS most_active_day
 
        FROM search_analytics
    `);
 
    return result.rows[0];
};

// Top search terms — specialties, names, locations separately
const getTopSearchTerms = async (limit) => {
    const [specialties, names, countries, states, cities] = await Promise.all([
 
        // Top specialties
        pool.query(`
            SELECT specialty AS term, COUNT(*) AS count
            FROM search_analytics
            WHERE specialty IS NOT NULL
            GROUP BY specialty
            ORDER BY count DESC
            LIMIT $1
        `, [limit]),
 
        // Top name searches
        pool.query(`
            SELECT name AS term, COUNT(*) AS count
            FROM search_analytics
            WHERE name IS NOT NULL
            GROUP BY name
            ORDER BY count DESC
            LIMIT $1
        `, [limit]),
 
        // Top countries searched
        pool.query(`
            SELECT co.name AS term, COUNT(*) AS count
            FROM search_analytics sa
            JOIN countries co ON sa.country_id = co.id
            WHERE sa.country_id IS NOT NULL
            GROUP BY co.name
            ORDER BY count DESC
            LIMIT $1
        `, [limit]),
 
        // Top states searched
        pool.query(`
            SELECT st.name AS term, COUNT(*) AS count
            FROM search_analytics sa
            JOIN states st ON sa.state_id = st.id
            WHERE sa.state_id IS NOT NULL
            GROUP BY st.name
            ORDER BY count DESC
            LIMIT $1
        `, [limit]),
 
        // Top cities searched
        pool.query(`
            SELECT ci.name AS term, COUNT(*) AS count
            FROM search_analytics sa
            JOIN cities ci ON sa.city_id = ci.id
            WHERE sa.city_id IS NOT NULL
            GROUP BY ci.name
            ORDER BY count DESC
            LIMIT $1
        `, [limit]),
    ]);
 
    return {
        top_specialties:  specialties.rows,
        top_names:        names.rows,
        top_countries:    countries.rows,
        top_states:       states.rows,
        top_cities:       cities.rows,
    };
};

// Recent searches — paginated log with joined location names
const getRecentSearches = async (page, limit) => {
    const offset = (page - 1) * limit;
 
    const [rows, countResult] = await Promise.all([
        pool.query(`
            SELECT
                sa.id,
                sa.name,
                sa.specialty,
                sa.searched_at,
                co.name  AS country,
                st.name  AS state,
                ci.name  AS city,
                u.name   AS searched_by,
                u.role   AS user_role
            FROM search_analytics sa
            LEFT JOIN countries co ON sa.country_id = co.id
            LEFT JOIN states    st ON sa.state_id   = st.id
            LEFT JOIN cities    ci ON sa.city_id    = ci.id
            LEFT JOIN users     u  ON sa.user_id    = u.id
            ORDER BY sa.searched_at DESC
            LIMIT $1 OFFSET $2
        `, [limit, offset]),
 
        pool.query(`SELECT COUNT(*) FROM search_analytics`),
    ]);
 
    return {
        page,
        limit,
        total: Number(countResult.rows[0].count),
        searches: rows.rows,
    };
};

// Searches by date — for trend chart
const getSearchesByDate = async (days) => {
    const result = await pool.query(`
        SELECT
            TO_CHAR(searched_at, 'YYYY-MM-DD') AS date,
            COUNT(*)                            AS count
        FROM search_analytics
        WHERE searched_at >= NOW() - INTERVAL '${days} days'
        GROUP BY date
        ORDER BY date ASC
    `);
 
    return result.rows;
};

module.exports = {
  logProfileView,
  getDoctorViewCount,
  getRecentViews,
  getMostViewedDoctors,
  getViewsByDate,
  getSearchAnalyticsSummary,
  getTopSearchTerms,
  getRecentSearches,
  getSearchesByDate
};