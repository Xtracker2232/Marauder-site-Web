const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const { Pool } = require('pg');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 8080;

// ============ CHARGEMENT FORCÉ DES VARIABLES ============
if (!process.env.DATABASE_URL) {
    console.log('⚠️ DATABASE_URL manquant, définition manuelle...');
    process.env.DATABASE_URL = 'postgresql://postgres:gtGztIyjmvGHVYieqyDdPRyAkopTRhev@postgres.railway.internal:5432/railway';
}

if (!process.env.JWT_SECRET) {
    console.log('⚠️ JWT_SECRET manquant, définition manuelle...');
    process.env.JWT_SECRET = 'Marauder2026UltraSecureKey!@#$%^&*()';
}

if (!process.env.BRIX_API_KEY) {
    console.log('⚠️ BRIX_API_KEY manquant, définition manuelle...');
    process.env.BRIX_API_KEY = 'brix_Kvlxh9SqVL8bokxVb_SrD_WltbNCGbn9hMxan85R7TencJAw';
}

if (!process.env.ADMIN_USERNAME) {
    console.log('⚠️ ADMIN_USERNAME manquant, définition manuelle...');
    process.env.ADMIN_USERNAME = 'Admin';
}

if (!process.env.ADMIN_PASSWORD) {
    console.log('⚠️ ADMIN_PASSWORD manquant, définition manuelle...');
    process.env.ADMIN_PASSWORD = 'Salto06530';
}

console.log('🔍 Vérification des variables:');
console.log('- DATABASE_URL:', process.env.DATABASE_URL ? '✅' : '❌');
console.log('- JWT_SECRET:', process.env.JWT_SECRET ? '✅' : '❌');
console.log('- BRIX_API_KEY:', process.env.BRIX_API_KEY ? '✅' : '❌');
console.log('- ADMIN_USERNAME:', process.env.ADMIN_USERNAME ? '✅' : '❌');
console.log('- ADMIN_PASSWORD:', process.env.ADMIN_PASSWORD ? '✅' : '❌');

// ============ BASE DE DONNÉES ============
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
});

// ============ CRÉATION DES TABLES ============
const initDB = async () => {
    let client;
    try {
        client = await pool.connect();
        console.log('✅ Connexion DB établie');

        // Table users
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username VARCHAR(100) UNIQUE NOT NULL,
                password_hash VARCHAR(255) NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                last_login TIMESTAMP,
                is_active BOOLEAN DEFAULT true,
                role VARCHAR(50) DEFAULT 'user'
            )
        `);

        // Table search_history
        await client.query(`
            CREATE TABLE IF NOT EXISTS search_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                query JSONB NOT NULL,
                results_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table fiches
        await client.query(`
            CREATE TABLE IF NOT EXISTS fiches (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) NOT NULL,
                persons JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Table graphes
        await client.query(`
            CREATE TABLE IF NOT EXISTS graphes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                name VARCHAR(255) DEFAULT 'Mon graphe',
                nodes JSONB DEFAULT '[]',
                edges JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Indexes
        await client.query(`CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_fiches_user_id ON fiches(user_id)`);
        await client.query(`CREATE INDEX IF NOT EXISTS idx_graphes_user_id ON graphes(user_id)`);

        console.log('✅ Tables créées/vérifiées avec succès');

        // Créer le compte admin
        const result = await client.query('SELECT COUNT(*) FROM users WHERE username = $1', [process.env.ADMIN_USERNAME]);

        if (parseInt(result.rows[0].count) === 0) {
            const hashedPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD, 12);
            await client.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                [process.env.ADMIN_USERNAME, hashedPassword, 'admin']
            );
            console.log(`✅ Compte admin créé (${process.env.ADMIN_USERNAME})`);
        } else {
            console.log(`✅ Compte admin déjà existant (${process.env.ADMIN_USERNAME})`);
        }

        return true;
    } catch (error) {
        console.error('❌ Erreur init DB:', error.message);
        return false;
    } finally {
        if (client) client.release();
    }
};

// Initialiser la DB
let dbReady = false;
pool.connect(async (err, client, release) => {
    if (err) {
        console.error('❌ ÉCHEC connexion DB:', err.message);
    } else {
        console.log('✅ Connexion DB établie');
        release();
        dbReady = await initDB();
    }
});

// ============ MIDDLEWARE ============
app.use(cors({ origin: '*', credentials: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// ============ FAVICON ============
app.get('/favicon-32x32.png', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'favicon-32x32.png'));
});

// ============ AUTH ============
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

// Health check
app.get('/api/health', async (req, res) => {
    let dbStatus = 'unknown';
    try {
        await pool.query('SELECT 1');
        dbStatus = 'connected';
    } catch (error) {
        dbStatus = 'disconnected: ' + error.message;
    }
    res.json({
        status: 'operational',
        timestamp: new Date().toISOString(),
        database: dbStatus,
        db_ready: dbReady
    });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('📝 Login:', username);

    if (!username || !password) {
        return res.status(400).json({ error: 'Identifiants requis' });
    }

    try {
        const result = await pool.query(
            'SELECT * FROM users WHERE username = $1',
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
            { id: user.id, username: user.username, role: user.role },
            process.env.JWT_SECRET,
            { expiresIn: '24h' }
        );

        console.log('✅ Login réussi');
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    console.log('📝 Inscription:', username);

    if (!username || !password) {
        return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Mot de passe trop court (min 8 caractères)' });
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 12);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username',
            [username, hashedPassword]
        );

        console.log('✅ Inscription réussie');
        res.status(201).json({ success: true, user: result.rows[0] });

    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'Nom d\'utilisateur déjà utilisé' });
        }
        console.error('❌ Register error:', error.message);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Verify
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
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

        try {
            await pool.query(
                'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
                [req.user.id, req.body, response.data.data?.results?.length || 0]
            );
        } catch (dbError) {
            console.error('Erreur historique:', dbError.message);
        }

        res.json(response.data);

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
        const response = await axios.get(
            `https://api.brixhub.to/api/v1/lookup/${type}/${encodeURIComponent(value)}`,
            {
                headers: { 'X-API-Key': process.env.BRIX_API_KEY },
                timeout: 10000
            }
        );

        res.json(response.data);

    } catch (error) {
        console.error('Lookup error:', error.message);
        res.status(500).json({ error: 'Erreur de lookup' });
    }
});

// ============ HISTORIQUE ============

app.get('/api/history', authenticateToken, async (req, res) => {
    const { limit = 50, offset = 0 } = req.query;

    try {
        const result = await pool.query(
            'SELECT * FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3',
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

        res.json({
            results: response.data.data?.results || [],
            total: response.data.meta?.total || 0,
            took_ms: response.data.meta?.took_ms || 0
        });

    } catch (error) {
        console.error('Replay error:', error.message);
        res.status(500).json({ error: 'Erreur replay' });
    }
});

// ============ ROUTES FICHES ============

// Récupérer toutes les fiches
app.get('/api/fiches', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM fiches WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ fiches: result.rows });
    } catch (error) {
        console.error('❌ Erreur fiches GET:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Créer une fiche
app.post('/api/fiches', authenticateToken, async (req, res) => {
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Nom de fiche requis' });
    }

    try {
        const result = await pool.query(
            'INSERT INTO fiches (user_id, name, persons) VALUES ($1, $2, $3) RETURNING *',
            [req.user.id, name.trim(), JSON.stringify([])]
        );
        res.status(201).json({ fiche: result.rows[0] });
    } catch (error) {
        console.error('❌ Erreur création fiche:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Modifier une fiche
app.put('/api/fiches/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Nom de fiche requis' });
    }

    try {
        const result = await pool.query(
            'UPDATE fiches SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
            [name.trim(), id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }
        res.json({ fiche: result.rows[0] });
    } catch (error) {
        console.error('❌ Erreur modification fiche:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Ajouter une personne à une fiche
app.post('/api/fiches/:id/persons', authenticateToken, async (req, res) => {
    const { id } = req.params;
    const { person } = req.body;

    if (!person) {
        return res.status(400).json({ error: 'Personne requise' });
    }

    try {
        const ficheResult = await pool.query(
            'SELECT * FROM fiches WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (ficheResult.rows.length === 0) {
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }

        const fiche = ficheResult.rows[0];
        let persons = fiche.persons || [];

        if (persons.length >= 10) {
            return res.status(400).json({ error: 'Maximum 10 personnes par fiche' });
        }

        const exists = persons.some(p =>
            p.nom_famille === person.nom_famille &&
            p.prenom === person.prenom &&
            p.email === person.email
        );

        if (exists) {
            return res.status(400).json({ error: 'Cette personne est déjà dans la fiche' });
        }

        persons.push(person);

        const result = await pool.query(
            'UPDATE fiches SET persons = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
            [JSON.stringify(persons), id, req.user.id]
        );

        res.json({ fiche: result.rows[0] });
    } catch (error) {
        console.error('❌ Erreur ajout personne:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une personne d'une fiche
app.delete('/api/fiches/:id/persons/:personId', authenticateToken, async (req, res) => {
    const { id, personId } = req.params;

    try {
        const ficheResult = await pool.query(
            'SELECT * FROM fiches WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (ficheResult.rows.length === 0) {
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }

        const fiche = ficheResult.rows[0];
        let persons = fiche.persons || [];

        // Supprimer la personne par index (personId est l'index dans le tableau)
        const idx = parseInt(personId);
        if (idx >= 0 && idx < persons.length) {
            persons.splice(idx, 1);
        } else {
            return res.status(400).json({ error: 'Personne non trouvée' });
        }

        const result = await pool.query(
            'UPDATE fiches SET persons = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 AND user_id = $3 RETURNING *',
            [JSON.stringify(persons), id, req.user.id]
        );

        res.json({ fiche: result.rows[0] });
    } catch (error) {
        console.error('❌ Erreur suppression personne:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer une fiche
app.delete('/api/fiches/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM fiches WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }
        res.json({ message: 'Fiche supprimée' });
    } catch (error) {
        console.error('❌ Erreur suppression fiche:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer les personnes d'une fiche
app.get('/api/fiches/:id/persons', authenticateToken, async (req, res) => {
    const { id } = req.params;

    try {
        const result = await pool.query(
            'SELECT persons FROM fiches WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Fiche non trouvée' });
        }

        const persons = result.rows[0].persons || [];
        res.json(persons);
    } catch (error) {
        console.error('❌ Erreur récupération personnes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============ ROUTES GRAPHES ============

// Sauvegarder un graphe
app.post('/api/graphes', authenticateToken, async (req, res) => {
    const { name, nodes, edges } = req.body;

    try {
        // Supprimer l'ancien graphe de l'utilisateur
        await pool.query(
            'DELETE FROM graphes WHERE user_id = $1',
            [req.user.id]
        );

        const result = await pool.query(
            'INSERT INTO graphes (user_id, name, nodes, edges) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, name || 'Mon graphe', JSON.stringify(nodes || []), JSON.stringify(edges || [])]
        );
        res.status(201).json({ graphe: result.rows[0] });
    } catch (error) {
        console.error('❌ Erreur sauvegarde graphe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer le graphe d'un utilisateur
app.get('/api/graphes', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM graphes WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
            [req.user.id]
        );
        if (result.rows.length === 0) {
            return res.json({ graphe: null });
        }
        res.json({ graphe: result.rows[0] });
    } catch (error) {
        console.error('❌ Erreur récupération graphe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Récupérer TOUS les graphes sauvegardés
app.get('/api/graphes/all', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM graphes WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ graphes: result.rows });
    } catch (error) {
        console.error('❌ Erreur récupération graphes:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Charger un graphe spécifique
app.get('/api/graphes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM graphes WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Graphe non trouvé' });
        }
        res.json({ graphe: result.rows[0] });
    } catch (error) {
        console.error('❌ Erreur chargement graphe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Supprimer un graphe
app.delete('/api/graphes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM graphes WHERE id = $1 AND user_id = $2 RETURNING *',
            [id, req.user.id]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Graphe non trouvé' });
        }
        res.json({ message: 'Graphe supprimé' });
    } catch (error) {
        console.error('❌ Erreur suppression graphe:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============ PROFIL ============

app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, username, role, created_at, last_login FROM users WHERE id = $1',
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

// ============ ROUTES STATIQUES ============
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'index.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'login.html'));
});

app.get('/cgu.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'cgu.html'));
});

app.get('/dashboard.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html'));
});

// ============ DÉMARRAGE ============
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Marauder API running on port ${PORT}`);
    console.log(`📊 Dashboard: http://localhost:${PORT}`);
    console.log(`🔍 Health check: http://localhost:${PORT}/api/health`);
});