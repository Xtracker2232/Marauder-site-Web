// reset-user.js
require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

const USER_ID = 217;  // ← ton user

(async () => {
    try {
        // Voir les logs actuels
        const before = await pool.query(
            `SELECT id, endpoint, status_code, created_at 
             FROM api_logs 
             WHERE user_id = $1 
             AND created_at >= date_trunc('month', CURRENT_DATE)
             ORDER BY created_at ASC`,
            [USER_ID]
        );
        console.log(`📊 Avant : ${before.rowCount} logs`);
        before.rows.forEach(r => console.log(`  #${r.id} ${r.endpoint} → ${r.status_code}`));

        // Garder seulement les 10 PLUS ANCIENS (les vraies requêtes)
        const toDelete = before.rows.slice(10).map(r => r.id);
        
        if (toDelete.length > 0) {
            const del = await pool.query(
                `DELETE FROM api_logs WHERE id = ANY($1::int[]) RETURNING id`,
                [toDelete]
            );
            console.log(`✅ ${del.rowCount} logs supprimés (les plus récents)`);
        } else {
            console.log('ℹ️ Rien à supprimer');
        }

        // Vérifier
        const after = await pool.query(
            `SELECT COUNT(*) FROM api_logs 
             WHERE user_id = $1 
             AND created_at >= date_trunc('month', CURRENT_DATE)`,
            [USER_ID]
        );
        console.log(`📊 Après : ${after.rows[0].count} logs`);
    } catch (error) {
        console.error('❌ Erreur :', error.message);
    } finally {
        await pool.end();
    }
})();