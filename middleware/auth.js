const jwt = require('jsonwebtoken');
const { Pool } = require('pg');

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
});

// ============================================
// AUTHENTIFICATION JWT
// ============================================
const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'Token manquant' });
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const result = await pool.query(
            'SELECT id, username, role, banned, plan, stripe_customer_id FROM users WHERE id = $1',
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
            stripe_customer_id: result.rows[0].stripe_customer_id
        };
        next();
    } catch (error) {
        if (error.name === 'JsonWebTokenError') {
            return res.status(403).json({ error: 'Token invalide' });
        }
        return res.status(500).json({ error: 'Erreur serveur' });
    }
};

// ============================================
// ADMIN ONLY
// ============================================
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
// PLAN MINIMUM REQUIS
// ============================================
const PLAN_LEVELS = { free: 0, starter: 1, pro: 2, enterprise: 3 };

const requirePlan = (minPlan) => {
    return async (req, res, next) => {
        try {
            const result = await pool.query('SELECT plan FROM users WHERE id = $1', [req.user.id]);
            if (result.rows.length === 0) {
                return res.status(401).json({ error: 'Utilisateur introuvable' });
            }
            const userPlan = result.rows[0].plan || 'free';
            const userLevel = PLAN_LEVELS[userPlan] ?? 0;
            const requiredLevel = PLAN_LEVELS[minPlan] ?? 0;

            if (userLevel < requiredLevel) {
                return res.status(403).json({
                    error: `Cette fonctionnalité nécessite le plan ${minPlan} ou supérieur`,
                    currentPlan: userPlan,
                    requiredPlan: minPlan
                });
            }
            req.user.plan = userPlan;
            next();
        } catch (error) {
            res.status(500).json({ error: 'Erreur serveur' });
        }
    };
};

module.exports = { authenticateToken, requireAdmin, requirePlan, pool };