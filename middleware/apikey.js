// ============================================
// MIDDLEWARE API KEY
// Vérifie une clé API dans le header Authorization
// ============================================
const crypto = require('crypto');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ============================================
// LIMITES PAR PLAN (source unique de vérité)
// ⚠️ Doit rester synchronisé avec index.js (PLAN_LIMITS)
// ============================================
const PLAN_LIMITS = {
    free:       { api: 10 },
    starter:    { api: 1000 },
    pro:        { api: 10000 },
    enterprise: { api: Infinity }
};

function getPlanLimit(plan) {
    return PLAN_LIMITS[plan]?.api ?? 10;
}

// ============================================
// MIDDLEWARE : requireApiKey
// ============================================
const requireApiKey = async (req, res, next) => {
    // ============================================
    // 0. Vérifier si l'API est en maintenance
    // ============================================
    if (process.env.API_MAINTENANCE === 'ON') {
        return res.status(503).json({
            error: 'api_maintenance',
            message: 'L\'API Marauder est actuellement en maintenance. Revenez plus tard.',
            discord: 'https://discord.gg/jf6QRZHaTB'
        });
    }

    const authHeader = req.headers['authorization'];

    // 1. Vérifier la présence du header
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            error: 'missing_api_key',
            message: 'Header Authorization manquant. Format: Bearer marauder_xxx'
        });
    }

    const rawKey = authHeader.replace('Bearer ', '').trim();

    // 2. Vérifier le format de la clé
    if (!rawKey.startsWith('marauder_')) {
        return res.status(401).json({
            error: 'invalid_api_key',
            message: 'Format de clé invalide (doit commencer par marauder_)'
        });
    }

    try {
        // 3. Hasher la clé pour comparaison
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');

        // 4. Chercher la clé en DB
        const result = await pool.query(
            `SELECT 
                ak.id, 
                ak.user_id, 
                ak.revoked, 
                u.plan, 
                u.custom_quota, 
                u.banned
             FROM api_keys ak
             JOIN users u ON u.id = ak.user_id
             WHERE ak.key_hash = $1`,
            [keyHash]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                error: 'invalid_api_key',
                message: 'Clé API invalide ou révoquée'
            });
        }

        const keyData = result.rows[0];

        // 5. Vérifier si la clé est révoquée
        if (keyData.revoked) {
            return res.status(401).json({
                error: 'revoked_api_key',
                message: 'Cette clé API a été révoquée'
            });
        }

        // 6. Vérifier si l'utilisateur est banni
        if (keyData.banned) {
            return res.status(403).json({
                error: 'banned',
                message: 'Ce compte est banni'
            });
        }

        // 7. Définir plan et limite (AVANT le if, utilisés plus loin)
        const plan = keyData.plan || 'free';
        const limit = keyData.custom_quota > 0
            ? keyData.custom_quota
            : getPlanLimit(plan);

        // 8. Vérifier la limite mensuelle (SAUF pour /me qui doit toujours répondre)
        const isMeRoute = req.path === '/me' || req.originalUrl.includes('/api/v1/me');

        if (!isMeRoute && limit !== Infinity) {
            const countResult = await pool.query(
                `SELECT COUNT(*) FROM api_logs
                 WHERE user_id = $1
                 AND created_at >= date_trunc('month', CURRENT_DATE)`,
                [keyData.user_id]
            );
            const monthCount = parseInt(countResult.rows[0].count) || 0;

            if (monthCount >= limit) {
                return res.status(429).json({
                    error: 'rate_limit_exceeded',
                    message: `Limite mensuelle atteinte (${limit} requêtes/mois pour le plan ${plan.toUpperCase()})`,
                    plan: plan,
                    limit: limit,
                    used: monthCount
                });
            }
        }

        // 9. Mettre à jour last_used
        await pool.query(
            'UPDATE api_keys SET last_used = CURRENT_TIMESTAMP WHERE id = $1',
            [keyData.id]
        );

        // 10. Attacher les infos à la requête
        req.apiKey = {
            id: keyData.id,
            userId: keyData.user_id,
            plan: plan,
            limit: limit,
            isCustomQuota: keyData.custom_quota > 0
        };

        next();

    } catch (error) {
        console.error('requireApiKey error:', error);
        return res.status(500).json({
            error: 'server_error',
            message: 'Erreur serveur'
        });
    }
};

// ============================================
// MIDDLEWARE : logApiRequest
// Enregistre la requête dans api_logs APRÈS la réponse
// ============================================
const logApiRequest = (endpoint, method) => {
    return async (req, res, next) => {
        const startTime = Date.now();

        // Ne PAS logger /me (consultation du compteur)
        const isMeRoute = req.path === '/me' || req.originalUrl.includes('/api/v1/me');
        if (isMeRoute) {
            return next();
        }

        res.on('finish', async () => {
            if (!req.apiKey) return;

            // ✅ Ne compter QUE les requêtes réussies (2xx)
            if (res.statusCode < 200 || res.statusCode >= 300) {
                return;
            }

            try {
                const responseTime = Date.now() - startTime;
                const ip = req.headers['x-forwarded-for']?.split(',')[0] ||
                           req.socket.remoteAddress ||
                           'unknown';

                await pool.query(
                    `INSERT INTO api_logs
                     (user_id, api_key_id, endpoint, method, status_code, response_time_ms, ip)
                     VALUES ($1, $2, $3, $4, $5, $6, $7)`,
                    [
                        req.apiKey.userId,
                        req.apiKey.id,
                        endpoint,
                        method,
                        res.statusCode,
                        responseTime,
                        ip
                    ]
                );
            } catch (err) {
                console.error('logApiRequest error:', err.message);
            }
        });

        next();
    };
};

// ============================================
// MIDDLEWARE : requirePlan
// Exige un plan minimum pour accéder à une route
// ============================================
const requirePlan = (minPlan) => {
    const levels = { free: 0, starter: 1, pro: 2, enterprise: 3 };

    return (req, res, next) => {
        if (!req.apiKey) {
            return res.status(401).json({ error: 'api_key_required' });
        }

        const userLevel = levels[req.apiKey.plan] ?? 0;
        const requiredLevel = levels[minPlan] ?? 0;

        if (userLevel < requiredLevel) {
            return res.status(403).json({
                error: 'plan_required',
                message: `Cette fonctionnalité nécessite le plan ${minPlan.toUpperCase()} ou supérieur`,
                current_plan: req.apiKey.plan,
                required_plan: minPlan
            });
        }

        next();
    };
};

// ============================================
// EXPORTS
// ============================================
module.exports = {
    requireApiKey,
    logApiRequest,
    requirePlan,
    PLAN_LIMITS
};