'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { authActionClient, idSchema } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';

// Types explicites pour les véhicules et chauffeurs
interface Vehicle {
  id: string;
  registration_number: string;
  type: string;
  insurance_expiry: string | null;
  technical_control_expiry: string | null;
  technical_control_date: string | null;
  tachy_control_expiry: string | null;
  tachy_control_date: string | null;
  atp_expiry: string | null;
  atp_date: string | null;
  next_maintenance_date: string | null;
}

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  license_expiry: string | null;
}

interface Alert {
  company_id: string;
  vehicle_id?: string;
  driver_id?: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  message: string;
  status?: 'unread' | 'read';
}

// Créer une alerte avec toutes les échéances réglementaires
export const createAlert = authActionClient
  .action(async ({ ctx }) => {
    if (!ctx.user.company_id) {
      throw new Error('Company ID manquant - onboarding requis');
    }
    
    const supabase = await createClient();
    
    // Récupérer tous les véhicules de l'entreprise (RLS filtre automatiquement)
    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select(`
        id, 
        registration_number, 
        type,
        insurance_expiry, 
        technical_control_expiry, 
        technical_control_date,
        tachy_control_expiry,
        tachy_control_date,
        atp_expiry,
        atp_date,
        next_maintenance_date
      `);
    
    // Récupérer tous les chauffeurs (RLS filtre automatiquement)
    const { data: driversData } = await supabase
      .from('drivers')
      .select('id, first_name, last_name, license_expiry');
    
    const vehicles = (vehiclesData || []) as Vehicle[];
    const drivers = (driversData || []) as Driver[];
    
    const alerts: Alert[] = [];
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    // Vérifier les véhicules
    for (const vehicle of vehicles) {
      // Assurance
      if (vehicle.insurance_expiry) {
        const expiry = new Date(vehicle.insurance_expiry);
        if (expiry <= thirtyDaysFromNow) {
          alerts.push({
            company_id: ctx.user.company_id,
            vehicle_id: vehicle.id,
            type: 'insurance',
            severity: expiry < now ? 'critical' : 'high',
            title: 'Assurance à renouveler',
            message: `Le véhicule ${vehicle.registration_number} a son assurance qui expire le ${expiry.toLocaleDateString('fr-FR')}`,
            status: 'unread',
          });
        }
      }
      
      // Contrôle technique
      if (vehicle.technical_control_expiry) {
        const expiry = new Date(vehicle.technical_control_expiry);
        if (expiry <= thirtyDaysFromNow) {
          alerts.push({
            company_id: ctx.user.company_id,
            vehicle_id: vehicle.id,
            type: 'vehicle_issue',
            severity: expiry < now ? 'critical' : 'high',
            title: 'Contrôle technique à renouveler',
            message: `Le CT du véhicule ${vehicle.registration_number} expire le ${expiry.toLocaleDateString('fr-FR')}`,
            status: 'unread',
          });
        }
      }
      
      // Tachygraphe (PL et PL Frigo uniquement)
      if (vehicle.tachy_control_expiry) {
        const expiry = new Date(vehicle.tachy_control_expiry);
        if (expiry <= thirtyDaysFromNow) {
          alerts.push({
            company_id: ctx.user.company_id,
            vehicle_id: vehicle.id,
            type: 'tachy_control',
            severity: expiry < now ? 'critical' : 'high',
            title: 'Contrôle tachygraphe à renouveler',
            message: `Le contrôle tachygraphe du véhicule ${vehicle.registration_number} expire le ${expiry.toLocaleDateString('fr-FR')}`,
            status: 'unread',
          });
        }
      }
      
      // ATP (pour véhicules frigorifiques)
      if (vehicle.atp_expiry) {
        const expiry = new Date(vehicle.atp_expiry);
        if (expiry <= thirtyDaysFromNow) {
          alerts.push({
            company_id: ctx.user.company_id,
            vehicle_id: vehicle.id,
            type: 'atp',
            severity: expiry < now ? 'critical' : 'high',
            title: 'Certificat ATP à renouveler',
            message: `Le certificat ATP du véhicule frigorifique ${vehicle.registration_number} expire le ${expiry.toLocaleDateString('fr-FR')}`,
            status: 'unread',
          });
        }
      }
      
      // Maintenance préventive
      if (vehicle.next_maintenance_date) {
        const maintenance = new Date(vehicle.next_maintenance_date);
        if (maintenance <= thirtyDaysFromNow) {
          alerts.push({
            company_id: ctx.user.company_id,
            vehicle_id: vehicle.id,
            type: 'maintenance',
            severity: maintenance < now ? 'critical' : 'medium',
            title: 'Maintenance préventive due',
            message: `La maintenance préventive du véhicule ${vehicle.registration_number} est prévue pour le ${maintenance.toLocaleDateString('fr-FR')}`,
            status: 'unread',
          });
        }
      }
    }
    
    // Vérifier les chauffeurs
    for (const driver of drivers) {
      if (driver.license_expiry) {
        const expiry = new Date(driver.license_expiry);
        if (expiry <= thirtyDaysFromNow) {
          alerts.push({
            company_id: ctx.user.company_id,
            driver_id: driver.id,
            type: 'license',
            severity: expiry < now ? 'critical' : 'high',
            title: 'Permis à renouveler',
            message: `Le permis de ${driver.first_name} ${driver.last_name} expire le ${expiry.toLocaleDateString('fr-FR')}`,
            status: 'unread',
          });
        }
      }
    }
    
    // Supprimer les anciennes alertes (RLS filtre automatiquement par company_id)
    await supabase
      .from('alerts')
      .delete();
    
    // Insérer les nouvelles alertes
    if (alerts.length > 0) {
      await supabase.from('alerts').insert(alerts);
    }
    
    revalidatePath('/alerts');
    return { count: alerts.length };
  });

// Récupérer les alertes
export const getAlerts = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    // RLS filtre automatiquement les alertes de l'entreprise
    const { data: alerts, error } = await supabase
      .from('alerts')
      .select(`
        *,
        vehicles:vehicle_id(registration_number, brand, model),
        drivers:driver_id(first_name, last_name)
      `)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return alerts || [];
  });

// Marquer une alerte comme lue
export const markAlertAsRead = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ ctx, parsedInput }) => {
    const supabase = await createClient();
    
    // Vérifier que l'alerte existe et appartient à l'entreprise (RLS)
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('id', (parsedInput as { id: string }).id)
      .single();
    
    if (!existing) {
      throw new Error('Alerte non trouvée');
    }
    
    await supabase
      .from('alerts')
      .update({ status: 'read' } as any)
      .eq('id', (parsedInput as { id: string }).id);
    
    revalidatePath('/alerts');
    return { success: true };
  });

// Supprimer une alerte
export const deleteAlert = authActionClient
  .schema(z.object({ id: z.string().uuid() }))
  .action(async ({ ctx, parsedInput }) => {
    const supabase = await createClient();
    
    // Vérifier que l'alerte existe et appartient à l'entreprise (RLS)
    const { data: existing } = await supabase
      .from('alerts')
      .select('id')
      .eq('id', (parsedInput as { id: string }).id)
      .single();
    
    if (!existing) {
      throw new Error('Alerte non trouvée');
    }
    
    await supabase
      .from('alerts')
      .delete()
      .eq('id', (parsedInput as { id: string }).id);
    
    revalidatePath('/alerts');
    return { success: true };
  });

// Marquer toutes les alertes comme lues
export const markAllAlertsAsRead = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    // RLS filtre automatiquement les alertes de l'entreprise
    await supabase
      .from('alerts')
      .update({ status: 'read' } as any)
      .eq('status', 'unread');
    
    revalidatePath('/alerts');
    return { success: true };
  });

// Vérifier les alertes critiques (pour dashboard)
export const getCriticalAlertsCount = authActionClient
  .action(async ({ ctx }) => {
    const supabase = await createClient();
    
    // Récupérer les véhicules avec contrôles techniques expirant bientôt (RLS filtre automatiquement)
    const { data: vehiclesData } = await supabase
      .from('vehicles')
      .select('id, technical_control_expiry, tachy_control_expiry');
    
    const vehicles = (vehiclesData || []) as Array<{
      id: string;
      technical_control_expiry: string | null;
      tachy_control_expiry: string | null;
    }>;
    
    const now = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    
    let criticalCount = 0;
    
    for (const vehicle of vehicles) {
      if (vehicle.technical_control_expiry) {
        const expiry = new Date(vehicle.technical_control_expiry);
        if (expiry <= thirtyDaysFromNow) {
          criticalCount++;
        }
      }
      if (vehicle.tachy_control_expiry) {
        const expiry = new Date(vehicle.tachy_control_expiry);
        if (expiry <= thirtyDaysFromNow) {
          criticalCount++;
        }
      }
    }
    
    return { count: criticalCount };
  });
