const pkg = require("pg");
const { Pool } = pkg;
const config = require("../config");

const pool = new Pool({
    connectionString: config.db_url,
    ssl: {
        rejectUnauthorized: false
    }
});

pool.connect((err, client, release) => {
  if (err) {
    console.error("Error connecting to DB:", err.message);
  } else {
    console.log("PostgreSQL connected successfully");
    release();
  }
});

module.exports = pool;