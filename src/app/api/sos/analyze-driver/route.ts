/**
 * API Route: /api/sos/analyze-driver
 * SOS Garage — Point d'entrée CHAUFFEUR
 *
 * Différence avec analyze-simple :
 * - Le chauffeur n'a pas de providers/contrats à son nom
 * - On cherche le gestionnaire de sa company pour récupérer ses providers/contrats
 * - Même arbre de décision que analyze-simple
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

type BreakdownType = 'pneu' | 'mecanique' | 'frigo' | 'hayon' | 'accident';
type DistanceCategory = 'close' | 'far';
type VehicleState = 'rolling' | 'immobilized';

interface AnalyzeDriverRequest {
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

    // 2. PARSE BODY
    const body: AnalyzeDriverRequest = await request.json();
    const { vehicleId, breakdownType, distanceCategory, vehicleState, location } = body;

    if (!vehicleId || !breakdownType || !distanceCategory || !vehicleState) {
      return NextResponse.json({ error: 'Données manquantes' }, { status: 400 });
    }

    // 3. RÉCUPÉRER LE PROFIL DU CHAUFFEUR → company_id
    const { data: profile } = await adminClient
      .from('profiles')
      .select('company_id')
      .eq('id', user.id)
      .maybeSingle();

    if (!profile?.company_id) {
      return NextResponse.json({ error: 'Profil ou entreprise introuvable' }, { status: 404 });
    }

    // 4. TROUVER LE GESTIONNAIRE DE CETTE COMPANY
    const { data: manager } = await adminClient
      .from('profiles')
      .select('id')
      .eq('company_id', profile.company_id)
      .in('role', ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'])
      .limit(1)
      .maybeSingle();

    if (!manager) {
      return NextResponse.json(
        { error: 'Aucun gestionnaire trouvé pour votre entreprise' },
        { status: 404 }
      );
    }

    // 5. RÉCUPÉRER LE VÉHICULE
    const { data: vehicle } = await adminClient
      .from('vehicles')
      .select('id, brand, model, type, registration_number')
      .eq('id', vehicleId)
      .maybeSingle();

    if (!vehicle) {
      return NextResponse.json({ error: 'Véhicule non trouvé' }, { status: 404 });
    }

    // 6. RÉCUPÉRER CONTRATS ET PROVIDERS DU GESTIONNAIRE
    const [{ data: contracts }, { data: providers }] = await Promise.all([
      adminClient
        .from('sos_emergency_contracts')
        .select('*')
        .eq('user_id', manager.id)
        .eq('is_active', true)
        .order('priority', { ascending: true }),
      adminClient
        .from('sos_providers')
        .select('*')
        .eq('user_id', manager.id)
        .eq('is_active', true)
        .order('priority', { ascending: true }),
    ]);

    logger.info('[SOS Driver] Analyse', {
      driverId: user.id,
      managerId: manager.id,
      breakdownType,
      distanceCategory,
      vehicleState,
      contracts: contracts?.length || 0,
      providers: providers?.length || 0,
    });

    // 7. ARBRE DE DÉCISION
    const result = analyzeBreakdown(
      breakdownType,
      distanceCategory,
      vehicleState,
      contracts || [],
      providers || [],
      vehicle
    );

    // 8. LOG HISTORIQUE
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
      logger.error('[SOS Driver] Erreur log historique', { error: e instanceof Error ? e.message : String(e) });
    }

    return NextResponse.json(result);

  } catch (error: any) {
    logger.error('[SOS Driver] Erreur', { error: error instanceof Error ? error.message : String(error) });
    return NextResponse.json(
      { error: 'Erreur serveur: ' + (error.message || 'inconnue') },
      { status: 500 }
    );
  }
}

// ==========================================
// ARBRE DE DÉCISION (identique à analyze-simple)
// ==========================================

function analyzeBreakdown(
  breakdownType: BreakdownType,
  distanceCategory: DistanceCategory,
  vehicleState: VehicleState,
  contracts: any[],
  providers: any[],
  vehicle: any
): { type: string; data?: any; message?: string } {

  // 1. ACCIDENT → TOUJOURS ASSURANCE
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
      message: 'ACCIDENT - Aucune assurance configurée. Contactez votre assureur habituel.',
    };
  }

  // 2. HAYON → TOUJOURS DIRECTION
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
      message: 'Problème hayon - Contactez votre direction. Ne pas chercher de garage extérieur.',
    };
  }

  // 3. PNEU
  if (breakdownType === 'pneu') {
    if (vehicleState === 'immobilized') {
      const contratPneu = findContract(contracts, 'pneu_24h', distanceCategory, true);
      if (contratPneu) {
        return {
          type: 'contract',
          data: formatContract(contratPneu),
          message: 'Pneu crevé - Véhicule immobilisé. Appelez votre contrat 24/24.',
        };
      }
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
        message: 'Pneu crevé et immobilisé - Contactez votre assurance pour remorquage.',
      };
    }

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

    return {
      type: 'garage_external',
      data: {
        name: `Garage pneumatique ${vehicle.brand}`,
        searchQuery: `${vehicle.brand} pneumatique dépannage`,
      },
      message: distanceCategory === 'far'
        ? 'Hors périmètre habituel - Recherchez un garage pneumatique sur Google Maps'
        : 'Aucun garage partenaire trouvé - Recherchez sur Google Maps',
    };
  }

  // 4. FRIGO
  if (breakdownType === 'frigo') {
    const contratFrigo = findContract(contracts, 'frigo_assistance');
    if (contratFrigo) {
      return {
        type: 'contract',
        data: formatContract(contratFrigo),
        message: 'Groupe frigo en panne - Appelez l\'assistance. Ne coupez pas le groupe !',
      };
    }

    if (distanceCategory === 'close') {
      const garageFrigo = findProvider(providers, 'frigo');
      if (garageFrigo) {
        return {
          type: 'garage_partner',
          data: formatProvider(garageFrigo),
          message: 'Groupe frigo - Rendez-vous rapidement chez votre partenaire.',
        };
      }
    }

    return {
      type: 'garage_external',
      data: {
        name: 'Garage frigorifique',
        searchQuery: `${vehicle.brand} groupe frigo Carrier Thermo King réparation`,
      },
      message: 'Groupe frigo - Recherchez un spécialiste frigorifique rapidement',
    };
  }

  // 5. MÉCANIQUE
  if (breakdownType === 'mecanique') {
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
        message: 'Panne mécanique et immobilisé - Contactez votre assurance pour remorquage.',
      };
    }

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

    return {
      type: 'garage_external',
      data: {
        name: `Garage ${vehicle.brand}`,
        searchQuery: `${vehicle.brand} garage agréé réparation`,
      },
      message: distanceCategory === 'far'
        ? 'Hors périmètre habituel - Recherchez un garage agréé sur Google Maps'
        : 'Aucun garage partenaire trouvé - Recherchez sur Google Maps',
    };
  }

  return {
    type: 'none',
    message: 'Aucune solution trouvée pour cette situation. Contactez votre assurance.',
  };
}

// ==========================================
// FONCTIONS UTILITAIRES
// ==========================================

function findContract(
  contracts: any[],
  serviceType: string,
  distanceCategory?: DistanceCategory,
  immobilized?: boolean
): any | null {
  return contracts.find(c => {
    if (c.service_type !== serviceType) return false;
    if (distanceCategory && c.for_distance) {
      if (c.for_distance !== 'both' && c.for_distance !== distanceCategory) return false;
    }
    if (immobilized !== undefined && c.for_immobilized !== null) {
      if (c.for_immobilized !== immobilized) return false;
    }
    return true;
  }) || null;
}

function findProvider(providers: any[], specialty: string): any | null {
  const exact = providers.find(p => p.specialty === specialty);
  if (exact) return exact;
  return providers.find(p => p.specialty === 'general') || null;
}

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
