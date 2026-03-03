/**
 * Client de recherche de garages - VERSION SIMPLIFIÉE
 * 
 * Note: La recherche Apify est temporairement désactivée car l'API
 * est instable. À la place, on retourne un message informatif
 * pour guider l'utilisateur.
 * 
 * Pour réactiver Apify plus tard:
 * 1. Créer un compte Apify: https://apify.com
 * 2. Trouver un actor Google Maps fonctionnel
 * 3. Mettre à jour APIFY_API_TOKEN et l'URL de l'actor
 */

export interface GoogleMapsSearchParams {
  keywords: string;
  location: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
  maxResults?: number;
}

export interface GoogleMapsResult {
  placeId: string;
  title: string;
  address: string;
  city?: string;
  postalCode?: string;
  phone?: string;
  website?: string;
  location?: {
    lat: number;
    lng: number;
  };
  rating?: number;
  reviewsCount?: number;
  categories?: string[];
  description?: string;
  reviews?: string[];
}

/**
 * Recherche de garages - VERSION SIMPLIFIÉE
 * 
 * Retourne une erreur informative car Apify n'est pas configuré.
 * L'utilisateur est invité à ajouter manuellement ses partenaires.
 */
export async function searchGoogleMapsApify(
  params: GoogleMapsSearchParams
): Promise<GoogleMapsResult[]> {
  console.log('[Apify] Recherche demandée mais service non disponible:', params.keywords);
  
  // Pour l'instant, on lance une erreur qui sera catchée
  // et l'utilisateur verra un message utile
  throw new Error('EXTERNAL_SEARCH_NOT_AVAILABLE');
}

/**
 * Génère des suggestions de recherche pour l'utilisateur
 * basées sur sa localisation et le type de panne
 */
export function generateSearchSuggestions(params: GoogleMapsSearchParams): {
  googleSearchUrl: string;
  keywords: string;
  tips: string[];
} {
  const { keywords, location } = params;
  
  // Construire une URL de recherche Google Maps manuelle
  const searchQuery = encodeURIComponent(`${keywords} ${location}`);
  const googleSearchUrl = `https://www.google.com/maps/search/${searchQuery}`;
  
  return {
    googleSearchUrl,
    keywords,
    tips: [
      'Vérifiez que le garage est bien agréé par la marque',
      'Appelez avant de vous déplacer pour vérifier la disponibilité',
      'Demandez un devis avant l\'intervention',
      'Pensez à ajouter ce garage à vos partenaires pour les futures recherches'
    ]
  };
}
