"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MapPin, Navigation, Car } from "lucide-react";
import { Button } from "@/components/ui/button";
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

interface FleetMapSimpleProps {
  vehicles: VehiclePosition[];
  className?: string;
}

export function FleetMapSimple({ vehicles, className }: FleetMapSimpleProps) {
  const activeVehicles = vehicles.filter(v => v.status === "ACTIVE").length;

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
        <Button variant="outline" size="sm">
          <Navigation className="h-4 w-4 mr-1" />
          Actualiser
        </Button>
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
              {/* Vue simplifiée des véhicules */}
              <div className="grid grid-cols-2 gap-3">
                {vehicles.map((vehicle, index) => (
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
              
              <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3 shadow-lg border border-gray-200">
                <p className="text-xs text-gray-500">
                  Carte interactive disponible avec Mapbox
                </p>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
