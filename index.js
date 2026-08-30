const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============ BASE DE DONNÉES (CORRIGÉE) ============
const pool = new Pool({
    connectionString: process.env.DATABASE_URL || `postgresql://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
});

// Initialisation de la DB avec meilleure gestion d'erreur
const initDB = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log('✅ Connexion DB établie');
        
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                role VARCHAR(50) DEFAULT 'user'
            );

            CREATE TABLE IF NOT EXISTS search_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                query JSONB NOT NULL,
                results_count INTEGER,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            );

            CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
            CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
            CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
        `);
        console.log('✅ Tables créées/vérifiées avec succès');
    } catch (error) {
        console.error('❌ Erreur DB:', error.message);
        console.error('📌 Vérifie que DATABASE_URL est configuré dans Railway');
        // Ne pas crash en production
    } finally {
        if (client) client.release();
    }
};

// Lancer l'init DB (non bloquant)
initDB();

// ============ MIDDLEWARE ============
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://marauder-site-web-production.up.railway.app'] 
        : ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
    credentials: true
}));
app.use(express.json());

// Servir les fichiers statiques depuis /frontend
app.use(express.static(path.join(__dirname, 'frontend')));

// ============ AUTHENTIFICATION ============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ error: 'Token manquant' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ error: 'Token invalide' });
        }
        req.user = user;
        next();
    });
};

// ============ ROUTES ============

// Health check (public)
app.get('/api/health', (req, res) => {
    res.json({ status: 'operational', timestamp: new Date().toISOString() });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ error: 'Identifiants requis' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1 OR email = $1',
            [username]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        const user = result.rows[0];
        const validPassword = await bcrypt.compare(password, user.password_hash);

        if (!validPassword) {
            return res.status(401).json({ error: 'Identifiants invalides' });
        }

        await pool.query(
            'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
            [user.id]
        );

        const token = jwt.sign(
            { id: user.id, username: user.username, email: user.email, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
                role: user.role
            }
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        
        const result = await pool.query(
            'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
            [username, email, hashedPassword]
        );

        res.status(201).json({
            success: true,
            user: result.rows[0]
        });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Nom d\'utilisateur ou email déjà utilisé' });
        }
        console.error('Register error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Verify token
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user 
    });
});

// ============ API BRIXHUB ============

app.post('/api/brix/search', authenticateToken, async (req, res) => {
    try {
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

        // Sauvegarde dans l'historique (si DB disponible)
        try {
            await pool.query(
                'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
                [req.user.id, req.body, response.data.data?.results?.length || 0]
            );
        } catch (dbError) {
            console.error('Erreur sauvegarde historique:', dbError.message);
        }

        res.json(response.data);

    } catch (error) {
        console.error('Brix search error:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Erreur de recherche' });
        }
    }
});

app.get('/api/brix/lookup/:type/:value', authenticateToken, async (req, res) => {
    const { type, value } = req.params;
    const validTypes = ['email', 'phone', 'iban'];

    if (!validTypes.includes(type)) {
        return res.status(400).json({ error: 'Type invalide' });
    }

    try {
        const response = await axios.get(
            `https://api.brixhub.to/api/v1/lookup/${type}/${encodeURIComponent(value)}`,
            {
                headers: { 'X-API-Key': process.env.BRIX_API_KEY },
                timeout: 10000
            }
        );

        res.json(response.data);

    } catch (error) {
        console.error('Brix lookup error:', error.message);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Erreur de lookup' });
        }
    }
});

// ============ HISTORIQUE ============

app.get('/api/history', authenticateToken, async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    try {
        const result = await pool.query(
            `SELECT * FROM search_history 
             WHERE user_id = $1 
             ORDER BY created_at DESC 
             LIMIT $2 OFFSET $3`,
            [req.user.id, limit, offset]
        );

        const count = await pool.query(
            'SELECT COUNT(*) FROM search_history WHERE user_id = $1',
            [req.user.id]
        );

        res.json({
            history: result.rows,
            total: parseInt(count.rows[0].count)
        });

    } catch (error) {
        console.error('History error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============ PROFIL ============

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        const stats = await pool.query(
            'SELECT COUNT(*) as total_searches FROM search_history WHERE user_id = $1',
            [req.user.id]
        );

        res.json({
            user: result.rows[0],
            stats: {
                total_searches: parseInt(stats.rows[0].total_searches)
            }
        });

    } catch (error) {
        console.error('Me error:', error);
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============ ROUTE PAR DÉFAUT ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// ============ DÉMARRAGE ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Marauder API running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
});