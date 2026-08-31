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

// ============ FORCER LES VARIABLES ============
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:gtGztIyjmvGHVYieqyDdPRyAkopTRhev@postgres.railway.internal:5432/railway';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'Marauder2026UltraSecureKey!@#$%^&*()';
process.env.BRIX_API_KEY = process.env.BRIX_API_KEY || 'brix_Kvlxh9SqVL8bokxVb_SrD_WltbNCGbn9hMxan85R7TencJAw';
process.env.ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'Admin';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Salto06530';

console.log('🔍 DATABASE_URL:', process.env.DATABASE_URL ? '✅' : '❌');
console.log('🔍 JWT_SECRET:', process.env.JWT_SECRET ? '✅' : '❌');

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
                role VARCHAR(50) DEFAULT 'user'
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
            CREATE TABLE IF NOT EXISTS search_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
                query JSONB NOT NULL,
                results_count INTEGER DEFAULT 0,
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
        }
    } finally {
        client.release();
    }
};
initDB();

// ============ MIDDLEWARE ============
app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'frontend')));

// ============ AUTH ============
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) return res.status(403).json({ error: 'Token invalide' });
        req.user = user;
        next();
    });
};

// ============ ROUTES ============

// Test
app.get('/api/test', authenticateToken, (req, res) => {
    res.json({ message: 'API OK', user: req.user });
});

// Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) return res.status(401).json({ error: 'Identifiants invalides' });
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) return res.status(401).json({ error: 'Identifiants invalides' });
        const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.json({ success: true, token, user: { id: user.id, username: user.username, role: user.role } });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Register
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;
    if (!username || !password || password.length < 8) {
        return res.status(400).json({ error: 'Nom ou mot de passe invalide' });
    }
    try {
        const hashed = await bcrypt.hash(password, 12);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
            [username, hashed]
        );
        res.status(201).json({ success: true, user: result.rows[0] });
    } catch (error) {
        if (error.code === '23505') return res.status(400).json({ error: 'Nom déjà utilisé' });
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// Verify
app.get('/api/verify', authenticateToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

// ============ FICHES ============
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

// ============ GRAPHES ============
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
        res.status(500).json({ error: 'Erreur' });
    }
});

app.get('/api/graphes/all', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT * FROM graphes WHERE user_id = $1 ORDER BY created_at DESC', [req.user.id]);
        res.json({ graphes: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

app.delete('/api/graphes/:id', authenticateToken, async (req, res) => {
    const { id } = req.params;
    try {
        await pool.query('DELETE FROM graphes WHERE id = $1 AND user_id = $2', [id, req.user.id]);
        res.json({ message: 'Supprimé' });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============ PROFIL ============
app.get('/api/me', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, created_at, last_login FROM users WHERE id = $1', [req.user.id]);
        res.json({ user: result.rows[0] });
    } catch (error) {
        res.status(500).json({ error: 'Erreur' });
    }
});

// ============ STATIQUES ============
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'login.html')));
app.get('/dashboard.html', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'dashboard.html')));

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Marauder API running on port ${PORT}`);
});