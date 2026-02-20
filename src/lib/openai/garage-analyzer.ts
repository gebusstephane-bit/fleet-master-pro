/**
 * Analyse IA des garages pour qualifier les résultats Apify
 */

import OpenAI from 'openai';
import { GoogleMapsResult } from '@/lib/apify/client';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

export interface AnalyzedGarage {
  placeId: string;
  name: string;
  address: string;
  city?: string;
  phone?: string;
  location?: {
    lat: number;
    lng: number;
  };
  confidence: number; // 0-100
  isAuthorizedDealer: boolean;
  specialties: string[];
  reasoning: string;
  warnings?: string[];
}

export interface GarageAnalysisResult {
  recommendations: AnalyzedGarage[];
  searchBrand: string;
  totalFound: number;
}

/**
 * Analyse les garages trouvés pour identifier les vrais réparateurs agréés
 */
export async function analyzeGarages(
  garages: GoogleMapsResult[],
  searchBrand: string,
  isFrigoSearch: boolean,
  vehicleType: 'PL' | 'VL'
): Promise<GarageAnalysisResult> {
  if (!process.env.OPENAI_API_KEY) {
    console.warn('[OpenAI] Pas de clé API, fallback simple');
    return fallbackAnalysis(garages, searchBrand);
  }

  if (garages.length === 0) {
    return { recommendations: [], searchBrand, totalFound: 0 };
  }

  const prompt = buildAnalysisPrompt(garages, searchBrand, isFrigoSearch, vehicleType);

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      response_format: { type: 'json_object' },
      temperature: 0.3,
      messages: [
        {
          role: 'system',
          content: `Tu es un expert automobile et logistique. Ta mission est d'analyser des garages trouvés sur Google Maps et d'identifier ceux qui sont vraiment agréés par la marque recherchée.

CRITÈRES D'ÉVALUATION:
1. Confiance 90-100: Mention explicite "agréé", "certifié", "concessionnaire", "spécialiste [marque]" dans le nom ou la description
2. Confiance 70-89: Nom contient la marque, ou catégories pertinentes, ou avis mentionnant la spécialisation
3. Confiance 50-69: Garage généraliste mais bien noté, possible qu'il fasse la marque
4. Confiance <50: Pas de lien évident avec la marque

POUR LES POIDS LOURDS (PL):
- Éliminer les garages "automobiles", "voitures", "concessionnaire auto" (sauf si poids lourd explicitement mentionné)
- Privilégier ceux avec "poids lourd", "camion", "PL", "industriel" dans le nom/description

POUR LES FRIGOS:
- Chercher mention de "frigorifique", "groupe froid", "carrier", "thermo king"
- Vérifier s'ils réparent bien les groupes frigorifiques (pas juste véhicules)

RÉPONSE ATTENDUE (JSON strict):
{
  "recommendations": [
    {
      "placeId": "...",
      "confidence": 95,
      "isAuthorizedDealer": true,
      "specialties": ["mécanique", "électricité"],
      "reasoning": "Concessionnaire officiel Audi, agréé poids lourd"
    }
  ]
}`
        },
        {
          role: 'user',
          content: prompt
        }
      ]
    });

    const content = response.choices[0]?.message?.content;
    if (!content) throw new Error('Pas de réponse IA');

    const analysis = JSON.parse(content);
    
    // Fusionner avec les données originales
    const enrichedRecommendations = analysis.recommendations
      ?.map((rec: any) => {
        const original = garages.find(g => g.placeId === rec.placeId);
        if (!original) return null;
        
        return {
          placeId: original.placeId,
          name: original.title,
          address: original.address,
          city: original.city,
          phone: original.phone,
          location: original.location,
          confidence: rec.confidence || 50,
          isAuthorizedDealer: rec.isAuthorizedDealer || false,
          specialties: rec.specialties || [],
          reasoning: rec.reasoning || '',
          warnings: rec.warnings || []
        };
      })
      .filter(Boolean)
      .sort((a: AnalyzedGarage, b: AnalyzedGarage) => b.confidence - a.confidence)
      .slice(0, 5) || []; // Top 5

    return {
      recommendations: enrichedRecommendations,
      searchBrand,
      totalFound: garages.length
    };

  } catch (error) {
    console.error('[OpenAI] Erreur analyse:', error);
    return fallbackAnalysis(garages, searchBrand);
  }
}

/**
 * Fallback si OpenAI indisponible
 */
function fallbackAnalysis(
  garages: GoogleMapsResult[],
  searchBrand: string
): GarageAnalysisResult {
  const recommendations = garages.slice(0, 5).map(g => ({
    placeId: g.placeId,
    name: g.title,
    address: g.address,
    city: g.city,
    phone: g.phone,
    location: g.location,
    confidence: g.rating && g.rating > 4 ? 70 : 50,
    isAuthorizedDealer: false,
    specialties: g.categories || [],
    reasoning: `Garage trouvé via recherche ${searchBrand} (analyse IA indisponible)`
  }));

  return {
    recommendations,
    searchBrand,
    totalFound: garages.length
  };
}

function buildAnalysisPrompt(
  garages: GoogleMapsResult[],
  searchBrand: string,
  isFrigoSearch: boolean,
  vehicleType: 'PL' | 'VL'
): string {
  const garagesData = garages.map(g => ({
    placeId: g.placeId,
    name: g.title,
    address: g.address,
    categories: g.categories,
    description: g.description,
    rating: g.rating,
    reviewsCount: g.reviewsCount,
    reviews: g.reviews
  }));

  return `ANALYSE DE GARAGES POUR: ${searchBrand}

TYPE DE RECHERCHE: ${isFrigoSearch ? 'Réparation groupe frigorifique' : 'Réparation mécanique'}
TYPE DE VÉHICULE: ${vehicleType === 'PL' ? 'Poids Lourd (camion > 3.5t)' : 'Véhicule Léger'}

GARAGES TROUVÉS SUR GOOGLE MAPS:
${JSON.stringify(garagesData, null, 2)}

INSTRUCTIONS:
1. Analyse chaque garage pour déterminer s'il est vraiment agréé ${searchBrand}
2. Pour les PL, élimine les garages auto classiques
3. Pour les frigos, vérifie qu'ils réparent bien les groupes frigorifiques
4. Attribue un score de confiance 0-100
5. Retourne les 5 meilleurs résultats classés par confiance

RÉPONSE EN JSON UNIQUEMENT.`;
}
