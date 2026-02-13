'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
// Mapbox CSS is loaded dynamically in layout or via link tag

// Set token
mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || '';

interface MapboxMapProps {
  center?: [number, number];
  zoom?: number;
  markers?: Array<{
    id: string;
    lng: number;
    lat: number;
    label?: string;
  }>;
  route?: Array<[number, number]>;
  onClick?: (lng: number, lat: number) => void;
  height?: string;
}

export function MapboxMap({
  center = [2.3522, 48.8566], // Paris
  zoom = 12,
  markers = [],
  route,
  onClick,
  height = '400px',
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const routeRef = useRef<mapboxgl.GeoJSONSource | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Initialize map
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/streets-v12',
      center,
      zoom,
    });

    map.current.on('load', () => {
      setIsLoaded(true);
      
      // Add route layer
      if (map.current) {
        map.current.addSource('route', {
          type: 'geojson',
          data: {
            type: 'Feature',
            properties: {},
            geometry: {
              type: 'LineString',
              coordinates: [],
            },
          },
        });

        map.current.addLayer({
          id: 'route',
          type: 'line',
          source: 'route',
          layout: {
            'line-join': 'round',
            'line-cap': 'round',
          },
          paint: {
            'line-color': '#3b82f6',
            'line-width': 4,
          },
        });

        routeRef.current = map.current.getSource('route') as mapboxgl.GeoJSONSource;
      }
    });

    // Click handler
    if (onClick) {
      map.current.on('click', (e) => {
        onClick(e.lngLat.lng, e.lngLat.lat);
      });
    }

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update center
  useEffect(() => {
    if (map.current && isLoaded) {
      map.current.setCenter(center);
    }
  }, [center, isLoaded]);

  // Update markers
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach((m, index) => {
      const el = document.createElement('div');
      el.className = 'marker';
      el.innerHTML = `
        <div style="
          background: ${index === 0 ? '#10b981' : index === markers.length - 1 ? '#ef4444' : '#3b82f6'};
          color: white;
          width: 28px;
          height: 28px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: bold;
          font-size: 12px;
          border: 2px solid white;
          box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        ">${index + 1}</div>
      `;

      const marker = new mapboxgl.Marker(el)
        .setLngLat([m.lng, m.lat])
        .addTo(map.current!);

      if (m.label) {
        marker.setPopup(new mapboxgl.Popup().setText(m.label));
      }

      markersRef.current.push(marker);
    });

    // Fit bounds to markers
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [markers, isLoaded]);

  // Update route line
  useEffect(() => {
    if (routeRef.current && route && route.length > 1) {
      routeRef.current.setData({
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'LineString',
          coordinates: route,
        },
      });
    }
  }, [route]);

  if (!process.env.NEXT_PUBLIC_MAPBOX_TOKEN) {
    return (
      <div
        className="flex items-center justify-center bg-muted rounded-lg border-2 border-dashed"
        style={{ height }}
      >
        <p className="text-muted-foreground text-sm">
          Mapbox token manquant. Ajoutez NEXT_PUBLIC_MAPBOX_TOKEN dans .env.local
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-lg overflow-hidden" style={{ height }}>
      <div ref={mapContainer} className="w-full h-full" />
      {!isLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted">
          <p className="text-muted-foreground">Chargement de la carte...</p>
        </div>
      )}
    </div>
  );
}
