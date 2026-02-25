/**
 * API Route: /api/sos/analyze-simple
 * SOS Garage V4 - Logique métier simplifiée
 * 
 * Entrées: breakdownType, distanceCategory, vehicleState
 * Sortie: type de solution + données
 * 
 * PAS DE GÉOCODAGE - PAS DE DÉTECTION AUTOROUTE
 * Juste une logique métier simple et lisible.
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type BreakdownType = 'pneu' | 'mecanique' | 'frigo' | 'hayon' | 'accident';
type DistanceCategory = 'close' | 'far';
type VehicleState = 'rolling' | 'immobilized';

interface AnalyzeRequest {
  vehicleId: string;
  breakdownType: BreakdownType;
  distanceCategory: DistanceCategory;
  vehicleState: VehicleState;
  location?: string;
}

export async function POST(request: NextRequest) {
  try {
    // 1. AUTH
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

    // 2. RÉCUPÉRATION DONNÉES
    const body: AnalyzeRequest = await request.json();
    const { vehicleId, breakdownType, distanceCategory, vehicleState, location } = body;

    if (!vehicleId || !breakdownType || !distanceCategory || !vehicleState) {
      return NextResponse.json(
        { error: 'Données manquantes' },
        { status: 400 }
      );
    }

    // 3. RÉCUPÉRATION VÉHICULE
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .select('id, brand, model, type, registration_number')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 });
    }

    // 4. RÉCUPÉRATION DES CONTRATS ET PRESTATAIRES
    const [{ data: contracts }, { data: providers }] = await Promise.all([
      adminClient
        .from('sos_emergency_contracts')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('priority', { ascending: true }),
      adminClient
        .from('sos_providers')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .order('priority', { ascending: true }),
    ]);

    logger.info('[SOS V4] Analyse', {
      breakdownType,
      distanceCategory,
      vehicleState,
      contracts: contracts?.length || 0,
      providers: providers?.length || 0,
    });

    // 5. LOGIQUE MÉTIER (L'ARBRE DE DÉCISION)
    const result = analyzeBreakdown(
      breakdownType,
      distanceCategory,
      vehicleState,
      contracts || [],
      providers || [],
      vehicle
    );

    // 6. LOG HISTORIQUE (optionnel)
    try {
      await adminClient.from('sos_history').insert({
        user_id: user.id,
        vehicle_id: vehicle.id,
        breakdown_type: breakdownType,
        distance_category: distanceCategory,
        vehicle_state: vehicleState,
        solution_type: result.type,
        solution_name: result.data?.name,
        solution_phone: result.data?.phone,
        location_text: location,
      });
    } catch (e) {
      logger.error('[SOS V4] Erreur log historique', { error: e instanceof Error ? e.message : String(e) });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('[SOS V4] Erreur', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Erreur serveur: ' + error.message },
      { status: 500 }
    );
  }
}

/**
 * L'ARBRE DE DÉCISION V4
 * ======================
 * Lisible, maintenable, pas de magie noire.
 */
function analyzeBreakdown(
  breakdownType: BreakdownType,
  distanceCategory: DistanceCategory,
  vehicleState: VehicleState,
  contracts: any[],
  providers: any[],
  vehicle: any
): { type: string; data?: any; message?: string } {

  // ==========================================
  // 1. ACCIDENT → TOUJOURS ASSURANCE
  // ==========================================
  if (breakdownType === 'accident') {
    const assurance = findContract(contracts, 'assurance');
    if (assurance) {
      return {
        type: 'insurance',
        data: formatContract(assurance),
        message: 'Accident déclaré - Contactez votre assurance immédiatement',
      };
    }
    return {
      type: 'none',
      message: '🚨 ACCIDENT - Aucune assurance configurée. Contactez votre assureur habituel.',
    };
  }

  // ==========================================
  // 2. HAYON → TOUJOURS DIRECTION
  // ==========================================
  if (breakdownType === 'hayon') {
    const direction = findContract(contracts, 'direction');
    if (direction) {
      return {
        type: 'contract',
        data: formatContract(direction),
        message: 'Problème hayon - Contactez la direction uniquement',
      };
    }
    return {
      type: 'none',
      message: '📦 Problème hayon - Contactez votre direction. Ne pas chercher de garage extérieur.',
    };
  }

  // ==========================================
  // 3. PNEU
  // ==========================================
  if (breakdownType === 'pneu') {
    // Immobilisé → Contrat 24/24 OU Assurance
    if (vehicleState === 'immobilized') {
      // Chercher contrat pneu 24h
      const contratPneu = findContract(contracts, 'pneu_24h', distanceCategory, true);
      if (contratPneu) {
        return {
          type: 'contract',
          data: formatContract(contratPneu),
          message: 'Pneu crevé - Véhicule immobilisé. Appelez votre contrat 24/24.',
        };
      }

      // Sinon assurance
      const assurance = findContract(contracts, 'assurance');
      if (assurance) {
        return {
          type: 'insurance',
          data: formatContract(assurance),
          message: 'Pneu crevé - Véhicule immobilisé. Contactez votre assurance pour remorquage.',
        };
      }

      return {
        type: 'none',
        message: '🛞 Pneu crevé et immobilisé - Contactez votre assurance pour remorquage.',
      };
    }

    // Roulant → Garage partenaire
    if (distanceCategory === 'close') {
      const garagePneu = findProvider(providers, 'pneu');
      if (garagePneu) {
        return {
          type: 'garage_partner',
          data: formatProvider(garagePneu),
          message: 'Pneu crevé mais roulant - Rendez-vous chez votre partenaire',
        };
      }
    }

    // Hors périmètre ou pas de garage → Recherche externe
    return {
      type: 'garage_external',
      data: {
        name: `Garage pneumatique ${vehicle.brand}`,
        searchQuery: `${vehicle.brand} pneumatique dépannage`,
      },
      message: distanceCategory === 'far'
        ? '🛞 Hors périmètre habituel - Recherchez un garage pneumatique sur Google Maps'
        : '🛞 Aucun garage partenaire trouvé - Recherchez sur Google Maps',
    };
  }

  // ==========================================
  // 4. FRIGO
  // ==========================================
  if (breakdownType === 'frigo') {
    // Chercher contrat frigo
    const contratFrigo = findContract(contracts, 'frigo_assistance');
    if (contratFrigo) {
      return {
        type: 'contract',
        data: formatContract(contratFrigo),
        message: 'Groupe frigo en panne - Appelez l\'assistance. Ne coupez pas le groupe !',
      };
    }

    // Pas de contrat → Garage frigo ou recherche
    if (distanceCategory === 'close') {
      const garageFrigo = findProvider(providers, 'frigo');
      if (garageFrigo) {
        return {
          type: 'garage_partner',
          data: formatProvider(garageFrigo),
          message: 'Groupe frigo - Rendez-vous rapidement chez votre partenaire. Le véhicule peut rouler.',
        };
      }
    }

    return {
      type: 'garage_external',
      data: {
        name: 'Garage frigorifique',
        searchQuery: `${vehicle.brand} groupe frigo Carrier Thermo King réparation`,
      },
      message: '❄️ Groupe frigo - Recherchez un spécialiste frigorifique rapidement',
    };
  }

  // ==========================================
  // 5. MÉCANIQUE (défaut)
  // ==========================================
  if (breakdownType === 'mecanique') {
    // Immobilisé → Contrat 24h OU Assurance
    if (vehicleState === 'immobilized') {
      const contratMeca = findContract(contracts, 'mecanique_24h', distanceCategory, true);
      if (contratMeca) {
        return {
          type: 'contract',
          data: formatContract(contratMeca),
          message: 'Panne mécanique - Véhicule immobilisé. Appelez votre contrat 24/24.',
        };
      }

      const assurance = findContract(contracts, 'assurance');
      if (assurance) {
        return {
          type: 'insurance',
          data: formatContract(assurance),
          message: 'Panne mécanique - Véhicule immobilisé. Contactez votre assurance pour remorquage.',
        };
      }

      return {
        type: 'none',
        message: '🔧 Panne mécanique et immobilisé - Contactez votre assurance pour remorquage.',
      };
    }

    // Roulant → Garage partenaire
    if (distanceCategory === 'close') {
      const garageMeca = findProvider(providers, 'mecanique') || findProvider(providers, 'general');
      if (garageMeca) {
        return {
          type: 'garage_partner',
          data: formatProvider(garageMeca),
          message: 'Panne mécanique - Rendez-vous chez votre partenaire dès que possible',
        };
      }
    }

    // Hors périmètre ou pas de garage
    return {
      type: 'garage_external',
      data: {
        name: `Garage ${vehicle.brand}`,
        searchQuery: `${vehicle.brand} garage agréé réparation`,
      },
      message: distanceCategory === 'far'
        ? '🔧 Hors périmètre habituel - Recherchez un garage agréé sur Google Maps'
        : '🔧 Aucun garage partenaire trouvé - Recherchez sur Google Maps',
    };
  }

  // Fallback
  return {
    type: 'none',
    message: 'Aucune solution trouvée pour cette situation. Contactez votre assurance.',
  };
}

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

/**
 * Cherche un contrat par type avec filtres optionnels
 */
function findContract(
  contracts: any[],
  serviceType: string,
  distanceCategory?: DistanceCategory,
  immobilized?: boolean
): any | null {
  return contracts.find(c => {
    // Type de service
    if (c.service_type !== serviceType) return false;

    // Filtre distance
    if (distanceCategory && c.for_distance) {
      if (c.for_distance !== 'both' && c.for_distance !== distanceCategory) {
        return false;
      }
    }

    // Filtre immobilisation
    if (immobilized !== undefined && c.for_immobilized !== null) {
      if (c.for_immobilized !== immobilized) return false;
    }

    return true;
  }) || null;
}

/**
 * Cherche un prestataire par spécialité
 */
function findProvider(providers: any[], specialty: string): any | null {
  // Chercher spécialité exacte d'abord
  const exact = providers.find(p => p.specialty === specialty);
  if (exact) return exact;

  // Sinon généraliste
  return providers.find(p => p.specialty === 'general') || null;
}

/**
 * Formate un contrat pour la réponse API
 */
function formatContract(contract: any) {
  return {
    id: contract.id,
    name: contract.name,
    serviceType: contract.service_type,
    phone: contract.phone_number,
    contractRef: contract.contract_ref,
    instructions: contract.instructions,
    forDistance: contract.for_distance,
    forImmobilized: contract.for_immobilized,
  };
}

/**
 * Formate un prestataire pour la réponse API
 */
function formatProvider(provider: any) {
  return {
    id: provider.id,
    name: provider.name,
    specialty: provider.specialty,
    phone: provider.phone_24h || provider.phone_standard,
    city: provider.city,
    address: provider.address,
    maxDistance: provider.max_distance_km,
    has24h: !!provider.phone_24h,
  };
}
