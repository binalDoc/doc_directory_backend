const pool = require("../config/db/db");

const getCountries = async () => {
  const result = await pool.query(`SELECT * FROM countries ORDER BY name`);
  return result.rows;
};

const getStates = async (countryId) => {
  const result = await pool.query(
    `SELECT * FROM states WHERE country_id = $1 ORDER BY name`,
    [countryId]
  );
  return result.rows;
};

const getCities = async (stateId) => {
  const result = await pool.query(
    `SELECT * FROM cities WHERE state_id = $1 ORDER BY name`,
    [stateId]
  );
  return result.rows;
};

module.exports = {
  getCountries,
  getStates,
  getCities
}