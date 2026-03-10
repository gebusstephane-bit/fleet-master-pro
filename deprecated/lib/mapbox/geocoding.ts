const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
const BASE_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places';

export interface GeocodingResult {
  place_name: string;
  center: [number, number]; // [lng, lat]
  geometry: {
    type: string;
    coordinates: [number, number];
  };
  context?: Array<{
    id: string;
    text: string;
  }>;
}

export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token missing');
    return null;
  }

  try {
    const encodedAddress = encodeURIComponent(address);
    const url = `${BASE_URL}/${encodedAddress}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=fr`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0] as GeocodingResult;
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
}

export async function reverseGeocode(lng: number, lat: number): Promise<GeocodingResult | null> {
  if (!MAPBOX_TOKEN) {
    console.error('Mapbox token missing');
    return null;
  }

  try {
    const url = `${BASE_URL}/${lng},${lat}.json?access_token=${MAPBOX_TOKEN}&limit=1&language=fr`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.features && data.features.length > 0) {
      return data.features[0] as GeocodingResult;
    }
    return null;
  } catch (error) {
    console.error('Reverse geocoding error:', error);
    return null;
  }
}

export async function getDirections(
  waypoints: Array<[number, number]>
): Promise<{ geometry: { coordinates: Array<[number, number]> }; duration: number; distance: number } | null> {
  if (!MAPBOX_TOKEN || waypoints.length < 2) return null;

  try {
    const coordinates = waypoints.map((w) => w.join(',')).join(';');
    const url = `https://api.mapbox.com/directions/v5/mapbox/driving/${coordinates}?geometries=geojson&access_token=${MAPBOX_TOKEN}`;
    
    const response = await fetch(url);
    const data = await response.json();

    if (data.routes && data.routes.length > 0) {
      return data.routes[0];
    }
    return null;
  } catch (error) {
    console.error('Directions error:', error);
    return null;
  }
}
