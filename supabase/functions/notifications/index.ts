/**
 * Supabase Edge Function pour le traitement des notifications
 * Déclenchée par webhooks pour:
 * - Maintenance due (cron schedule)
 * - Document expiry (cron schedule)
 * - Fuel anomalies (trigger)
 * - Geofencing events (trigger)
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

// Types
interface NotificationPayload {
  userId: string;
  companyId: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  data?: Record<string, unknown>;
}

interface MaintenanceRecord {
  id: string;
  vehicle_id: string;
  company_id: string;
  service_type: string;
  service_date: string;
  next_service_date: string | null;
  status: string;
  vehicle: {
    name: string;
    plate_number: string;
  };
}

interface VehicleDocument {
  id: string;
  vehicle_id: string;
  company_id: string;
  type: string;
  expiry_date: string;
  vehicle: {
    name: string;
    plate_number: string;
  };
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    
    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Missing Supabase environment variables');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { action } = await req.json();
    
    let result;
    switch (action) {
      case 'check_maintenance':
        result = await checkMaintenanceDue(supabase);
        break;
      case 'check_documents':
        result = await checkDocumentExpiry(supabase);
        break;
      case 'process_fuel_alert':
        result = await processFuelAlert(supabase, await req.json());
        break;
      case 'process_geofence':
        result = await processGeofenceEvent(supabase, await req.json());
        break;
      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({ error: (error as Error).message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400 
      }
    );
  }
});

/**
 * Vérifie les maintenances dues et expirées
 */
async function checkMaintenanceDue(supabase: ReturnType<typeof createClient>) {
  const now = new Date();
  const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const in3Days = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000);
  
  const notifications: NotificationPayload[] = [];

  // Récupérer les maintenances avec véhicule
  const { data: maintenances } = await supabase
    .from('maintenance_records')
    .select(`
      id,
      vehicle_id,
      company_id,
      service_type,
      service_date,
      next_service_date,
      status,
      vehicles!inner(name, plate_number)
    `)
    .eq('status', 'scheduled')
    .not('next_service_date', 'is', null);

  if (!maintenances) return { processed: 0 };

  for (const m of maintenances as unknown as MaintenanceRecord[]) {
    const nextDate = new Date(m.next_service_date!);
    const daysUntil = Math.ceil((nextDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let type: string;
    let priority: NotificationPayload['priority'];
    let shouldNotify = false;

    if (daysUntil < 0) {
      type = 'maintenance_overdue';
      priority = 'critical';
      shouldNotify = true;
    } else if (daysUntil <= 1) {
      type = 'maintenance_due';
      priority = 'critical';
      shouldNotify = true;
    } else if (daysUntil <= 3) {
      type = 'maintenance_due';
      priority = 'high';
      shouldNotify = true;
    } else if (daysUntil <= 7) {
      type = 'maintenance_due';
      priority = 'medium';
      shouldNotify = true;
    }

    if (shouldNotify) {
      // Récupérer les utilisateurs de l'entreprise
      const { data: users } = await supabase
        .from('profiles')
        .select('id')
        .eq('company_id', m.company_id)
        .eq('status', 'active');

      for (const user of users || []) {
        notifications.push({
          userId: user.id,
          companyId: m.company_id,
          type,
          priority,
          title: `Maintenance ${daysUntil < 0 ? 'en retard' : 'prévue'}`,
          message: `${m.vehicle.name} (${m.vehicle.plate_number}) - ${m.service_type}${daysUntil < 0 ? ` (depuis ${Math.abs(daysUntil)} jours)` : ` dans ${daysUntil} jours`}`,
          data: {
            maintenanceId: m.id,
            vehicleId: m.vehicle_id,
            vehicleName: m.vehicle.name,
            serviceType: m.service_type,
            dueDate: m.next_service_date,
            daysUntil,
          },
        });
      }
    }
  }

  // Créer les notifications
  const created = await createNotifications(supabase, notifications);
  
  return { processed: maintenances.length, notificationsCreated: created };
}

/**
 * Vérifie les documents expirants/expirés
 */
async function checkDocumentExpiry(supabase: ReturnType<typeof createClient>) {
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  
  const notifications: NotificationPayload[] = [];

  // Récupérer les documents
  const { data: documents } = await supabase
    .from('vehicle_documents')
    .select(`
      id,
      vehicle_id,
      company_id,
      type,
      expiry_date,
      vehicles!inner(name, plate_number)
    `)
    .lte('expiry_date', in30Days.toISOString());

  if (!documents) return { processed: 0 };

  for (const doc of documents as unknown as VehicleDocument[]) {
    const expiryDate = new Date(doc.expiry_date);
    const daysUntil = Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    let type: string;
    let priority: NotificationPayload['priority'];

    if (daysUntil < 0) {
      type = 'document_expired';
      priority = 'critical';
    } else if (daysUntil <= 7) {
      type = 'document_expiring';
      priority = 'high';
    } else if (daysUntil <= 30) {
      type = 'document_expiring';
      priority = 'medium';
    } else {
      continue;
    }

    // Récupérer les utilisateurs
    const { data: users } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', doc.company_id)
      .eq('status', 'active');

    for (const user of users || []) {
      notifications.push({
        userId: user.id,
        companyId: doc.company_id,
        type,
        priority,
        title: `${doc.type} ${daysUntil < 0 ? 'expiré' : 'expirant'}`,
        message: `${doc.vehicle.name} - ${doc.type}${daysUntil < 0 ? ` (expiré depuis ${Math.abs(daysUntil)} jours)` : ` expire dans ${daysUntil} jours`}`,
        data: {
          documentId: doc.id,
          vehicleId: doc.vehicle_id,
          documentType: doc.type,
          expiryDate: doc.expiry_date,
          daysUntil,
        },
      });
    }
  }

  const created = await createNotifications(supabase, notifications);
  
  return { processed: documents.length, notificationsCreated: created };
}

/**
 * Traite une alerte de carburant
 */
async function processFuelAlert(
  supabase: ReturnType<typeof createClient>,
  data: { vehicleId: string; type: string; message: string; details: Record<string, unknown> }
) {
  const { vehicleId, type, message, details } = data;
  
  // Récupérer le véhicule et l'entreprise
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('company_id, name, plate_number')
    .eq('id', vehicleId)
    .single();

  if (!vehicle) return { error: 'Vehicle not found' };

  // Récupérer les utilisateurs
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', vehicle.company_id)
    .eq('status', 'active');

  const notifications: NotificationPayload[] = (users || []).map((u) => ({
    userId: u.id,
    companyId: vehicle.company_id,
    type: type as string,
    priority: type === 'fuel_low' ? 'high' : 'medium',
    title: type === 'fuel_low' ? 'Niveau carburant bas' : 'Anomalie carburant',
    message: `${vehicle.name}: ${message}`,
    data: {
      vehicleId,
      vehicleName: vehicle.name,
      ...details,
    },
  }));

  const created = await createNotifications(supabase, notifications);
  
  return { notificationsCreated: created };
}

/**
 * Traite un événement de géolocalisation
 */
async function processGeofenceEvent(
  supabase: ReturnType<typeof createClient>,
  data: { vehicleId: string; zoneId: string; event: 'enter' | 'exit'; location: Record<string, unknown> }
) {
  const { vehicleId, zoneId, event, location } = data;
  
  // Récupérer le véhicule
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('company_id, name, plate_number')
    .eq('id', vehicleId)
    .single();

  if (!vehicle) return { error: 'Vehicle not found' };

  // Récupérer la zone
  const { data: zone } = await supabase
    .from('geofence_zones')
    .select('name')
    .eq('id', zoneId)
    .single();

  // Récupérer les utilisateurs
  const { data: users } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', vehicle.company_id)
    .eq('status', 'active');

  const notifications: NotificationPayload[] = (users || []).map((u) => ({
    userId: u.id,
    companyId: vehicle.company_id,
    type: `geofencing_${event}` as string,
    priority: 'medium',
    title: `Géolocalisation: ${event === 'enter' ? 'Entrée' : 'Sortie'}`,
    message: `${vehicle.name} a ${event === 'enter' ? 'entré dans' : 'quitté'} ${zone?.name || 'une zone'}`,
    data: {
      vehicleId,
      zoneId,
      zoneName: zone?.name,
      location,
    },
  }));

  const created = await createNotifications(supabase, notifications);
  
  return { notificationsCreated: created };
}

/**
 * Crée les notifications en base de données
 */
async function createNotifications(
  supabase: ReturnType<typeof createClient>,
  notifications: NotificationPayload[]
): Promise<number> {
  if (notifications.length === 0) return 0;

  // Dédupliquer par userId + type + entityId (dans data)
  const seen = new Set<string>();
  const uniqueNotifications = notifications.filter((n) => {
    const entityId = (n.data?.maintenanceId || n.data?.documentId || n.data?.vehicleId || '') as string;
    const key = `${n.userId}-${n.type}-${entityId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Vérifier les préférences avant insertion
  const notificationsToCreate: Array<{
    user_id: string;
    company_id: string;
    type: string;
    priority: string;
    title: string;
    message: string;
    data: Record<string, unknown>;
    channels: string[];
  }> = [];

  for (const n of uniqueNotifications) {
    const { data: prefs } = await supabase
      .from('notification_preferences')
      .select('*')
      .eq('user_id', n.userId)
      .single();

    // Déterminer les canaux selon les préférences
    const channels: string[] = [];
    const typeKey = n.type.replace(/_(enter|exit)$/, ''); // geofencing_enter -> geofencing
    
    if (prefs?.in_app_enabled && prefs[`${typeKey}_in_app`] !== false) {
      channels.push('in_app');
    }
    if (prefs?.email_enabled && prefs[`${typeKey}_email`] !== false && n.priority !== 'low') {
      channels.push('email');
    }
    if (prefs?.push_enabled && prefs[`${typeKey}_push`] === true) {
      channels.push('push');
    }

    if (channels.length > 0) {
      notificationsToCreate.push({
        user_id: n.userId,
        company_id: n.companyId,
        type: n.type,
        priority: n.priority,
        title: n.title,
        message: n.message,
        data: n.data || {},
        channels,
      });
    }
  }

  if (notificationsToCreate.length === 0) return 0;

  const { error } = await supabase
    .from('notifications')
    .insert(notificationsToCreate);

  if (error) {
    console.error('Error creating notifications:', error);
    return 0;
  }

  return notificationsToCreate.length;
}
