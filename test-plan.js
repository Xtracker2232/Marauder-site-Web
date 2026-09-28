require('dotenv').config();
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const NEW_PLAN = 'pro';
const USER_ID = 235;

pool.query(
    'UPDATE users SET plan = $1, subscription_status = $2 WHERE id = $3',
    [NEW_PLAN, 'active', USER_ID]
)
.then(() => {
    console.log('✅ User ' + USER_ID + ' → plan ' + NEW_PLAN);
    process.exit(0);
})
.catch(e => {
    console.error('❌ Erreur:', e.message);
    process.exit(1);
});
