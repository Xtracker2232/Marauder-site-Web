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

            // ===== MODE MOCK (tant que BrixHub est down) =====
            const BRIX_AVAILABLE = process.env.BRIX_AVAILABLE === 'true';

            if (!BRIX_AVAILABLE) {
                // Retourner des données mock pour tester
                return res.json({
                    success: true,
                    mock: true,
                    data: {
                        results: [
                            {
                                nom_famille: 'TEST',
                                prenom: 'Jean',
                                email: 'jean.test@example.com',
                                telephone: '0612345678',
                                ville: 'Paris',
                                _mock: true
                            }
                        ]
                    },
                    meta: {
                        total: 1,
                        took_ms: 5,
                        warning: 'BrixHub temporairement indisponible — données mock'
                    }
                });
            }

            // ===== MODE RÉEL (BrixHub) =====
            const response = await axios.post(
                'https://api.brixhub.to/api/v1/search',
                query,
                {
                    headers: {
                        'X-API-Key': process.env.BRIX_API_KEY,
                        'Content-Type': 'application/json'
                    },
                    timeout: 15000
                }
            );

            res.json({
                success: true,
                data: response.data.data || { results: [] },
                meta: {
                    total: response.data.data?.results?.length || 0,
                    took_ms: response.data.meta?.took_ms || 0
                }
            });

        } catch (error) {
            console.error('API v1 search error:', error.message);

            if (error.response) {
                return res.status(error.response.status).json({
                    error: 'upstream_error',
                    message: 'Erreur du fournisseur de données',
                    status: error.response.status
                });
            }

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

            // ===== MODE MOCK =====
            const BRIX_AVAILABLE = process.env.BRIX_AVAILABLE === 'true';

            if (!BRIX_AVAILABLE) {
                return res.json({
                    success: true,
                    mock: true,
                    data: {
                        results: [
                            {
                                nom_famille: 'TEST',
                                prenom: 'Jean',
                                [type === 'email' ? 'email' : type === 'phone' ? 'telephone' : 'iban']: value,
                                _mock: true
                            }
                        ]
                    },
                    meta: {
                        total: 1,
                        warning: 'BrixHub temporairement indisponible — données mock'
                    }
                });
            }

            // ===== MODE RÉEL =====
            const response = await axios.get(
                `https://api.brixhub.to/api/v1/lookup/${type}/${encodeURIComponent(value)}`,
                {
                    headers: { 'X-API-Key': process.env.BRIX_API_KEY },
                    timeout: 15000
                }
            );

            res.json({
                success: true,
                data: response.data.data || { results: [] },
                meta: {
                    total: response.data.data?.results?.length || 0
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