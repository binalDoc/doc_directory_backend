const checkTodayUsage = async (adminId, client) => {
    const res = await client.query(
        `SELECT 1 FROM nmc_import_logs
         WHERE admin_id = $1 AND used_at = CURRENT_DATE
         LIMIT 1`,
        [adminId]
    );
    return res.rowCount > 0;
};

const getLastOffset = async (adminId, year, client) => {
    const res = await client.query(
        `SELECT last_offset FROM nmc_import_logs
         WHERE admin_id = $1 AND registration_year = $2
         ORDER BY created_at DESC
         LIMIT 1`,
        [adminId, year]
    );

    return res.rows[0]?.last_offset || 0;
};

const createImportLog = async (adminId, year, newOffset, client) => {
    await client.query(
        `INSERT INTO nmc_import_logs (admin_id, registration_year, last_offset)
         VALUES ($1, $2, $3)`,
        [adminId, year, newOffset]
    );
};

module.exports = {
    checkTodayUsage,
    getLastOffset,
    createImportLog
}