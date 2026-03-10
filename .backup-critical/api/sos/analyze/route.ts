/**
 * API Route : /api/sos/analyze
 * Analyse IA pour trouver le meilleur garage prestataire
 */

import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createAdminClient } from '@/lib/supabase/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export const dynamic = 'force-dynamic';

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
    
    // Verifier l'authentification
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Non authentifie' },
        { status: 401 }
      );
    }

    const adminClient = createAdminClient();

    // Recuperer les donnees de la requete
    const body = await request.json();
    const { vehicleId, breakdownLocation, breakdownType } = body;

    if (!vehicleId || !breakdownLocation || !breakdownType) {
      return NextResponse.json(
        { error: 'Donnees manquantes (vehicleId, breakdownLocation, breakdownType)' },
        { status: 400 }
      );
    }

    // Verifier que le vehicule appartient a l'utilisateur
    const { data: vehicle, error: vehicleError } = await adminClient
      .from('vehicles')
      .select('*')
      .eq('id', vehicleId)
      .single();

    if (vehicleError || !vehicle) {
      return NextResponse.json(
        { error: 'Vehicule non trouve' },
        { status: 404 }
      );
    }

    // Recuperer les prestataires de l'utilisateur
    const { data: providers, error: providersError } = await adminClient
      .from('user_service_providers')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (providersError) {
      console.error('Error fetching providers:', providersError);
      return NextResponse.json(
        { error: 'Erreur lors de la recuperation des prestataires' },
        { status: 500 }
      );
    }

    // Si aucun prestataire configure
    if (!providers || providers.length === 0) {
      return NextResponse.json({
        success: false,
        error: 'NO_PROVIDERS',
        message: 'Aucun garage partenaire configure. Veuillez ajouter vos prestataires dans les parametres.',
        vehicle: {
          id: vehicle.id,
          registration_number: vehicle.registration_number,
          type: vehicle.type,
          brand: vehicle.brand,
          model: vehicle.model,
        }
      });
    }

    // Determiner le type de vehicule (PL/VL)
    // La colonne type contient: POIDS_LOURD_FRIGO, POIDS_LOURD, VL, etc.
    const typeValue = (vehicle.type || '').toString().toUpperCase();
    const isPL = typeValue.includes('POIDS') || typeValue.includes('LOURD') || typeValue.includes('FRIGO');
    const vehicleCategory = isPL ? 'PL' : 'VL';

    // Calculer la distance pour chaque prestataire
    const providersWithDistance = (providers as any[]).map(provider => {
      const distance = calculateDistance(
        breakdownLocation.lat,
        breakdownLocation.lng,
        (provider as any).lat,
        (provider as any).lng
      );
      
      return {
        ...provider,
        distance_km: distance,
        is_within_radius: distance !== null && distance <= ((provider as any).intervention_radius_km || 50)
      };
    });

    // Filtrer ceux dans le rayon d'intervention
    const availableProviders = providersWithDistance.filter(p => p.is_within_radius);

    if (availableProviders.length === 0) {
      // Aucun dans le rayon, proposer le plus proche avec warning
      const closestProvider = (providersWithDistance as any[])
        .filter(p => p.distance_km !== null)
        .sort((a: any, b: any) => (a.distance_km || 999) - (b.distance_km || 999))[0];

      return NextResponse.json({
        success: true,
        warning: 'NO_PROVIDER_IN_RADIUS',
        message: `Aucun prestataire dans les ${closestProvider?.intervention_radius_km || 50}km. Voici le plus proche :`,
        recommendations: [formatRecommendation(closestProvider, 1, true)],
        vehicle: {
          id: vehicle.id,
          registration_number: vehicle.registration_number,
          type: vehicle.type,
          category: vehicleCategory,
        },
        breakdown_location: breakdownLocation,
        breakdown_type: breakdownType
      });
    }

    // Appel OpenAI pour le scoring intelligent
    const aiAnalysis = await analyzeWithAI(
      vehicle,
      vehicleCategory,
      breakdownType,
      breakdownLocation,
      availableProviders
    );

    // Enregistrer la recherche dans l'historique
    await (adminClient as any).from('emergency_searches').insert({
      user_id: user.id,
      vehicle_id: vehicleId,
      breakdown_location_lat: breakdownLocation.lat,
      breakdown_location_lng: breakdownLocation.lng,
      breakdown_address: breakdownLocation.address,
      breakdown_type: breakdownType as any,
      recommended_provider_id: aiAnalysis.top_recommendation?.provider?.id || null,
      ai_reasoning: aiAnalysis.reasoning,
      distance_km: aiAnalysis.top_recommendation?.distance_km,
      estimated_time_minutes: aiAnalysis.top_recommendation?.estimated_time_minutes,
    } as any);

    return NextResponse.json({
      success: true,
      vehicle: {
        id: vehicle.id,
        registration_number: vehicle.registration_number,
        type: vehicle.type,
        category: vehicleCategory,
        brand: vehicle.brand,
        model: vehicle.model,
      },
      breakdown_location: breakdownLocation,
      breakdown_type: breakdownType,
      recommendations: [
        aiAnalysis.top_recommendation,
        aiAnalysis.alternative,
        aiAnalysis.backup
      ].filter(Boolean)
    });

  } catch (error: any) {
    console.error('SOS analyze API error:', error);
    return NextResponse.json(
      { error: 'Erreur interne du serveur: ' + error.message },
      { status: 500 }
    );
  }
}

// Fonction pour calculer la distance (formule de Haversine)
function calculateDistance(lat1: number, lng1: number, lat2: number | null, lng2: number | null): number | null {
  if (!lat1 || !lng1 || !lat2 || !lng2) return null;
  
  const R = 6371; // Rayon de la Terre en km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng/2) * Math.sin(dLng/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Estimer le temps de trajet (environ 40 km/h en moyenne pour camion)
function estimateDrivingTime(distanceKm: number): number {
  const averageSpeedKmh = 40; // Camion sur route
  return Math.round((distanceKm / averageSpeedKmh) * 60);
}

function formatRecommendation(provider: any, rank: number, outsideRadius: boolean = false) {
  if (!provider) return null;
  
  return {
    provider: {
      id: provider.id,
      name: provider.name,
      phone: provider.phone,
      email: provider.email,
      address: provider.address,
      city: provider.city,
      lat: provider.lat,
      lng: provider.lng,
      specialties: (provider.specialties as any) || [],
      vehicle_types_supported: (provider.vehicle_types_supported as any) || [],
      is_24_7: (provider.specialties as any)?.includes('24_7') || false,
    },
    ai_analysis: {
      rank,
      confidence: outsideRadius ? 0.5 : 0.9,
      reasoning: outsideRadius 
        ? 'Prestataire le plus proche mais hors rayon de couverture habituel. Verifier la disponibilite.'
        : `Garage adapte a ${provider.distance_km?.toFixed(1)} km`,
      score_distance: 0.5,
      score_specialty: 0.5,
      score_availability: (provider.specialties as any)?.includes('24_7') ? 1 : 0.5,
    },
    distance_km: Math.round(provider.distance_km * 10) / 10,
    estimated_time_minutes: estimateDrivingTime(provider.distance_km || 0),
    outside_radius: outsideRadius
  };
}

// Analyse IA avec OpenAI
async function analyzeWithAI(
  vehicle: any,
  vehicleCategory: string,
  breakdownType: string,
  breakdownLocation: any,
  providers: any[]
) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      // Fallback sans IA : tri par distance uniquement
      const sorted = providers.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
      return {
        top_recommendation: formatRecommendation(sorted[0], 1),
        alternative: sorted[1] ? formatRecommendation(sorted[1], 2) : null,
        backup: sorted[2] ? formatRecommendation(sorted[2], 3) : null,
        reasoning: 'Tri par distance (mode sans IA)'
      };
    }

    const prompt = `
Tu es un expert logistique transport. Analyse quel garage est le plus adapte pour cette panne.

CONTEXTE :
- Vehicule : ${vehicle.brand} ${vehicle.model} (${vehicleCategory})
- Immatriculation : ${vehicle.registration_number}
- Type panne : ${breakdownType}

- Localisation panne : ${breakdownLocation.address}

GARAGES DISPONIBLES :
${providers.map((p, i) => `
${i + 1}. ${p.name} (ID: ${p.id})
   Distance : ${p.distance_km?.toFixed(1)} km
   Specialites : ${p.specialties?.join(', ') || 'Non specifie'}
   Types acceptes : ${p.vehicle_types_supported?.join(', ') || 'Tous'}
   Rayon contrat : ${p.intervention_radius_km} km
   24/7 : ${p.specialties?.includes('24_7') ? 'Oui' : 'Non'}
   Priorite : ${p.priority}
`).join('\n')}

INSTRUCTIONS :
1. Verifie compatibilite : Le garage accepte-t-il ${vehicleCategory} ?
2. Verifie specialite : Le garage gere-t-il ${breakdownType} ?

4. Classe par : Distance (40%) + Specialite exacte (40%) + Disponibilite 24/7 (20%)

Reponds en JSON exactement :
{
  "top_recommendation_id": "uuid",
  "alternative_id": "uuid ou null",
  "backup_id": "uuid ou null",
  "reasoning": "Explication courte pour l'utilisateur",
  "warnings": ["attention eventuelle"]
}
`;

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Pas de reponse IA');

    const aiResult = JSON.parse(content);

    // Mapper les resultats
    const findProvider = (id: string | null) => providers.find(p => p.id === id);

    return {
      top_recommendation: formatRecommendation(findProvider(aiResult.top_recommendation_id), 1),
      alternative: aiResult.alternative_id ? formatRecommendation(findProvider(aiResult.alternative_id), 2) : null,
      backup: aiResult.backup_id ? formatRecommendation(findProvider(aiResult.backup_id), 3) : null,
      reasoning: aiResult.reasoning,
      warnings: aiResult.warnings || []
    };

  } catch (error) {
    console.error('OpenAI error:', error);
    // Fallback sans IA
    const sorted = providers.sort((a, b) => (a.distance_km || 999) - (b.distance_km || 999));
    return {
      top_recommendation: formatRecommendation(sorted[0], 1),
      alternative: sorted[1] ? formatRecommendation(sorted[1], 2) : null,
      backup: sorted[2] ? formatRecommendation(sorted[2], 3) : null,
      reasoning: 'Tri par distance (service IA temporairement indisponible)'
    };
  }
}
