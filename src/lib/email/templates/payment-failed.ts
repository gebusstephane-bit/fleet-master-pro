/**
 * Template email — échec de paiement Stripe
 */

interface PaymentFailedEmailData {
  companyName: string;
  adminFirstName?: string;
  amount?: number;
  currency?: string;
  nextRetryDate?: string;
}

export function paymentFailedEmailTemplate(data: PaymentFailedEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
  const amountStr =
    data.amount && data.currency
      ? `${(data.amount / 100).toFixed(2)} ${data.currency.toUpperCase()}`
      : null;

  const greeting = data.adminFirstName ? `Bonjour ${data.adminFirstName},` : 'Bonjour,';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Échec de paiement — FleetMaster Pro</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #dc2626, #b91c1c); color: white; padding: 36px 30px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 24px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.9; font-size: 15px; }
    .content { padding: 36px 30px; }
    .alert-box { border: 1px solid #fecaca; background: #fef2f2; border-radius: 8px; padding: 20px; margin: 20px 0; }
    .alert-box p { margin: 0; font-size: 15px; color: #7f1d1d; }
    .amount { font-size: 28px; font-weight: 800; color: #dc2626; margin: 4px 0; }
    .steps { background: #f9fafb; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .steps h3 { margin: 0 0 14px; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
    .step { display: flex; align-items: flex-start; margin: 12px 0; font-size: 14px; color: #4b5563; }
    .step-num { background: #2563eb; color: white; border-radius: 50%; width: 22px; height: 22px; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; margin-right: 12px; flex-shrink: 0; line-height: 22px; }
    .button-wrap { text-align: center; margin: 28px 0 16px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .warning { font-size: 13px; color: #6b7280; border-left: 3px solid #fbbf24; padding-left: 12px; margin: 20px 0; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>⚠️ Échec de paiement</h1>
      <p>Votre abonnement FleetMaster Pro</p>
    </div>
    <div class="content">
      <p style="font-size:16px;font-weight:600;color:#111827;">${greeting}</p>
      <p>Le prélèvement automatique de votre abonnement <strong>${data.companyName}</strong> a échoué.</p>

      ${
        amountStr
          ? `<div class="alert-box">
        <p>Montant dû</p>
        <div class="amount">${amountStr}</div>
        ${data.nextRetryDate ? `<p style="margin-top:8px;font-size:13px;">Prochaine tentative : <strong>${data.nextRetryDate}</strong></p>` : ''}
      </div>`
          : `<div class="alert-box"><p>Le renouvellement de votre abonnement n'a pas pu être effectué. Veuillez mettre à jour votre moyen de paiement.</p></div>`
      }

      <div class="steps">
        <h3>Que faire maintenant ?</h3>
        <div class="step"><span class="step-num">1</span>Connectez-vous à votre espace client FleetMaster Pro</div>
        <div class="step"><span class="step-num">2</span>Accédez à <strong>Paramètres → Abonnement & Facturation</strong></div>
        <div class="step"><span class="step-num">3</span>Mettez à jour votre carte bancaire ou IBAN</div>
      </div>

      <div class="button-wrap">
        <a href="${appUrl}/dashboard/settings/billing" class="button">Mettre à jour le paiement →</a>
      </div>

      <div class="warning">
        Si le paiement n'est pas régularisé, l'accès à FleetMaster Pro sera suspendu. Vos données restent conservées pendant 30 jours.
      </div>

      <p style="font-size:13px;color:#6b7280;">Besoin d'aide ? Répondez à cet email ou contactez-nous à <a href="mailto:support@fleetmaster.pro" style="color:#2563eb;">support@fleetmaster.pro</a>.</p>
    </div>
    <div class="footer">
      FleetMaster Pro · Gestion de flotte professionnelle<br>
      Cet email est envoyé au contact administrateur du compte.
    </div>
  </div>
</body>
</html>
`.trim();
}

export function paymentFailedEmailText(data: PaymentFailedEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
  const greeting = data.adminFirstName ? `Bonjour ${data.adminFirstName},` : 'Bonjour,';

  return `
Échec de paiement — FleetMaster Pro

${greeting}

Le prélèvement de votre abonnement ${data.companyName} a échoué.

Pour régulariser la situation :
1. Connectez-vous sur ${appUrl}/dashboard/settings/billing
2. Accédez à Paramètres → Abonnement & Facturation
3. Mettez à jour votre moyen de paiement

Sans régularisation, l'accès sera suspendu. Vos données sont conservées 30 jours.

Besoin d'aide ? Répondez à cet email.

FleetMaster Pro
`.trim();
}
