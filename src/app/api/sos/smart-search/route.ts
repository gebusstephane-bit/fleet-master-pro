/**
 * API Route: /api/sos/smart-search (V3.2)
 * Arbre de décision intelligent pour les urgences
 * 
 * Ordre de priorité:
 * 1. Autoroute + Immobilisé → Service autoroute (priorité absolue)
 * 2. Règles métier (contracts 24/7, assurance, direction)
 * 3. Recherche standard (garages partenaires → externe)
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from '@/types/supabase';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Types de panne valides
const BREAKDOWN_TYPES = ['mechanical', 'frigo', 'tire', 'electric', 'bodywork', 'tailgate'] as const;
type BreakdownType = typeof BREAKDOWN_TYPES[number];

interface Coordinates {
  lat: number;
  lng: number;
}

interface Vehicle {
  id: string;
  brand: string;
  model: string;
  type: string | null;
  registration_number: string;
}

interface EmergencyRule {
  id: string;
  name: string;
  rule_type: 'contract_24_7' | 'insurance' | 'management' | string;
  phone_number: string;
  contact_name: string | null;
  contract_reference: string | null;
  instructions: string | null;
  display_color: string | null;
  applies_to_breakdown_types: string[];
  applies_if_immobilized: boolean | null;
  applies_on_highway: boolean | null;
}

interface ServiceProvider {
  id: string;
  lat: number;
  lng: number;
  intervention_radius_km: number | null;
  distance_km?: number | null;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return request.cookies.get(name)?.value;
          },
          set() {},
          remove() {},
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const adminClient = createAdminClient();

    // 1. Récupération des données
    const { 
      vehicleId, 
      breakdownType, 
      coordinates, 
      address, 
      vehicleImmobilized = false,
      onHighway = false,
      severity = 'normal'
    }: {
      vehicleId: string;
      breakdownType: BreakdownType;
      coordinates?: Coordinates;
      address: string;
      vehicleImmobilized?: boolean;
      onHighway?: boolean;
      severity?: string;
    } = await request.json();

    if (!vehicleId || !breakdownType) {
      return NextResponse.json(
        { error: 'Données manquantes (vehicleId, breakdownType)' },
        { status: 400 }
      );
    }

    // 2. Récupération du profil utilisateur avec company_id
    const { data: profile, error: profileError } = await adminClient
      .from('profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      return NextResponse.json({ error: 'Profil utilisateur invalide' }, { status: 403 });
    }

    // 3. Récupération véhicule avec vérification company_id (IDOR protection)
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .select('id, brand, model, type, registration_number, company_id')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 });
    }

    // Vérification IDOR : le véhicule doit appartenir à l'entreprise de l'utilisateur
    if (vehicle.company_id !== profile.company_id) {
      logger.warn('[SOS V3.2] Tentative IDOR détectée');
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 });
    }

    // Détection PL/VL
    const typeValue = (vehicle.type || '').toString().toUpperCase();
    const isPL = typeValue.includes('POIDS') || typeValue.includes('LOURD') || typeValue.includes('FRIGO');
    const vehicleCategory = isPL ? 'PL' : 'VL';

    // 3. DÉTECTION AUTOROUTE (Priorité 1 - Critique)
    const isHighway = detectHighway(address) || onHighway === true;
    
    if (isHighway && vehicleImmobilized && isCriticalHighwayBreakdown(breakdownType)) {
      logger.info('[SOS V3.2] 🚨 AUTOROUTE + IMMOBILISÉ - Service autoroute requis');
      
      return NextResponse.json({
        level: 'highway_emergency',
        critical: true,
        message: '⚠️ VOUS ÊTES SUR AUTOROUTE - VÉHICULE IMMOBILISÉ',
        safetyInstructions: [
          'Ne quittez PAS votre véhicule côté chaussée',
          'Activez vos feux de détresse (warning)',
          'Mettez votre gilet de sécurité',
          'Placez le triangle de signalisation (si possible en sécurité)',
          'Appelez depuis la borne d\'appel d\'urgence ou votre portable'
        ],
        vehicle: formatVehicle(vehicle, vehicleCategory),
        breakdown: { type: breakdownType, address },
        highwayService: {
          name: 'Service d\'autoroute',
          phone: '112', // Ou numéro spécifique autoroute si configuré
          alternative: '17 (Gendarmerie)'
        },
        warning: 'En cas de danger immédiat, appelez le 112 (numéro d\'urgence européen)'
      });
    }

    // 4. Récupération des règles d'urgence configurées
    const { data: rules } = await adminClient
      .from('emergency_rules')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .contains('applies_to_breakdown_types', [breakdownType])
      .or(`applies_if_immobilized.is.null,applies_if_immobilized.eq.${vehicleImmobilized}`)
      .or(`applies_on_highway.is.null,applies_on_highway.eq.${isHighway}`)
      .order('priority', { ascending: true });

    logger.info(`[SOS V3.2] ${rules?.length || 0} règle(s) trouvée(s)`, { breakdownType, vehicleImmobilized, isHighway });

    // 5. ARBRE DE DÉCISION PAR TYPE DE PANNE

    // === CAS A : PNEU ===
    if (breakdownType === 'tire') {
      return handleTireBreakdown((rules || []) as EmergencyRule[], vehicle as Vehicle, vehicleCategory, vehicleImmobilized, coordinates, address, user.id, adminClient);
    }

    // === CAS B : HAYON (TAILGATE) ===
    if (breakdownType === 'tailgate') {
      return handleTailgateBreakdown((rules || []) as EmergencyRule[], vehicle as Vehicle, vehicleCategory, user.id, adminClient);
    }

    // === CAS C : FRIGO ===
    if (breakdownType === 'frigo') {
      return handleFrigoBreakdown((rules || []) as EmergencyRule[], vehicle as Vehicle, vehicleCategory, coordinates, address, user.id, adminClient);
    }

    // === CAS D : ÉLECTRIQUE ===
    if (breakdownType === 'electric') {
      return handleElectricBreakdown((rules || []) as EmergencyRule[], vehicle as Vehicle, vehicleCategory, vehicleImmobilized, coordinates, address, user.id, adminClient);
    }

    // === CAS E : CARROSSERIE ===
    if (breakdownType === 'bodywork') {
      return handleBodyworkBreakdown((rules || []) as EmergencyRule[], vehicle as Vehicle, vehicleCategory, coordinates, address, user.id, adminClient);
    }

    // === CAS F : MÉCANIQUE (DÉFAUT) ===
    return handleMechanicalBreakdown((rules || []) as EmergencyRule[], vehicle as Vehicle, vehicleCategory, vehicleImmobilized, coordinates, address, user.id, adminClient);

  } catch (error) {
    logger.error('[SOS V3.2] Erreur', { error: error instanceof Error ? error.message : String(error) });
    const errorMessage = error instanceof Error ? error.message : 'Erreur inconnue';
    return NextResponse.json(
      { error: 'Erreur serveur: ' + errorMessage },
      { status: 500 }
    );
  }
}

// ============ FONCTIONS D'ARBRE DE DÉCISION ============

async function handleTireBreakdown(
  rules: EmergencyRule[],
  vehicle: Vehicle,
  vehicleCategory: string,
  immobilized: boolean,
  coordinates: Coordinates | undefined,
  address: string,
  userId: string,
  adminClient: SupabaseClient<Database>
) {
  logger.info('[SOS V3.2] Traitement panne PNEU');

  // 1. Chercher contrat pneu 24/7
  const tireContract = rules.find(r => r.rule_type === 'contract_24_7');
  
  if (tireContract) {
    await logEmergencySearch(adminClient, userId, vehicle, 'tire', 'emergency_contract', tireContract.id);
    
    return NextResponse.json({
      level: 'emergency_contract',
      rule: formatRule(tireContract),
      context: immobilized 
        ? 'Véhicule immobilisé - Dépannage sur place inclus'
        : 'Véhicule roulant - Possible de rouler lentement jusqu\'au garage',
      nextSteps: ['Appeler le numéro ci-dessus', 'Décrire la position exacte', 'Attendre l\'intervention'],
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: 'tire', address }
    });
  }

  // 2. Si immobilisé et pas de contrat → Assurance obligatoire
  if (immobilized) {
    const insuranceRule = rules.find(r => r.rule_type === 'insurance');
    
    if (insuranceRule) {
      await logEmergencySearch(adminClient, userId, vehicle, 'tire', 'insurance_mandatory', insuranceRule.id);
      
      return NextResponse.json({
        level: 'insurance_mandatory',
        rule: formatRule(insuranceRule),
        warning: 'Aucun contrat pneu 24/24 configuré. Contactez votre assurance pour remorquage.',
        reason: 'Véhicule immobilisé sans contrat de dépannage pneu',
        vehicle: formatVehicle(vehicle, vehicleCategory),
        breakdown: { type: 'tire', address }
      });
    }

    // Si vraiment rien → Fallback assurance générique
    return NextResponse.json({
      level: 'insurance_fallback',
      message: 'Véhicule immobilisé - Contactez votre assurance',
      warning: 'Aucun contrat de dépannage pneu configuré. Le remorquage sera possiblement payant.',
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: 'tire', address }
    });
  }

  // 3. Si roulant et pas de contrat → Recherche garage pneu standard
  return await standardGarageSearch('tire', vehicle, vehicleCategory, coordinates, address, userId, adminClient, immobilized);
}

async function handleTailgateBreakdown(
  rules: EmergencyRule[],
  vehicle: Vehicle,
  vehicleCategory: string,
  userId: string,
  adminClient: SupabaseClient<Database>
) {
  logger.info('[SOS V3.2] Traitement panne HAYON');

  // 1. Chercher contrat hayon
  const contractRule = rules.find(r => r.rule_type === 'contract_24_7');
  
  if (contractRule) {
    await logEmergencySearch(adminClient, userId, vehicle, 'tailgate', 'emergency_contract', contractRule.id);
    
    return NextResponse.json({
      level: 'emergency_contract',
      rule: formatRule(contractRule),
      context: 'Problème hayon - Contrat disponible',
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: 'tailgate', address: '' }
    });
  }

  // 2. Sinon → Direction (pas de recherche garage)
  const managementRule = rules.find(r => r.rule_type === 'management');
  
  if (managementRule) {
    await logEmergencySearch(adminClient, userId, vehicle, 'tailgate', 'management_contact', managementRule.id);
    
    return NextResponse.json({
      level: 'management_contact',
      rule: formatRule(managementRule),
      warning: 'Aucun contrat hayon configuré. Contactez votre direction.',
      doNotSearch: true,
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: 'tailgate', address: '' }
    });
  }

  // Fallback
  return NextResponse.json({
    level: 'management_fallback',
    message: 'Problème hayon - Contactez votre direction',
    warning: 'Ne contactez pas de garage extérieur sans autorisation',
    doNotSearch: true,
    vehicle: formatVehicle(vehicle, vehicleCategory),
    breakdown: { type: 'tailgate', address: '' }
  });
}

async function handleFrigoBreakdown(
  rules: EmergencyRule[],
  vehicle: Vehicle,
  vehicleCategory: string,
  coordinates: Coordinates | undefined,
  address: string,
  userId: string,
  adminClient: SupabaseClient<Database>
) {
  logger.info('[SOS V3.2] Traitement panne FRIGO');

  // 1. Chercher contrat frigo
  const frigoContract = rules.find(r => r.rule_type === 'contract_24_7');
  
  if (frigoContract) {
    await logEmergencySearch(adminClient, userId, vehicle, 'frigo', 'emergency_contract', frigoContract.id);
    
    return NextResponse.json({
      level: 'emergency_contract',
      rule: formatRule(frigoContract),
      context: 'Problème groupe frigo - Assistance sous contrat',
      criticalInfo: 'Ne coupez PAS le groupe frigo avant d\'avoir parlé au support',
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: 'frigo', address }
    });
  }

  // 2. Pas de contrat → Recherche garage frigo (véhicule peut rouler)
  return await standardGarageSearch('frigo', vehicle, vehicleCategory, coordinates, address, userId, adminClient, false);
}

async function handleElectricBreakdown(
  rules: EmergencyRule[],
  vehicle: Vehicle,
  vehicleCategory: string,
  immobilized: boolean,
  coordinates: Coordinates | undefined,
  address: string,
  userId: string,
  adminClient: SupabaseClient<Database>
) {
  logger.info('[SOS V3.2] Traitement panne ÉLECTRIQUE');

  // Électrique = souvent immobilisant, chercher contrat prioritaire
  const contractRule = rules.find(r => r.rule_type === 'contract_24_7');
  
  if (contractRule) {
    await logEmergencySearch(adminClient, userId, vehicle, 'electric', 'emergency_contract', contractRule.id);
    
    return NextResponse.json({
      level: 'emergency_contract',
      rule: formatRule(contractRule),
      context: immobilized ? 'Dépannage électrique sur place' : 'Rendez-vous au garage',
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: 'electric', address }
    });
  }

  // Sinon recherche standard
  return await standardGarageSearch('electric', vehicle, vehicleCategory, coordinates, address, userId, adminClient, immobilized);
}

async function handleBodyworkBreakdown(
  rules: EmergencyRule[],
  vehicle: Vehicle,
  vehicleCategory: string,
  coordinates: Coordinates | undefined,
  address: string,
  userId: string,
  adminClient: SupabaseClient<Database>
) {
  logger.info('[SOS V3.2] Traitement panne CARROSSERIE');

  // Carrosserie = pas urgent, recherche standard
  return await standardGarageSearch('bodywork', vehicle, vehicleCategory, coordinates, address, userId, adminClient, false);
}

async function handleMechanicalBreakdown(
  rules: EmergencyRule[],
  vehicle: Vehicle,
  vehicleCategory: string,
  immobilized: boolean,
  coordinates: Coordinates | undefined,
  address: string,
  userId: string,
  adminClient: SupabaseClient<Database>
) {
  logger.info('[SOS V3.2] Traitement panne MÉCANIQUE (défaut)');

  // 1. Chercher contrat mécanique
  const mechContract = rules.find(r => r.rule_type === 'contract_24_7');
  
  if (mechContract) {
    await logEmergencySearch(adminClient, userId, vehicle, 'mechanical', 'emergency_contract', mechContract.id);
    
    return NextResponse.json({
      level: 'emergency_contract',
      rule: formatRule(mechContract),
      context: immobilized ? 'Dépannage sur place inclus' : 'Rendez-vous au garage sous 24h',
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: 'mechanical', address }
    });
  }

  // 2. Recherche standard
  return await standardGarageSearch('mechanical', vehicle, vehicleCategory, coordinates, address, userId, adminClient, immobilized);
}

// ============ RECHERCHE GARAGE STANDARD ============

async function standardGarageSearch(
  breakdownType: string,
  vehicle: Vehicle,
  vehicleCategory: string,
  coordinates: Coordinates | undefined,
  address: string,
  userId: string,
  adminClient: SupabaseClient<Database>,
  vehicleImmobilized: boolean = false
) {
  logger.info(`[SOS V3.2] Recherche garage standard`, { breakdownType });

  // 1. RECHERCHE PARTENAIRES INTERNES
  const { data: partners } = await adminClient
    .from('user_service_providers')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .contains('vehicle_types_supported', [vehicleCategory]);

  // Calcul distance et filtrage
  const partnersWithDistance = ((partners || []) as unknown as ServiceProvider[])
    .map((p) => {
      const dist = coordinates ? calculateDistance(coordinates, { lat: p.lat, lng: p.lng }) : null;
      return { ...p, distance_km: dist };
    })
    .filter((p) => p.distance_km === null || p.distance_km <= (p.intervention_radius_km || 50))
    .sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));

  // ✅ GARAGE PARTENAIRE TROUVÉ
  if (partnersWithDistance.length > 0) {
    await logEmergencySearch(adminClient, userId, vehicle, breakdownType, 'internal_partner', partnersWithDistance[0].id);
    
    return NextResponse.json({
      level: 'internal_partner',
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: breakdownType, address },
      recommendations: partnersWithDistance.slice(0, 3)
    });
  }

  // 2. HORS PERIMÈTRE - Vérifier les règles d'urgence configurées
  logger.info(`[SOS V3.2] Hors périmètre - Recherche règles d'urgence`);
  
  const { data: emergencyRules } = await adminClient
    .from('emergency_rules')
    .select('*')
    .eq('user_id', userId)
    .eq('is_active', true)
    .contains('applies_to_breakdown_types', [breakdownType])
    .or(`applies_if_immobilized.is.null,applies_if_immobilized.eq.${vehicleImmobilized}`)
    .order('priority', { ascending: true });

  // 2a. CONTRAT 24/7 CONFIGURÉ → Afficher même hors périmètre
  const contractRule = (emergencyRules as EmergencyRule[] | null)?.find((r) => r.rule_type === 'contract_24_7');
  if (contractRule) {
    await logEmergencySearch(adminClient, userId, vehicle, breakdownType, 'emergency_contract_out_of_range', contractRule.id);
    
    return NextResponse.json({
      level: 'emergency_contract',
      rule: formatRule(contractRule),
      context: 'Hors périmètre des garages partenaires - Appelez votre contrat d\'urgence',
      warning: 'Aucun garage partenaire dans la zone, mais vous avez un contrat d\'urgence',
      nextSteps: [
        'Appelez le numéro ci-dessus',
        'Indiquez que vous êtes hors périmètre habituel',
        'Demandez une intervention sur place ou un remorquage'
      ],
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: breakdownType, address }
    });
  }

  // 2b. ASSURANCE CONFIGURÉE → Afficher pour remorquage
  const insuranceRule = (emergencyRules as EmergencyRule[] | null)?.find((r) => r.rule_type === 'insurance');
  if (insuranceRule && vehicleImmobilized) {
    await logEmergencySearch(adminClient, userId, vehicle, breakdownType, 'insurance_out_of_range', insuranceRule.id);
    
    return NextResponse.json({
      level: 'insurance_mandatory',
      rule: formatRule(insuranceRule),
      context: 'Hors périmètre - Contactez votre assurance pour remorquage',
      warning: 'Aucun garage partenaire dans la zone. Votre assurance doit organiser le remorquage.',
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: breakdownType, address }
    });
  }

  // 2c. DIRECTION CONFIGURÉE (cas hayon, etc.)
  const managementRule = (emergencyRules as EmergencyRule[] | null)?.find((r) => r.rule_type === 'management');
  if (managementRule) {
    await logEmergencySearch(adminClient, userId, vehicle, breakdownType, 'management_out_of_range', managementRule.id);
    
    return NextResponse.json({
      level: 'management_contact',
      rule: formatRule(managementRule),
      context: 'Hors périmètre - Contactez votre direction pour instructions',
      warning: 'Aucun garage partenaire dans la zone. La direction doit décider de la marche à suivre.',
      doNotSearch: true,
      vehicle: formatVehicle(vehicle, vehicleCategory),
      breakdown: { type: breakdownType, address }
    });
  }

  // 3. AUCUNE RÈGLE CONFIGURÉE → Fallback Google Maps
  logger.info(`[SOS V3.2] Aucune règle configurée - Fallback Google Maps`);
  
  await logEmergencySearch(adminClient, userId, vehicle, breakdownType, 'no_partner_fallback');
  
  return NextResponse.json({
    level: 'no_partner',
    message: 'Aucun garage partenaire trouvé dans votre zone',
    warning: vehicleImmobilized 
      ? '⚠️ Véhicule immobilisé hors périmètre. Contactez votre assurance ou le 112 si danger.' 
      : 'Véhicule roulant - Recherchez un garage via Google Maps',
    searchSuggestion: `${vehicle.brand} ${breakdownType === 'tire' ? 'pneumatique' : 'garage'} ${address}`,
    googleSearchUrl: `https://www.google.com/maps/search/${encodeURIComponent(`${vehicle.brand} ${breakdownType === 'tire' ? 'pneumatique' : 'garage'} ${address}`)}`,
    tips: [
      'Vérifiez l\'agrément du garage avant de vous déplacer',
      'Appelez pour vérifier la disponibilité',
      'Demandez un devis estimatif',
      vehicleImmobilized ? 'Demandez si ils font du dépannage sur place' : 'Vérifiez que le garage accepte votre type de véhicule'
    ],
    vehicle: formatVehicle(vehicle, vehicleCategory),
    breakdown: { type: breakdownType, address }
  });
}

// ============ UTILITAIRES ============

function detectHighway(address: string): boolean {
  if (!address) return false;
  const lower = address.toLowerCase();
  return lower.includes('autoroute') || 
         /\bA\d+\b/.test(lower) || 
         lower.includes('aire de repos') ||
         lower.includes('aire de service');
}

function isCriticalHighwayBreakdown(breakdownType: string): boolean {
  return ['mechanical', 'tire', 'engine'].includes(breakdownType);
}

function calculateDistance(point1: Coordinates, point2: Coordinates): number | null {
  if (!point1?.lat || !point1?.lng || !point2?.lat || !point2?.lng) return null;
  
  const R = 6371;
  const dLat = (point2.lat - point1.lat) * Math.PI / 180;
  const dLng = (point2.lng - point1.lng) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(point1.lat * Math.PI / 180) * Math.cos(point2.lat * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return Math.round(R * c * 10) / 10;
}

function formatVehicle(vehicle: Vehicle, category: string) {
  return {
    id: vehicle.id,
    brand: vehicle.brand,
    model: vehicle.model,
    registration_number: vehicle.registration_number,
    category
  };
}

function formatRule(rule: EmergencyRule) {
  return {
    id: rule.id,
    name: rule.name,
    rule_type: rule.rule_type,
    phone_number: rule.phone_number,
    contact_name: rule.contact_name,
    contract_reference: rule.contract_reference,
    instructions: rule.instructions,
    display_color: rule.display_color || 'blue'
  };
}

async function logEmergencySearch(
  adminClient: SupabaseClient<Database>,
  userId: string,
  vehicle: Vehicle,
  breakdownType: string,
  foundLevel: string,
  ruleId?: string
) {
  try {
    await (adminClient.from('emergency_searches' as any) as any).insert({
      user_id: userId,
      vehicle_id: vehicle.id,
      vehicle_registration: vehicle.registration_number,
      vehicle_brand: vehicle.brand,
      breakdown_type: breakdownType,
      found_level: foundLevel,
      ...(ruleId && { selected_provider_id: ruleId }),
      ai_reasoning: `V3.2 - ${foundLevel}`
    });
  } catch (e) {
    logger.error('[SOS] Erreur log historique', { error: e instanceof Error ? e.message : String(e) });
  }
}
