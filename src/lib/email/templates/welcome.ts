/**
 * Template email de bienvenue — essai gratuit 14 jours
 */

interface WelcomeEmailData {
  firstName: string;
  companyName: string;
  trialEndsAt: Date;
}

export function welcomeEmailTemplate(data: WelcomeEmailData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
  const trialEnd = data.trialEndsAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bienvenue sur Fleet-Master</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background: #f3f4f6; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.07); }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 40px 30px; text-align: center; }
    .header h1 { margin: 0 0 8px; font-size: 28px; font-weight: 700; }
    .header p { margin: 0; opacity: 0.9; font-size: 15px; }
    .content { padding: 36px 30px; }
    .greeting { font-size: 18px; font-weight: 600; color: #111827; margin-bottom: 16px; }
    .trial-box { background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin: 24px 0; text-align: center; }
    .trial-box .days { font-size: 42px; font-weight: 800; color: #2563eb; line-height: 1; }
    .trial-box .label { font-size: 13px; color: #3b82f6; font-weight: 500; margin-top: 4px; }
    .trial-box .date { font-size: 13px; color: #6b7280; margin-top: 8px; }
    .features { background: #f9fafb; border-radius: 8px; padding: 20px 24px; margin: 24px 0; }
    .features h3 { margin: 0 0 12px; font-size: 14px; font-weight: 600; color: #374151; text-transform: uppercase; letter-spacing: 0.05em; }
    .feature-item { display: flex; align-items: center; margin: 8px 0; font-size: 14px; color: #4b5563; }
    .feature-icon { color: #10b981; font-weight: 700; margin-right: 10px; font-size: 16px; }
    .button-wrap { text-align: center; margin: 28px 0 16px; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 14px 36px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px; }
    .help { font-size: 13px; color: #6b7280; margin-top: 24px; padding-top: 20px; border-top: 1px solid #e5e7eb; }
    .footer { background: #f9fafb; padding: 20px 30px; text-align: center; font-size: 12px; color: #9ca3af; border-top: 1px solid #e5e7eb; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Bienvenue sur Fleet-Master</h1>
      <p>Votre essai gratuit est activé — aucune carte bancaire requise</p>
    </div>
    <div class="content">
      <p class="greeting">Bonjour ${data.firstName},</p>
      <p>Votre compte <strong>${data.companyName}</strong> est prêt. Vous avez accès à toutes les fonctionnalités PRO pendant votre période d'essai.</p>

      <div class="trial-box">
        <div class="days">14</div>
        <div class="label">JOURS D'ESSAI GRATUIT</div>
        <div class="date">Jusqu'au ${trialEnd}</div>
      </div>

      <div class="features">
        <h3>Inclus dans votre essai</h3>
        <div class="feature-item"><span class="feature-icon">✓</span> Gestion illimitée des véhicules et conducteurs</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Alertes documents et contrôles réglementaires</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Suivi carburant et coûts</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Workflow de maintenance complet</div>
        <div class="feature-item"><span class="feature-icon">✓</span> Rapports et exports PDF/CSV</div>
        <div class="feature-item"><span class="feature-icon">✓</span> QR codes inspections terrain</div>
      </div>

      <div class="button-wrap">
        <a href="${appUrl}/dashboard" class="button">Accéder au tableau de bord →</a>
      </div>

      <div class="help">
        <strong>Une question ?</strong> Répondez directement à cet email, notre équipe vous répond sous 24h.<br><br>
        Pour commencer rapidement, ajoutez votre premier véhicule depuis le tableau de bord.
      </div>
    </div>
    <div class="footer">
      Fleet-Master · Gestion de flotte professionnelle<br>
      Vous recevez cet email car vous venez de créer un compte.
    </div>
  </div>
</body>
</html>
`.trim();
}

export function welcomeEmailText(data: WelcomeEmailData): string {
  const trialEnd = data.trialEndsAt.toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';

  return `
Bienvenue sur Fleet-Master

Bonjour ${data.firstName},

Votre compte ${data.companyName} est activé avec 14 jours d'essai gratuit (jusqu'au ${trialEnd}).

Vous avez accès à toutes les fonctionnalités PRO :
- Gestion véhicules et conducteurs
- Alertes documents réglementaires
- Suivi carburant et coûts
- Workflow de maintenance
- Rapports PDF/CSV
- QR codes inspections

Commencer : ${appUrl}/dashboard

Une question ? Répondez à cet email.

Fleet-Master
`.trim();
}
