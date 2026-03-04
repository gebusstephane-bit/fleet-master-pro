'use server';

import { sendEmail } from '@/lib/email/client';
import { 
  maintenanceAlertTemplate, 
  maintenanceAlertText
} from '@/lib/email/templates/maintenance-alert';
import { authActionClient } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';

interface MaintenanceAlertData {
  vehicleName: string;
  alertType: 'OVERDUE' | 'MILEAGE_DUE' | 'DATE_DUE';
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  message: string;
  dueMileage?: number;
  currentMileage?: number;
  dueDate?: string;
  companyName: string;
}

/**
 * Envoyer les alertes maintenance par email
 * Cette action est appelée par un cron job ou manuellement
 */
export const sendMaintenanceAlerts = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    // Récupérer les utilisateurs avec notifications activées
    const { data: users } = await supabase
      .from('profiles')
      .select('email, first_name, last_name, notify_maintenance')
      .eq('company_id', ctx.user.company_id)
      .eq('notify_maintenance', true);
    
    if (!users || users.length === 0) {
      return { success: true, sent: 0, reason: 'Aucun utilisateur avec notifications activées' };
    }
    
    // Récupérer les véhicules avec alertes
    const { data: vehicles } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, mileage, next_service_due, next_service_mileage')
      .eq('company_id', ctx.user.company_id)
      .eq('status', 'ACTIF');
    
    const alerts: MaintenanceAlertData[] = [];
    const today = new Date();
    
    for (const vehicle of vehicles || []) {
      // Alerte kilométrage
      if (vehicle.next_service_mileage && vehicle.mileage > vehicle.next_service_mileage - 2000) {
        const remainingKm = vehicle.next_service_mileage - vehicle.mileage;
        alerts.push({
          vehicleName: `${vehicle.registration_number} - ${vehicle.brand} ${vehicle.model}`,
          alertType: remainingKm < 0 ? 'OVERDUE' : 'MILEAGE_DUE',
          severity: remainingKm < 0 ? 'CRITICAL' : remainingKm < 500 ? 'WARNING' : 'INFO',
          message: remainingKm < 0 
            ? `Entretien kilométrage dépassé de ${Math.abs(remainingKm)} km`
            : `Entretien préventif dans ${remainingKm} km`,
          dueMileage: vehicle.next_service_mileage,
          currentMileage: vehicle.mileage,
          companyName: 'Votre entreprise',
        });
      }
      
      // Alerte date
      if (vehicle.next_service_due) {
        const dueDate = new Date(vehicle.next_service_due);
        const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysUntil < 30) {
          alerts.push({
            vehicleName: `${vehicle.registration_number} - ${vehicle.brand} ${vehicle.model}`,
            alertType: daysUntil < 0 ? 'OVERDUE' : 'DATE_DUE',
            severity: daysUntil < 0 ? 'CRITICAL' : daysUntil < 7 ? 'WARNING' : 'INFO',
            message: daysUntil < 0
              ? `Entretien date dépassée de ${Math.abs(daysUntil)} jours`
              : `Entretien préventif dans ${daysUntil} jours`,
            dueDate: vehicle.next_service_due,
            companyName: 'Votre entreprise',
          });
        }
      }
    }
    
    // Envoyer les emails
    let sentCount = 0;
    const emails = users.map(u => u.email).filter(Boolean);
    
    for (const alert of alerts) {
      try {
        await sendEmail({
          to: emails,
          subject: `🔧 Alerte Maintenance - ${alert.vehicleName}`,
          html: maintenanceAlertTemplate(alert),
          text: maintenanceAlertText(alert),
        });
        sentCount++;
      } catch (error) {
        console.error('Erreur envoi email:', error);
      }
    }
    
    return { 
      success: true, 
      sent: sentCount, 
      alerts: alerts.length,
      recipients: emails.length 
    };
  });

/**
 * Tester la configuration email
 */
export const testEmailConfig = authActionClient
  .action(async ({ ctx }) => {
    const result = await sendEmail({
      to: ctx.user.email,
      subject: '✅ Test - FleetMaster Pro',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb;">FleetMaster Pro</h1>
          <p>Ceci est un email de test pour vérifier la configuration.</p>
          <p>Si vous recevez cet email, la configuration est correcte !</p>
          <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 12px;">
            Envoyé à ${new Date().toLocaleString('fr-FR')}
          </p>
        </div>
      `,
      text: 'Test de configuration email - FleetMaster Pro',
    });
    
    return { success: true, result };
  });
