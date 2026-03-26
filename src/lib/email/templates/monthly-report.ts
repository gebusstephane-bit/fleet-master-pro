/**
 * Template email pour le rapport mensuel Fleet-Master
 * Design compact et professionnel
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

export interface MonthlyFleetReport {
  period: string;
  company: {
    id: string;
    name: string;
  };
  
  fleet: {
    totalVehicles: number;
    activeVehicles: number;
    totalKm: number;
    totalKmDriven?: number; // km parcourus ce mois (calculé via les pleins)
  };
  
  compliance: {
    score: number;
    expired: number;
    expiringSoon: number;
  };
  
  fuel: {
    totalLiters: number;
    totalCost: number;
    avgConsumption: number;
    avgConsumptionReal?: number; // L/100km calculé sur les km réellement parcourus
    costPerKm?: number; // €/km
    anomaliesCount: number;
  };
  
  maintenance: {
    completedCount: number;
    totalCost: number;
    pendingCount: number;
  };
  
  inspections: {
    count: number;
    avgScore: string;
    defectsCount: number;
    criticalDefects: number;
  };
  
  topCostVehicles: {
    vehicle: string;
    totalCost: number;
  }[];
  
  urgentActions: string[];
  
  documentsToRenew?: {
    vehicle: string;
    documentType: string;
    expiryDate: string;
  }[];
}

const COLORS = {
  primary: '#2563eb',
  success: '#16a34a',
  warning: '#d97706',
  danger: '#dc2626',
  gray: '#6b7280',
  lightGray: '#f3f4f6',
  border: '#e5e7eb',
};

function getScoreColor(score: number): string {
  if (score >= 90) return COLORS.success;
  if (score >= 70) return COLORS.warning;
  return COLORS.danger;
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatNumber(num: number): string {
  return new Intl.NumberFormat('fr-FR').format(num);
}

export function monthlyReportTemplate(data: MonthlyFleetReport, unsubscribeUrl?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
  const scoreColor = getScoreColor(data.compliance.score);
  
  // KPI cards HTML
  const kpiCards = [
    { 
      icon: '🚗', 
      value: formatNumber(data.fleet.totalVehicles), 
      label: 'Véhicules', 
      sub: data.fleet.totalKmDriven && data.fleet.totalKmDriven > 0 
        ? `${formatNumber(data.fleet.totalKmDriven)} km parcourus` 
        : `${formatNumber(data.fleet.activeVehicles)} actifs` 
    },
    { 
      icon: '⛽', 
      value: data.fuel.totalCost > 0 ? formatCurrency(data.fuel.totalCost) : '—', 
      label: 'Carburant', 
      sub: data.fuel.totalLiters > 0 
        ? `${formatNumber(Math.round(data.fuel.totalLiters))} L • ${data.fuel.avgConsumptionReal && data.fuel.avgConsumptionReal > 0 ? data.fuel.avgConsumptionReal.toFixed(1) : '-'} L/100km` 
        : 'Aucune donnée' 
    },
    { 
      icon: '🔧', 
      value: data.maintenance.completedCount > 0 ? formatNumber(data.maintenance.completedCount) : '—', 
      label: 'Maintenances', 
      sub: data.maintenance.totalCost > 0 
        ? `${formatCurrency(data.maintenance.totalCost)}` 
        : 'Aucune donnée' 
    },
    { 
      icon: '📋', 
      value: data.inspections.count > 0 ? data.inspections.avgScore : '—', 
      label: 'Inspections', 
      sub: data.inspections.count > 0 
        ? `${data.inspections.count} contrôle(s)` 
        : 'Aucune donnée' 
    },
  ].map(kpi => `
    <td style="width: 25%; padding: 8px; vertical-align: top;">
      <div style="background: #fff; border: 1px solid ${COLORS.border}; border-radius: 8px; padding: 16px 8px; text-align: center;">
        <div style="font-size: 20px; margin-bottom: 4px;">${kpi.icon}</div>
        <div style="font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 2px;">${kpi.value}</div>
        <div style="font-size: 11px; color: ${COLORS.gray}; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">${kpi.label}</div>
        <div style="font-size: 11px; color: ${COLORS.gray};">${kpi.sub}</div>
      </div>
    </td>
  `).join('');

  // Documents à renouveler
  const docsHtml = data.documentsToRenew && data.documentsToRenew.length > 0 ? `
    <tr>
      <td style="padding: 16px;">
        <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #111827;">📅 Documents à renouveler</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: ${COLORS.lightGray};">
              <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151;">Véhicule</th>
              <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151;">Document</th>
              <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151;">Expiration</th>
            </tr>
          </thead>
          <tbody>
            ${data.documentsToRenew.map(doc => `
              <tr style="border-bottom: 1px solid ${COLORS.border};">
                <td style="padding: 8px 12px;">${doc.vehicle}</td>
                <td style="padding: 8px 12px;">${doc.documentType}</td>
                <td style="padding: 8px 12px;"><span style="background: #fffbeb; color: ${COLORS.warning}; padding: 2px 8px; border-radius: 12px; font-size: 11px; font-weight: 600;">${format(new Date(doc.expiryDate), 'dd/MM/yyyy')}</span></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </td>
    </tr>
  ` : '';

  // Top véhicules coûteux
  const topVehiclesHtml = data.topCostVehicles.length > 0 && data.topCostVehicles.some(v => v.totalCost > 0) ? `
    <tr>
      <td style="padding: 16px;">
        <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 12px; color: #111827;">💰 Top véhicules les plus coûteux</h3>
        <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse: collapse; font-size: 13px;">
          <thead>
            <tr style="background: ${COLORS.lightGray};">
              <th style="padding: 8px 12px; text-align: left; font-weight: 600; color: #374151;">Véhicule</th>
              <th style="padding: 8px 12px; text-align: right; font-weight: 600; color: #374151;">Coût total</th>
            </tr>
          </thead>
          <tbody>
            ${data.topCostVehicles.filter(v => v.totalCost > 0).map(v => `
              <tr style="border-bottom: 1px solid ${COLORS.border};">
                <td style="padding: 8px 12px;">${v.vehicle}</td>
                <td style="padding: 8px 12px; text-align: right; font-weight: 600;">${formatCurrency(v.totalCost)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </td>
    </tr>
  ` : '';

  // Actions urgentes
  const urgentHtml = data.urgentActions.length > 0 ? `
    <tr>
      <td style="padding: 16px;">
        <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px;">
          <h3 style="font-size: 14px; font-weight: 600; margin-bottom: 8px; color: ${COLORS.danger};">🚨 Actions urgentes</h3>
          <ul style="margin: 0; padding-left: 20px; color: ${COLORS.danger}; font-size: 13px;">
            ${data.urgentActions.map(action => `<li style="margin-bottom: 4px;">${action}</li>`).join('')}
          </ul>
        </div>
      </td>
    </tr>
  ` : '';

  return `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Rapport Mensuel - ${data.period}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f3f4f6;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1);">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, ${COLORS.primary}, #1d4ed8); padding: 24px; text-align: center;">
              <h1 style="color: #ffffff; font-size: 20px; font-weight: 700; margin: 0 0 4px 0;">📊 Rapport Mensuel</h1>
              <p style="color: #ffffff; font-size: 14px; margin: 0; opacity: 0.9;">${data.period} — ${data.company.name}</p>
              <p style="color: #dbeafe; font-size: 11px; margin: 8px 0 0 0;">Données du mois écoulé</p>
            </td>
          </tr>
          
          <!-- Score Section -->
          <tr>
            <td style="padding: 24px 16px; background: #f8fafc; text-align: center;">
              <table align="center" cellpadding="0" cellspacing="0" style="margin: 0 auto;">
                <tr>
                  <td style="width: 100px; height: 100px; border-radius: 50%; background: #ffffff; border: 3px solid ${scoreColor}; text-align: center; vertical-align: middle;">
                    <span style="font-size: 32px; font-weight: 800; color: ${scoreColor};">${data.compliance.score}%</span>
                  </td>
                </tr>
              </table>
              <p style="font-size: 12px; color: ${COLORS.gray}; text-transform: uppercase; letter-spacing: 1px; margin: 12px 0 0 0; font-weight: 600;">Score de conformité</p>
              <p style="font-size: 12px; color: ${COLORS.gray}; margin: 8px 0 0 0;">
                <span style="color: ${COLORS.danger};">● ${data.compliance.expired} expiré(s)</span> &nbsp;&nbsp;
                <span style="color: ${COLORS.warning};">● ${data.compliance.expiringSoon} à renouveler</span>
              </p>
            </td>
          </tr>
          
          <!-- KPI Cards -->
          <tr>
            <td style="padding: 0 8px 16px 8px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${kpiCards}
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Documents à renouveler -->
          ${docsHtml}
          
          <!-- Top véhicules -->
          ${topVehiclesHtml}
          
          <!-- Actions urgentes -->
          ${urgentHtml}
          
          <!-- CTA -->
          <tr>
            <td style="padding: 16px; text-align: center;">
              <a href="${appUrl}/dashboard" style="display: inline-block; background: ${COLORS.primary}; color: #ffffff; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: 600; font-size: 14px;">Voir le rapport complet</a>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="padding: 16px; background: #f8fafc; border-top: 1px solid ${COLORS.border}; text-align: center;">
              <p style="font-size: 12px; color: ${COLORS.gray}; margin: 0;">
                <a href="${appUrl}/dashboard" style="color: ${COLORS.primary}; text-decoration: none;">Tableau de bord</a>
                ${unsubscribeUrl ? ` | <a href="${unsubscribeUrl}" style="color: ${COLORS.primary}; text-decoration: none;">Se désabonner</a>` : ''}
              </p>
              <p style="font-size: 11px; color: #9ca3af; margin: 8px 0 0 0;">
                Cet email a été envoyé automatiquement par Fleet-Master<br>
                ${data.company.name}
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function monthlyReportText(data: MonthlyFleetReport, unsubscribeUrl?: string): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://fleetmaster.pro';
  
  return `RAPPORT MENSUEL FLEETMASTER — ${data.period}
${data.company.name}
(Données du mois écoulé)
=====================================

📊 SCORE DE CONFORMITÉ: ${data.compliance.score}%
   • Documents expirés: ${data.compliance.expired}
   • Expiration dans 60j: ${data.compliance.expiringSoon}

🚗 FLOTTE
   • Véhicules total: ${formatNumber(data.fleet.totalVehicles)}
   • Véhicules actifs: ${formatNumber(data.fleet.activeVehicles)}
   • ${data.fleet.totalKmDriven && data.fleet.totalKmDriven > 0 ? `Km parcourus: ${formatNumber(data.fleet.totalKmDriven)} km` : ''}

⛽ CARBURANT
   • Total: ${data.fuel.totalCost > 0 ? formatCurrency(data.fuel.totalCost) : 'Aucune donnée'}
   • Litres consommés: ${data.fuel.totalLiters > 0 ? formatNumber(Math.round(data.fuel.totalLiters)) + ' L' : 'N/A'}
   • Consommation réelle: ${data.fuel.avgConsumptionReal && data.fuel.avgConsumptionReal > 0 ? data.fuel.avgConsumptionReal.toFixed(1) + ' L/100km' : 'N/A'}
   • Coût au km: ${data.fuel.costPerKm && data.fuel.costPerKm > 0 ? data.fuel.costPerKm.toFixed(2) + ' €/km' : 'N/A'}

🔧 MAINTENANCE
   • Interventions: ${data.maintenance.completedCount > 0 ? formatNumber(data.maintenance.completedCount) : 'Aucune'}
   • Coût total: ${data.maintenance.totalCost > 0 ? formatCurrency(data.maintenance.totalCost) : 'N/A'}
   • En cours: ${formatNumber(data.maintenance.pendingCount)}

📋 INSPECTIONS
   • Contrôles: ${data.inspections.count > 0 ? data.inspections.count : 'Aucune'}
   • Score moyen: ${data.inspections.count > 0 ? data.inspections.avgScore : 'N/A'}
   • Défauts critiques: ${data.inspections.criticalDefects}

${data.urgentActions.length > 0 ? `
🚨 ACTIONS URGENTES:
${data.urgentActions.map(a => `   ⚠️ ${a}`).join('\n')}
` : ''}

Voir le rapport complet: ${appUrl}/dashboard

---
Fleet-Master
${unsubscribeUrl ? `Se désabonner: ${unsubscribeUrl}` : ''}`;
}
