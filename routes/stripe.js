const express = require('express');
const router = express.Router();
const stripeService = require('../services/stripe');
const { authenticateToken, pool } = require('../middleware/auth');
const emailService = require('../services/email');

// ============================================
// CRÉER UNE SESSION CHECKOUT
// ============================================
router.post('/create-checkout', authenticateToken, async (req, res) => {
    if (!req.body || typeof req.body !== 'object') {
        return res.status(400).json({ error: 'Body JSON manquant ou invalide' });
    }

    const { plan } = req.body;
    const userId = req.user.id;

    if (!['starter', 'pro'].includes(plan)) {
        return res.status(400).json({ error: 'Plan invalide' });
    }

    const baseUrl = process.env.NODE_ENV === 'production'
        ? 'https://marauder.host'
        : 'http://localhost:8080';

    const result = await stripeService.createCheckoutSession(
        userId,
        plan,
        `${baseUrl}/dashboard.html?payment=success&plan=${plan}`,
        `${baseUrl}/tarifs.html?payment=cancel`
    );

    if (result.success) {
        res.json({ url: result.url });
    } else {
        res.status(500).json({ error: result.error });
    }
});

// ============================================
// CRÉER UNE SESSION BILLING PORTAL
// ============================================
router.post('/create-portal', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT stripe_customer_id FROM users WHERE id = $1',
            [req.user.id]
        );

        if (!result.rows[0]?.stripe_customer_id) {
            return res.status(400).json({ error: 'Aucun abonnement actif' });
        }

        const baseUrl = process.env.NODE_ENV === 'production'
            ? 'https://marauder.host'
            : 'http://localhost:8080';

        const session = await stripeService.createPortalSession(
            result.rows[0].stripe_customer_id,
            `${baseUrl}/dashboard.html`
        );

        if (session.success) {
            res.json({ url: session.url });
        } else {
            res.status(500).json({ error: session.error });
        }
    } catch (error) {
        console.error('Portal error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// VÉRIFIER LE STATUT D'ABONNEMENT
// ============================================
router.get('/status', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT plan, stripe_customer_id, subscription_status, plan_expires_at FROM users WHERE id = $1',
            [req.user.id]
        );

        const user = result.rows[0];
        if (!user || !user.stripe_customer_id) {
            return res.json({
                plan: 'free',
                active: false,
                limits: stripeService.PLANS.free.limits
            });
        }

        const subResult = await stripeService.getSubscription(user.stripe_customer_id);

        if (subResult.success && subResult.subscription) {
            const sub = subResult.subscription;
            res.json({
                plan: user.plan || 'free',
                active: sub.status === 'active' || sub.status === 'trialing',
                status: sub.status,
                currentPeriodEnd: sub.current_period_end,
                cancelAtPeriodEnd: sub.cancel_at_period_end,
                subscriptionId: sub.id,
                limits: stripeService.PLANS[user.plan || 'free'].limits
            });
        } else {
            res.json({
                plan: user.plan || 'free',
                active: false,
                status: user.subscription_status || 'inactive',
                limits: stripeService.PLANS[user.plan || 'free'].limits
            });
        }
    } catch (error) {
        console.error('Status error:', error);
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// HISTORIQUE DES PAIEMENTS
// ============================================
router.get('/payments', authenticateToken, async (req, res) => {
    try {
        const result = await pool.query(
            'SELECT id, amount, currency, status, created_at FROM payments WHERE user_id = $1 ORDER BY created_at DESC LIMIT 20',
            [req.user.id]
        );
        res.json({ payments: result.rows });
    } catch (error) {
        res.status(500).json({ error: 'Erreur serveur' });
    }
});

// ============================================
// WEBHOOK STRIPE
// ⚠️ type: '*/*' pour capturer TOUS les Content-Type
// ============================================
router.post('/webhook', express.raw({ type: '*/*' }), async (req, res) => {
    const signature = req.headers['stripe-signature'];

    console.log('=== WEBHOOK REÇU ===');
    console.log('Signature présente:', signature ? 'OUI' : 'NON');
    console.log('Body est Buffer:', Buffer.isBuffer(req.body));
    console.log('Body type:', typeof req.body);
    console.log('whsec env:', (process.env.STRIPE_WEBHOOK_SECRET || 'NON DÉFINI').substring(0, 20) + '...');
    console.log('===================');

    let event;
    try {
        event = stripeService.constructWebhookEvent(req.body, signature);
    } catch (err) {
        console.error('❌ Webhook signature verification failed:', err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`📩 Webhook reçu: ${event.type}`);

    try {
        switch (event.type) {

            // ============================================
            // PAIEMENT RÉUSSI
            // ============================================
            case 'checkout.session.completed': {
                const session = event.data.object;
                const userId = session.client_reference_id;
                const customerId = session.customer;
                const subscriptionId = session.subscription;
                const plan = session.metadata?.plan || 'starter';

                console.log(`✅ Paiement réussi: user=${userId}, plan=${plan}, customer=${customerId}`);

                const subscription = await stripeService.stripe.subscriptions.retrieve(subscriptionId);

                await pool.query(
                    `UPDATE users 
                     SET stripe_customer_id = $1, 
                         plan = $2, 
                         subscription_status = $3,
                         plan_expires_at = to_timestamp($4)
                     WHERE id = $5`,
                    [customerId, plan, subscription.status, subscription.current_period_end, userId]
                );

                await pool.query(
                    `INSERT INTO subscriptions 
                     (user_id, stripe_subscription_id, stripe_customer_id, stripe_price_id, status, plan, current_period_start, current_period_end, cancel_at_period_end)
                     VALUES ($1, $2, $3, $4, $5, $6, to_timestamp($7), to_timestamp($8), $9)
                     ON CONFLICT (stripe_subscription_id) DO UPDATE SET
                        status = EXCLUDED.status,
                        plan = EXCLUDED.plan,
                        current_period_start = EXCLUDED.current_period_start,
                        current_period_end = EXCLUDED.current_period_end,
                        cancel_at_period_end = EXCLUDED.cancel_at_period_end,
                        updated_at = CURRENT_TIMESTAMP`,
                    [
                        userId,
                        subscriptionId,
                        customerId,
                        subscription.items.data[0].price.id,
                        subscription.status,
                        plan,
                        subscription.current_period_start,
                        subscription.current_period_end,
                        subscription.cancel_at_period_end
                    ]
                );

                console.log(`💾 DB mise à jour pour user ${userId} → plan ${plan}`);

                // ============================================
                // 📧 ENVOI DE L'EMAIL DE CONFIRMATION
                // ============================================
                try {
                    const customerEmail = session.customer_details?.email || session.customer_email;
                    const amountTotal = (session.amount_total || 0) / 100;
                    const currency = (session.currency || 'eur').toUpperCase();
                    const orderNumber = `STRIPE-${session.id.slice(-8).toUpperCase()}`;

                    if (customerEmail) {
                        const emailResult = await emailService.sendReceiptEmail({
                            order_number: orderNumber,
                            plan: plan.toUpperCase(),
                            pay_amount: amountTotal.toFixed(2),
                            pay_currency: currency,
                            price_amount: amountTotal.toFixed(2),
                            price_currency: currency,
                            pay_address: 'Carte bancaire via Stripe',
                            created_at: new Date().toLocaleString('fr-FR'),
                            email: customerEmail
                        });

                        if (emailResult.success) {
                            console.log(`📧 Email de confirmation envoyé à ${customerEmail} (${orderNumber})`);
                        } else {
                            console.error(`❌ Échec envoi email à ${customerEmail}:`, emailResult.error);
                        }
                    } else {
                        console.log('⚠️ Pas d\'email client dans la session Stripe — email non envoyé');
                    }
                } catch (emailErr) {
                    console.error('❌ Erreur envoi email Stripe:', emailErr.message);
                }

                break;
            }

            // ============================================
            // ABONNEMENT MIS À JOUR
            // ============================================
            case 'customer.subscription.updated': {
                const sub = event.data.object;
                const customerId = sub.customer;

                console.log(`🔄 Abonnement mis à jour: ${sub.id}, status=${sub.status}`);

                let plan = 'free';
                if (sub.items.data[0].price.id === process.env.STRIPE_PRICE_PRO) plan = 'pro';
                else if (sub.items.data[0].price.id === process.env.STRIPE_PRICE_STARTER) plan = 'starter';

                if (sub.status !== 'active' && sub.status !== 'trialing') {
                    plan = 'free';
                }

                await pool.query(
                    `UPDATE users 
                     SET plan = $1, 
                         subscription_status = $2,
                         plan_expires_at = to_timestamp($3)
                     WHERE stripe_customer_id = $4`,
                    [plan, sub.status, sub.current_period_end, customerId]
                );

                await pool.query(
                    `UPDATE subscriptions 
                     SET status = $1, 
                         plan = $2,
                         current_period_start = to_timestamp($3),
                         current_period_end = to_timestamp($4),
                         cancel_at_period_end = $5,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE stripe_subscription_id = $6`,
                    [
                        sub.status,
                        plan,
                        sub.current_period_start,
                        sub.current_period_end,
                        sub.cancel_at_period_end,
                        sub.id
                    ]
                );

                console.log(`💾 DB mise à jour: ${customerId} → plan ${plan}, status ${sub.status}`);
                break;
            }

            // ============================================
            // ABONNEMENT ANNULÉ
            // ============================================
            case 'customer.subscription.deleted': {
                const sub = event.data.object;
                const customerId = sub.customer;

                console.log(`❌ Abonnement annulé: ${sub.id}`);

                await pool.query(
                    `UPDATE users 
                     SET plan = 'free', 
                         subscription_status = 'canceled',
                         plan_expires_at = NULL
                     WHERE stripe_customer_id = $1`,
                    [customerId]
                );

                await pool.query(
                    `UPDATE subscriptions 
                     SET status = 'canceled', 
                         plan = 'free',
                         updated_at = CURRENT_TIMESTAMP
                     WHERE stripe_subscription_id = $1`,
                    [sub.id]
                );

                console.log(`💾 User ${customerId} → downgrade vers free`);
                break;
            }

            // ============================================
            // PAIEMENT ÉCHOUÉ
            // ============================================
            case 'invoice.payment_failed': {
                const invoice = event.data.object;
                const customerId = invoice.customer;

                console.log(`⚠️ Paiement échoué: ${invoice.id} pour ${customerId}`);

                await pool.query(
                    `UPDATE users SET subscription_status = 'past_due' WHERE stripe_customer_id = $1`,
                    [customerId]
                );
                break;
            }

            // ============================================
            // PAIEMENT RÉUSSI (facture payée)
            // ============================================
            case 'invoice.paid': {
                const invoice = event.data.object;
                const customerId = invoice.customer;

                const userResult = await pool.query(
                    'SELECT id FROM users WHERE stripe_customer_id = $1',
                    [customerId]
                );

                if (userResult.rows.length > 0) {
                    const userId = userResult.rows[0].id;

                    await pool.query(
                        `INSERT INTO payments (user_id, stripe_payment_intent_id, stripe_invoice_id, amount, currency, status)
                         VALUES ($1, $2, $3, $4, $5, $6)`,
                        [
                            userId,
                            invoice.payment_intent,
                            invoice.id,
                            invoice.amount_paid,
                            invoice.currency,
                            'succeeded'
                        ]
                    );

                    console.log(`💰 Paiement enregistré: ${invoice.amount_paid / 100}€ pour user ${userId}`);
                }
                break;
            }

            // ============================================
            // FACTURE PAYÉE (invoice.payment_succeeded)
            // Événement non géré — on l'ignore proprement
            // ============================================
            case 'invoice.payment_succeeded': {
                console.log('ℹ️ invoice.payment_succeeded ignoré (géré par invoice.paid)');
                break;
            }

            default:
                console.log(`ℹ️ Événement non géré: ${event.type}`);
        }

        res.json({ received: true });
    } catch (error) {
        console.error('❌ Erreur traitement webhook:', error);
        res.status(500).json({ error: 'Erreur traitement webhook' });
    }
});

module.exports = router;