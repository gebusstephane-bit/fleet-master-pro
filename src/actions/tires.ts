'use server';

/**
 * Actions Pneumatiques — FleetMaster Pro
 * Auth pattern: createClient + getUser + profiles (même que vehicles.ts)
 */

import { createClient } from '@/lib/supabase/server';
import { TREAD_DEPTH_THRESHOLDS } from '@/lib/axle-configurations';

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface ActionResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
}

export type StockTire = {
  id: string;
  brand: string;
  model: string | null;
  dimensions: string;
  tread_depth_current: number | null;
  tread_depth_new: number | null;
  purchase_price: number | null;
  purchase_date: string | null;
  dot_code: string | null;
  tire_type: string | null;
};

export type ActiveMounting = {
  mounting_id: string;
  axle_position: string;
  mount_type: 'simple' | 'jumele_ext' | 'jumele_int';
  mounted_date: string;
  mounted_km: number;
  tire_id: string;
  brand: string;
  model: string | null;
  dimensions: string;
  tread_depth_current: number | null;
};

export type VehicleTireStateData = {
  config: {
    id: string;
    axle_formula: string;
    axle_details: unknown[];
    reference_dimensions: Record<string, string>;
  } | null;
  activeMountings: ActiveMounting[];
  criticalCount: number;
  warningCount: number;
};

export type TireHistoryEntry = {
  mounting_id: string;
  axle_position: string;
  mount_type: string;
  mounted_date: string;
  mounted_km: number;
  unmounted_date: string | null;
  unmounted_km: number | null;
  reason_unmounted: string | null;
  destination: string | null;
  tire_id: string;
  brand: string;
  dimensions: string;
  purchase_price: number | null;
};

export type TireCostData = {
  total_spent: number;
  tire_count: number;
  avg_cost_per_tire: number;
};

// ----------------------------------------------------------------
// Helper auth
// ----------------------------------------------------------------

async function getAuthProfile(supabase: Awaited<ReturnType<typeof createClient>>) {
  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return null;

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('company_id, role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile?.company_id) return null;
  return profile as { company_id: string; role: string };
}

// ----------------------------------------------------------------
// 1. Sauvegarder la configuration essieux d'un véhicule
// ----------------------------------------------------------------

export async function saveAxleConfig(
  vehicleId: string,
  formula: string,
  axleDetails: unknown[],
  referenceDimensions: Record<string, string>
): Promise<ActionResult> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  if (!['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'].includes(profile.role)) {
    return { success: false, error: 'Permissions insuffisantes' };
  }

  const { error } = await supabase
    .from('vehicle_axle_configs')
    .upsert(
      {
        vehicle_id: vehicleId,
        company_id: profile.company_id,
        axle_formula: formula,
        axle_details: axleDetails as never,
        reference_dimensions: referenceDimensions as never,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'vehicle_id' }
    );

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ----------------------------------------------------------------
// 2. État actuel de tous les pneus d'un véhicule
// ----------------------------------------------------------------

export async function getVehicleTireState(
  vehicleId: string
): Promise<ActionResult<VehicleTireStateData>> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  // Config essieux
  const { data: config } = await supabase
    .from('vehicle_axle_configs')
    .select('id, axle_formula, axle_details, reference_dimensions')
    .eq('vehicle_id', vehicleId)
    .maybeSingle();

  // Montages actifs
  const { data: mountingsRaw, error: mountErr } = await supabase
    .from('tire_mountings')
    .select('id, axle_position, mount_type, mounted_date, mounted_km, tire_id')
    .eq('vehicle_id', vehicleId)
    .is('unmounted_date', null);

  if (mountErr) return { success: false, error: mountErr.message };

  const mountings = mountingsRaw ?? [];

  // Infos pneus
  const tireIds = mountings.map(m => m.tire_id);
  let tiresMap: Record<string, { brand: string; model: string | null; dimensions: string; tread_depth_current: number | null }> = {};

  if (tireIds.length > 0) {
    const { data: tiresRaw } = await supabase
      .from('tires')
      .select('id, brand, model, dimensions, tread_depth_current')
      .in('id', tireIds);

    for (const t of tiresRaw ?? []) {
      tiresMap[t.id] = t;
    }
  }

  const activeMountings: ActiveMounting[] = mountings.map(m => ({
    mounting_id: m.id,
    axle_position: m.axle_position,
    mount_type: m.mount_type as 'simple' | 'jumele_ext' | 'jumele_int',
    mounted_date: m.mounted_date,
    mounted_km: m.mounted_km,
    tire_id: m.tire_id,
    brand: tiresMap[m.tire_id]?.brand ?? 'Inconnu',
    model: tiresMap[m.tire_id]?.model ?? null,
    dimensions: tiresMap[m.tire_id]?.dimensions ?? '',
    tread_depth_current: tiresMap[m.tire_id]?.tread_depth_current ?? null,
  }));

  const criticalCount = activeMountings.filter(
    m => m.tread_depth_current != null && m.tread_depth_current <= TREAD_DEPTH_THRESHOLDS.critical
  ).length;

  const warningCount = activeMountings.filter(
    m => m.tread_depth_current != null &&
      m.tread_depth_current > TREAD_DEPTH_THRESHOLDS.critical &&
      m.tread_depth_current <= TREAD_DEPTH_THRESHOLDS.warning
  ).length;

  return {
    success: true,
    data: {
      config: config
        ? {
            id: config.id,
            axle_formula: config.axle_formula,
            axle_details: (config.axle_details as unknown[]) ?? [],
            reference_dimensions: (config.reference_dimensions as Record<string, string>) ?? {},
          }
        : null,
      activeMountings,
      criticalCount,
      warningCount,
    },
  };
}

// ----------------------------------------------------------------
// 3. Pneus en stock
// ----------------------------------------------------------------

export async function getStockTires(): Promise<ActionResult<StockTire[]>> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  const { data, error } = await supabase
    .from('tires')
    .select('id, brand, model, dimensions, tread_depth_current, tread_depth_new, purchase_price, purchase_date, dot_code, tire_type')
    .eq('company_id', profile.company_id)
    .eq('status', 'in_stock')
    .order('brand');

  if (error) return { success: false, error: error.message };
  return { success: true, data: (data ?? []) as StockTire[] };
}

// ----------------------------------------------------------------
// 4. Monter un pneu
// ----------------------------------------------------------------

export async function mountTire(params: {
  vehicleId: string;
  position: string;
  mountType: 'simple' | 'jumele_ext' | 'jumele_int';
  tireId?: string;
  tireData?: {
    brand: string;
    dimensions: string;
    model?: string;
    purchase_price?: number;
    purchase_date?: string;
    tread_depth_new?: number;
    dot_code?: string;
  };
  mountedKm: number;
  mountedDate: string;
  treadDepthAtMount?: number;
  performedBy?: string;
  garageName?: string;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  if (!['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'].includes(profile.role)) {
    return { success: false, error: 'Permissions insuffisantes' };
  }

  // Vérifier qu'aucun pneu n'est déjà monté à cette position
  const { data: existing } = await supabase
    .from('tire_mountings')
    .select('id')
    .eq('vehicle_id', params.vehicleId)
    .eq('axle_position', params.position)
    .is('unmounted_date', null)
    .maybeSingle();

  if (existing) {
    return { success: false, error: 'Un pneu est déjà monté à cette position. Démontez-le d\'abord.' };
  }

  let tireId = params.tireId;

  if (!tireId && params.tireData) {
    // Créer le nouveau pneu
    const { data: newTire, error: insertErr } = await supabase
      .from('tires')
      .insert({
        company_id: profile.company_id,
        brand: params.tireData.brand,
        model: params.tireData.model ?? null,
        dimensions: params.tireData.dimensions,
        dot_code: params.tireData.dot_code ?? null,
        purchase_price: params.tireData.purchase_price ?? null,
        purchase_date: params.tireData.purchase_date ?? null,
        tread_depth_new: params.tireData.tread_depth_new ?? null,
        tread_depth_current: params.treadDepthAtMount ?? params.tireData.tread_depth_new ?? null,
        status: 'in_use',
      })
      .select('id')
      .single();

    if (insertErr || !newTire) {
      return { success: false, error: insertErr?.message ?? 'Erreur création pneu' };
    }
    tireId = newTire.id;
  }

  if (!tireId) return { success: false, error: 'Aucun pneu sélectionné' };

  // Passer le pneu de stock en 'in_use'
  if (params.tireId) {
    await supabase
      .from('tires')
      .update({
        status: 'in_use',
        tread_depth_current: params.treadDepthAtMount ?? undefined,
        tread_depth_measured_at: params.treadDepthAtMount ? params.mountedDate : undefined,
        tread_depth_measured_km: params.treadDepthAtMount ? params.mountedKm : undefined,
      })
      .eq('id', tireId);
  }

  // Créer le montage
  const { error: mountErr } = await supabase
    .from('tire_mountings')
    .insert({
      tire_id: tireId,
      vehicle_id: params.vehicleId,
      company_id: profile.company_id,
      axle_position: params.position,
      mount_type: params.mountType,
      mounted_date: params.mountedDate,
      mounted_km: params.mountedKm,
      performed_by: params.performedBy ?? null,
      garage_name: params.garageName ?? null,
      notes: params.notes ?? null,
    });

  if (mountErr) return { success: false, error: mountErr.message };
  return { success: true };
}

// ----------------------------------------------------------------
// 5. Démonter un pneu
// ----------------------------------------------------------------

export async function unmountTire(params: {
  mountingId: string;
  unmountedKm: number;
  unmountedDate: string;
  treadDepthAtUnmount?: number;
  reasonUnmounted: string;
  destination: string;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  // Récupérer le montage pour obtenir le tire_id
  const { data: mounting, error: fetchErr } = await supabase
    .from('tire_mountings')
    .select('id, tire_id, company_id')
    .eq('id', params.mountingId)
    .single();

  if (fetchErr || !mounting) return { success: false, error: 'Montage introuvable' };
  if (mounting.company_id !== profile.company_id) return { success: false, error: 'Accès refusé' };

  // Mettre à jour le montage
  const { error: updateMountErr } = await supabase
    .from('tire_mountings')
    .update({
      unmounted_date: params.unmountedDate,
      unmounted_km: params.unmountedKm,
      tread_depth_at_unmount: params.treadDepthAtUnmount ?? null,
      reason_unmounted: params.reasonUnmounted as never,
      destination: params.destination as never,
      notes: params.notes ?? null,
    })
    .eq('id', params.mountingId);

  if (updateMountErr) return { success: false, error: updateMountErr.message };

  // Mettre à jour le statut du pneu
  const newTireStatus =
    params.destination === 'stock' ? 'in_stock' :
    params.destination === 'scrap' ? 'scrapped' :
    params.destination === 'retreading' ? 'retreaded' : 'in_stock';

  const tireUpdate: Record<string, unknown> = { status: newTireStatus };
  if (params.treadDepthAtUnmount != null) {
    tireUpdate.tread_depth_current = params.treadDepthAtUnmount;
    tireUpdate.tread_depth_measured_at = params.unmountedDate;
    tireUpdate.tread_depth_measured_km = params.unmountedKm;
  }

  await supabase
    .from('tires')
    .update(tireUpdate as never)
    .eq('id', mounting.tire_id);

  return { success: true };
}

// ----------------------------------------------------------------
// 6. Enregistrer une mesure de profondeur
// ----------------------------------------------------------------

export async function recordDepthCheck(params: {
  mountingId: string;
  tireId: string;
  vehicleId: string;
  checkKm: number;
  checkDate: string;
  treadDepth: number;
  depthInner?: number;
  depthCenter?: number;
  depthOuter?: number;
  pressureBar?: number;
  checkedBy?: string;
  notes?: string;
}): Promise<ActionResult> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  // Insérer la mesure
  const { error: insertErr } = await supabase
    .from('tire_depth_checks')
    .insert({
      mounting_id: params.mountingId,
      tire_id: params.tireId,
      vehicle_id: params.vehicleId,
      company_id: profile.company_id,
      check_date: params.checkDate,
      check_km: params.checkKm,
      tread_depth: params.treadDepth,
      depth_inner: params.depthInner ?? null,
      depth_center: params.depthCenter ?? null,
      depth_outer: params.depthOuter ?? null,
      pressure_bar: params.pressureBar ?? null,
      checked_by: params.checkedBy ?? null,
      notes: params.notes ?? null,
    });

  if (insertErr) return { success: false, error: insertErr.message };

  // Mettre à jour la profondeur actuelle du pneu
  await supabase
    .from('tires')
    .update({
      tread_depth_current: params.treadDepth,
      tread_depth_measured_at: params.checkDate,
      tread_depth_measured_km: params.checkKm,
    } as never)
    .eq('id', params.tireId);

  return { success: true };
}

// ----------------------------------------------------------------
// 7. Historique des pneus d'un véhicule
// ----------------------------------------------------------------

export async function getVehicleTireHistory(
  vehicleId: string
): Promise<ActionResult<TireHistoryEntry[]>> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  const { data: mountings, error } = await supabase
    .from('tire_mountings')
    .select('id, axle_position, mount_type, mounted_date, mounted_km, unmounted_date, unmounted_km, reason_unmounted, destination, tire_id')
    .eq('vehicle_id', vehicleId)
    .order('mounted_date', { ascending: false })
    .limit(20);

  if (error) return { success: false, error: error.message };
  if (!mountings || mountings.length === 0) return { success: true, data: [] };

  const tireIds = Array.from(new Set(mountings.map(m => m.tire_id)));
  const { data: tiresRaw } = await supabase
    .from('tires')
    .select('id, brand, dimensions, purchase_price')
    .in('id', tireIds);

  const tiresMap: Record<string, { brand: string; dimensions: string; purchase_price: number | null }> = {};
  for (const t of tiresRaw ?? []) {
    tiresMap[t.id] = t;
  }

  const history: TireHistoryEntry[] = mountings.map(m => ({
    mounting_id: m.id,
    axle_position: m.axle_position,
    mount_type: m.mount_type,
    mounted_date: m.mounted_date,
    mounted_km: m.mounted_km,
    unmounted_date: m.unmounted_date,
    unmounted_km: m.unmounted_km,
    reason_unmounted: m.reason_unmounted,
    destination: m.destination,
    tire_id: m.tire_id,
    brand: tiresMap[m.tire_id]?.brand ?? 'Inconnu',
    dimensions: tiresMap[m.tire_id]?.dimensions ?? '',
    purchase_price: tiresMap[m.tire_id]?.purchase_price ?? null,
  }));

  return { success: true, data: history };
}

// ----------------------------------------------------------------
// 8. Coûts pneumatiques sur les 12 derniers mois
// ----------------------------------------------------------------

export async function getTireCosts(
  vehicleId: string
): Promise<ActionResult<TireCostData>> {
  const supabase = await createClient();
  const profile = await getAuthProfile(supabase);
  if (!profile) return { success: false, error: 'Non authentifié' };

  const oneYearAgo = new Date();
  oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

  // Montages des 12 derniers mois
  const { data: mountings } = await supabase
    .from('tire_mountings')
    .select('tire_id')
    .eq('vehicle_id', vehicleId)
    .gte('mounted_date', oneYearAgo.toISOString().split('T')[0]);

  if (!mountings || mountings.length === 0) {
    return { success: true, data: { total_spent: 0, tire_count: 0, avg_cost_per_tire: 0 } };
  }

  const tireIds = Array.from(new Set(mountings.map(m => m.tire_id)));
  const { data: tires } = await supabase
    .from('tires')
    .select('purchase_price')
    .in('id', tireIds);

  const prices = (tires ?? []).map(t => t.purchase_price ?? 0);
  const total = prices.reduce((sum, p) => sum + p, 0);

  return {
    success: true,
    data: {
      total_spent: total,
      tire_count: tireIds.length,
      avg_cost_per_tire: tireIds.length > 0 ? total / tireIds.length : 0,
    },
  };
}
