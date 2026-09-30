// ============================================
// API PUBLIQUE v1
// ============================================
const express = require('express');
const router = express.Router();
const axios = require('axios');
const { Pool } = require('pg');
const { requireApiKey, logApiRequest, requirePlan } = require('../middleware/apikey');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ============================================
// HELPERS BRIXHUB (compatibles ancien + nouveau format)
// ============================================
function extractBrixResults(response) {
    if (response?.data?.data?.results) return response.data.data.results;
    if (response?.data?.results) return response.data.results;
    return [];
}

function extractBrixMeta(response) {
    return response?.data?.meta || response?.data?.data?.meta || {};
}

function isBrixMaintenance(response) {
    const meta = extractBrixMeta(response);
    return meta.maintenance === true || response?.data?.maintenance === true;
}

// ============================================
// POST /api/v1/search
// ============================================
router.post('/search',
    requireApiKey,
    logApiRequest('/api/v1/search', 'POST'),
    async (req, res) => {
        try {
            const query = req.body;

            if (!query || Object.keys(query).length === 0) {
                return res.status(400).json({
                    error: 'empty_query',
                    message: 'Aucun critère fourni'
                });
            }

            // ===== APPEL BRIXHUB =====
            let response;
            try {
                response = await axios.post(
                    'https://api.brixhub.to/api/v1/search',
                    query,
                    {
                        headers: {
                            'X-API-Key': process.env.BRIX_API_KEY,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );
            } catch (brixError) {
                console.error('BrixHub error:', brixError.response?.data || brixError.message);
                return res.status(503).json({
                    error: 'upstream_unavailable',
                    message: 'Le fournisseur de données est temporairement indisponible. Réessayez dans quelques minutes.',
                    detail: brixError.message
                });
            }

            const results = extractBrixResults(response);
            const meta = extractBrixMeta(response);
            const maintenance = isBrixMaintenance(response);

            return res.json({
                success: true,
                mock: false,
                data: { results },
                meta: {
                    total: meta.total || results.length,
                    page: meta.page || 1,
                    pages: meta.pages || 1,
                    per_page: meta.per_page || results.length,
                    took_ms: meta.took_ms || 0,
                    maintenance: maintenance,
                    warning: maintenance ? 'BrixHub signale une maintenance — résultats possiblement incomplets' : null
                }
            });

        } catch (error) {
            console.error('API v1 search error:', error.message);
            res.status(500).json({
                error: 'server_error',
                message: 'Erreur lors de la recherche'
            });
        }
    }
);

// ============================================
// GET /api/v1/lookup/:type/:value
// ============================================
router.get('/lookup/:type/:value',
    requireApiKey,
    logApiRequest('/api/v1/lookup', 'GET'),
    async (req, res) => {
        try {
            const { type, value } = req.params;
            const validTypes = ['email', 'phone', 'iban'];

            if (!validTypes.includes(type)) {
                return res.status(400).json({
                    error: 'invalid_type',
                    message: `Type invalide. Types valides: ${validTypes.join(', ')}`
                });
            }

            if (!value || value.length < 3) {
                return res.status(400).json({
                    error: 'invalid_value',
                    message: 'Valeur trop courte'
                });
            }

            // ===== APPEL BRIXHUB =====
            let response;
            try {
                response = await axios.get(
                    `https://api.brixhub.to/api/v1/lookup/${type}/${encodeURIComponent(value)}`,
                    {
                        headers: { 'X-API-Key': process.env.BRIX_API_KEY },
                        timeout: 30000
                    }
                );
            } catch (brixError) {
                console.error('BrixHub lookup error:', brixError.response?.data || brixError.message);
                return res.status(503).json({
                    error: 'upstream_unavailable',
                    message: 'Le fournisseur de données est temporairement indisponible.',
                    detail: brixError.message
                });
            }

            const results = extractBrixResults(response);
            const meta = extractBrixMeta(response);
            const maintenance = isBrixMaintenance(response);

            return res.json({
                success: true,
                mock: false,
                data: { results },
                meta: {
                    total: meta.total || results.length,
                    took_ms: meta.took_ms || 0,
                    maintenance: maintenance,
                    warning: maintenance ? 'BrixHub signale une maintenance — résultats possiblement incomplets' : null
                }
            });

        } catch (error) {
            console.error('API v1 lookup error:', error.message);
            res.status(500).json({
                error: 'server_error',
                message: 'Erreur lors du lookup'
            });
        }
    }
);

// ============================================
// GET /api/v1/me — Infos sur la clé
// ============================================
router.get('/me',
    requireApiKey,
    logApiRequest('/api/v1/me', 'GET'),
    async (req, res) => {
        try {
            const countResult = await pool.query(
                `SELECT COUNT(*) FROM api_logs
                 WHERE user_id = $1
                 AND created_at >= date_trunc('month', CURRENT_DATE)`,
                [req.apiKey.userId]
            );
            const used = parseInt(countResult.rows[0].count);
            const limit = req.apiKey.limit;

            res.json({
                success: true,
                plan: req.apiKey.plan,
                usage: {
                    used: used,
                    limit: limit === Infinity ? '∞' : limit,
                    remaining: limit === Infinity ? '∞' : Math.max(0, limit - used)
                }
            });
        } catch (error) {
            res.status(500).json({ error: 'server_error' });
        }
    }
);

module.exports = router;

// ============================================
// GET /api/v1/usage — Stats API de l'utilisateur
// ============================================
router.get('/usage',
    requireApiKey,
    async (req, res) => {
        try {
            const userId = req.apiKey.userId;
            const limit = req.apiKey.limit;

            const monthResult = await pool.query(
                `SELECT COUNT(*) AS total FROM api_logs
                 WHERE user_id = $1
                 AND created_at >= date_trunc('month', CURRENT_DATE)`,
                [userId]
            );
            const monthCount = parseInt(monthResult.rows[0].total) || 0;

            const todayResult = await pool.query(
                `SELECT COUNT(*) AS total FROM api_logs
                 WHERE user_id = $1
                 AND DATE(created_at) = CURRENT_DATE`,
                [userId]
            );
            const todayCount = parseInt(todayResult.rows[0].total) || 0;

            const byEndpointResult = await pool.query(
                `SELECT endpoint, COUNT(*) AS total FROM api_logs
                 WHERE user_id = $1
                 AND created_at >= date_trunc('month', CURRENT_DATE)
                 GROUP BY endpoint
                 ORDER BY total DESC`,
                [userId]
            );

            const remaining = limit === Infinity ? '∞' : Math.max(0, limit - monthCount);

            res.json({
                success: true,
                plan: req.apiKey.plan,
                usage: {
                    today: todayCount,
                    month: monthCount,
                    limit: limit === Infinity ? '∞' : limit,
                    remaining,
                    by_endpoint: byEndpointResult.rows
                }
            });
        } catch (error) {
            console.error('API v1 usage error:', error);
            res.status(500).json({ error: 'server_error' });
        }
    }
);