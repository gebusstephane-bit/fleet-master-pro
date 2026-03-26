/**
 * Template email — rappel fin de trial (J-3)
 */

interface TrialEndingEmailData {
  firstName?: string;
  companyName: string;
  trialEndsAt: Date;
  planName: string;
  planPrice: number;
  billingUrl: string;
}

export function trialEndingEmailTemplate(data: TrialEndingEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
  const endDate = data.trialEndsAt.toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  const greeting = data.firstName ? `Bonjour ${data.firstName},` : 'Bonjour,';

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Votre essai se termine dans 3 jours — Fleet-Master</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 36px 30px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 22px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .content { padding: 32px 30px; }
    .countdown-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 20px 0; text-align: center; }
    .countdown-box .days { font-size: 52px; font-weight: 800; color: #2563eb; line-height: 1; }
    .countdown-box .label { font-size: 14px; color: #3b82f6; font-weight: 600; margin-top: 4px; }
    .countdown-box .date { font-size: 13px; color: #6b7280; margin-top: 6px; }
    .plan-box { background: #f9fafb; border-radius: 8px; padding: 18px 20px; margin: 20px 0; display: flex; justify-content: space-between; align-items: center; }
    .plan-name { font-size: 15px; font-weight: 600; color: #111827; }
    .plan-price { font-size: 20px; font-weight: 700; color: #2563eb; }
    .plan-price span { font-size: 12px; font-weight: 400; color: #6b7280; }
    .button-wrap { text-align: center; margin: 28px 0 16px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .note { font-size: 13px; color: #6b7280; background: #f9fafb; border-radius: 6px; padding: 14px 16px; margin-top: 20px; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Votre essai se termine bientôt</h1>
      <p>${data.companyName} — Fleet-Master</p>
    </div>
    <div class="content">
      <p style="font-size:16px;font-weight:600;color:#111827;margin-bottom:4px;">${greeting}</p>
      <p style="color:#4b5563;">Votre période d'essai gratuit arrive à son terme. Pour continuer à utiliser Fleet-Master sans interruption, activez votre abonnement avant la date d'expiration.</p>

      <div class="countdown-box">
        <div class="days">3</div>
        <div class="label">JOURS RESTANTS</div>
        <div class="date">Expiration : ${endDate}</div>
      </div>

      <div class="plan-box">
        <div>
          <div class="plan-name">Plan ${data.planName}</div>
          <div style="font-size:13px;color:#6b7280;margin-top:2px;">Votre plan actuel</div>
        </div>
        <div class="plan-price">${data.planPrice}€ <span>/ mois</span></div>
      </div>

      <div class="button-wrap">
        <a href="${data.billingUrl}" class="button">Activer mon abonnement →</a>
      </div>

      <div class="note">
        Si vous ne souhaitez pas continuer, votre compte sera automatiquement rétrogradé au plan Essentiel (5 véhicules) à l'expiration. Vos données seront conservées.
      </div>

      <p style="font-size:13px;color:#6b7280;margin-top:20px;">Une question ? Répondez à cet email ou contactez-nous à <a href="mailto:contact@fleet-master.fr" style="color:#2563eb;">contact@fleet-master.fr</a>.</p>
    </div>
    <div class="footer">
      Fleet-Master · Gestion de flotte professionnelle<br>
      Cet email est envoyé au contact administrateur du compte.
    </div>
  </div>
</body>
</html>
`.trim();
}

export function trialEndingEmailText(data: TrialEndingEmailData): string {
  const endDate = data.trialEndsAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const greeting = data.firstName ? `Bonjour ${data.firstName},` : 'Bonjour,';

  return `
Votre essai Fleet-Master se termine dans 3 jours

${greeting}

Votre essai gratuit expire le ${endDate}.

Plan actuel : ${data.planName} — ${data.planPrice}€/mois

Pour continuer sans interruption, activez votre abonnement :
${data.billingUrl}

Sans activation, votre compte sera rétrogradé au plan Essentiel (5 véhicules) à l'expiration. Vos données sont conservées.

Une question ? Répondez à cet email.

Fleet-Master
`.trim();
}
