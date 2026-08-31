const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Pool } = require('pg');
const path = require('path');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// ============ VÉRIFICATION DES VARIABLES ============
if (!process.env.DATABASE_URL) {
    console.error('❌ DATABASE_URL non défini');
    process.exit(1);
}
if (!process.env.JWT_SECRET) {
    console.error('❌ JWT_SECRET non défini');
    process.exit(1);
}
if (!process.env.BRIX_API_KEY) {
    console.error('❌ BRIX_API_KEY non défini');
    process.exit(1);
}
if (!process.env.ADMIN_USERNAME) {
    console.error('❌ ADMIN_USERNAME non défini');
    process.exit(1);
}
if (!process.env.ADMIN_PASSWORD) {
    console.error('❌ ADMIN_PASSWORD non défini');
    process.exit(1);
}

console.log('✅ Toutes les variables d\'environnement sont définies');

// ============ BASE DE DONNÉES ============
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ============ CRÉATION DES TABLES ============
const initDB = async () => {
    const client = await pool.connect();
    try {
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

        const result = await client.query('SELECT COUNT(*) FROM users WHERE username = $1', [process.env.ADMIN_USERNAME]);
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
initDB();

// ============ BLOCKLIST HELPER ============
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
    
    const fieldsToCheck = ['nom_famille', 'prenom', 'email', 'telephone', 'adresse', 'ville', 'code_postal', 'nom_utilisateur', 'adresse_ip', 'steam_id', 'discord_id', 'nir', 'iban', 'nom_naissance', 'nom_affichage', 'societe', 'profession', 'fonction', 'siret', 'siren', 'bic', 'vin_plaque'];
    
    for (let entry of blocklist) {
        const fieldValue = person[entry.type];
        if (fieldValue) {
            if (fieldValue.toLowerCase().includes(entry.value.toLowerCase())) {
                console.log(`🚫 Bloqué: ${entry.type}=${entry.value} trouvé dans ${fieldValue}`);
                return true;
            }
        }
    }
    return false;
}

// ============ MIDDLEWARE ============
const allowedOrigins = [
    'https://marauder-site-web-production.up.railway.app',
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

app.use(express.json());
app.set('trust proxy', 1);
app.use(express.static(path.join(__dirname, 'frontend')));

// ============ RATE LIMITING ============
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: 'Trop de requêtes, réessayez plus tard'
});

const loginLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: 'Trop de tentatives de connexion, réessayez dans 15 minutes'
});

app.use('/api/', limiter);

// ============ AUTH ============
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query('SELECT banned FROM users WHERE id = $1', [decoded.id]);
        
        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Utilisateur introuvable' });
        }
        
        if (result.rows[0].banned) {
            return res.status(403).json({ error: 'Ce compte a été banni' });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token invalide' });
        }
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

// ============ ROUTES AUTH ============
app.post('/api/login', loginLimiter, async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Identifiants invalides' });
        const user = result.rows[0];
        
        if (user.banned) {
            return res.status(403).json({ error: 'Ce compte a été banni' });
        }
        
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
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

app.post('/api/register',
    body('username').isLength({ min: 3 }).trim().escape(),
    body('password').isLength({ min: 8 }),
    async (req, res) => {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ errors: errors.array() });
        }
        const { username, password } = req.body;
        try {
            const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress || 'unknown';
            const hashed = await bcrypt.hash(password, 12);
            const result = await pool.query(
                'INSERT INTO users (username, password_hash, reg_ip) VALUES ($1, $2, $3) RETURNING id, username, role',
                [username, hashed, ip]
            );
            await pool.query('INSERT INTO ip_used (ip, user_id) VALUES ($1, $2) ON CONFLICT (ip) DO NOTHING', [ip, result.rows[0].id]);
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

// ============ ROUTES BRIXHUB AVEC BLOCKLIST ============
app.post('/api/brix/search', authenticateToken, async (req, res) => {
    try {
        // Récupérer la blocklist
        const blocklist = await getBlocklist();
        
        // Faire la recherche BrixHub
        const response = await axios.post(
            'https://api.brixhub.to/api/v1/search',
            req.body,
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

        // Filtrer selon la blocklist
        if (blocklist.length > 0 && results.length > 0) {
            results = results.filter(person => !isBlocked(person, blocklist));
            console.log(`🔍 Blocklist: ${totalBeforeFilter} résultats → ${results.length} après filtrage`);
        }

        // Sauvegarder dans l'historique
        try {
            await pool.query(
                'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
                [req.user.id, req.body, results.length]
            );
        } catch (dbError) {
            console.error('Erreur historique:', dbError.message);
        }

        // Retourner les résultats filtrés
        res.json({
            data: { results: results },
            meta: { 
                total: results.length, 
                filtered: totalBeforeFilter !== results.length,
                total_before_filter: totalBeforeFilter,
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
        
        res.json({
            data: { results: results },
            meta: { filtered: true }
        });
    } catch (error) {
        console.error('Lookup error:', error.message);
        res.status(500).json({ error: 'Erreur de lookup' });
    }
});

// ============ ROUTES HISTORIQUE ============
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
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recherche non trouvée' });
        }
        let query = result.rows[0].query;
        if (typeof query === 'string') {
            query = JSON.parse(query);
        }
        query.per_page = 100;
        
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

// ============ ROUTES FICHES ============
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
        let persons = fiche.rows[0].persons || [];
        if (persons.length >= 10) return res.status(400).json({ error: 'Max 10 personnes' });
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

// ============ ROUTES GRAPHES ============
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

// ============ ROUTES PROFIL ============
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, created_at, last_login FROM users WHERE id = $1', [req.user.id]);
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============ ROUTES ADMIN ============

app.get('/api/admin/check', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role FROM users WHERE id = $1',
            [req.user.id]
        );
        const isProtected = result.rows[0]?.username === process.env.ADMIN_USERNAME;
        res.json({
            isAdmin: true,
            isProtected: isProtected,
            user: result.rows[0]
        });
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
                u.id, u.username, u.role, u.created_at, u.last_login, u.banned, u.reg_ip,
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
                u.id, u.username, u.role, u.created_at, u.last_login, u.banned, u.reg_ip,
                (SELECT COUNT(*) FROM search_history WHERE user_id = u.id) as search_count,
                (SELECT COUNT(*) FROM fiches WHERE user_id = u.id) as fiche_count,
                (SELECT COUNT(*) FROM graphes WHERE user_id = u.id) as graphe_count
            FROM users u
            WHERE u.id = $1
        `, [id]);
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }
        const ips = await pool.query('SELECT ip, created_at FROM ip_used WHERE user_id = $1', [id]);
        const searches = await pool.query(
            'SELECT id, query, results_count, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 10',
            [id]
        );
        res.json({
            user: result.rows[0],
            ips: ips.rows,
            recent_searches: searches.rows
        });
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
    if (!type || !value) {
        return res.status(400).json({ error: 'Type et valeur requis' });
    }
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
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket non trouvé' });
        }
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
    if (!message) {
        return res.status(400).json({ error: 'Message requis' });
    }
    try {
        const ticketCheck = await pool.query('SELECT * FROM tickets WHERE id = $1', [id]);
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket non trouvé' });
        }
        if (ticketCheck.rows[0].status === 'closed') {
            return res.status(400).json({ error: 'Ce ticket est fermé' });
        }
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
    if (!validStatus.includes(status)) {
        return res.status(400).json({ error: 'Statut invalide' });
    }
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

// ============ ROUTES TICKETS (USER) ============
app.post('/api/tickets', authenticateToken, async (req, res) => {
    const { subject, message } = req.body;
    if (!subject || !message) {
        return res.status(400).json({ error: 'Sujet et message requis' });
    }
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
        if (ticketResult.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket non trouvé' });
        }
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
    if (!message) {
        return res.status(400).json({ error: 'Message requis' });
    }
    try {
        const ticketCheck = await pool.query(
            'SELECT * FROM tickets WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        if (ticketCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Ticket non trouvé' });
        }
        if (ticketCheck.rows[0].status === 'closed') {
            return res.status(400).json({ error: 'Ce ticket est fermé' });
        }
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

// ============ ROUTES STATIQUES ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'login.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html')));
app.get('/cgu.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'cgu.html')));
app.get('/admin.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'admin.html')));

// ============ HEALTH CHECK ============
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============ DÉMARRAGE ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Marauder API running on port ${PORT}`);
});