'use server';

import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';

import { USER_ROLE } from '@/constants/enums';
import { sendEmail } from '@/lib/email';
import { authActionClient } from '@/lib/safe-action';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';
import { recalculatePredictionsForVehicle } from '@/lib/maintenance-predictor';
import { logger } from '@/lib/logger';


// ============================================
// SCHÉMAS
// ============================================

const createRequestSchema = z.object({
  vehicleId: z.string().uuid(),
  type: z.enum(['PREVENTIVE', 'CORRECTIVE', 'PNEUMATIQUE', 'CARROSSERIE']),
  description: z.string().min(1, 'La description est requise'),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).default('NORMAL'),
  estimatedCost: z.number().optional(),
  garageName: z.string().optional(),
  notes: z.string().optional(),
});

const validateRequestSchema = z.object({
  id: z.string().uuid(),
  token: z.string().uuid(),
  action: z.enum(['validate', 'reject']),
  notes: z.string().optional(),
});

const scheduleRDVSchema = z.object({
  maintenanceId: z.string().uuid(),
  garageName: z.string().min(1, 'Le nom du garage est requis'),
  garageAddress: z.string().min(1, 'L\'adresse est requise'),
  garagePhone: z.string().optional(),
  rdvDate: z.string(), // YYYY-MM-DD
  rdvTime: z.string(), // HH:mm
  estimatedDays: z.number().default(0),
  estimatedHours: z.number().default(2),
  notes: z.string().optional(),
});

const completeMaintenanceSchema = z.object({
  maintenanceId: z.string().uuid(),
  finalCost: z.number().min(0),
  completionNotes: z.string().optional(),
  invoiceDocument: z.string().optional(),
});

// ============================================
// UTILITAIRES
// ============================================

async function getUserCompanyData(userId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role, company_id')
    .eq('id', userId)
    .single();

  if (error || !data) {throw new Error('Utilisateur non trouvé');}
  return data;
}

async function getCompanyDirectors(companyId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, first_name, last_name')
    .eq('company_id', companyId)
    .in('role', [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR]);

  if (error) {return [];}
  return data || [];
}

async function addStatusHistory(
  maintenanceId: string,
  oldStatus: string,
  newStatus: string,
  userId: string,
  notes?: string
) {
  const supabase = await createClient();
  await supabase
    .from('maintenance_status_history')
    .insert({
      maintenance_id: maintenanceId,
      old_status: oldStatus,
      new_status: newStatus,
      changed_by: userId,
      notes,
    });
}

// ============================================
// 1. CRÉATION DEMANDE (Agent de parc)
// ============================================

export const createMaintenanceRequest = authActionClient
  .schema(createRequestSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    // Création maintenance request
    
    // 1. Vérifier le véhicule
    const { data: vehicle, error: vehicleError } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, company_id')
      .eq('id', parsedInput.vehicleId)
      .eq('company_id', ctx.user.company_id)
      .single();
    
    // Vehicle query done
    
    if (vehicleError || !vehicle) {
      logger.error('Vehicle error:', vehicleError?.message);
      throw new Error('Véhicule non trouvé ou accès non autorisé');
    }
    
    // 2. Créer la demande via action simple (bypass trigger problématique)
    const { createMaintenanceSimple } = await import('./maintenance-simple');
    const result = await createMaintenanceSimple(
      {
        vehicleId: parsedInput.vehicleId,
        type: parsedInput.type,
        description: parsedInput.description,
        priority: parsedInput.priority,
        estimatedCost: parsedInput.estimatedCost,
        garageName: parsedInput.garageName,
        notes: parsedInput.notes,
      },
      ctx.user.id,
      ctx.user.company_id
    );
    
    if (!result.success) {
      throw new Error(`Erreur création demande: ${result.error}`);
    }
    
    const maintenance = result.data;
    
    if (!maintenance) {
      throw new Error('Erreur lors de la création de la demande: données manquantes');
    }
    
    // 3. Trouver les directeurs et envoyer emails (non-bloquant)
    try {
      const directors = await getCompanyDirectors(ctx.user.company_id);
      const requester = await getUserCompanyData(ctx.user.id);

      for (const director of directors) {
        const validationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/maintenance/validate?id=${maintenance.id}&token=${maintenance.validation_token}`;

        await sendEmail({
          to: director.email,
          subject: `🔧 Validation requise : ${vehicle.registration_number}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #1f2937;">Nouvelle demande d'intervention</h2>

              <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <p><strong>🚗 Véhicule :</strong> ${vehicle.registration_number} (${vehicle.brand} ${vehicle.model})</p>
                <p><strong>🔧 Type :</strong> ${parsedInput.type}</p>
                <p><strong>📝 Description :</strong> ${parsedInput.description}</p>
                <p><strong>⚡ Priorité :</strong> <span style="color: ${parsedInput.priority === 'CRITICAL' ? '#dc2626' : parsedInput.priority === 'HIGH' ? '#ea580c' : '#6b7280'};">${parsedInput.priority}</span></p>
                <p><strong>👤 Demandé par :</strong> ${requester.first_name} ${requester.last_name}</p>
                ${parsedInput.estimatedCost ? `<p><strong>💰 Coût estimé :</strong> ${parsedInput.estimatedCost}€</p>` : ''}
              </div>

              <div style="margin: 30px 0; text-align: center;">
                <a href="${validationUrl}&action=validate"
                   style="background: #10b981; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin-right: 10px; display: inline-block;">
                  ✅ Valider la demande
                </a>
                <a href="${validationUrl}&action=reject"
                   style="background: #ef4444; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                   ❌ Refuser
                </a>
              </div>

              <p style="color: #6b7280; font-size: 12px; margin-top: 30px;">
                Cet email a été envoyé automatiquement par FleetMaster Pro.
              </p>
            </div>
          `,
        });
      }
    } catch (emailError) {
      // L'email est non-bloquant : la demande est créée même si l'envoi échoue
      logger.error('Erreur envoi email directeur (non-bloquant):', emailError);
    }
    
    revalidatePath('/maintenance');
    return { success: true, maintenance };
  });

// ============================================
// 2. VALIDATION DIRECTEUR (App interne)
// ============================================

export const validateMaintenanceRequest = authActionClient
  .schema(validateRequestSchema.omit({ token: true }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    // Validation maintenance request
    
    // 1. Récupérer la demande
    const { data: maintenance, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('id', parsedInput.id)
      .single();
    
    // Récupérer le véhicule séparément si besoin
    let vehicleData = null;
    let requesterData = null;
    if (maintenance) {
      const { data: v } = await supabase.from('vehicles').select('registration_number, brand, model').eq('id', maintenance.vehicle_id).single();
      vehicleData = v;
      const adminClient = createAdminClient();
      const { data: r } = await adminClient.from('profiles').select('email, first_name, last_name').eq('id', maintenance.requested_by!).single();
      // Fallback vers auth.users si email absent du profil
      if (r && !r.email) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(maintenance.requested_by!);
        requesterData = { ...r, email: authUser?.user?.email || null };
      } else {
        requesterData = r;
      }
    }
    
    // Maintenance query done
    
    if (error || !maintenance) {
      throw new Error('Demande non trouvée');
    }
    
    // Vérifier le company_id manuellement
    if (maintenance.company_id !== ctx.user.company_id) {
      logger.error('Company mismatch');
      throw new Error('Accès non autorisé à cette demande');
    }
    
    // Vérification stricte du rôle : seuls ADMIN et DIRECTEUR peuvent valider
    if ((!([USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR] as string[]).includes(ctx.user.role))) {
      throw new Error('Accès non autorisé - réservé aux directeurs');
    }

    if (maintenance.status !== 'DEMANDE_CREEE') {
      throw new Error('Cette demande a déjà été traitée');
    }

    const newStatus = parsedInput.action === 'validate' ? 'VALIDEE_DIRECTEUR' : 'REFUSEE';
    
    // 2. Mettre à jour le statut
    const { data: updated } = await supabase
      .from('maintenance_records')
      .update({
        status: newStatus,
        validated_at: new Date().toISOString(),
        notes_validation: parsedInput.notes,
      })
      .eq('id', parsedInput.id)
      .select()
      .single();
    
    // 3. Historique
    await addStatusHistory(
      parsedInput.id,
      maintenance.status,
      newStatus,
      ctx.user.id,
      parsedInput.notes
    );
    
    // 4. Email à l'agent de parc
    if (parsedInput.action === 'validate') {
      await sendEmail({
        to: requesterData?.email || '',
        subject: `✅ Demande validée - Prenez RDV pour ${vehicleData?.registration_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Votre demande a été validée</h2>
            
            <p>Le directeur a validé l'intervention pour <strong>${vehicleData?.registration_number}</strong>.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 0;"><strong>Prochaine étape :</strong> Prenez rendez-vous avec un garage.</p>
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/maintenance/${maintenance.id}/schedule" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📅 Prendre RDV
              </a>
            </div>
          </div>
        `,
      });
    } else {
      // Email refus
      await sendEmail({
        to: requesterData?.email || '',
        subject: `❌ Demande refusée - ${vehicleData?.registration_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #ef4444;">Demande refusée</h2>
            <p>Votre demande d'intervention pour <strong>${vehicleData?.registration_number}</strong> a été refusée.</p>
            ${parsedInput.notes ? `<p><strong>Motif :</strong> ${parsedInput.notes}</p>` : ''}
          </div>
        `,
      });
    }
    
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${parsedInput.id}`);
    return { success: true, status: newStatus };
  });

// ============================================
// 3. PRISE DE RDV (Agent de parc) + Agenda
// ============================================

export const scheduleMaintenanceRDV = authActionClient
  .schema(scheduleRDVSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    // Schedule maintenance RDV
    
    // 1. Récupérer la maintenance
    const { data: maintenance, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('id', parsedInput.maintenanceId)
      .single();
    
    // Maintenance query done
    
    if (error || !maintenance) {
      throw new Error('Demande non trouvée');
    }
    
    if (maintenance.company_id !== ctx.user.company_id) {
      throw new Error('Accès non autorisé');
    }
    
    if (maintenance.status !== 'VALIDEE_DIRECTEUR') {
      throw new Error('Cette demande doit être validée avant de prendre RDV');
    }
    
    // Récupérer les données liées
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('registration_number, brand, model')
      .eq('id', maintenance.vehicle_id)
      .single();
    const adminClient = createAdminClient();
    let requesterData: { email: string | null; first_name: string | null; last_name: string | null } | null = null;
    {
      const { data: r } = await adminClient.from('profiles').select('email, first_name, last_name').eq('id', maintenance.requested_by!).single();
      if (r && !r.email) {
        const { data: authUser } = await adminClient.auth.admin.getUserById(maintenance.requested_by!);
        requesterData = { ...r, email: authUser?.user?.email || null };
      } else {
        requesterData = r;
      }
    }

    // 2. Calculer les heures de fin
    const [hours, minutes] = parsedInput.rdvTime.split(':').map(Number);
    const startDateTime = new Date(parsedInput.rdvDate);
    startDateTime.setHours(hours, minutes);
    
    // Calculer la date/heure de fin en ajoutant jours et heures
    const endDateTime = new Date(startDateTime);
    endDateTime.setDate(endDateTime.getDate() + parsedInput.estimatedDays);
    endDateTime.setHours(endDateTime.getHours() + parsedInput.estimatedHours);
    
    const endTime = `${String(endDateTime.getHours()).padStart(2, '0')}:${String(endDateTime.getMinutes()).padStart(2, '0')}`;
    const endDate = endDateTime.toISOString().split('T')[0];
    
    // 3. Mettre à jour la maintenance
    const { data: updated } = await supabase
      .from('maintenance_records')
      .update({
        status: 'RDV_PRIS',
        garage_name: parsedInput.garageName,
        garage_address: parsedInput.garageAddress,
        garage_phone: parsedInput.garagePhone,
        rdv_date: parsedInput.rdvDate,
        rdv_time: parsedInput.rdvTime,
        rdv_confirmed_at: new Date().toISOString(),
        estimated_days: parsedInput.estimatedDays,
        estimated_hours: parsedInput.estimatedHours,
      })
      .eq('id', parsedInput.maintenanceId)
      .select()
      .single();
    
    // 4. Créer l'événement dans l'agenda
    await supabase.from('maintenance_agenda').insert({
      maintenance_id: parsedInput.maintenanceId,
      company_id: ctx.user.company_id,
      event_date: parsedInput.rdvDate,
      start_time: parsedInput.rdvTime,
      end_time: endTime,
      title: `🔧 ${vehicleData?.registration_number} - ${maintenance.type}`,
      description: `${maintenance.description} | Garage: ${parsedInput.garageName}`,
      event_type: 'RDV_GARAGE',
      attendees: maintenance.requested_by ? [maintenance.requested_by] : [],
      status: 'SCHEDULED',
      reminder_sent: false,
    });
    
    // 5. Historique
    await addStatusHistory(
      parsedInput.maintenanceId,
      maintenance.status,
      'RDV_PRIS',
      ctx.user.id,
      parsedInput.notes
    );
    
    // 6. Emails de confirmation (ADMIN + DIRECTEUR + AGENT_DE_PARC + EXPLOITANT)
    const directors = await getCompanyDirectors(ctx.user.company_id);
    const { data: exploitants } = await supabase
      .from('profiles')
      .select('id, email, first_name, last_name')
      .eq('company_id', ctx.user.company_id)
      .eq('role', USER_ROLE.EXPLOITANT);
    const recipients = [...directors, ...(exploitants || []), requesterData];

    // DEBUG TEMPORAIRE — à retirer après diagnostic
    console.log('[EMAIL DEBUG] maintenance.requested_by:', maintenance.requested_by);
    console.log('[EMAIL DEBUG] requesterData:', JSON.stringify(requesterData));
    console.log('[EMAIL DEBUG] directors:', JSON.stringify(directors.map(d => ({ email: d.email, role: 'ADMIN/DIR' }))));
    console.log('[EMAIL DEBUG] exploitants:', JSON.stringify((exploitants || []).map(e => ({ email: e.email }))));
    console.log('[EMAIL DEBUG] recipients final:', JSON.stringify(recipients.map(r => r?.email)));

    const formattedDate = format(new Date(parsedInput.rdvDate), 'EEEE d MMMM yyyy', { locale: fr });

    for (const recipient of recipients) {
      await sendEmail({
        to: recipient?.email || '',
        subject: `📅 RDV confirmé : ${vehicleData?.registration_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #3b82f6;">Rendez-vous de maintenance confirmé</h2>
            
            <div style="background: #eff6ff; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #3b82f6;">
              <p style="margin: 5px 0;"><strong>🚗 Véhicule :</strong> ${vehicleData?.registration_number}</p>
              <p style="margin: 5px 0;"><strong>📅 Date :</strong> ${formattedDate}</p>
              <p style="margin: 5px 0;"><strong>🕐 Heure :</strong> ${parsedInput.rdvTime}</p>
              <p style="margin: 5px 0;"><strong>🔧 Garage :</strong> ${parsedInput.garageName}</p>
              <p style="margin: 5px 0;"><strong>📍 Adresse :</strong> ${parsedInput.garageAddress}</p>
              ${parsedInput.garagePhone ? `<p style="margin: 5px 0;"><strong>📞 Téléphone :</strong> ${parsedInput.garagePhone}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/agenda" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📆 Voir l'agenda
              </a>
            </div>
          </div>
        `,
      });
    }
    
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${parsedInput.maintenanceId}`);
    revalidatePath('/agenda');
    return { success: true, maintenance: updated };
  });

// ============================================
// 4. INTERVENTION TERMINÉE (Agent de parc)
// ============================================

export const completeMaintenance = authActionClient
  .schema(completeMaintenanceSchema)
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { data: maintenance, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('id', parsedInput.maintenanceId)
      .single();
    
    if (error || !maintenance) {
      throw new Error('Demande non trouvée');
    }
    
    if (maintenance.company_id !== ctx.user.company_id) {
      throw new Error('Accès non autorisé');
    }
    
    if (maintenance.status !== 'RDV_PRIS' && maintenance.status !== 'EN_COURS') {
      throw new Error('Le RDV doit être pris avant de terminer l\'intervention');
    }
    
    // Récupérer les données liées
    const { data: vehicleData } = await supabase
      .from('vehicles')
      .select('registration_number, brand, model')
      .eq('id', maintenance.vehicle_id)
      .single();
    const adminClientComplete = createAdminClient();
    let requesterData: { email: string | null; first_name: string | null; last_name: string | null } | null = null;
    {
      const { data: r } = await adminClientComplete.from('profiles').select('email, first_name, last_name').eq('id', maintenance.requested_by!).single();
      if (r && !r.email) {
        const { data: authUser } = await adminClientComplete.auth.admin.getUserById(maintenance.requested_by!);
        requesterData = { ...r, email: authUser?.user?.email || null };
      } else {
        requesterData = r;
      }
    }

    // 1. Mettre à jour la maintenance
    const { data: updated } = await supabase
      .from('maintenance_records')
      .update({
        status: 'TERMINEE',
        completed_at: new Date().toISOString(),
        final_cost: parsedInput.finalCost,
        invoice_document_url: parsedInput.invoiceDocument,
        notes_completion: parsedInput.completionNotes,
      })
      .eq('id', parsedInput.maintenanceId)
      .select()
      .single();
    
    // 2. Mettre à jour l'événement agenda
    await supabase
      .from('maintenance_agenda')
      .update({ status: 'COMPLETED' })
      .eq('maintenance_id', parsedInput.maintenanceId);
    
    // 3. Historique
    await addStatusHistory(
      parsedInput.maintenanceId,
      maintenance.status,
      'TERMINEE',
      ctx.user.id,
      parsedInput.completionNotes
    );

    // 4. Mise à jour des dates réglementaires sur la fiche véhicule (CT/Tachy/ATP)
    // Cela garantit que les prédictions utilisent la bonne date de référence
    const descriptionLower = (maintenance.description || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const typeLower = (maintenance.type || '').toLowerCase();
    
    // Détection plus robuste : description OU type contient les mots-clés
    const isCT = descriptionLower.includes('controle technique') || 
                 descriptionLower.includes('control technique') ||
                 typeLower.includes('inspection') ||
                 descriptionLower.includes('ct ');
                 
    const isTachy = descriptionLower.includes('tachygraphe') || 
                    descriptionLower.includes('tachy') ||
                    descriptionLower.includes('calibration');
                    
    const isATP = descriptionLower.includes('atp') || 
                  descriptionLower.includes('attestation transporteur');
    
    logger.debug('[MAINTENANCE-WORKFLOW] Détection CT/Tachy/ATP:', { 
      description: maintenance.description, 
      type: maintenance.type,
      isCT, 
      isTachy,
      isATP,
      descriptionNormalized: descriptionLower
    });
    
    if (isCT || isTachy || isATP) {
      const completedDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
      const vehicleUpdate: Database['public']['Tables']['vehicles']['Update'] = {};
      
      if (isCT) {
        vehicleUpdate.technical_control_date = completedDate;
      }
      if (isTachy) {
        vehicleUpdate.tachy_control_date = completedDate;
      }
      if (isATP) {
        vehicleUpdate.atp_date = completedDate;
      }
      
      try {
        const { error: updateError } = await supabase
          .from('vehicles')
          .update(vehicleUpdate)
          .eq('id', maintenance.vehicle_id);
          
        if (updateError) {
          logger.error('[MAINTENANCE-WORKFLOW] Erreur SQL maj fiche véhicule:', updateError);
        } else {
          logger.debug('[MAINTENANCE-WORKFLOW] Date réglementaire mise à jour avec succès:', vehicleUpdate);
        }
      } catch (vehicleError) {
        logger.error('[MAINTENANCE-WORKFLOW] Exception maj fiche véhicule:', vehicleError);
      }
    } else {
      logger.debug('[MAINTENANCE-WORKFLOW] Pas de mise à jour réglementaire (pas CT/Tachy détecté)');
    }
    
    // 5. Recalcul immédiat des prédictions (CORRECTION P1)
    // Le cron quotidien prendra le relais si cette étape échoue
    try {
      await recalculatePredictionsForVehicle(maintenance.vehicle_id)
    } catch (recalcError) {
      logger.error('[MAINTENANCE] Recalcul prédictions non critique:', recalcError)
    }
    
    // 4. Email confirmation à tous
    const directors = await getCompanyDirectors(ctx.user.company_id);
    const recipients = [...directors, requesterData];
    
    for (const recipient of recipients) {
      await sendEmail({
        to: recipient?.email || '',
        subject: `✅ Intervention terminée : ${vehicleData?.registration_number}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #10b981;">Intervention de maintenance terminée</h2>
            
            <p>Le véhicule <strong>${vehicleData?.registration_number}</strong> est de nouveau disponible.</p>
            
            <div style="background: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #10b981;">
              <p style="margin: 5px 0;"><strong>🔧 Type :</strong> ${maintenance.type}</p>
              <p style="margin: 5px 0;"><strong>💰 Coût final :</strong> ${parsedInput.finalCost}€</p>
              ${parsedInput.completionNotes ? `<p style="margin: 5px 0;"><strong>📝 Notes :</strong> ${parsedInput.completionNotes}</p>` : ''}
            </div>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.NEXT_PUBLIC_APP_URL}/maintenance/${maintenance.id}" 
                 style="background: #3b82f6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
                📋 Voir les détails
              </a>
            </div>
          </div>
        `,
      });
    }
    
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${parsedInput.maintenanceId}`);
    revalidatePath('/agenda');
    return { success: true, maintenance: updated };
  });

// ============================================
// GETTERS
// ============================================

export const getMaintenanceRequests = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('company_id', ctx.user.company_id)
      .order('requested_at', { ascending: false });

    if (error) {
      throw new Error(`Erreur récupération: ${error.message}`);
    }

    return { success: true, data: data || [] };
  });

export const getMaintenanceById = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { data: maintenance, error } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id)
      .single();
    
    if (error) {
      throw new Error('Demande non trouvée');
    }
    
    // Récupérer l'historique des statuts
    const { data: history } = await supabase
      .from('maintenance_status_history')
      .select('*, user:profiles(first_name, last_name)')
      .eq('maintenance_id', parsedInput.id)
      .order('changed_at', { ascending: true });
    
    // Récupérer l'événement agenda
    const { data: agendaEvent } = await supabase
      .from('maintenance_agenda')
      .select('*')
      .eq('maintenance_id', parsedInput.id)
      .eq('company_id', ctx.user.company_id)
      .maybeSingle();
    
    // NOTE: maintenance_records utilise string pour type/priority/status
    // alors que le composant attend des unions strictes — à aligner dans une session dédiée
    return { success: true, data: { ...(maintenance as unknown as Record<string, unknown>), history: history || [], agendaEvent } };
  });

export const getAgendaEvents = authActionClient
  .schema(z.object({ 
    startDate: z.string().optional(),
    endDate: z.string().optional(),
  }).default({}))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    let query = supabase
      .from('maintenance_agenda')
      .select('*')
      .eq('company_id', ctx.user.company_id);
    
    if (parsedInput.startDate) {
      query = query.gte('event_date', parsedInput.startDate);
    }
    if (parsedInput.endDate) {
      query = query.lte('event_date', parsedInput.endDate);
    }
    
    const { data, error } = await query.order('event_date', { ascending: true });
    
    if (error) {
      throw new Error(`Erreur récupération agenda: ${error.message}`);
    }
    
    return { success: true, data: data || [] };
  });

export const markMaintenanceInProgress = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    
    const { data: maintenance } = await supabase
      .from('maintenance_records')
      .select('status')
      .eq('id', parsedInput.id)
      .eq('company_id', ctx.user.company_id)
      .single();
    
    if (!maintenance || maintenance.status !== 'RDV_PRIS') {
      throw new Error('Le RDV doit être confirmé avant de marquer comme en cours');
    }
    
    const { data: updated } = await supabase
      .from('maintenance_records')
      .update({ status: 'EN_COURS' })
      .eq('id', parsedInput.id)
      .select()
      .single();
    
    await addStatusHistory(parsedInput.id, 'RDV_PRIS', 'EN_COURS', ctx.user.id);
    
    revalidatePath('/maintenance');
    revalidatePath(`/maintenance/${parsedInput.id}`);
    return { success: true, maintenance: updated };
  });

// ============================================
// WORKFLOW DE STATUT - Gestion des transitions (déplacé depuis maintenance.ts)
// ============================================

const ALLOWED_MANAGER_ROLES = [USER_ROLE.ADMIN, 'MANAGER', USER_ROLE.DIRECTEUR];

/**
 * Met à jour le statut d'une maintenance avec validation des transitions
 * Visible UNIQUEMENT pour roles admin et manager
 */
export async function updateMaintenanceStatus(
  maintenanceId: string,
  newStatus: string,
  additionalData?: { scheduled_date?: string; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient();
  
  // Vérifier l'authentification et le rôle
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return { success: false, error: 'Non authentifié' };
  }
  
  // Récupérer le profil pour vérifier le rôle
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, company_id')
    .eq('id', user.id)
    .single();
  
  if (profileError || !profile) {
    return { success: false, error: 'Profil utilisateur non trouvé' };
  }
  
  if (!ALLOWED_MANAGER_ROLES.includes(profile.role)) {
    return { success: false, error: 'Accès refusé - Réservé aux administrateurs et managers' };
  }
  
  // Définition des transitions valides
  const TRANSITIONS: Record<string, string[]> = {
    'DEMANDE_CREEE': ['VALIDEE', 'REFUSEE'],
    'VALIDEE': ['RDV_PRIS'],
    'VALIDEE_DIRECTEUR': ['RDV_PRIS'],
    'RDV_PRIS': ['EN_COURS'],
    'EN_COURS': ['TERMINEE'],
    'TERMINEE': [],
    'REFUSEE': ['DEMANDE_CREEE']
  };
  
  // Récupérer le statut actuel
  const { data: current, error: fetchError } = await supabase
    .from('maintenance_records')
    .select('status, company_id')
    .eq('id', maintenanceId)
    .single();
  
  if (fetchError || !current) {
    return { success: false, error: 'Intervention non trouvée' };
  }
  
  // Vérifier l'appartenance à la company
  if (current.company_id !== profile.company_id && profile.role !== USER_ROLE.ADMIN) {
    return { success: false, error: 'Accès non autorisé à cette intervention' };
  }
  
  // Vérifier que la transition est valide
  const allowedTransitions = TRANSITIONS[current.status] || [];
  if (!allowedTransitions.includes(newStatus)) {
    return { success: false, error: `Transition de statut invalide: ${current.status} → ${newStatus}` };
  }
  
  // Préparer les données de mise à jour
  const updateData: Record<string, unknown> = {
    status: newStatus,
    updated_at: new Date().toISOString(),
  };
  
  // Ajouter les données additionnelles
  if (additionalData?.scheduled_date) {
    updateData.scheduled_date = additionalData.scheduled_date;
  }
  if (additionalData?.notes) {
    updateData.notes = additionalData.notes;
  }
  
  // Si passage à TERMINEE, ajouter completed_at
  if (newStatus === 'TERMINEE') {
    updateData.completed_at = new Date().toISOString();
  }
  
  // Si passage à VALIDEE, enregistrer validated_at
  if (newStatus === 'VALIDEE') {
    updateData.validated_at = new Date().toISOString();
  }
  
  // Exécuter la mise à jour
  const { error: updateError } = await supabase
    .from('maintenance_records')
    .update(updateData)
    .eq('id', maintenanceId);
  
  if (updateError) {
    return { success: false, error: updateError.message };
  }
  
  // Ajouter l'historique de statut
  await supabase.from('maintenance_status_history').insert({
    maintenance_id: maintenanceId,
    old_status: current.status,
    new_status: newStatus,
    changed_by: user.id,
    notes: additionalData?.notes,
  });
  
  // Revalidation des chemins
  revalidatePath('/maintenance');
  revalidatePath(`/maintenance/${maintenanceId}`);
  
  return { success: true };
}
