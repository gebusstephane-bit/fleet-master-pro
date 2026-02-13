/**
 * Templates d'emails pour les alertes maintenance
 */

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

interface MaintenanceAlertData {
  vehicleName: string;
  alertType: 'MILEAGE_DUE' | 'DATE_DUE' | 'OVERDUE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  dueMileage?: number;
  currentMileage?: number;
  dueDate?: string;
  companyName: string;
}

const severityColors = {
  CRITICAL: '#dc2626',
  WARNING: '#d97706',
  INFO: '#2563eb',
};

const severityLabels = {
  CRITICAL: 'CRITIQUE',
  WARNING: 'ATTENTION',
  INFO: 'INFORMATION',
};

export function maintenanceAlertTemplate(data: MaintenanceAlertData): string {
  const severityColor = severityColors[data.severity];
  const severityLabel = severityLabels[data.severity];
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Alerte Maintenance - FleetMaster Pro</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb, #1d4ed8); color: white; padding: 30px; border-radius: 8px 8px 0 0; text-align: center; }
    .content { background: #f9fafb; padding: 30px; border-radius: 0 0 8px 8px; }
    .alert-box { background: white; border-left: 4px solid ${severityColor}; padding: 20px; margin: 20px 0; border-radius: 4px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .severity-badge { display: inline-block; background: ${severityColor}; color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: bold; }
    .vehicle-name { font-size: 20px; font-weight: bold; color: #111827; margin: 10px 0; }
    .message { font-size: 16px; color: #4b5563; margin: 15px 0; }
    .details { background: #f3f4f6; padding: 15px; border-radius: 4px; margin: 15px 0; }
    .detail-row { display: flex; justify-content: space-between; margin: 8px 0; }
    .button { display: inline-block; background: #2563eb; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 500; margin: 20px 0; }
    .footer { text-align: center; color: #9ca3af; font-size: 12px; margin-top: 30px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🔧 FleetMaster Pro</h1>
      <p>Alerte Maintenance</p>
    </div>
    
    <div class="content">
      <div class="alert-box">
        <span class="severity-badge">${severityLabel}</span>
        <div class="vehicle-name">${data.vehicleName}</div>
        <div class="message">${data.message}</div>
        
        <div class="details">
          ${data.currentMileage && data.dueMileage ? `
          <div class="detail-row">
            <span>Kilométrage actuel:</span>
            <strong>${data.currentMileage.toLocaleString('fr-FR')} km</strong>
          </div>
          <div class="detail-row">
            <span>Kilométrage prévu:</span>
            <strong>${data.dueMileage.toLocaleString('fr-FR')} km</strong>
          </div>
          ` : ''}
          
          ${data.dueDate ? `
          <div class="detail-row">
            <span>Date prévue:</span>
            <strong>${format(new Date(data.dueDate), 'dd MMMM yyyy', { locale: fr })}</strong>
          </div>
          ` : ''}
        </div>
      </div>
      
      <center>
        <a href="${appUrl}/maintenance/new" class="button">
          Planifier une intervention
        </a>
      </center>
      
      <div class="footer">
        <p>Cet email a été envoyé automatiquement par FleetMaster Pro</p>
        <p>${data.companyName}</p>
      </div>
    </div>
  </div>
</body>
</html>
`;
}

export function maintenanceAlertText(data: MaintenanceAlertData): string {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  
  return `
ALERTE MAINTENANCE - FleetMaster Pro
=====================================

${severityLabels[data.severity]}: ${data.vehicleName}

${data.message}

${data.currentMileage && data.dueMileage ? `Kilométrage: ${data.currentMileage.toLocaleString('fr-FR')} / ${data.dueMileage.toLocaleString('fr-FR')} km` : ''}
${data.dueDate ? `Date prévue: ${format(new Date(data.dueDate), 'dd/MM/yyyy', { locale: fr })}` : ''}

Planifier une intervention: ${appUrl}/maintenance/new

---
${data.companyName} - FleetMaster Pro
`;
}
