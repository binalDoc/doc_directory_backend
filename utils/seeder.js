//node ./utils/seeder.js

const { Country, State, City } = require('country-state-city');
const pool = require('../config/db/db');


async function seed() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    console.log('Seeding countries...');
    const countries = Country.getAllCountries();

    // Map: isoCode -> inserted DB id
    const countryIdMap = {};

    for (const country of countries) {
      const res = await client.query(
        `INSERT INTO countries (name, code, dial_code)
         VALUES ($1, $2, $3)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [country.name, country.isoCode, country.phonecode]
      );
      if (res.rows[0]) {
        countryIdMap[country.isoCode] = res.rows[0].id;
      }
    }
    console.log(`Inserted ${Object.keys(countryIdMap).length} countries`);

    console.log('Seeding states...');
    const states = State.getAllStates();

    // Map: "countryIso-stateIso" -> inserted DB id
    const stateIdMap = {};

    for (const state of states) {
      const countryDbId = countryIdMap[state.countryCode];
      if (!countryDbId) continue;

      const res = await client.query(
        `INSERT INTO states (name, country_id)
         VALUES ($1, $2)
         ON CONFLICT DO NOTHING
         RETURNING id`,
        [state.name, countryDbId]
      );
      if (res.rows[0]) {
        stateIdMap[`${state.countryCode}-${state.isoCode}`] = res.rows[0].id;
      }
    }
    console.log(`Inserted ${Object.keys(stateIdMap).length} states`);

    console.log('Seeding cities...');
    const cities = City.getAllCities();
    let cityCount = 0;

    // Batch inserts for performance (cities are 150k+)
    const BATCH_SIZE = 500;
    for (let i = 0; i < cities.length; i += BATCH_SIZE) {
      const batch = cities.slice(i, i + BATCH_SIZE);
      const values = [];
      const params = [];
      let paramIdx = 1;

      for (const city of batch) {
        const stateDbId = stateIdMap[`${city.countryCode}-${city.stateCode}`];
        if (!stateDbId) continue;

        values.push(`($${paramIdx++}, $${paramIdx++})`);
        params.push(city.name, stateDbId);
      }

      if (values.length === 0) continue;

      await client.query(
        `INSERT INTO cities (name, state_id) VALUES ${values.join(', ')}
         ON CONFLICT DO NOTHING`,
        params
      );
      cityCount += values.length;

      if (i % 10000 === 0) console.log(`  ...${i} cities processed`);
    }
    console.log(`Inserted ${cityCount} cities`);

    await client.query('COMMIT');
    console.log('✅ Seed complete!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Seed failed:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed();