/**
 * Composant VehicleMap
 * Carte Mapbox affichant les véhicules en temps réel
 */

'use client';

import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Map as MapIcon, 
  Navigation, 
  Maximize2,
  Minimize2,
  Truck
} from 'lucide-react';
import { cn } from '@/lib/utils';
// @ts-ignore
import { MapVehicleMarker, VehicleStatus } from '@/types';
import { formatSpeed } from '@/lib/utils';

interface VehicleMapProps {
  // @ts-ignore
  vehicles: MapVehicleMarker[];
  className?: string;
}

// @ts-ignore
export function VehicleMap({ vehicles, className }: VehicleMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<any>(null);
  const markersRef = useRef<{ [key: string]: any }>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [isMapboxEnabled, setIsMapboxEnabled] = useState(false);

  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  // Initialiser la carte Mapbox
  useEffect(() => {
    if (!token || token.includes('placeholder')) {
      setIsMapboxEnabled(false);
      return;
    }

    if (!mapContainer.current) return;

    setIsMapboxEnabled(true);

    const initMap = async () => {
      const mapboxgl = await import('mapbox-gl');
      
      mapboxgl.default.accessToken = token;

      map.current = new mapboxgl.default.Map({
        container: mapContainer.current!,
        style: 'mapbox://styles/mapbox/streets-v12',
        center: [2.3522, 48.8566], // Paris par défaut
        zoom: 11,
      });

      map.current.addControl(new mapboxgl.default.NavigationControl(), 'top-right');
      map.current.addControl(new mapboxgl.default.FullscreenControl(), 'top-right');

      map.current.on('load', () => {
        setMapLoaded(true);
      });
    };

    initMap();

    return () => {
      map.current?.remove();
    };
  }, [token]);

  // Mettre à jour les marqueurs
  useEffect(() => {
    if (!isMapboxEnabled || !map.current || !mapLoaded) return;

    const updateMarkers = async () => {
      const mapboxgl = await import('mapbox-gl');

      // Supprimer les anciens marqueurs
      Object.values(markersRef.current).forEach((marker: any) => marker.remove());
      markersRef.current = {};

      // Ajouter les nouveaux marqueurs
      // @ts-ignore
      vehicles.forEach((vehicle) => {
        const el = document.createElement('div');
        el.className = 'vehicle-marker cursor-pointer';
        el.innerHTML = `
          <div class="relative">
            <div class="w-10 h-10 rounded-full flex items-center justify-center shadow-lg ${getMarkerColor(vehicle.status)}">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transform: rotate(${vehicle.heading}deg)">
                <path d="M12 2L2 7l10 5 10-5-10-5z"/>
              </svg>
            </div>
            <div class="absolute -bottom-5 left-1/2 transform -translate-x-1/2 bg-black/75 text-white text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap">
              ${vehicle.registration}
            </div>
          </div>
        `;

        const marker = new mapboxgl.default.Marker(el)
          .setLngLat([vehicle.lng, vehicle.lat])
          .addTo(map.current!);

        // Popup
        const popup = new mapboxgl.default.Popup({ offset: 25 }).setHTML(`
          <div class="p-2 min-w-[180px]">
            <h4 class="font-semibold text-sm">${vehicle.registration}</h4>
            <p class="text-xs text-gray-600">${vehicle.driverName || 'Non assigné'}</p>
            <div class="mt-1">
              <span class="inline-flex items-center px-2 py-0.5 rounded text-xs ${getStatusBadgeColor(vehicle.status)}">
                ${getStatusLabel(vehicle.status)}
              </span>
            </div>
            <p class="text-xs mt-1 font-medium">${formatSpeed(vehicle.speed)}</p>
          </div>
        `);

        el.addEventListener('click', () => {
          marker.setPopup(popup).togglePopup();
        });

        markersRef.current[vehicle.id] = marker;
      });

      // Ajuster la vue
      // @ts-ignore
      if (vehicles.length > 0) {
        const bounds = new mapboxgl.default.LngLatBounds();
        // @ts-ignore
        vehicles.forEach((v: any) => bounds.extend([v.lng, v.lat]));
        map.current.fitBounds(bounds, { padding: 50 });
      }
    };

    updateMarkers();
  }, [vehicles, mapLoaded, isMapboxEnabled]);

  // @ts-ignore
  const movingVehicles = vehicles.filter((v: any) => v.speed && v.speed > 0).length;

  return (
    <Card className={cn('overflow-hidden', isExpanded && 'fixed inset-4 z-50', className)}>
      <CardHeader className="flex flex-row items-center justify-between py-3">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <MapIcon className="h-5 w-5" />
            Carte temps réel
          </CardTitle>
          <div className="flex gap-2">
            <Badge variant="secondary" className="text-xs">
              <Truck className="h-3 w-3 mr-1" />
              {vehicles.length} véhicules
            </Badge>
            <Badge variant="outline" className="text-xs text-green-600">
              <Navigation className="h-3 w-3 mr-1" />
              {movingVehicles} en mouvement
            </Badge>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        {isMapboxEnabled ? (
          <div 
            ref={mapContainer} 
            className={cn(
              'w-full',
              isExpanded ? 'h-[calc(100vh-120px)]' : 'h-[400px]'
            )}
          />
        ) : (
          <div className={cn(
            'relative bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center',
            isExpanded ? 'h-[calc(100vh-120px)]' : 'h-[400px]'
          )}>
            <div className="text-center">
              <MapIcon className="h-16 w-16 mx-auto mb-4 text-slate-400" />
              <p className="text-slate-600 font-medium">Carte des véhicules</p>
              <p className="text-sm text-slate-500 mt-1">
                {vehicles.length} véhicules • {movingVehicles} en mouvement
              </p>
              <div className="mt-4 grid grid-cols-2 gap-2 text-xs max-w-xs mx-auto">
                {/* @ts-ignore */}
                {vehicles.slice(0, 6).map((v: any) => (
                  <div key={v.id} className="bg-white/80 p-2 rounded shadow-sm text-left">
                    <p className="font-medium">{v.registration}</p>
                    <p className="text-muted-foreground">{formatSpeed(v.speed)}</p>
                    <p className="text-muted-foreground text-[10px]">{v.driverName || 'Non assigné'}</p>
                  </div>
                ))}
              </div>
              <div className="mt-6 p-3 bg-amber-50 border border-amber-200 rounded-lg max-w-sm">
                <p className="text-sm text-amber-800">
                  🗺️ Pour activer la carte Mapbox :
                </p>
                <ol className="text-xs text-amber-700 text-left mt-2 space-y-1">
                  <li>1. Crée un compte sur <a href="https://mapbox.com" target="_blank" className="underline">mapbox.com</a></li>
                  <li>2. Va dans Account → Tokens</li>
                  <li>3. Copie ton token public</li>
                  <li>4. colle-le dans <code className="bg-amber-100 px-1 rounded">.env.local</code></li>
                </ol>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// @ts-ignore
function getMarkerColor(status: VehicleStatus): string {
  switch (status) {
    case 'active': return 'bg-green-500 text-white';
    case 'maintenance': return 'bg-amber-500 text-white';
    case 'inactive': return 'bg-gray-500 text-white';
    case 'retired': return 'bg-red-500 text-white';
    default: return 'bg-blue-500 text-white';
  }
}

// @ts-ignore
function getStatusBadgeColor(status: VehicleStatus): string {
  switch (status) {
    case 'active': return 'bg-green-100 text-green-800';
    case 'maintenance': return 'bg-amber-100 text-amber-800';
    case 'inactive': return 'bg-gray-100 text-gray-800';
    case 'retired': return 'bg-red-100 text-red-800';
    default: return 'bg-blue-100 text-blue-800';
  }
}

// @ts-ignore
function getStatusLabel(status: VehicleStatus): string {
  const labels: Record<string, string> = {
    active: 'Actif', maintenance: 'Maintenance', inactive: 'Inactif', retired: 'Retiré',
  };
  return labels[status] || status;
}
