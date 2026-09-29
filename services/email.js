// ============================================
// SERVICES/EMAIL.JS — Envoi d'emails via Resend
// ============================================
const axios = require('axios');

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'onboarding@resend.dev';
const FROM_NAME = 'Marauder';

// ============================================
// Template HTML : Ticket de caisse stylé Marauder
// ============================================
function buildReceiptEmail(payment) {
    const {
        order_number,
        plan,
        pay_amount,
        pay_currency,
        price_amount,
        price_currency,
        pay_address,
        created_at,
        email
    } = payment;

    const planLabels = { starter: 'Starter', pro: 'Pro', enterprise: 'Enterprise' };
    const planLabel = planLabels[plan] || plan;

    const dateStr = new Date(created_at).toLocaleString('fr-FR', {
        day: '2-digit',
        month: 'long',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });

    return `
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<title>Preuve d'achat Marauder</title>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:Arial,sans-serif;color:#ffffff;">
    <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;padding:40px 20px;">
        <tr>
            <td align="center">
                <table width="600" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border:1px solid #2a2a2a;border-radius:12px;overflow:hidden;max-width:600px;">

                    <!-- HEADER -->
                    <tr>
                        <td style="padding:32px 32px 24px;border-bottom:1px solid #2a2a2a;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td>
                                        <table cellpadding="0" cellspacing="0">
                                            <tr>
                                                <td style="padding-right:12px;">
                                                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="2">
                                                        <path d="M12 2L2 7l10 5 10-5-10-5z"/>
                                                        <path d="M2 17l10 5 10-5"/>
                                                        <path d="M2 12l10 5 10-5"/>
                                                    </svg>
                                                </td>
                                                <td>
                                                    <div style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Marauder</div>
                                                    <div style="font-size:11px;color:#6b6b6b;text-transform:uppercase;letter-spacing:1px;margin-top:2px;">Preuve d'achat</div>
                                                </td>
                                            </tr>
                                        </table>
                                    </td>
                                    <td align="right" style="vertical-align:top;">
                                        <div style="display:inline-block;padding:6px 14px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.3);border-radius:100px;color:#10b981;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;">
                                            ✓ Payé
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- TITRE -->
                    <tr>
                        <td style="padding:32px 32px 16px;">
                            <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;letter-spacing:-0.3px;">Merci pour votre achat !</h1>
                            <p style="font-size:14px;color:#a0a0a0;line-height:1.6;margin:0;">
                                Votre paiement a été confirmé. Voici votre preuve d'achat.
                            </p>
                        </td>
                    </tr>

                    <!-- NUMÉRO DE COMMANDE -->
                    <tr>
                        <td style="padding:16px 32px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:#050505;border:1px solid #2a2a2a;border-radius:10px;">
                                <tr>
                                    <td style="padding:16px 20px;">
                                        <div style="font-size:10px;color:#6b6b6b;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px;">Numéro de commande</div>
                                        <div style="font-family:'Courier New',monospace;font-size:18px;font-weight:700;color:#ffffff;letter-spacing:1px;">${order_number}</div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- DÉTAILS -->
                    <tr>
                        <td style="padding:8px 32px 24px;">
                            <table width="100%" cellpadding="0" cellspacing="0">
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#a0a0a0;">Date</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#ffffff;text-align:right;font-weight:600;">${dateStr}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#a0a0a0;">Plan activé</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#10b981;text-align:right;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;">${planLabel}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#a0a0a0;">Montant payé</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#ffffff;text-align:right;font-weight:600;">${price_amount} ${(price_currency || 'EUR').toUpperCase()}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#a0a0a0;">Équivalent crypto</td>
                                    <td style="padding:10px 0;border-bottom:1px solid #1a1a1a;font-size:13px;color:#ffffff;text-align:right;font-weight:600;font-family:'Courier New',monospace;">${pay_amount} ${(pay_currency || '').toUpperCase()}</td>
                                </tr>
                                <tr>
                                    <td style="padding:10px 0;font-size:13px;color:#a0a0a0;vertical-align:top;">Adresse de réception</td>
                                    <td style="padding:10px 0;font-size:11px;color:#6b6b6b;text-align:right;font-family:'Courier New',monospace;word-break:break-all;line-height:1.4;">${pay_address || '—'}</td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- INFO -->
                    <tr>
                        <td style="padding:0 32px 24px;">
                            <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(16,185,129,0.05);border:1px solid rgba(16,185,129,0.2);border-radius:10px;">
                                <tr>
                                    <td style="padding:14px 18px;">
                                        <div style="font-size:13px;color:#a0a0a0;line-height:1.6;">
                                            <strong style="color:#10b981;">✓ Votre abonnement est actif.</strong><br>
                                            Vous pouvez dès maintenant accéder à toutes les fonctionnalités de votre plan.
                                        </div>
                                    </td>
                                </tr>
                            </table>
                        </td>
                    </tr>

                    <!-- BOUTON -->
                    <tr>
                        <td align="center" style="padding:0 32px 32px;">
                            <a href="https://marauder.host/dashboard.html" style="display:inline-block;padding:14px 32px;background:#ffffff;color:#000000;text-decoration:none;border-radius:8px;font-size:14px;font-weight:700;">
                                Accéder à mon dashboard
                            </a>
                        </td>
                    </tr>

                    <!-- FOOTER -->
                    <tr>
                        <td style="padding:20px 32px;border-top:1px solid #2a2a2a;background:#050505;">
                            <p style="font-size:11px;color:#6b6b6b;line-height:1.6;margin:0;text-align:center;">
                                Cet email vous a été envoyé car vous avez effectué un paiement sur Marauder.<br>
                                Votre adresse email (${email}) est uniquement conservée pour la traçabilité de votre commande.<br>
                                Pour toute demande de suppression : <a href="mailto:support@marauder.host" style="color:#a0a0a0;">support@marauder.host</a>
                            </p>
                            <p style="font-size:11px;color:#3a3a3a;margin:12px 0 0 0;text-align:center;">
                                © 2026 Marauder · Plateforme OSINT/CSINT
                            </p>
                        </td>
                    </tr>

                </table>
            </td>
        </tr>
    </table>
</body>
</html>
    `.trim();
}

// ============================================
// Envoi de l'email de preuve d'achat
// ============================================
async function sendReceiptEmail(payment) {
    if (!RESEND_API_KEY) {
        console.warn('⚠️ RESEND_API_KEY non configurée, email non envoyé');
        return { success: false, error: 'RESEND_API_KEY manquante' };
    }

    if (!payment.email) {
        console.warn('⚠️ Pas d\'email pour cette commande, email non envoyé');
        return { success: false, error: 'Email manquant' };
    }

    try {
        const response = await axios.post(
            'https://api.resend.com/emails',
            {
                from: `${FROM_NAME} <${FROM_EMAIL}>`,
                to: [payment.email],
                subject: `Votre preuve d'achat Marauder — ${payment.order_number}`,
                html: buildReceiptEmail(payment)
            },
            {
                headers: {
                    'Authorization': `Bearer ${RESEND_API_KEY}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log(`📧 Email envoyé à ${payment.email} (${payment.order_number})`);
        return { success: true, id: response.data.id };
    } catch (error) {
        console.error('❌ Erreur envoi email:', error.response?.data || error.message);
        return { success: false, error: error.response?.data?.message || error.message };
    }
}

module.exports = { sendReceiptEmail, buildReceiptEmail };