const express = require('express');
const cors = require('cors');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const fetch = require('node-fetch');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ============================================
// MIDDLEWARE
// ============================================
app.use(cors());
app.use(express.json());
app.use(express.static('frontend'));

// ============================================
// BASE DE DONNÉES
// ============================================
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

const JWT_SECRET = process.env.JWT_SECRET || 'marauder_secret_key_2026';
const BRIX_API_KEY = process.env.BRIX_API_KEY || '';
const BRIX_BASE = 'https://api.brixhub.to/api/v1';

// ============================================
// FONCTIONS UTILITAIRES
// ============================================
function generateToken(userId, role = 'user') {
    return jwt.sign({ id: userId, role }, JWT_SECRET, { expiresIn: '24h' });
}

function verifyToken(token) {
    try {
        return jwt.verify(token, JWT_SECRET);
    } catch (error) {
        return null;
    }
}

function formatPhone(phone) {
    if (!phone) return '';
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10) {
        return cleaned.replace(/(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/, '$1 $2 $3 $4 $5');
    }
    return phone;
}

// ============================================
// PIVOT FAMILLE
// ============================================
async function enrichirAvecPivotFamille(results) {
    if (!results || results.length === 0) return results;
    
    const enrichedResults = [];
    
    for (const person of results) {
        const enriched = { ...person };
        const famille = [];
        const pivotDone = new Set();
        const maxFamille = 10;
        
        // PIVOT 1 : ADRESSE + CODE POSTAL
        if (person.adresse && person.code_postal && famille.length < maxFamille) {
            const pivotKey = `adresse_${person.adresse}_${person.code_postal}`;
            if (!pivotDone.has(pivotKey)) {
                pivotDone.add(pivotKey);
                try {
                    const pivotPayload = {
                        adresse: person.adresse,
                        code_postal: person.code_postal,
                        flexible: false,
                        per_page: 20
                    };
                    
                    const pivotResponse = await fetch(`${BRIX_BASE}/search`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': BRIX_API_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(pivotPayload)
                    });
                    
                    const pivotData = await pivotResponse.json();
                    const pivotResults = pivotData.data?.results || [];
                    
                    for (const pr of pivotResults) {
                        if (famille.length >= maxFamille) break;
                        if (pr.nom_famille === person.nom_famille && pr.prenom === person.prenom) continue;
                        
                        const duplicate = famille.some(m => m.prenom === pr.prenom && m.nom_famille === pr.nom_famille);
                        if (duplicate) continue;
                        
                        famille.push({
                            prenom: pr.prenom || '',
                            nom_famille: pr.nom_famille || '',
                            date_naissance: pr.date_naissance || '',
                            email: pr.email || '',
                            telephone: pr.telephone || '',
                            adresse: pr.adresse || '',
                            code_postal: pr.code_postal || '',
                            ville: pr.ville || '',
                            lien: 'Même adresse',
                            _sources: pr._sources || []
                        });
                    }
                } catch (error) {
                    console.warn('Pivot adresse échoué:', error.message);
                }
            }
        }
        
        // PIVOT 2 : TÉLÉPHONE
        if (person.telephone && famille.length < maxFamille) {
            const phoneClean = person.telephone.replace(/\D/g, '');
            if (phoneClean.length >= 8) {
                const pivotKey = `tel_${phoneClean}`;
                if (!pivotDone.has(pivotKey)) {
                    pivotDone.add(pivotKey);
                    try {
                        const pivotPayload = {
                            telephone: phoneClean,
                            flexible: false,
                            per_page: 15
                        };
                        
                        const pivotResponse = await fetch(`${BRIX_BASE}/search`, {
                            method: 'POST',
                            headers: {
                                'X-API-Key': BRIX_API_KEY,
                                'Content-Type': 'application/json',
                                'Accept': 'application/json'
                            },
                            body: JSON.stringify(pivotPayload)
                        });
                        
                        const pivotData = await pivotResponse.json();
                        const pivotResults = pivotData.data?.results || [];
                        
                        for (const pr of pivotResults) {
                            if (famille.length >= maxFamille) break;
                            if (pr.nom_famille === person.nom_famille && pr.prenom === person.prenom) continue;
                            
                            const duplicate = famille.some(m => m.prenom === pr.prenom && m.nom_famille === pr.nom_famille);
                            if (duplicate) continue;
                            
                            famille.push({
                                prenom: pr.prenom || '',
                                nom_famille: pr.nom_famille || '',
                                date_naissance: pr.date_naissance || '',
                                email: pr.email || '',
                                telephone: pr.telephone || '',
                                adresse: pr.adresse || '',
                                code_postal: pr.code_postal || '',
                                ville: pr.ville || '',
                                lien: 'Téléphone partagé',
                                _sources: pr._sources || []
                            });
                        }
                    } catch (error) {
                        console.warn('Pivot téléphone échoué:', error.message);
                    }
                }
            }
        }
        
        // PIVOT 3 : EMAIL
        if (person.email && famille.length < maxFamille) {
            const pivotKey = `email_${person.email}`;
            if (!pivotDone.has(pivotKey)) {
                pivotDone.add(pivotKey);
                try {
                    const pivotPayload = {
                        email: person.email,
                        flexible: false,
                        per_page: 10
                    };
                    
                    const pivotResponse = await fetch(`${BRIX_BASE}/search`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': BRIX_API_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(pivotPayload)
                    });
                    
                    const pivotData = await pivotResponse.json();
                    const pivotResults = pivotData.data?.results || [];
                    
                    for (const pr of pivotResults) {
                        if (famille.length >= maxFamille) break;
                        if (pr.nom_famille === person.nom_famille && pr.prenom === person.prenom) continue;
                        
                        const duplicate = famille.some(m => m.prenom === pr.prenom && m.nom_famille === pr.nom_famille);
                        if (duplicate) continue;
                        
                        famille.push({
                            prenom: pr.prenom || '',
                            nom_famille: pr.nom_famille || '',
                            date_naissance: pr.date_naissance || '',
                            email: pr.email || '',
                            telephone: pr.telephone || '',
                            adresse: pr.adresse || '',
                            code_postal: pr.code_postal || '',
                            ville: pr.ville || '',
                            lien: 'Email partagé',
                            _sources: pr._sources || []
                        });
                    }
                } catch (error) {
                    console.warn('Pivot email échoué:', error.message);
                }
            }
        }
        
        // PIVOT 4 : VILLE + CODE POSTAL
        if (person.ville && person.code_postal && famille.length < maxFamille) {
            const pivotKey = `ville_${person.ville}_${person.code_postal}`;
            if (!pivotDone.has(pivotKey)) {
                pivotDone.add(pivotKey);
                try {
                    const pivotPayload = {
                        ville: person.ville,
                        code_postal: person.code_postal,
                        flexible: false,
                        per_page: 10
                    };
                    
                    const pivotResponse = await fetch(`${BRIX_BASE}/search`, {
                        method: 'POST',
                        headers: {
                            'X-API-Key': BRIX_API_KEY,
                            'Content-Type': 'application/json',
                            'Accept': 'application/json'
                        },
                        body: JSON.stringify(pivotPayload)
                    });
                    
                    const pivotData = await pivotResponse.json();
                    const pivotResults = pivotData.data?.results || [];
                    
                    for (const pr of pivotResults) {
                        if (famille.length >= maxFamille) break;
                        if (pr.nom_famille === person.nom_famille && pr.prenom === person.prenom) continue;
                        
                        const duplicate = famille.some(m => m.prenom === pr.prenom && m.nom_famille === pr.nom_famille);
                        if (duplicate) continue;
                        
                        famille.push({
                            prenom: pr.prenom || '',
                            nom_famille: pr.nom_famille || '',
                            date_naissance: pr.date_naissance || '',
                            email: pr.email || '',
                            telephone: pr.telephone || '',
                            adresse: pr.adresse || '',
                            code_postal: pr.code_postal || '',
                            ville: pr.ville || '',
                            lien: 'Même ville',
                            _sources: pr._sources || []
                        });
                    }
                } catch (error) {
                    console.warn('Pivot ville échoué:', error.message);
                }
            }
        }
        
        if (famille.length > 0) {
            enriched.famille = famille;
        }
        
        enrichedResults.push(enriched);
    }
    
    return enrichedResults;
}

// ============================================
// INIT DB
// ============================================
async function initDatabase() {
    const client = await pool.connect();
    try {
        await client.query(`
            CREATE TABLE IF NOT EXISTS users (
                id SERIAL PRIMARY KEY,
                username TEXT UNIQUE NOT NULL,
                password_hash TEXT NOT NULL,
                role TEXT DEFAULT 'user',
                created_at TIMESTAMP DEFAULT NOW(),
                last_login TIMESTAMP
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS search_history (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                query JSONB,
                results_count INTEGER DEFAULT 0,
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS fiches (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name TEXT NOT NULL,
                persons JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT NOW(),
                updated_at TIMESTAMP DEFAULT NOW()
            )
        `);
        await client.query(`
            CREATE TABLE IF NOT EXISTS graphes (
                id SERIAL PRIMARY KEY,
                user_id INTEGER REFERENCES users(id),
                name TEXT DEFAULT 'Mon graphe',
                nodes JSONB DEFAULT '[]',
                edges JSONB DEFAULT '[]',
                created_at TIMESTAMP DEFAULT NOW()
            )
        `);
        
        const adminCheck = await client.query('SELECT * FROM users WHERE username = $1', ['Admin']);
        if (adminCheck.rows.length === 0) {
            const hashedPassword = await bcrypt.hash('Salto06530', 10);
            await client.query(
                'INSERT INTO users (username, password_hash, role) VALUES ($1, $2, $3)',
                ['Admin', hashedPassword, 'admin']
            );
            console.log('✅ Compte admin créé');
        }
        
        console.log('✅ Base de données initialisée');
    } catch (error) {
        console.error('❌ Erreur DB:', error.message);
    } finally {
        client.release();
    }
}

initDatabase();

// ============================================
// MIDDLEWARE AUTH
// ============================================
async function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Token manquant' });
    }
    
    const token = authHeader.substring(7);
    const decoded = verifyToken(token);
    if (!decoded) {
        return res.status(401).json({ success: false, error: 'Token invalide' });
    }
    
    try {
        const result = await pool.query('SELECT * FROM users WHERE id = $1', [decoded.id]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Utilisateur introuvable' });
        }
        req.user = result.rows[0];
        next();
    } catch (error) {
        return res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
}

async function requireAdmin(req, res, next) {
    await authenticate(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ success: false, error: 'Accès refusé' });
        }
        next();
    });
}

// ============================================
// FONCTION APPEL BRIXHUB
// ============================================
async function callBrix(method, path, body = null) {
    const headers = {
        'X-API-Key': BRIX_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
    };
    
    const url = `${BRIX_BASE}${path}`;
    const options = {
        method,
        headers,
        timeout: 30000
    };
    
    if (body) {
        options.body = JSON.stringify(body);
    }
    
    try {
        const response = await fetch(url, options);
        const data = await response.json();
        return data;
    } catch (error) {
        console.error('BrixHub error:', error.message);
        throw new Error('Erreur API BrixHub');
    }
}

// ============================================
// ROUTES AUTH
// ============================================
app.post('/api/register', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Champs requis' });
        }
        
        if (username.length < 3) {
            return res.status(400).json({ success: false, error: 'Nom d\'utilisateur trop court' });
        }
        
        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Mot de passe trop court (8 caractères min)' });
        }
        
        const existing = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Nom d\'utilisateur déjà pris' });
        }
        
        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password_hash) VALUES ($1, $2) RETURNING id, username, role',
            [username, hashedPassword]
        );
        
        const user = result.rows[0];
        const token = generateToken(user.id, user.role);
        
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
        console.error('Register error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.post('/api/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        
        if (!username || !password) {
            return res.status(400).json({ success: false, error: 'Champs requis' });
        }
        
        const result = await pool.query('SELECT * FROM users WHERE username = $1', [username]);
        if (result.rows.length === 0) {
            return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
        }
        
        const user = result.rows[0];
        const valid = await bcrypt.compare(password, user.password_hash);
        if (!valid) {
            return res.status(401).json({ success: false, error: 'Identifiants incorrects' });
        }
        
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        
        const token = generateToken(user.id, user.role);
        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                role: user.role,
                created_at: user.created_at,
                last_login: user.last_login
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.get('/api/verify', authenticate, async (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            username: req.user.username,
            role: req.user.role,
            created_at: req.user.created_at,
            last_login: req.user.last_login
        }
    });
});

app.get('/api/me', authenticate, async (req, res) => {
    try {
        const searchesResult = await pool.query(
            'SELECT COUNT(*) as total FROM search_history WHERE user_id = $1',
            [req.user.id]
        );
        
        res.json({
            success: true,
            user: {
                id: req.user.id,
                username: req.user.username,
                role: req.user.role,
                created_at: req.user.created_at,
                last_login: req.user.last_login
            },
            stats: {
                total_searches: parseInt(searchesResult.rows[0]?.total || 0)
            }
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTES BRIXHUB
// ============================================
app.post('/api/brix/search', authenticate, async (req, res) => {
    try {
        const query = req.body;
        
        const hasCriteria = Object.keys(query).some(key => {
            return key !== 'flexible' && key !== 'per_page' && key !== 'page' && query[key];
        });
        
        if (!hasCriteria) {
            return res.status(400).json({ 
                success: false, 
                error: 'Veuillez remplir au moins un critère' 
            });
        }
        
        const result = await callBrix('POST', '/search', query);
        let results = result.data?.results || [];
        results = await enrichirAvecPivotFamille(results);
        
        await pool.query(
            'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
            [req.user.id, JSON.stringify(query), results.length]
        );
        
        res.json({
            success: true,
            data: {
                results,
                total: result.meta?.total || results.length,
                took_ms: result.meta?.took_ms || 0
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({ success: false, error: error.message || 'Erreur de recherche' });
    }
});

app.get('/api/brix/lookup/:type/:value', authenticate, async (req, res) => {
    try {
        const { type, value } = req.params;
        
        if (!value) {
            return res.status(400).json({ success: false, error: 'Valeur requise' });
        }
        
        let payload = {};
        
        switch(type) {
            case 'email':
                payload = { email: value, flexible: false, per_page: 20 };
                break;
            case 'phone':
                const phoneClean = value.replace(/\D/g, '');
                payload = { telephone: phoneClean, flexible: false, per_page: 20 };
                break;
            case 'iban':
                payload = { iban: value, flexible: false, per_page: 20 };
                break;
            default:
                return res.status(400).json({ success: false, error: 'Type non supporté' });
        }
        
        const result = await callBrix('POST', '/search', payload);
        let results = result.data?.results || [];
        results = await enrichirAvecPivotFamille(results);
        
        await pool.query(
            'INSERT INTO search_history (user_id, query, results_count) VALUES ($1, $2, $3)',
            [req.user.id, JSON.stringify({ lookup: value, type }), results.length]
        );
        
        res.json({
            success: true,
            data: {
                results,
                total: result.meta?.total || results.length
            }
        });
    } catch (error) {
        console.error('Lookup error:', error);
        res.status(500).json({ success: false, error: error.message || 'Erreur de lookup' });
    }
});

// ============================================
// ROUTES HISTORIQUE
// ============================================
app.get('/api/history', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, query, results_count, created_at FROM search_history WHERE user_id = $1 ORDER BY created_at DESC LIMIT 50',
            [req.user.id]
        );
        res.json({ history: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.post('/api/history/:id/replay', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const historyResult = await pool.query(
            'SELECT query FROM search_history WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        
        if (historyResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Recherche introuvable' });
        }
        
        const query = historyResult.rows[0].query;
        const result = await callBrix('POST', '/search', query);
        let results = result.data?.results || [];
        results = await enrichirAvecPivotFamille(results);
        
        res.json({
            success: true,
            results
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur de replay' });
    }
});

// ============================================
// ROUTES FICHES
// ============================================
app.get('/api/fiches', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM fiches WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ fiches: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.post('/api/fiches', authenticate, async (req, res) => {
    try {
        const { name } = req.body;
        
        if (!name) {
            return res.status(400).json({ success: false, error: 'Nom requis' });
        }
        
        const result = await pool.query(
            'INSERT INTO fiches (user_id, name) VALUES ($1, $2) RETURNING *',
            [req.user.id, name]
        );
        
        res.json({ success: true, fiche: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.put('/api/fiches/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        
        const result = await pool.query(
            'UPDATE fiches SET name = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
            [name, id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fiche introuvable' });
        }
        
        res.json({ success: true, fiche: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.delete('/api/fiches/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM fiches WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fiche introuvable' });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.post('/api/fiches/:id/persons', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { person } = req.body;
        
        if (!person) {
            return res.status(400).json({ success: false, error: 'Personne requise' });
        }
        
        const ficheResult = await pool.query(
            'SELECT * FROM fiches WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        
        if (ficheResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Fiche introuvable' });
        }
        
        const fiche = ficheResult.rows[0];
        let persons = fiche.persons || [];
        
        if (persons.length >= 10) {
            return res.status(400).json({ success: false, error: 'Maximum 10 personnes par fiche' });
        }
        
        const exists = persons.some(p => 
            p.prenom === person.prenom && 
            p.nom_famille === person.nom_famille
        );
        
        if (exists) {
            return res.status(400).json({ success: false, error: 'Personne déjà dans la fiche' });
        }
        
        persons.push(person);
        
        const result = await pool.query(
            'UPDATE fiches SET persons = $1, updated_at = NOW() WHERE id = $2 AND user_id = $3 RETURNING *',
            [JSON.stringify(persons), id, req.user.id]
        );
        
        res.json({ success: true, fiche: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTES GRAPHES
// ============================================
app.get('/api/graphes/all', authenticate, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT * FROM graphes WHERE user_id = $1 ORDER BY created_at DESC',
            [req.user.id]
        );
        res.json({ graphes: result.rows });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.get('/api/graphes/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const result = await pool.query(
            'SELECT * FROM graphes WHERE id = $1 AND user_id = $2',
            [id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Graphe introuvable' });
        }
        
        res.json({ graphe: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.post('/api/graphes', authenticate, async (req, res) => {
    try {
        const { name, nodes, edges } = req.body;
        
        const result = await pool.query(
            'INSERT INTO graphes (user_id, name, nodes, edges) VALUES ($1, $2, $3, $4) RETURNING *',
            [req.user.id, name || 'Mon graphe', JSON.stringify(nodes || []), JSON.stringify(edges || [])]
        );
        
        res.json({ success: true, graphe: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.put('/api/graphes/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        const { name, nodes, edges } = req.body;
        
        const result = await pool.query(
            'UPDATE graphes SET name = $1, nodes = $2, edges = $3 WHERE id = $4 AND user_id = $5 RETURNING *',
            [name || 'Mon graphe', JSON.stringify(nodes || []), JSON.stringify(edges || []), id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Graphe introuvable' });
        }
        
        res.json({ success: true, graphe: result.rows[0] });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

app.delete('/api/graphes/:id', authenticate, async (req, res) => {
    try {
        const { id } = req.params;
        
        const result = await pool.query(
            'DELETE FROM graphes WHERE id = $1 AND user_id = $2 RETURNING id',
            [id, req.user.id]
        );
        
        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Graphe introuvable' });
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// ============================================
// ROUTES ADMIN
// ============================================
app.get('/api/admin/stats', requireAdmin, async (req, res) => {
    try {
        const usersResult = await pool.query('SELECT COUNT(*) as total FROM users');
        const searchesResult = await pool.query('SELECT COUNT(*) as total FROM search_history');
        const fichesResult = await pool.query('SELECT COUNT(*) as total FROM fiches');
        
        res.json({
            total_users: parseInt(usersResult.rows[0]?.total || 0),
            total_searches: parseInt(searchesResult.rows[0]?.total || 0),
            total_fiches: parseInt(fichesResult.rows[0]?.total || 0)
        });
    } catch (error) {
        res.status(500).json({ success: false, error: 'Erreur serveur' });
    }
});

// ============================================
// HEALTH CHECK
// ============================================
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ============================================
// DÉMARRAGE
// ============================================
app.listen(PORT, () => {
    console.log(`🚀 Serveur Marauder démarré sur le port ${PORT}`);
    console.log(`🔗 http://localhost:${PORT}`);
});