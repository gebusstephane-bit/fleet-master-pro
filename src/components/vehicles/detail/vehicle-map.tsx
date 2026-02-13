'use client';

import { MapPin, Navigation, AlertCircle } from 'lucide-react';

interface VehicleMapProps {
  vehicle: {
    id: string;
    registration: string;
    lat?: number;
    lng?: number;
    lastUpdate?: string;
  };
}

export default function VehicleMap({ vehicle }: VehicleMapProps) {
  // Pour l'instant, on affiche une carte statique avec les coordonnées simulées
  // L'intégration Mapbox complète nécessitera une configuration supplémentaire
  
  const hasLocation = vehicle.lat && vehicle.lng;
  
  if (!hasLocation) {
    return (
      <div className="h-[400px] flex flex-col items-center justify-center bg-slate-50 rounded-lg border-2 border-dashed border-slate-200">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <MapPin className="h-8 w-8 text-slate-400" />
        </div>
        <p className="text-slate-900 font-medium">Position non disponible</p>
        <p className="text-sm text-slate-500 mt-1 text-center max-w-xs">
          Le véhicule n&apos;est pas équipé de GPS ou est actuellement hors ligne
        </p>
      </div>
    );
  }

  return (
    <div className="relative h-[400px] rounded-lg overflow-hidden bg-slate-100">
      {/* Placeholder pour la carte - à remplacer par Mapbox */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="text-center">
          <div className="h-20 w-20 rounded-full bg-blue-500 border-4 border-white shadow-lg flex items-center justify-center mx-auto mb-4">
            <Navigation className="h-8 w-8 text-white" />
          </div>
          <p className="font-semibold text-slate-900">{vehicle.registration}</p>
          <p className="text-sm text-slate-500">
            {vehicle.lat?.toFixed(4)}, {vehicle.lng?.toFixed(4)}
          </p>
          <p className="text-xs text-green-600 mt-2 flex items-center justify-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            En ligne
          </p>
        </div>
      </div>
      
      {/* Overlay avec infos */}
      <div className="absolute bottom-4 left-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow-lg p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">{vehicle.registration}</span>
          </div>
          <span className="text-xs text-slate-500">
            Mis à jour: {vehicle.lastUpdate ? new Date(vehicle.lastUpdate).toLocaleTimeString('fr-FR') : 'à l\'instant'}
          </span>
        </div>
      </div>
      
      {/* Note Mapbox */}
      <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg shadow px-3 py-2">
        <p className="text-xs text-slate-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3" />
          Carte Mapbox à intégrer
        </p>
      </div>
    </div>
  );
}
