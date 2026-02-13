"use client";

import { useEffect, useRef, useState } from "react";
import mapboxgl from "mapbox-gl";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Maximize2, Car } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface VehiclePosition {
  id: string;
  registration: string;
  lat: number;
  lng: number;
  status: "ACTIVE" | "INACTIVE" | "MAINTENANCE";
  driverName?: string;
  lastUpdate: Date;
}

interface FleetMapProps {
  vehicles: VehiclePosition[];
  className?: string;
}

export function FleetMap({ vehicles, className }: FleetMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [hasToken, setHasToken] = useState(!!process.env.NEXT_PUBLIC_MAPBOX_TOKEN);

  useEffect(() => {
    if (!hasToken || !mapContainer.current || map.current) return;

    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/light-v11",
      center: [2.3522, 48.8566], // Paris par défaut
      zoom: 10,
      attributionControl: false
    });

    map.current.on("load", () => {
      setMapLoaded(true);
      
      // Ajouter les marqueurs si véhicules disponibles
      if (vehicles.length > 0) {
        updateMarkers();
        fitBounds();
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, [hasToken]);

  // Mettre à jour les marqueurs quand les véhicules changent
  useEffect(() => {
    if (mapLoaded && vehicles.length > 0) {
      updateMarkers();
    }
  }, [vehicles, mapLoaded]);

  const updateMarkers = () => {
    if (!map.current) return;

    // Supprimer anciens marqueurs
    const markers = document.querySelectorAll(".vehicle-marker");
    markers.forEach(m => m.remove());

    vehicles.forEach((vehicle, index) => {
      const el = document.createElement("div");
      el.className = "vehicle-marker";
      
      const bgColor = vehicle.status === 'ACTIVE' ? 'bg-emerald-500' : 
                      vehicle.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-gray-400';
      const statusColor = vehicle.status === 'ACTIVE' ? 'bg-emerald-400' : 'bg-gray-300';
      
      el.innerHTML = `
        <div class="relative">
          <div class="w-10 h-10 rounded-full border-3 border-white shadow-lg flex items-center justify-center font-bold text-white text-sm ${bgColor}">
            ${index + 1}
          </div>
          <div class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${statusColor}">
          </div>
        </div>
      `;

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(`
        <div class="p-2 min-w-[200px]">
          <div class="font-semibold text-gray-900">${vehicle.registration}</div>
          <div class="text-sm text-gray-500">${vehicle.driverName || "Sans chauffeur"}</div>
          <div class="text-xs text-gray-400 mt-1">
            Mis à jour : ${new Date(vehicle.lastUpdate).toLocaleTimeString()}
          </div>
          <div class="mt-2">
            <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium
              ${vehicle.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 
                vehicle.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 
                'bg-gray-100 text-gray-700'}">
              ${vehicle.status === 'ACTIVE' ? 'En service' : 
                vehicle.status === 'MAINTENANCE' ? 'Maintenance' : 'Inactif'}
            </span>
          </div>
        </div>
      `);

      new mapboxgl.Marker(el)
        .setLngLat([vehicle.lng, vehicle.lat])
        .setPopup(popup)
        .addTo(map.current!);
    });
  };

  const fitBounds = () => {
    if (!map.current || vehicles.length === 0) return;
    
    const bounds = new mapboxgl.LngLatBounds();
    vehicles.forEach(v => bounds.extend([v.lng, v.lat]));
    
    map.current.fitBounds(bounds, { padding: 50, maxZoom: 14 });
  };

  const activeVehicles = vehicles.filter(v => v.status === "ACTIVE").length;

  // Si pas de token Mapbox, afficher la vue simplifiée
  if (!hasToken) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div className="flex items-center gap-3">
            <CardTitle className="text-lg font-semibold">Position des véhicules</CardTitle>
            <Badge variant="secondary" className="font-normal">
              {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''}
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
              {activeVehicles} en service
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-0">
          <div className="relative h-[350px] bg-gradient-to-br from-slate-100 to-slate-200 rounded-b-lg overflow-hidden">
            {vehicles.length === 0 ? (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">Aucun véhicule suivi</p>
                  <p className="text-sm text-gray-400 mt-1">
                    Les positions s&apos;afficheront quand les véhicules seront équipés de GPS
                  </p>
                </div>
              </div>
            ) : (
              <div className="absolute inset-0 p-4">
                <div className="grid grid-cols-2 gap-3">
                  {vehicles.map((vehicle) => (
                    <div
                      key={vehicle.id}
                      className="bg-white rounded-lg p-3 shadow-sm border border-gray-200 flex items-center gap-3"
                    >
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white text-sm
                        ${vehicle.status === 'ACTIVE' ? 'bg-emerald-500' : 
                          vehicle.status === 'MAINTENANCE' ? 'bg-amber-500' : 'bg-gray-400'}`}
                      >
                        <Car className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          {vehicle.registration}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                          {vehicle.driverName || "Sans chauffeur"}
                        </p>
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium mt-1
                          ${vehicle.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 
                            vehicle.status === 'MAINTENANCE' ? 'bg-amber-100 text-amber-700' : 
                            'bg-gray-100 text-gray-700'}`}
                        >
                          {vehicle.status === 'ACTIVE' ? 'En service' : 
                            vehicle.status === 'MAINTENANCE' ? 'Maintenance' : 'Inactif'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <CardTitle className="text-lg font-semibold">Carte temps réel</CardTitle>
          <Badge variant="secondary" className="font-normal">
            {vehicles.length} véhicule{vehicles.length > 1 ? 's' : ''}
          </Badge>
          <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-normal">
            {activeVehicles} en mouvement
          </Badge>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={fitBounds}>
            <Navigation className="h-4 w-4 mr-1" />
            Centrer
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8">
            <Maximize2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative h-[350px] bg-gray-100 rounded-b-lg overflow-hidden">
          {vehicles.length === 0 ? (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center">
                <MapPin className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 font-medium">Aucun véhicule suivi</p>
                <p className="text-sm text-gray-400 mt-1">
                  Les positions s&apos;afficheront quand les véhicules seront équipés de GPS
                </p>
              </div>
            </div>
          ) : (
            <div ref={mapContainer} className="absolute inset-0" />
          )}
        </div>
      </CardContent>
    </Card>
  );
}
