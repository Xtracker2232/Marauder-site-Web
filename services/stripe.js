const Stripe = require('stripe');
const stripe = Stripe(process.env.STRIPE_SECRET_KEY);

// ============================================
// PLANS MARAUDER
// ============================================
const PLANS = {
    free: {
        name: 'Free',
        price: 0,
        limits: { api: 10, search: 10, fiches: 3 }
    },
    starter: {
        name: 'Starter',
        price: 999,
        limits: { api: 1000, search: 1000, fiches: 25 },
        stripePriceId: process.env.STRIPE_PRICE_STARTER
    },
    pro: {
        name: 'Pro',
        price: 2999,
        limits: { api: 10000, search: 10000, fiches: 100 },
        stripePriceId: process.env.STRIPE_PRICE_PRO
    },
    enterprise: {
        name: 'Enterprise',
        price: null,
        limits: { api: Infinity, search: Infinity, fiches: Infinity }
    }
};

// ============================================
// CRÉER UNE SESSION CHECKOUT (ABONNEMENT)
// ============================================
async function createCheckoutSession(userId, plan, successUrl, cancelUrl) {
    try {
        const session = await stripe.checkout.sessions.create({
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{
                price: PLANS[plan].stripePriceId,
                quantity: 1
            }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: userId,
            metadata: {
                userId: userId,
                plan: plan
            }
        });
        return { success: true, url: session.url, sessionId: session.id };
    } catch (error) {
        console.error('Stripe checkout error:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// CRÉER UNE SESSION BILLING PORTAL
// ============================================
async function createPortalSession(customerId, returnUrl) {
    try {
        const session = await stripe.billingPortal.sessions.create({
            customer: customerId,
            return_url: returnUrl
        });
        return { success: true, url: session.url };
    } catch (error) {
        console.error('Stripe portal error:', error.message);
        return { success: false, error: error.message };
    }
}

// ============================================
// RÉCUPÉRER L'ABONNEMENT D'UN CLIENT
// ============================================
async function getSubscription(customerId) {
    try {
        const subscriptions = await stripe.subscriptions.list({
            customer: customerId,
            status: 'active',
            limit: 1
        });
        if (subscriptions.data.length === 0) {
            return { success: true, subscription: null };
        }
        return { success: true, subscription: subscriptions.data[0] };
    } catch (error) {
        return { success: false, error: error.message };
    }
}

// ============================================
// VÉRIFIER LA SIGNATURE DU WEBHOOK
// ============================================
function constructWebhookEvent(payload, signature) {
    return stripe.webhooks.constructEvent(
        payload,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
    );
}

module.exports = {
    stripe,
    PLANS,
    createCheckoutSession,
    createPortalSession,
    getSubscription,
    constructWebhookEvent
};