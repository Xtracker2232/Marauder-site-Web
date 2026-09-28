// ============================================
// MARAUDER API - index.js
// ============================================
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const crypto = require('crypto');
const { Pool } = require('pg');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

// ============================================
// 1. INITIALISATION
// ============================================
const app = express();
const PORT = process.env.PORT || 8080;

// ============================================
// 2. VÉRIFICATION DES VARIABLES D'ENV
// ============================================
const REQUIRED_ENV = [
    'DATABASE_URL',
    'JWT_SECRET',
    'BRIX_API_KEY',
    'ADMIN_USERNAME',
    'ADMIN_PASSWORD'
];

for (const envVar of REQUIRED_ENV) {
    if (!process.env[envVar]) {
        console.error(`❌ ${envVar} non défini`);
        process.exit(1);
    }
}

console.log('✅ Toutes les variables d\'environnement sont définies');
console.log('🚧 Mode maintenance:', process.env.MAINTENANCE || 'OFF');
console.log('🔒 Mode DEV API:', process.env.DEV_API || 'OFF');

// ============================================
// 3. BASE DE DONNÉES
// ============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ============================================
// 4. LIMITES PAR PLAN (source unique de vérité)
// ============================================
const PLAN_LIMITS = {
    free: {
        apiKeys: 1,
        searchesPerMonth: 10,
        resultsPerSearch: 10,
        fiches: 10
    },
    starter: {
        apiKeys: 1,
        searchesPerMonth: 1000,
        resultsPerSearch: 50,
        fiches: 50
    },
    pro: {
        apiKeys: 3,
        searchesPerMonth: 10000,
        resultsPerSearch: 100,
        fiches: 100
    },
    enterprise: {
        apiKeys: Infinity,
        searchesPerMonth: Infinity,
        resultsPerSearch: 100,
        fiches: Infinity
    }
};

function getPlanLimits(plan) {
    return PLAN_LIMITS[plan] || PLAN_LIMITS.free;
}

async function getUserLimits(userId) {
    const result = await pool.query(
        'SELECT plan, custom_quota FROM users WHERE id = $1',
        [userId]
    );
    const user = result.rows[0];
    if (!user) return PLAN_LIMITS.free;

    const planLimits = getPlanLimits(user.plan);
    return {
        ...planLimits,
        searchesPerMonth: user.custom_quota > 0 ? user.custom_quota : planLimits.searchesPerMonth,
        hasCustomQuota: user.custom_quota > 0
    };
}

// ============================================
// 5. CRÉATION DES TABLES + MIGRATIONS
// ============================================
const initDB = async () => {
    const client = await pool.connect();
    try {
        // Tables de base
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                role VARCHAR(50) DEFAULT 'user',
                banned BOOLEAN DEFAULT FALSE,
                reg_ip TEXT
            );
            CREATE TABLE IF NOT EXISTS search_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                query JSONB NOT NULL,
                results_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS fiches (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                persons JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS graphes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) DEFAULT 'Mon graphe',
                nodes JSONB DEFAULT '[]',
                edges JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS ip_used (
                id SERIAL PRIMARY KEY,
                ip TEXT UNIQUE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS blocklist (
                id SERIAL PRIMARY KEY,
                type VARCHAR(50) NOT NULL,
                value TEXT NOT NULL,
                reason TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
            );
            CREATE TABLE IF NOT EXISTS tickets (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                subject VARCHAR(255) NOT NULL,
                message TEXT NOT NULL,
                status VARCHAR(50) DEFAULT 'open',
                admin_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE TABLE IF NOT EXISTS ticket_messages (
                id SERIAL PRIMARY KEY,
                ticket_id INTEGER REFERENCES tickets(id) ON DELETE CASCADE,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                message TEXT NOT NULL,
                is_admin BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Tables OK');

        // Migration Stripe
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS stripe_customer_id VARCHAR(255),
            ADD COLUMN IF NOT EXISTS plan VARCHAR(50) DEFAULT 'free',
            ADD COLUMN IF NOT EXISTS plan_expires_at TIMESTAMP,
            ADD COLUMN IF NOT EXISTS subscription_status VARCHAR(50);

            CREATE TABLE IF NOT EXISTS subscriptions (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_subscription_id VARCHAR(255) UNIQUE NOT NULL,
                stripe_customer_id VARCHAR(255) NOT NULL,
                stripe_price_id VARCHAR(255),
                status VARCHAR(50) NOT NULL,
                plan VARCHAR(50) NOT NULL,
                current_period_start TIMESTAMP,
                current_period_end TIMESTAMP,
                cancel_at_period_end BOOLEAN DEFAULT FALSE,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE TABLE IF NOT EXISTS payments (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                stripe_payment_intent_id VARCHAR(255),
                stripe_invoice_id VARCHAR(255),
                amount INTEGER NOT NULL,
                currency VARCHAR(10) DEFAULT 'eur',
                status VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
        `);
        console.log('✅ Migration Stripe OK');

        // Migration API Keys
        await client.query(`
            CREATE TABLE IF NOT EXISTS api_keys (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) DEFAULT 'Ma clé API',
                key_hash VARCHAR(255) NOT NULL UNIQUE,
                key_preview VARCHAR(50) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_used TIMESTAMP,
                revoked BOOLEAN DEFAULT FALSE
            );
            CREATE INDEX IF NOT EXISTS idx_api_keys_user ON api_keys(user_id);
            CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON api_keys(key_hash);
        `);
        console.log('✅ Migration API Keys OK');

        // Migration API Logs
        await client.query(`
            CREATE TABLE IF NOT EXISTS api_logs (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                api_key_id INTEGER REFERENCES api_keys(id) ON DELETE SET NULL,
                endpoint VARCHAR(255) NOT NULL,
                method VARCHAR(10) NOT NULL,
                status_code INTEGER,
                response_time_ms INTEGER,
                ip TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );
            CREATE INDEX IF NOT EXISTS idx_api_logs_user ON api_logs(user_id);
            CREATE INDEX IF NOT EXISTS idx_api_logs_created ON api_logs(created_at);
        `);
        console.log('✅ Migration API Logs OK');

        // Migration Custom Quota
        await client.query(`
            ALTER TABLE users 
            ADD COLUMN IF NOT EXISTS custom_quota INTEGER DEFAULT 0;
        `);
        console.log('✅ Migration Custom Quota OK');

        // Admin
        const result = await client.query(
            'SELECT COUNT(*) FROM users WHERE username = $1',
            [process.env.ADMIN_USERNAME]
        );
        if (parseInt(result.rows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
            await client.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                [process.env.ADMIN_USERNAME, hashedPassword, 'admin']
            );
            console.log('✅ Admin créé');
        } else {
            await client.query(
                'UPDATE users SET role = $1 WHERE username = $2',
                ['admin', process.env.ADMIN_USERNAME]
            );
            console.log('✅ Admin vérifié');
        }
    } finally {
        client.release();
    }
};

// ============================================
// 6. HELPERS
// ============================================
async function getBlocklist() {
    try {
        const result = await pool.query('SELECT type, value FROM blocklist');
        return result.rows;
    } catch (error) {
        console.error('Erreur blocklist:', error.message);
        return [];
    }
}

function isBlocked(person, blocklist) {
    if (!blocklist || blocklist.length === 0) return false;
    const fieldsToCheck = [
        'nom_famille', 'prenom', 'email', 'telephone', 'adresse', 'ville',
        'code_postal', 'nom_utilisateur', 'adresse_ip', 'steam_id', 'discord_id',
        'nir', 'iban', 'nom_naissance', 'nom_affichage', 'societe', 'profession',
        'fonction', 'siret', 'siren', 'bic', 'vin_plaque'
    ];
    for (let entry of blocklist) {
        const fieldValue = person[entry.type];
        if (fieldValue && typeof fieldValue === 'string') {
            if (fieldValue.toLowerCase().includes(entry.value.toLowerCase())) {
                console.log(`🚫 Bloqué: ${entry.type}=${entry.value}`);
                return true;
            }
        }
    }
    return false;
}

async function getMonthlySearchCount(userId) {
    const result = await pool.query(
        `SELECT 
            (SELECT COUNT(*) FROM search_history 
             WHERE user_id = $1 
             AND created_at >= date_trunc('month', CURRENT_DATE))
            +
            (SELECT COUNT(*) FROM api_logs 
             WHERE user_id = $1 
             AND created_at >= date_trunc('month', CURRENT_DATE))
         AS total`,
        [userId]
    );
    return parseInt(result.rows[0].total) || 0;
}

// ============================================
// 7. MIDDLEWARES GLOBAUX
// ============================================

// Body parser (sauf webhook Stripe)
app.use((req, res, next) => {
    if (req.originalUrl === '/api/stripe/webhook' || req.originalUrl === '/api/crypto/webhook') {
        return next();
    }
    express.json()(req, res, next);
});
app.use(express.urlencoded({ extended: true }));

// CORS
const allowedOrigins = [
    'https://marauder-site-web-production.up.railway.app',
    'https://marauder.host',
    'http://localhost:3000',
    'http://localhost:8080'
];

app.use(cors({
    origin: function(origin, callback) {
        if (!origin) return callback(null, true);
        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV === 'development') {
            callback(null, true);
        } else {
            callback(new Error('CORS non autorisé'));
        }
    },
    credentials: true
}));

app.set('trust proxy', 1);

// ============================================
// 8. STRIPE ROUTES (avant le reste)
// ============================================
const stripeRoutes = require('./routes/stripe');
app.use('/api/stripe', stripeRoutes);

// ============================================
// 9. MAINTENANCE
// ============================================
app.use((req, res, next) => {
    if (req.path.startsWith('/api/')) return next();
    if (req.path === '/maintenance') return next();
    if (process.env.MAINTENANCE === 'ON') {
        console.log('🚧 Maintenance activée pour:', req.path);
        return res.sendFile(path.join(__dirname, 'frontend', 'maintenance.html'));
    }
    next();
});

app.get('/maintenance', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'maintenance.html'));
});

// ============================================
// 10. FICHIERS STATIQUES
// ============================================
app.use(express.static(path.join(__dirname, 'frontend')));

// ============================================
// 11. FORCER HTTPS (prod uniquement)
// ============================================
app.use((req, res, next) => {
    const proto = req.headers['x-forwarded-proto'] || req.headers['cf-visitor'];
    let isHttps = false;
    if (typeof proto === 'string') {
        try {
            const cfVisitor = JSON.parse(proto);
            isHttps = cfVisitor.scheme === 'https';
        } catch (e) {
            isHttps = proto === 'https';
        }
    }
    if (!isHttps && process.env.NODE_ENV === 'production') {
        return res.redirect('https://' + req.headers.host + req.url);
    }
    next();
});

// ============================================
// 12. RATE LIMITING
// ============================================
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 2000,
    message: 'Trop de requêtes, réessayez plus tard',
    standardHeaders: true,
    legacyHeaders: false
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Trop de tentatives de connexion, réessayez dans 15 minutes'
});

// Exclure les routes critiques du rate limit global
const RATE_LIMIT_EXEMPT = [
    '/api/login',
    '/api/register',
    '/api/verify',
    '/api/me',
    '/api/usage',
    '/api/logs',
    '/api/keys',
    '/api/keys/limits',
    '/api/config',
    '/api/health',
    '/api/stripe/webhook'
];

app.use('/api/', (req, res, next) => {
    if (RATE_LIMIT_EXEMPT.some(p => req.path === p || req.path.startsWith(p + '/'))) {
        return next();
    }
    return limiter(req, res, next);
});

// ============================================
// 13. AUTH MIDDLEWARES
// ============================================
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT id, username, role, banned, plan, custom_quota FROM users WHERE id = $1',
            [decoded.id]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Utilisateur introuvable' });
        }
        if (result.rows[0].banned) {
            return res.status(403).json({ error: 'Ce compte a été banni' });
        }
        req.user = {
            id: result.rows[0].id,
            username: result.rows[0].username,
            role: result.rows[0].role,
            plan: result.rows[0].plan || 'free',
            custom_quota: result.rows[0].custom_quota || 0
        };
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token invalide' });
        }
        console.error('Auth error:', error);
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};

const requireAdmin = async (req, res, next) => {
    try {
        const result = await pool.query('SELECT role FROM users WHERE id = $1', [req.user.id]);
        if (result.rows.length === 0 || result.rows[0].role !== 'admin') {
            return res.status(403).json({ error: 'Accès refusé - Admin requis' });
        }
        next();
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
};

// ============================================
// 14. ROUTES AUTH
// ============================================
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Identifiants invalides' });
        const user = result.rows[0];
        if (user.banned) return res.status(403).json({ error: 'Ce compte a été banni' });
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });
        await pool.query('UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1', [user.id]);
        const token = jwt.sign(
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );
        res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/register',
    body('username').isLength({ min: 3 }).trim().escape(),
    body('password').isLength({ min: 8 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
        const { username, password } = req.body;
        try {
            const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
            const hashed = await bcrypt.hash(password, 12);
            const result = await pool.query(
                'INSERT INTO users (username, password_hash, reg_ip) VALUES ($1, $2, $3) RETURNING id, username, role',
                [username, hashed, ip]
            );
            await pool.query(
                'INSERT INTO ip_used (ip, user_id) VALUES ($1, $2) ON CONFLICT (ip) DO NOTHING',
                [ip, result.rows[0].id]
            );
            res.status(201).json({ success: true, user: result.rows[0] });
        } catch (error) {
            if (error.code === '23505') return res.status(400).json({ error: 'Nom déjà utilisé' });
            res.status(500).json({ error: 'Erreur serveur' });
        }
    }
);

app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ============================================
// 15. ROUTES BRIXHUB (avec limites)
// ============================================
app.post('/api/brix/search', authenticateToken, async (req, res) => {
    try {
        const limits = await getUserLimits(req.user.id);

        // Vérif limite
        if (limits.searchesPerMonth !== Infinity) {
            const used = await getMonthlySearchCount(req.user.id);
            if (used >= limits.searchesPerMonth) {
                return res.status(429).json({
                    error: 'quota_exceeded',
                    message: `Limite mensuelle atteinte (${limits.searchesPerMonth} recherches/mois pour le plan ${req.user.plan.toUpperCase()})`,
                    used: used,
                    limit: limits.searchesPerMonth
                });
            }
        }

        // Forcer per_page
        const query = { ...req.body };
        query.per_page = Math.min(query.per_page || limits.resultsPerSearch, limits.resultsPerSearch);

        const blocklist = await getBlocklist();
        const response = await axios.post(
            'https://api.brixhub.to/api/v1/search',
            query,
            {
                headers: {
                    'X-API-Key': process.env.BRIX_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        let results = response.data.data?.results || [];
        const totalBeforeFilter = results.length;

        if (blocklist.length > 0 && results.length > 0) {
            results = results.filter(person => !isBlocked(person, blocklist));
        }

        try {
            await pool.query(
                'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
                [req.user.id, query, results.length]
            );
        } catch (dbError) {
            console.error('Erreur historique:', dbError.message);
        }

        res.json({
            data: { results: results },
            meta: {
                total: results.length,
                filtered: totalBeforeFilter !== results.length,
                total_before_filter: totalBeforeFilter,
                plan_limit: limits.resultsPerSearch,
                took_ms: response.data.meta?.took_ms || 0
            }
        });
    } catch (error) {
        console.error('Brix error:', error.message);
        res.status(500).json({ error: 'Erreur de recherche' });
    }
});

app.get('/api/brix/lookup/:type/:value', authenticateToken, async (req, res) => {
    const { type, value } = req.params;
    const validTypes = ['email', 'phone', 'iban'];
    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Type invalide' });
    }
    try {
        const limits = await getUserLimits(req.user.id);

        if (limits.searchesPerMonth !== Infinity) {
            const used = await getMonthlySearchCount(req.user.id);
            if (used >= limits.searchesPerMonth) {
                return res.status(429).json({
                    error: 'quota_exceeded',
                    message: `Limite mensuelle atteinte (${limits.searchesPerMonth} recherches/mois)`,
                    used: used,
                    limit: limits.searchesPerMonth
                });
            }
        }

        const blocklist = await getBlocklist();
        const response = await axios.get(
            `https://api.brixhub.to/api/v1/lookup/${type}/${encodeURIComponent(value)}`,
            {
                headers: { 'X-API-Key': process.env.BRIX_API_KEY },
                timeout: 10000
            }
        );

        let results = response.data.data?.results || [];
        if (blocklist.length > 0 && results.length > 0) {
            results = results.filter(row => !isBlocked(row, blocklist));
        }

        try {
            await pool.query(
                'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
                [req.user.id, { type: 'lookup', lookup_type: type, value: value }, results.length]
            );
        } catch (dbError) {
            console.error('Erreur historique lookup:', dbError.message);
        }

        res.json({
            data: { results: results },
            meta: { filtered: true }
        });
    } catch (error) {
        console.error('Lookup error:', error.message);
        res.status(500).json({ error: 'Erreur de lookup' });
    }
});

// ============================================
// 16. ROUTES HISTORIQUE
// ============================================
app.get('/api/history', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json({ history: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.post('/api/history/:id/replay', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT query FROM search_history WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Recherche non trouvée' });

        let query = result.rows[0].query;
        if (typeof query === 'string') query = JSON.parse(query);

        const limits = await getUserLimits(req.user.id);
        query.per_page = limits.resultsPerSearch;

        const blocklist = await getBlocklist();
        const response = await axios.post(
            'https://api.brixhub.to/api/v1/search',
            query,
            {
                headers: {
                    'X-API-Key': process.env.BRIX_API_KEY,
                    'Content-Type': 'application/json'
                },
                timeout: 10000
            }
        );

        let results = response.data.data?.results || [];
        if (blocklist.length > 0 && results.length > 0) {
            results = results.filter(person => !isBlocked(person, blocklist));
        }

        res.json({
            results: results,
            total: results.length,
            took_ms: response.data.meta?.took_ms || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur replay' });
    }
});

// ============================================
// 17. ROUTES FICHES
// ============================================
app.get('/api/fiches', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM fiches WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json({ fiches: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.post('/api/fiches', authenticateToken, async (req, res) => {
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
    try {
        const result = await pool.query(
            'INSERT INTO fiches (user_id, name, persons) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, name.trim(), '[]']
        );
        res.status(201).json({ fiche: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.post('/api/fiches/:id/persons', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { person } = req.body;
    if (!person) return res.status(400).json({ error: 'Personne requise' });
    try {
        const fiche = await pool.query('SELECT * FROM fiches WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (fiche.rows.length === 0) return res.status(404).json({ error: 'Fiche non trouvée' });

        const limits = await getUserLimits(req.user.id);
        let persons = fiche.rows[0].persons || [];
        if (persons.length >= limits.fiches) {
            return res.status(400).json({ error: `Max ${limits.fiches} personnes par fiche` });
        }
        persons.push(person);
        const result = await pool.query(
            'UPDATE fiches SET persons = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [JSON.stringify(persons), id, req.user.id]
        );
        res.json({ fiche: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.put('/api/fiches/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;
    if (!name || !name.trim()) return res.status(400).json({ error: 'Nom requis' });
    try {
        const result = await pool.query(
            'UPDATE fiches SET name = $1 WHERE id = $2 AND user_id = $3 RETURNING *',
            [name.trim(), id, req.user.id]
        );
        if (result.rows.length === 0) return res.status(404).json({ error: 'Fiche non trouvée' });
        res.json({ fiche: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.delete('/api/fiches/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM fiches WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Fiche non trouvée' });
        res.json({ message: 'Supprimée' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============================================
// 18. ROUTES GRAPHES
// ============================================
app.post('/api/graphes', authenticateToken, async (req, res) => {
    const { name, nodes, edges } = req.body;
    try {
        await pool.query('DELETE FROM graphes WHERE user_id = $1', [req.user.id]);
        const result = await pool.query(
            'INSERT INTO graphes (user_id, name, nodes, edges) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, name || 'Mon graphe', JSON.stringify(nodes || []), JSON.stringify(edges || [])]
        );
        res.status(201).json({ graphe: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/graphes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM graphes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1', [req.user.id]);
        if (result.rows.length === 0) return res.json({ graphe: null });
        res.json({ graphe: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.get('/api/graphes/all', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM graphes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json({ graphes: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/graphes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('SELECT * FROM graphes WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Graphe non trouvé' });
        res.json({ graphe: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.delete('/api/graphes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query('DELETE FROM graphes WHERE id = $1 AND user_id = $2 RETURNING *', [id, req.user.id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Graphe non trouvé' });
        res.json({ message: 'Supprimé' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============ ROUTES CRYPTO (NOWPayments) ============

// Créer un paiement crypto
app.post('/api/crypto/create-payment', authenticateToken, async (req, res) => {
    try {
        const { plan } = req.body;
        if (!['starter', 'pro'].includes(plan)) {
            return res.status(400).json({ error: 'Plan invalide' });
        }

        const prices = { starter: 9.99, pro: 29.99 };
        const amount = prices[plan];
        const baseUrl = process.env.BASE_URL || 'http://localhost:8080';

        const response = await axios.post(
            'https://api.nowpayments.io/v1/payment',
            {
                price_amount: amount,
                price_currency: 'eur',
                pay_currency: 'usdttrc20',
                order_id: `${req.user.id}_${plan}_${Date.now()}`,
                order_description: `Abonnement Marauder ${plan.toUpperCase()}`,
                ipn_callback_url: `${baseUrl}/api/crypto/webhook`
            },
            {
                headers: {
                    'x-api-key': process.env.NOWPAYMENTS_API_KEY,
                    'Content-Type': 'application/json'
                }
            }
        );

        res.json({
            success: true,
            payment_id: response.data.payment_id,
            pay_address: response.data.pay_address,
            pay_amount: response.data.pay_amount,
            pay_currency: response.data.pay_currency,
            price_amount: response.data.price_amount,
            price_currency: response.data.price_currency,
            expiration_estimate_date: response.data.expiration_estimate_date
        });
    } catch (error) {
        console.error('Crypto payment error:', error.response?.data || error.message);
        res.status(500).json({ error: 'Erreur création paiement crypto' });
    }
});

// Webhook NOWPayments (IPN)
app.post('/api/crypto/webhook', express.json(), async (req, res) => {
    try {
        const signature = req.headers['x-nowpayments-sig'];
        if (!signature) {
            return res.status(400).json({ error: 'Signature manquante' });
        }

        // Vérification HMAC SHA-512
        const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET);
        const sortedBody = JSON.stringify(req.body, Object.keys(req.body).sort());
        hmac.update(sortedBody);
        const computedSignature = hmac.digest('hex');

        if (computedSignature !== signature) {
            console.error('❌ Signature invalide');
            return res.status(401).json({ error: 'Signature invalide' });
        }

        const payment = req.body;
        console.log(`🪙 Crypto payment ${payment.payment_id} → ${payment.payment_status}`);

        if (payment.payment_status === 'finished' || payment.payment_status === 'confirmed') {
            const orderParts = (payment.order_id || '').split('_');
            const userId = parseInt(orderParts[0]);
            const plan = orderParts[1];

            if (userId && plan) {
                await pool.query(
                    'UPDATE users SET plan = $1, subscription_status = $2 WHERE id = $3',
                    [plan, 'active', userId]
                );
                console.log(`✅ User ${userId} → plan ${plan} (crypto)`);
            }
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Crypto webhook error:', error);
        res.status(400).json({ error: 'Webhook invalide' });
    }
});


// Webhook NOWPayments (IPN)
app.post('/api/crypto/webhook', express.json(), async (req, res) => {
    try {
        // Vérifier la signature
        const signature = req.headers['x-nowpayments-sig'];
        if (!signature) {
            return res.status(400).json({ error: 'Signature manquante' });
        }

        // Vérification HMAC SHA-512
        const crypto = require('crypto');
        const hmac = crypto.createHmac('sha512', process.env.NOWPAYMENTS_IPN_SECRET);
        const sortedBody = JSON.stringify(req.body, Object.keys(req.body).sort());
        hmac.update(sortedBody);
        const computedSignature = hmac.digest('hex');

        if (computedSignature !== signature) {
            console.error('❌ Signature invalide');
            return res.status(401).json({ error: 'Signature invalide' });
        }

        // Traiter le paiement
        const payment = req.body;
        console.log(`🪙 Crypto payment ${payment.payment_id} → ${payment.payment_status}`);

        if (payment.payment_status === 'finished' || payment.payment_status === 'confirmed') {
            const orderParts = (payment.order_id || '').split('_');
            const userId = parseInt(orderParts[0]);
            const plan = orderParts[1];

            if (userId && plan) {
                await pool.query(
                    'UPDATE users SET plan = $1, subscription_status = $2 WHERE id = $3',
                    [plan, 'active', userId]
                );
                console.log(`✅ User ${userId} → plan ${plan} (crypto)`);
            }
        }

        res.json({ ok: true });
    } catch (error) {
        console.error('Crypto webhook error:', error);
        res.status(400).json({ error: 'Webhook invalide' });
    }
});

// ============================================
// 19. ROUTE USAGE
// ============================================
app.get('/api/usage', authenticateToken, async (req, res) => {
    try {
        const limits = await getUserLimits(req.user.id);
        const monthCount = await getMonthlySearchCount(req.user.id);

        const todayResult = await pool.query(
            `SELECT 
                (SELECT COUNT(*) FROM search_history 
                 WHERE user_id = $1 
                 AND DATE(created_at) = CURRENT_DATE)
                +
                (SELECT COUNT(*) FROM api_logs 
                 WHERE user_id = $1 
                 AND DATE(created_at) = CURRENT_DATE)
             AS total`,
            [req.user.id]
        );
        const todayCount = parseInt(todayResult.rows[0].total) || 0;

        const limit = limits.searchesPerMonth;
        const remaining = limit === Infinity ? '∞' : Math.max(0, limit - monthCount);

        res.json({
            plan: req.user.plan || 'free',
            hasCustomQuota: limits.hasCustomQuota,
            today: todayCount,
            month: monthCount,
            limit: limit === Infinity ? '∞' : limit,
            remaining: remaining,
            resultsPerSearch: limits.resultsPerSearch
        });
    } catch (error) {
        console.error('Usage error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// 20. ROUTE LOGS API
// ============================================
app.get('/api/logs', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            `SELECT 
                'api' as type,
                endpoint,
                method,
                status_code,
                response_time_ms,
                created_at
             FROM api_logs
             WHERE user_id = $1
             ORDER BY created_at DESC
             LIMIT 20`,
            [req.user.id]
        );
        res.json({ logs: result.rows });
    } catch (error) {
        console.error('Logs error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// 21. ROUTES API KEYS
// ============================================
app.get('/api/keys', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, name, key_preview, created_at, last_used FROM api_keys WHERE user_id = $1 AND revoked = FALSE ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ keys: result.rows });
    } catch (error) {
        console.error('List keys error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/keys/limits', authenticateToken, async (req, res) => {
    try {
        const limits = await getUserLimits(req.user.id);
        const countResult = await pool.query(
            'SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND revoked = FALSE',
            [req.user.id]
        );
        const currentCount = parseInt(countResult.rows[0].count);

        res.json({
            plan: req.user.plan || 'free',
            currentCount: currentCount,
            maxKeys: limits.apiKeys
        });
    } catch (error) {
        console.error('Limits error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/keys', authenticateToken, async (req, res) => {
    try {
        const limits = await getUserLimits(req.user.id);

        const countResult = await pool.query(
            'SELECT COUNT(*) FROM api_keys WHERE user_id = $1 AND revoked = FALSE',
            [req.user.id]
        );
        const currentCount = parseInt(countResult.rows[0].count);

        if (currentCount >= limits.apiKeys) {
            return res.status(403).json({
                error: `Limite atteinte pour le plan ${req.user.plan.toUpperCase()} (${limits.apiKeys} clé${limits.apiKeys > 1 ? 's' : ''} maximum)`,
                currentCount: currentCount,
                maxKeys: limits.apiKeys,
                plan: req.user.plan
            });
        }

        const rawKey = 'marauder_' + crypto.randomBytes(24).toString('hex');
        const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
        const keyPreview = rawKey.substring(0, 20) + '...' + rawKey.substring(rawKey.length - 8);
        const name = req.body?.name || `Clé API #${currentCount + 1}`;

        const result = await pool.query(
            'INSERT INTO api_keys (user_id, name, key_hash, key_preview) VALUES ($1, $2, $3, $4) RETURNING id, name, key_preview, created_at',
            [req.user.id, name, keyHash, keyPreview]
        );

        res.status(201).json({
            key: {
                id: result.rows[0].id,
                name: result.rows[0].name,
                key: rawKey,
                preview: result.rows[0].key_preview,
                created_at: result.rows[0].created_at
            },
            remaining: limits.apiKeys - currentCount - 1,
            maxKeys: limits.apiKeys,
            plan: req.user.plan
        });
    } catch (error) {
        console.error('Create key error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/keys/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'UPDATE api_keys SET revoked = TRUE WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Clé non trouvée' });
        }
        res.json({ success: true });
    } catch (error) {
        console.error('Delete key error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// 22. ROUTE PROFIL
// ============================================
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, created_at, last_login, plan FROM users WHERE id = $1',
            [req.user.id]
        );
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============================================
// 23. ROUTES ADMIN
// ============================================
app.get('/api/admin/check', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role FROM users WHERE id = $1',
            [req.user.id]
        );
        const isProtected = result.rows[0]?.username === process.env.ADMIN_USERNAME;
        res.json({ isAdmin: true, isProtected: isProtected, user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.get('/api/admin/stats', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const totalUsers = await pool.query('SELECT COUNT(*) FROM users');
        const totalSearches = await pool.query('SELECT COUNT(*) FROM search_history');
        const totalFiches = await pool.query('SELECT COUNT(*) FROM fiches');
        const totalGraphes = await pool.query('SELECT COUNT(*) FROM graphes');
        const bannedUsers = await pool.query('SELECT COUNT(*) FROM users WHERE banned = TRUE');
        const searchesToday = await pool.query('SELECT COUNT(*) FROM search_history WHERE DATE(created_at) = CURRENT_DATE');
        const usersToday = await pool.query('SELECT COUNT(*) FROM users WHERE DATE(created_at) = CURRENT_DATE');
        res.json({
            total_users: parseInt(totalUsers.rows[0].count),
            total_searches: parseInt(totalSearches.rows[0].count),
            total_fiches: parseInt(totalFiches.rows[0].count),
            total_graphes: parseInt(totalGraphes.rows[0].count),
            banned_users: parseInt(bannedUsers.rows[0].count),
            searches_today: parseInt(searchesToday.rows[0].count),
            users_today: parseInt(usersToday.rows[0].count)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/users', authenticateToken, requireAdmin, async (req, res) => {
    const { page = 1, limit = 20, search = '' } = req.query;
    const offset = (page - 1) * limit;
    try {
        let query = `
            SELECT 
                u.id, u.username, u.role, u.created_at, u.last_login, u.banned, u.reg_ip, u.plan, u.custom_quota,
                (SELECT COUNT(*) FROM search_history WHERE user_id = u.id) as search_count,
                (SELECT COUNT(*) FROM fiches WHERE user_id = u.id) as fiche_count,
                (SELECT COUNT(*) FROM ip_used WHERE ip = u.reg_ip) as ip_count
            FROM users u
            WHERE u.username != $1
        `;
        const params = [process.env.ADMIN_USERNAME];
        if (search) {
            query += ` AND (u.username ILIKE $${params.length + 1} OR u.reg_ip ILIKE $${params.length + 1})`;
            params.push(`%${search}%`);
        }
        query += ` ORDER BY u.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
        params.push(limit, offset);
        const result = await pool.query(query, params);

        let countQuery = 'SELECT COUNT(*) FROM users WHERE username != $1';
        const countParams = [process.env.ADMIN_USERNAME];
        if (search) {
            countQuery += ` AND (username ILIKE $${countParams.length + 1} OR reg_ip ILIKE $${countParams.length + 1})`;
            countParams.push(`%${search}%`);
        }
        const countResult = await pool.query(countQuery, countParams);

        res.json({
            users: result.rows,
            total: parseInt(countResult.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error('Admin users error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const adminCheck = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        if (adminCheck.rows[0]?.username === process.env.ADMIN_USERNAME) {
            return res.status(403).json({ error: 'Ce compte admin ne peut pas être consulté' });
        }
        const result = await pool.query(`
            SELECT 
                u.id, u.username, u.role, u.created_at, u.last_login, u.banned, u.reg_ip, u.plan, u.custom_quota,
                (SELECT COUNT(*) FROM search_history WHERE user_id = u.id) as search_count,
                (SELECT COUNT(*) FROM fiches WHERE user_id = u.id) as fiche_count,
                (SELECT COUNT(*) FROM graphes WHERE user_id = u.id) as graphe_count
            FROM users u
            WHERE u.id = $1
        `, [id]);
        if (result.rows.length === 0) return res.status(404).json({ error: 'Utilisateur non trouvé' });

        const ips = await pool.query('SELECT ip, created_at FROM ip_used WHERE user_id = $1', [id]);
        const searches = await pool.query(
            'SELECT id, query, results_count, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
            [id]
        );
        res.json({ user: result.rows[0], ips: ips.rows, recent_searches: searches.rows });
    } catch (error) {
        console.error('User detail error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/admin/users/:id/ban', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { banned } = req.body;
    try {
        const adminCheck = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        if (adminCheck.rows[0]?.username === process.env.ADMIN_USERNAME) {
            return res.status(403).json({ error: 'Ce compte admin ne peut pas être banni' });
        }
        await pool.query('UPDATE users SET banned = $1 WHERE id = $2', [banned, id]);
        res.json({ success: true, banned });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/admin/users/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const adminCheck = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        if (adminCheck.rows[0]?.username === process.env.ADMIN_USERNAME) {
            return res.status(403).json({ error: 'Ce compte admin ne peut pas être supprimé' });
        }
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/admin/users/:id/role', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { role } = req.body;
    try {
        const adminCheck = await pool.query('SELECT username FROM users WHERE id = $1', [id]);
        if (adminCheck.rows[0]?.username === process.env.ADMIN_USERNAME) {
            return res.status(403).json({ error: 'Le rôle de l\'admin principal ne peut pas être modifié' });
        }
        await pool.query('UPDATE users SET role = $1 WHERE id = $2', [role, id]);
        res.json({ success: true, role });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Attribuer un quota custom
app.post('/api/admin/users/:id/quota', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { custom_quota } = req.body;
    try {
        const quota = parseInt(custom_quota) || 0;
        await pool.query('UPDATE users SET custom_quota = $1 WHERE id = $2', [quota, id]);
        res.json({ success: true, custom_quota: quota });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/ips/:ip', authenticateToken, requireAdmin, async (req, res) => {
    const { ip } = req.params;
    try {
        const result = await pool.query(`
            SELECT u.id, u.username, u.role, u.created_at, u.banned
            FROM users u
            WHERE u.reg_ip = $1
        `, [ip]);
        res.json({ accounts: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/blocklist', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM blocklist ORDER BY created_at DESC');
        res.json({ blocklist: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/admin/blocklist', authenticateToken, requireAdmin, async (req, res) => {
    const { type, value, reason } = req.body;
    if (!type || !value) return res.status(400).json({ error: 'Type et valeur requis' });
    try {
        const result = await pool.query(
            'INSERT INTO blocklist (type, value, reason, created_by) VALUES ($1, $2, $3, $4) RETURNING *',
            [type, value, reason, req.user.id]
        );
        res.status(201).json({ success: true, entry: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.delete('/api/admin/blocklist/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM blocklist WHERE id = $1', [id]);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/tickets', authenticateToken, requireAdmin, async (req, res) => {
    const { status } = req.query;
    try {
        let query = `
            SELECT t.*, u.username as user_name 
            FROM tickets t 
            JOIN users u ON t.user_id = u.id
        `;
        const params = [];
        if (status) {
            query += ` WHERE t.status = $1`;
            params.push(status);
        }
        query += ` ORDER BY t.created_at DESC`;
        const result = await pool.query(query, params);
        res.json({ tickets: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/tickets/:id', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    try {
        const ticketResult = await pool.query(`
            SELECT t.*, u.username as user_name 
            FROM tickets t 
            JOIN users u ON t.user_id = u.id 
            WHERE t.id = $1
        `, [id]);
        if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket non trouvé' });

        const messages = await pool.query(`
            SELECT tm.*, u.username, u.role 
            FROM ticket_messages tm 
            JOIN users u ON tm.user_id = u.id 
            WHERE tm.ticket_id = $1 
            ORDER BY tm.created_at ASC
        `, [id]);
        res.json({ ticket: ticketResult.rows[0], messages: messages.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/admin/tickets/:id/reply', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    try {
        const ticketCheck = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
        if (ticketCheck.rows.length === 0) return res.status(404).json({ error: 'Ticket non trouvé' });
        if (ticketCheck.rows[0].status === 'closed') return res.status(400).json({ error: 'Ce ticket est fermé' });

        await pool.query(
            'INSERT INTO ticket_messages (ticket_id, user_id, message, is_admin) VALUES ($1, $2, $3, $4)',
            [id, req.user.id, message, true]
        );
        await pool.query(
            'UPDATE tickets SET status = $1, admin_id = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
            ['in_progress', req.user.id, id]
        );
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.patch('/api/admin/tickets/:id/status', authenticateToken, requireAdmin, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    const validStatus = ['open', 'in_progress', 'closed'];
    if (!validStatus.includes(status)) return res.status(400).json({ error: 'Statut invalide' });
    try {
        await pool.query(
            'UPDATE tickets SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
            [status, id]
        );
        res.json({ success: true, status });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/searches', authenticateToken, requireAdmin, async (req, res) => {
    const { page = 1, limit = 50 } = req.query;
    const offset = (page - 1) * limit;
    try {
        const result = await pool.query(`
            SELECT s.*, u.username 
            FROM search_history s 
            JOIN users u ON s.user_id = u.id 
            ORDER BY s.created_at DESC 
            LIMIT $1 OFFSET $2
        `, [limit, offset]);
        const count = await pool.query('SELECT COUNT(*) FROM search_history');
        res.json({
            searches: result.rows,
            total: parseInt(count.rows[0].count),
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/admin/maintenance/status', authenticateToken, requireAdmin, (req, res) => {
    res.json({
        enabled: process.env.MAINTENANCE === 'ON',
        message: 'Maintenance en cours',
        eta: 0
    });
});

// ============ API MAINTENANCE TOGGLE ============
app.get('/api/admin/api-maintenance', authenticateToken, requireAdmin, (req, res) => {
    res.json({
        enabled: process.env.API_MAINTENANCE === 'ON'
    });
});

app.post('/api/admin/api-maintenance', authenticateToken, requireAdmin, (req, res) => {
    const { enabled } = req.body;
    process.env.API_MAINTENANCE = enabled ? 'ON' : 'OFF';
    console.log(`🔒 API Maintenance: ${process.env.API_MAINTENANCE}`);
    res.json({ success: true, enabled: process.env.API_MAINTENANCE === 'ON' });
});

// ============================================
// 24. ROUTES TICKETS (USER)
// ============================================
app.post('/api/tickets', authenticateToken, async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) return res.status(400).json({ error: 'Sujet et message requis' });
    try {
        const result = await pool.query(
            'INSERT INTO tickets (user_id, subject, message) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, subject, message]
        );
        res.status(201).json({ success: true, ticket: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/tickets', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM tickets WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ tickets: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.get('/api/tickets/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const ticketResult = await pool.query(
            'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        if (ticketResult.rows.length === 0) return res.status(404).json({ error: 'Ticket non trouvé' });

        const messages = await pool.query(
            'SELECT * FROM ticket_messages WHERE ticket_id = $1 ORDER BY created_at ASC',
            [id]
        );
        res.json({ ticket: ticketResult.rows[0], messages: messages.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/tickets/:id/messages', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { message } = req.body;
    if (!message) return res.status(400).json({ error: 'Message requis' });
    try {
        const ticketCheck = await pool.query(
            'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        if (ticketCheck.rows.length === 0) return res.status(404).json({ error: 'Ticket non trouvé' });
        if (ticketCheck.rows[0].status === 'closed') return res.status(400).json({ error: 'Ce ticket est fermé' });

        const result = await pool.query(
            'INSERT INTO ticket_messages (ticket_id, user_id, message) VALUES ($1, $2, $3) RETURNING *',
            [id, req.user.id, message]
        );
        await pool.query(
            'UPDATE tickets SET updated_at = CURRENT_TIMESTAMP WHERE id = $1',
            [id]
        );
        res.status(201).json({ success: true, message: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// 25. ROUTES STATIQUES
// ============================================
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'login.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html')));
app.get('/cgu.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'cgu.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin.html')));
app.get('/tarifs.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'tarifs.html')));
app.get('/tarifs', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'tarifs.html')));

// ============================================
// 26. ROUTES API PUBLIQUE v1
// ============================================
const apiV1Routes = require('./routes/api-v1');
app.use('/api/v1', apiV1Routes);

// ============================================
// 27. CONFIG PUBLIQUE
// ============================================
app.get('/api/config', (req, res) => {
    res.json({
        devApi: process.env.DEV_API === 'ON',
        maintenance: process.env.MAINTENANCE === 'ON'
    });
});

// ============================================
// 28. HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// 29. HANDLER D'ERREURS GLOBAL
// ============================================
app.use((err, req, res, next) => {
    console.error('❌ Erreur middleware:', err.message);
    if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

process.on('uncaughtException', (err) => {
    console.error('❌ Exception non catchée:', err.message);
    console.error(err.stack);
});

process.on('unhandledRejection', (err) => {
    console.error('❌ Rejet non catché:', err);
});

// ============================================
// 30. DÉMARRAGE (après initDB)
// ============================================
(async () => {
    await initDB();
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`🚀 Marauder API running on port ${PORT}`);
    });
})();