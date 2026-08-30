const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const pool = require('./db');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
    origin: process.env.NODE_ENV === 'production' 
        ? ['https://votre-domaine.com'] 
        : ['http://localhost:5500', 'http://127.0.0.1:5500'],
    credentials: true
}));
app.use(express.json());
app.use(express.static('../frontend'));

// ============ AUTHENTIFICATION ============

// Middleware JWT
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

// Route de login
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

        // Mise à jour last_login
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

// Route d'inscription (pour créer ton premier compte)
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

// Route de vérification du token
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ 
        valid: true, 
        user: req.user 
    });
});

// ============ API BRIXHUB ============

// Route de recherche
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

        // Sauvegarde de la recherche
        await pool.query(
            'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
            [req.user.id, req.body, response.data.data?.results?.length || 0]
        );

        res.json(response.data);

    } catch (error) {
        console.error('Brix search error:', error);
        if (error.response) {
            res.status(error.response.status).json(error.response.data);
        } else {
            res.status(500).json({ error: 'Erreur de recherche' });
        }
    }
});

// Route lookup
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
        console.error('Brix lookup error:', error);
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

// ============ UTILISATEUR ============

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
            [req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Utilisateur non trouvé' });
        }

        // Statistiques
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

app.listen(PORT, () => {
    console.log(`🚀 Marauder API running on port ${PORT}`);
});