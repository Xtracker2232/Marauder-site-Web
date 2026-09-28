require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

pool.query('SELECT id, username, plan, subscription_status FROM users WHERE id = 235')
.then(r => {
    console.log('DB user 235:', JSON.stringify(r.rows[0], null, 2));
    process.exit(0);
})
.catch(e => {
    console.error('❌', e.message);
    process.exit(1);
});
