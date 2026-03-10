/**
 * Actions publiques sécurisées pour accès QR Code véhicule
 * Triple accès : Inspection, Carburant, Carnet Digital
 * 
 * SECURITY:
 * - Rate limiting strict (5 req/min par IP)
 * - Validation du token véhicule requise
 * - Aucune donnée sensible exposée
 * - Insert uniquement, pas de SELECT sur données confidentielles
 */

'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { USER_ROLE } from '@/constants/enums';
import { scanPublicActionClient } from '@/lib/safe-action';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

// ============================================
// SCHÉMAS DE VALIDATION
// ============================================

const vehicleTokenSchema = z.object({
  vehicleId: z.string().uuid(),
  accessToken: z.string(), // Token peut être TEXT (UUID ou ancien format)
});

const fuelTypeSchema = z.enum(['diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg']);

const publicFuelRecordSchema = z.object({
  vehicleId: z.string().uuid(),
  accessToken: z.string(),
  fuelType: fuelTypeSchema,
  liters: z.number().min(0.01).max(2000),
  priceTotal: z.number().min(0).max(10000),
  mileage: z.number().int().min(0).max(9999999),
  stationName: z.string().max(200).optional(),
  driverName: z.string().min(2).max(100),
  notes: z.string().max(1000).optional(),
});

// Schéma pour session multi-carburants (nouveau formulaire)
const fuelSessionSchema = z.object({
  vehicleId: z.string().uuid(),
  accessToken: z.string(),
  fuels: z.array(z.object({
    type: fuelTypeSchema,
    liters: z.number().min(0.01).max(2000),
    price: z.number().min(0).max(10000).nullable(),
    mileage: z.number().int().min(0).max(9999999).nullable(),
  })).min(1).max(3), // 1 à 3 carburants max
  driverName: z.string().min(2).max(100),
  stationName: z.string().max(200).optional(),
});

const publicInspectionSchema = z.object({
  vehicleId: z.string().uuid(),
  accessToken: z.string(),
  mileage: z.number().int().min(0).max(9999999),
  fuelLevel: z.number().min(0).max(100),
  adblueLevel: z.number().min(0).max(100).optional(),
  gnrLevel: z.number().min(0).max(100).optional(),
  driverName: z.string().min(2).max(100),
  location: z.string().max(200).default('Dépôt'),
  notes: z.string().max(1000).optional(),
  checks: z.array(z.object({
    id: z.string(),
    status: z.enum(['OK', 'WARNING', 'CRITICAL']),
    note: z.string().optional(),
  })),
  cleanliness: z.array(z.object({
    id: z.string(),
    status: z.enum(['CLEAN', 'DIRTY', 'DAMAGED']),
  })).optional(),
  compartmentC1Temp: z.number().optional(),
  compartmentC2Temp: z.number().optional(),
});

// ============================================
// FONCTIONS UTILITAIRES INTERNES
// ============================================

/**
 * Vérifie la validité du token d'accès véhicule
 * Retourne les infos véhicule si valide, null sinon
 */
async function validateVehicleAccess(
  vehicleId: string, 
  accessToken: string
): Promise<{ id: string; company_id: string; registration_number: string; type: string } | null> {
  const supabase = await createClient();
  
  // Utiliser la fonction RPC pour vérifier le token (TEXT)
  const { data, error } = await supabase
    // @ts-ignore - RPC non typée dans Database
    .rpc('verify_qr_token' as never, {
      p_vehicle_id: vehicleId,
      p_token: accessToken
    });
  
  const verifyResult = data as unknown as { valid: boolean } | null;
  if (error || !verifyResult || !verifyResult.valid) {
    logger.warn('[PUBLIC_SCAN] Token invalide ou véhicule non trouvé:', vehicleId);
    return null;
  }
  
  // Récupérer les infos complètes du véhicule — admin client pour bypass RLS
  const adminClient = createAdminClient();
  const { data: vehicle, error: vehicleError } = await adminClient
    .from('vehicles')
    .select('id, company_id, registration_number, type')
    .eq('id', vehicleId)
    .single();
  
  if (vehicleError || !vehicle) {
    return null;
  }
  
  return vehicle;
}

/**
 * Calcule la consommation L/100km si un plein précédent existe
 */
async function calculateConsumption(
  supabase: any,
  vehicleId: string,
  currentMileage: number,
  currentLiters: number
): Promise<number | null> {
  const { data: previousFill } = await supabase
    .from('fuel_records')
    .select('mileage_at_fill, quantity_liters')
    .eq('vehicle_id', vehicleId)
    .lt('mileage_at_fill', currentMileage)
    .order('mileage_at_fill', { ascending: false })
    .limit(1)
    .single();
  
  if (previousFill) {
    const distanceKm = currentMileage - previousFill.mileage_at_fill;
    if (distanceKm > 0) {
      return (previousFill.quantity_liters / distanceKm) * 100;
    }
  }
  
  return null;
}

// ============================================
// ACTIONS PUBLIQUES
// ============================================

/**
 * Vérifie la validité d'un accès véhicule (token)
 * Utilisé côté client pour valider l'URL avant affichage du formulaire
 */
export const verifyVehicleAccess = scanPublicActionClient
  .schema(vehicleTokenSchema)
  .action(async ({ parsedInput }) => {
    const vehicle = await validateVehicleAccess(
      parsedInput.vehicleId,
      parsedInput.accessToken
    );
    
    if (!vehicle) {
      throw new Error('Accès non autorisé ou véhicule invalide');
    }
    
    // Retourner uniquement les infos publiques (pas de company_id)
    return {
      success: true,
      vehicle: {
        id: vehicle.id,
        registration_number: vehicle.registration_number,
        type: vehicle.type,
      }
    };
  });

/**
 * Crée un plein de carburant via accès public (QR Code)
 * Rate limit: 5 req/min par IP
 */
export const createPublicFuelRecord = scanPublicActionClient
  .schema(publicFuelRecordSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();
    
    // Utiliser la fonction RPC pour créer le plein
    const { data, error } = await supabase
      // @ts-ignore - RPC non typée dans Database
      .rpc('create_public_fuel_record' as never, {
        p_vehicle_id: parsedInput.vehicleId,
        p_token: parsedInput.accessToken,
        p_fuel_type: parsedInput.fuelType,
        p_liters: parsedInput.liters,
        p_price_total: parsedInput.priceTotal,
        p_mileage: parsedInput.mileage,
        p_station_name: parsedInput.stationName || null,
        p_driver_name: parsedInput.driverName
      });
    
    if (error) {
      logger.error('[PUBLIC_SCAN] Erreur création plein:', error);
      throw new Error('Erreur lors de l\'enregistrement du plein');
    }
    
    const fuelResult = data as unknown as { success: boolean; error?: string; ticket_number?: string; consumption?: number } | null;
    if (!fuelResult || !fuelResult.success) {
      throw new Error(fuelResult?.error || 'Erreur lors de l\'enregistrement');
    }
    
    return {
      success: true,
      ticketNumber: fuelResult.ticket_number,
      consumption: fuelResult.consumption ? Math.round(fuelResult.consumption * 10) / 10 : null,
    };
  });

/**
 * Crée une inspection via accès public (QR Code)
 * Rate limit: 5 req/min par IP
 */
export const createPublicInspection = scanPublicActionClient
  .schema(publicInspectionSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();
    
    // Calculer le score
    const criticalCount = parsedInput.checks.filter(c => c.status === 'CRITICAL').length;
    const warningCount = parsedInput.checks.filter(c => c.status === 'WARNING').length;
    let score = 100;
    if (criticalCount > 0) score -= criticalCount * 25;
    if (warningCount > 0) score -= warningCount * 10;
    score = Math.max(0, score);
    
    const grade = score >= 90 ? 'A' : score >= 75 ? 'B' : score >= 60 ? 'C' : 'D';
    
    // Construire les défauts signalés
    const reportedDefects = parsedInput.checks
      .filter(c => c.status !== 'OK')
      .map(c => ({
        id: crypto.randomUUID(),
        category: c.status === 'CRITICAL' ? 'MECANIQUE' : 'AUTRE',
        description: `${c.id}: ${c.status === 'CRITICAL' ? 'Problème critique' : 'À surveiller'}`,
        severity: c.status === 'CRITICAL' ? 'CRITIQUE' : 'MAJEUR',
      }));
    
    // Ajouter les problèmes de propreté
    if (parsedInput.cleanliness) {
      const dirtyItems = parsedInput.cleanliness.filter(c => c.status !== 'CLEAN');
      if (dirtyItems.length > 0) {
        reportedDefects.push({
          id: crypto.randomUUID(),
          category: 'PROPRETE',
          description: `Propreté: ${dirtyItems.map(i => i.id).join(', ')}`,
          severity: dirtyItems.some(i => i.status === 'DAMAGED') ? 'MAJEUR' : 'MINEUR',
        });
      }
    }
    
    // Utiliser la fonction RPC pour créer l'inspection
    const { data, error } = await supabase
      // @ts-ignore - RPC non typée dans Database
      .rpc('create_public_inspection' as never, {
        p_vehicle_id: parsedInput.vehicleId,
        p_token: parsedInput.accessToken,
        p_mileage: parsedInput.mileage,
        p_fuel_level: parsedInput.fuelLevel,
        p_driver_name: parsedInput.driverName,
        p_location: parsedInput.location,
        p_score: score,
        p_grade: grade,
        p_reported_defects: reportedDefects
      });
    
    if (error) {
      logger.error('[PUBLIC_SCAN] Erreur création inspection:', error);
      throw new Error('Erreur lors de l\'enregistrement du contrôle');
    }
    
    const inspectionResult = data as unknown as { success: boolean; error?: string; ticket_number?: string; status?: string } | null;
    if (!inspectionResult || !inspectionResult.success) {
      throw new Error(inspectionResult?.error || 'Erreur lors de l\'enregistrement');
    }
    
    return {
      success: true,
      ticketNumber: inspectionResult.ticket_number,
      score,
      grade,
      status: inspectionResult.status,
      criticalIssues: reportedDefects.filter(d => d.severity === 'CRITIQUE').length,
    };
  });

/**
 * Crée une session de ravitaillement multi-carburants via QR Code
 * Remplace createPublicFuelRecord pour supporter le multi-plein
 * Rate limit: 5 req/min par IP
 */
export const createFuelSession = scanPublicActionClient
  .schema(fuelSessionSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();
    
    // Préparer les données pour la fonction RPC (format JSONB natif)
    const fuelsData = parsedInput.fuels.map(f => ({
      type: f.type,
      liters: f.liters,
      price: f.price,
      mileage: f.mileage,
    }));
    
    logger.debug('[PUBLIC_SCAN] Appel create_fuel_session:', {
      vehicleId: parsedInput.vehicleId,
      fuelsCount: fuelsData.length,
      driverName: parsedInput.driverName,
    });
    
    // Appeler la fonction RPC create_fuel_session
    // Passer directement l'array, Supabase gère la conversion JSONB
    const { data, error } = await supabase
      // @ts-ignore - RPC non typée dans Database
      .rpc('create_fuel_session' as never, {
        p_vehicle_id: parsedInput.vehicleId,
        p_token: parsedInput.accessToken,
        p_fuels: fuelsData,
        p_driver_name: parsedInput.driverName || null,
        p_station_name: parsedInput.stationName || null,
      });
    
    if (error) {
      logger.error('[PUBLIC_SCAN] Erreur RPC create_fuel_session:', error);
      throw new Error(`Erreur: ${error.message}`);
    }
    
    logger.debug('[PUBLIC_SCAN] Réponse create_fuel_session:', data);
    
    // La fonction retourne un JSONB qu'il faut parser si c'est une string
    const result = typeof data === 'string' ? JSON.parse(data) : data;
    
    if (!result || !result.success) {
      throw new Error(result?.error || 'Erreur lors de l\'enregistrement');
    }
    
    // Invalider le cache de la page fuel
    revalidatePath('/fuel');
    
    return {
      success: true,
      ticketNumber: result.ticket_number,
      count: result.count || 1,
      recordIds: result.record_ids || [],
    };
  });

/**
 * Récupère les informations d'un véhicule pour le carnet digital
 * Cette action nécessite une authentification - elle est ici pour cohérence
 * mais sera appelée via authActionClient côté carnet
 */
export const getVehicleCarnetInfo = scanPublicActionClient
  .schema(vehicleTokenSchema)
  .action(async ({ parsedInput }) => {
    const supabase = await createClient();
    
    // Vérifier l'authentification
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('AUTH_REQUIRED');
    }
    
    // Vérifier le token véhicule
    const vehicle = await validateVehicleAccess(
      parsedInput.vehicleId,
      parsedInput.accessToken
    );
    
    if (!vehicle) {
      throw new Error('Accès non autorisé');
    }
    
    // Vérifier que l'utilisateur appartient à la même entreprise
    const { data: profile } = await supabase
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();
    
    if (!profile || profile.company_id !== vehicle.company_id) {
      throw new Error('Accès non autorisé');
    }
    
    // Vérifier le rôle (ADMIN, DIRECTEUR, AGENT_DE_PARC uniquement)
    const allowedRoles: string[] = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
    if (!allowedRoles.includes(profile.role)) {
      throw new Error('INSUFFICIENT_ROLE');
    }
    
    // Récupérer les infos du carnet
    const { data: inspections } = await supabase
      .from('vehicle_inspections')
      .select('*')
      .eq('vehicle_id', parsedInput.vehicleId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    const { data: fuelRecords } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('vehicle_id', parsedInput.vehicleId)
      .order('date', { ascending: false })
      .limit(10);
    
    const { data: maintenances } = await supabase
      .from('maintenance_records')
      .select('*')
      .eq('vehicle_id', parsedInput.vehicleId)
      .order('created_at', { ascending: false })
      .limit(10);
    
    return {
      success: true,
      vehicle,
      inspections: inspections || [],
      fuelRecords: fuelRecords || [],
      maintenances: maintenances || [],
    };
  });
