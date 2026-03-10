/**
 * API Route: /api/geocode
 * Géocodage via Apify (Google Maps Scraper) avec fallback Nominatim
 * 
 * Méthodes:
 * - GET /api/geocode?q=address : Forward geocoding
 * - POST {address} ou {lat, lng} : Forward/reverse geocoding
 */

import { NextRequest, NextResponse } from 'next/server';
import { ApifyClient } from 'apify-client';

export const dynamic = 'force-dynamic';

// Initialiser le client Apify
const apifyClient = process.env.APIFY_API_TOKEN 
  ? new ApifyClient({ token: process.env.APIFY_API_TOKEN })
  : null;

interface GeocodeResult {
  lat: number;
  lng: number;
  display_name: string;
  address?: string;
  place_id?: string;
  source: 'apify' | 'nominatim' | 'fallback';
}

/**
 * Géocodage via Apify Google Maps Scraper
 */
async function geocodeWithApify(address: string): Promise<GeocodeResult | null> {
  if (!apifyClient) {
    console.log('[Geocode] Apify not configured, skipping');
    return null;
  }

  try {
    console.log('[Geocode] Trying Apify for:', address);
    
    // Utilisation de l'actor Google Maps Scraper
    const input = {
      searchQueries: [`${address}, France`],
      maxCrawledPlaces: 1,
      language: 'fr',
      maxImages: 0,
      includeWebResults: false,
      scrapeReviews: false,
      scrapeContactInfo: false,
    };

    const run = await apifyClient.actor('compass/crawler-google-places').call(input);
    const { items } = await apifyClient.dataset(run.defaultDatasetId).listItems();

    if (items && items.length > 0) {
      const place = items[0] as any;
      
      if (place.location?.lat && place.location?.lng) {
        console.log('[Geocode] Apify success:', place.title);
        return {
          lat: place.location.lat,
          lng: place.location.lng,
          display_name: place.title + (place.address ? `, ${place.address}` : ''),
          address: place.address,
          place_id: place.placeId,
          source: 'apify',
        };
      }
    }
    
    console.log('[Geocode] Apify returned no results');
    return null;
    
  } catch (error: any) {
    console.error('[Geocode] Apify error:', error.message);
    return null;
  }
}

/**
 * Géocodage via Nominatim (OpenStreetMap)
 */
async function geocodeWithNominatim(address: string): Promise<GeocodeResult | null> {
  try {
    console.log('[Geocode] Trying Nominatim for:', address);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=fr&limit=1`,
      {
        headers: {
          'User-Agent': 'FleetMaster/1.0 (contact@fleetmaster.fr)',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.length > 0) {
      console.log('[Geocode] Nominatim success:', data[0].display_name);
      return {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
        display_name: data[0].display_name,
        place_id: data[0].place_id,
        source: 'nominatim',
      };
    }
    
    return null;
    
  } catch (error: any) {
    console.error('[Geocode] Nominatim error:', error.message);
    return null;
  }
}

/**
 * Reverse geocoding via Nominatim
 */
async function reverseGeocodeWithNominatim(lat: number, lng: number): Promise<GeocodeResult | null> {
  try {
    console.log('[Geocode] Reverse geocoding:', lat, lng);
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      {
        headers: {
          'User-Agent': 'FleetMaster/1.0 (contact@fleetmaster.fr)',
        },
        signal: controller.signal,
      }
    );
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const data = await response.json();
    
    if (data && data.display_name) {
      return {
        lat,
        lng,
        display_name: data.display_name,
        address: data.address,
        place_id: data.place_id,
        source: 'nominatim',
      };
    }
    
    return null;
    
  } catch (error: any) {
    console.error('[Geocode] Reverse geocoding error:', error.message);
    return null;
  }
}

/**
 * Géocodage intelligent avec fallback
 */
async function geocodeAddress(address: string): Promise<GeocodeResult | null> {
  // Essayer Apify d'abord
  const apifyResult = await geocodeWithApify(address);
  if (apifyResult) return apifyResult;
  
  // Fallback sur Nominatim
  return geocodeWithNominatim(address);
}

// GET /api/geocode?q=address
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const address = searchParams.get('q');
  
  if (!address) {
    return NextResponse.json({ error: 'Adresse requise (paramètre q)' }, { status: 400 });
  }

  const result = await geocodeAddress(address);
  
  if (!result) {
    return NextResponse.json(
      { error: 'Adresse non trouvée', address },
      { status: 404 }
    );
  }

  return NextResponse.json([result]); // Format compatible ancien code
}

// POST /api/geocode
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { address, lat, lng } = body;
    
    // Reverse geocoding (lat/lng -> adresse)
    if (lat !== undefined && lng !== undefined) {
      const result = await reverseGeocodeWithNominatim(Number(lat), Number(lng));
      
      if (!result) {
        // Fallback: retourner les coordonnées comme adresse
        return NextResponse.json({
          lat,
          lng,
          display_name: `${lat}, ${lng}`,
          source: 'fallback',
        });
      }
      
      return NextResponse.json(result);
    }
    
    // Forward geocoding (adresse -> lat/lng)
    if (address) {
      const result = await geocodeAddress(address);
      
      if (!result) {
        return NextResponse.json(
          { error: 'Adresse non trouvée', address },
          { status: 404 }
        );
      }
      
      return NextResponse.json([result]);
    }

    return NextResponse.json(
      { error: 'Adresse ou coordonnées (lat,lng) requises' },
      { status: 400 }
    );

  } catch (error: any) {
    console.error('[Geocode] POST error:', error);
    return NextResponse.json(
      { error: 'Erreur de traitement: ' + error.message },
      { status: 500 }
    );
  }
}
