/**
 * Template email pour le rapport hebdomadaire IA — FleetMaster Pro
 * Design cohérent avec monthly-report.ts (styles inline, max-width 600px)
 * Aucun appel IA — données pré-calculées par le cron vehicle-scoring
 */

export interface WeeklyFleetReportData {
  companyName: string;
  recipientFirstName: string;
  totalVehicles: number;
  avgScore: number;
  criticalCount: number;
  warningCount: number;
  goodCount: number;
  criticalVehicles: Array<{
    registration_number: string;
    type: string;
    score: number;
    summary: string | null;
  }>;
  reportDate: string; // formatted date
  unsubscribeUrl: string;
  dashboardUrl: string;
}

function scoreColor(score: number): string {
  if (score < 40) return '#DC2626';
  if (score < 60) return '#D97706';
  if (score < 75) return '#2563eb';
  return '#16A34A';
}

function scoreBg(score: number): string {
  if (score < 40) return '#fef2f2';
  if (score < 60) return '#fffbeb';
  if (score < 75) return '#eff6ff';
  return '#f0fdf4';
}

export function weeklyFleetReportTemplate(data: WeeklyFleetReportData): string {
  const {
    companyName,
    recipientFirstName,
    totalVehicles,
    avgScore,
    criticalCount,
    warningCount,
    goodCount,
    criticalVehicles,
    reportDate,
    unsubscribeUrl,
    dashboardUrl,
  } = data;

  const criticalSection = criticalVehicles.length > 0
    ? criticalVehicles.map((v) => `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;">
          <div style="display:flex;align-items:center;gap:12px;">
            <div style="width:40px;height:40px;border-radius:50%;background:${scoreBg(v.score)};color:${scoreColor(v.score)};font-weight:700;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;text-align:center;line-height:40px;">
              ${v.score}
            </div>
            <div>
              <div style="font-weight:600;color:#111827;font-size:14px;">${v.registration_number}</div>
              <div style="color:#6b7280;font-size:12px;">${v.type || ''}</div>
              ${v.summary ? `<div style="color:#4b5563;font-size:12px;margin-top:2px;">${v.summary}</div>` : ''}
            </div>
          </div>
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #f1f5f9;text-align:right;">
          <span style="display:inline-block;padding:2px 10px;border-radius:12px;font-size:11px;font-weight:600;background:${scoreBg(v.score)};color:${scoreColor(v.score)};">
            ${v.score < 40 ? 'URGENT' : 'ATTENTION'}
          </span>
        </td>
      </tr>
    `).join('')
    : `
      <tr>
        <td colspan="2" style="padding:24px 16px;text-align:center;">
          <div style="color:#16A34A;font-weight:600;font-size:15px;">✅ Votre flotte est en bon état cette semaine</div>
          <div style="color:#6b7280;font-size:13px;margin-top:4px;">Aucun véhicule ne nécessite d'attention urgente.</div>
        </td>
      </tr>
    `;

  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f1f5f9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f1f5f9;padding:32px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.1);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#2563eb,#1d4ed8);padding:28px 32px;text-align:center;">
            <div style="color:#ffffff;font-size:20px;font-weight:700;">🚛 FleetMaster Pro</div>
            <div style="color:#bfdbfe;font-size:13px;margin-top:4px;">Rapport Hebdomadaire IA — ${reportDate}</div>
          </td>
        </tr>

        <!-- Greeting -->
        <tr>
          <td style="padding:28px 32px 12px;">
            <p style="color:#111827;font-size:15px;margin:0;">
              Bonjour <strong>${recipientFirstName}</strong>, voici le bilan hebdomadaire de votre flotte
              de <strong>${totalVehicles} véhicule${totalVehicles > 1 ? 's' : ''}</strong>.
            </p>
          </td>
        </tr>

        <!-- 3 KPI Cards -->
        <tr>
          <td style="padding:16px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="padding:0 4px 0 0;">
                  <div style="background:${scoreBg(avgScore)};border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:${scoreColor(avgScore)};">${avgScore}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Score moyen</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 2px;">
                  <div style="background:#fef2f2;border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#DC2626;">${criticalCount}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">Critique${criticalCount > 1 ? 's' : ''}</div>
                  </div>
                </td>
                <td width="33%" style="padding:0 0 0 4px;">
                  <div style="background:#f0fdf4;border-radius:10px;padding:16px;text-align:center;">
                    <div style="font-size:28px;font-weight:700;color:#16A34A;">${goodCount}</div>
                    <div style="font-size:11px;color:#6b7280;margin-top:2px;">En bon état</div>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Section Véhicules critiques -->
        <tr>
          <td style="padding:8px 32px 4px;">
            <h2 style="color:#111827;font-size:16px;font-weight:600;margin:0 0 12px;">
              Véhicules à surveiller
            </h2>
          </td>
        </tr>
        <tr>
          <td style="padding:0 32px;">
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
              ${criticalSection}
            </table>
          </td>
        </tr>

        <!-- CTA Button -->
        <tr>
          <td style="padding:24px 32px;text-align:center;">
            <a href="${dashboardUrl}/vehicles" style="display:inline-block;background:#2563eb;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;font-size:14px;">
              Voir le détail complet →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f8fafc;padding:20px 32px;border-top:1px solid #e2e8f0;">
            <p style="color:#9ca3af;font-size:11px;margin:0;text-align:center;">
              Ce rapport est généré automatiquement chaque lundi pour ${companyName}.
              <br>Les scores sont calculés par l'IA de FleetMaster Pro (maintenance, inspections, consommation).
            </p>
            <p style="text-align:center;margin:8px 0 0;">
              <a href="${unsubscribeUrl}" style="color:#9ca3af;font-size:11px;text-decoration:underline;">
                Se désabonner de ces rapports
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function weeklyFleetReportText(data: WeeklyFleetReportData): string {
  const lines = [
    `FleetMaster Pro — Rapport Hebdomadaire IA (${data.reportDate})`,
    '',
    `Bonjour ${data.recipientFirstName},`,
    `Voici le bilan de votre flotte de ${data.totalVehicles} véhicules.`,
    '',
    `Score moyen : ${data.avgScore}/100`,
    `Critiques : ${data.criticalCount} | Attention : ${data.warningCount} | OK : ${data.goodCount}`,
    '',
  ];

  if (data.criticalVehicles.length > 0) {
    lines.push('Véhicules à surveiller :');
    for (const v of data.criticalVehicles) {
      lines.push(`  - ${v.registration_number} (${v.score}/100) ${v.summary || ''}`);
    }
  } else {
    lines.push('Votre flotte est en bon état cette semaine.');
  }

  lines.push('', `Voir le détail : ${data.dashboardUrl}/vehicles`);
  lines.push('', `Se désabonner : ${data.unsubscribeUrl}`);

  return lines.join('\n');
}
