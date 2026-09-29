// ============================================
// services/email.js — Resend
// ============================================
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

// ============================================
// TEMPLATE EMAIL DE CONFIRMATION
// ============================================
function getReceiptEmailHtml({ order_number, plan, pay_amount, pay_currency, price_amount, price_currency, pay_address, created_at, email }) {
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<meta name="color-scheme" content="dark light">
<meta name="supported-color-schemes" content="dark light">
<title>Marauder — Confirmation</title>
<!--[if mso]>
<style>table,td,div,h1,p,a{font-family:Arial,sans-serif !important;}</style>
<![endif]-->
<style>
  body, table, td, p, a, h1, h2 { -webkit-text-size-adjust:100%; -ms-text-size-adjust:100%; }
  table, td { mso-table-lspace:0pt; mso-table-rspace:0pt; border-collapse:collapse; }
  img { -ms-interpolation-mode:bicubic; border:0; height:auto; line-height:100%; outline:none; text-decoration:none; }
  a { text-decoration:none; }
  @media screen and (max-width: 600px) {
    .wrapper { padding: 24px 12px !important; }
    .card { border-radius: 16px !important; }
    .header { padding: 28px 20px 20px !important; }
    .logo-text { font-size: 22px !important; }
    .icon-cell { padding: 32px 20px 0 !important; }
    .icon-circle { width: 72px !important; height: 72px !important; }
    .icon-svg { width: 34px !important; height: 34px !important; margin-top: 19px !important; }
    .title-cell { padding: 24px 20px 8px !important; }
    .title { font-size: 22px !important; }
    .subtitle-cell { padding: 0 20px 28px !important; }
    .subtitle { font-size: 14px !important; }
    .details-cell { padding: 0 20px 16px !important; }
    .detail-row td { padding: 14px 16px !important; font-size: 12px !important; }
    .detail-row .detail-label { font-size: 10px !important; }
    .detail-row .detail-value { font-size: 13px !important; }
    .detail-value.mono { font-size: 11px !important; }
    .cta-cell { padding: 16px 20px 8px !important; }
    .cta-btn { padding: 14px 28px !important; font-size: 13px !important; }
    .note-cell { padding: 12px 20px 28px !important; }
    .footer-cell { padding: 24px 20px !important; }
    .footer-title { font-size: 11px !important; }
    .footer-links { font-size: 10px !important; }
    .legal-text { padding: 16px 8px 0 !important; font-size: 10px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:#050505;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;font-size:1px;color:#050505;line-height:1px;max-height:0;max-width:0;opacity:0;overflow:hidden;">
    Paiement confirmé · Votre abonnement ${plan} est maintenant actif · Commande ${order_number}
  </div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" class="wrapper" style="background:#050505;padding:48px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" class="card" style="max-width:600px;width:100%;background:#0b0b0b;border:1px solid #1f1f1f;border-radius:20px;overflow:hidden;box-shadow:0 0 60px rgba(16,185,129,0.06);">
          <tr><td style="height:3px;background:linear-gradient(90deg,#10b981 0%,#22c55e 50%,#10b981 100%);line-height:3px;font-size:0;">&nbsp;</td></tr>
          <tr>
            <td class="header" style="padding:36px 40px 28px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="vertical-align:middle;padding-right:12px;">
                    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                  </td>
                  <td style="vertical-align:middle;"><span class="logo-text" style="font-size:24px;font-weight:800;color:#ffffff;letter-spacing:-0.6px;">Marauder</span></td>
                </tr>
              </table>
              <div style="font-size:10px;color:#4a4a4a;letter-spacing:3px;text-transform:uppercase;margin-top:10px;font-weight:600;">OSINT · CSINT · INVESTIGATION</div>
            </td>
          </tr>
          <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#1f1f1f 20%,#1f1f1f 80%,transparent);"></div></td></tr>
          <tr>
            <td class="icon-cell" style="padding:48px 40px 0;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;">
                <tr>
                  <td class="icon-circle" style="width:88px;height:88px;background:radial-gradient(circle,#10b981 0%,#059669 100%);border-radius:50%;text-align:center;vertical-align:middle;box-shadow:0 0 0 8px rgba(16,185,129,0.08),0 0 40px rgba(16,185,129,0.35);">
                    <svg class="icon-svg" width="42" height="42" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" xmlns="http://www.w3.org/2000/svg" style="vertical-align:middle;margin-top:23px;"><polyline points="20 6 9 17 4 12"/></svg>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr><td class="title-cell" style="padding:32px 40px 10px;text-align:center;"><h1 class="title" style="margin:0;font-size:28px;line-height:1.2;color:#ffffff;font-weight:800;letter-spacing:-0.8px;">Paiement confirmé</h1></td></tr>
          <tr><td class="subtitle-cell" style="padding:0 40px 36px;text-align:center;"><p class="subtitle" style="margin:0;font-size:15px;line-height:1.65;color:#8a8a8a;">Votre abonnement <strong style="color:#10b981;font-weight:700;">${plan}</strong> a été activé avec succès.<br>Merci pour votre confiance.</p></td></tr>
          <tr>
            <td class="details-cell" style="padding:0 40px 20px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#0e0e0e;border:1px solid #1f1f1f;border-radius:14px;overflow:hidden;">
                <tr><td colspan="2" style="padding:16px 22px;border-bottom:1px solid #1a1a1a;background:#0a0a0a;"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="font-size:11px;color:#5a5a5a;letter-spacing:1.5px;text-transform:uppercase;font-weight:700;">Détails</td><td align="right"><span style="display:inline-block;padding:4px 10px;background:rgba(16,185,129,0.1);border:1px solid rgba(16,185,129,0.25);border-radius:100px;font-size:10px;color:#10b981;font-weight:700;letter-spacing:0.6px;">● PAYÉ</span></td></tr></table></td></tr>
                <tr class="detail-row"><td class="detail-label" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:12px;color:#5a5a5a;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Commande</td><td class="detail-value mono" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:14px;color:#ffffff;text-align:right;font-weight:600;font-family:'Courier New',Courier,monospace;">${order_number}</td></tr>
                <tr class="detail-row"><td class="detail-label" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:12px;color:#5a5a5a;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Plan</td><td class="detail-value" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:14px;color:#10b981;text-align:right;font-weight:700;">${plan}</td></tr>
                <tr class="detail-row"><td class="detail-label" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:12px;color:#5a5a5a;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Montant payé</td><td class="detail-value mono" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:14px;color:#ffffff;text-align:right;font-family:'Courier New',Courier,monospace;font-weight:600;">${pay_amount} ${pay_currency}</td></tr>
                <tr class="detail-row"><td class="detail-label" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:12px;color:#5a5a5a;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Équivalent</td><td class="detail-value" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:14px;color:#ffffff;text-align:right;font-weight:600;">${price_amount} ${price_currency}</td></tr>
                <tr class="detail-row"><td class="detail-label" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:12px;color:#5a5a5a;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;vertical-align:top;">Adresse</td><td class="detail-value mono" style="padding:16px 22px;border-bottom:1px solid #141414;font-size:11px;color:#8a8a8a;text-align:right;font-family:'Courier New',Courier,monospace;word-break:break-all;line-height:1.5;">${pay_address}</td></tr>
                <tr class="detail-row"><td class="detail-label" style="padding:16px 22px;font-size:12px;color:#5a5a5a;text-transform:uppercase;letter-spacing:0.8px;font-weight:600;">Date</td><td class="detail-value" style="padding:16px 22px;font-size:13px;color:#8a8a8a;text-align:right;">${created_at}</td></tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="cta-cell" style="padding:20px 40px 8px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:0 auto;"><tr><td style="background:#ffffff;border-radius:12px;box-shadow:0 8px 24px rgba(255,255,255,0.08);"><a href="https://marauder.host/dashboard.html" target="_blank" class="cta-btn" style="display:inline-block;padding:16px 42px;font-size:14px;font-weight:700;color:#000000;text-decoration:none;letter-spacing:-0.2px;border-radius:12px;">Accéder à mon dashboard →</a></td></tr></table>
            </td>
          </tr>
          <tr><td class="note-cell" style="padding:16px 40px 40px;text-align:center;"><p style="margin:0;font-size:12px;color:#5a5a5a;line-height:1.7;">Une question ? Rejoignez notre <a href="https://discord.gg/jf6QRZHaTB" style="color:#8a8a8a;text-decoration:underline;">Discord</a> ou répondez à cet email.</p></td></tr>
          <tr><td style="padding:0 40px;"><div style="height:1px;background:linear-gradient(90deg,transparent,#1f1f1f 20%,#1f1f1f 80%,transparent);"></div></td></tr>
          <tr>
            <td class="footer-cell" style="padding:28px 40px;text-align:center;background:#080808;">
              <p class="footer-title" style="margin:0 0 8px 0;font-size:12px;color:#5a5a5a;font-weight:600;letter-spacing:0.4px;">Marauder — OSINT / CSINT Investigation Platform</p>
              <p class="footer-links" style="margin:0;font-size:11px;color:#3a3a3a;line-height:1.6;"><a href="https://marauder.host/cgu.html" style="color:#5a5a5a;text-decoration:none;">CGU</a> &nbsp;·&nbsp; <a href="https://marauder.host" style="color:#5a5a5a;text-decoration:none;">marauder.host</a> &nbsp;·&nbsp; Created by Index</p>
            </td>
          </tr>
        </table>
        <p class="legal-text" style="margin:20px 0 0 0;font-size:11px;color:#2a2a2a;line-height:1.6;max-width:600px;padding:0 20px;">Cet email a été envoyé automatiquement suite à votre paiement. Ne répondez pas directement à cette adresse.</p>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

// ============================================
// ENVOI DE L'EMAIL DE REÇU
// ============================================
async function sendReceiptEmail({ order_number, plan, pay_amount, pay_currency, price_amount, price_currency, pay_address, created_at, email }) {
    if (!process.env.RESEND_API_KEY) {
        console.error('❌ RESEND_API_KEY manquant');
        return { success: false, error: 'RESEND_API_KEY manquant' };
    }

    if (!email) {
        console.error('❌ Email destinataire manquant');
        return { success: false, error: 'Email manquant' };
    }

    try {
        const { data, error } = await resend.emails.send({
            from: 'Marauder <noreply@marauder.host>', // ⚠️ Change si ton domaine est différent
            to: [email],
            subject: `Marauder — Paiement confirmé · ${order_number}`,
            html: getReceiptEmailHtml({
                order_number, plan, pay_amount, pay_currency,
                price_amount, price_currency, pay_address, created_at, email
            })
        });

        if (error) {
            console.error('❌ Erreur Resend:', error);
            return { success: false, error: error.message };
        }

        console.log(`✅ Email envoyé à ${email} · ID: ${data.id}`);
        return { success: true, id: data.id };

    } catch (err) {
        console.error('❌ Erreur envoi email:', err.message);
        return { success: false, error: err.message };
    }
}

module.exports = { sendReceiptEmail };