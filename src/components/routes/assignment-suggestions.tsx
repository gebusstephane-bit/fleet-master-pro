'use client';

import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RouteConstraints, StopConstraint, findBestAssignment } from '@/lib/routing/constraints';
import { Vehicle } from '@/lib/schemas/vehicles';
import { Driver } from '@/lib/schemas/drivers';
import { optimizeRouteV2 } from '@/lib/routing/optimizer-v2';
import { calculateAverageSpeed, isHeavyVehicle } from '@/lib/routing/vehicle-speeds';
import { User, Truck, Star, AlertTriangle, Check, Sparkles } from 'lucide-react';

interface AssignmentSuggestionsProps {
  vehicles: Vehicle[];
  drivers: Driver[];
  stops: Array<{
    latitude?: number;
    longitude?: number;
    constraints?: StopConstraint;
  }>;
  constraints: RouteConstraints;
  depot: { latitude: number; longitude: number };
  onSelect: (vehicleId: string, driverId: string) => void;
  selectedVehicleId?: string;
  selectedDriverId?: string;
}

export function AssignmentSuggestions({
  vehicles,
  drivers,
  stops,
  constraints,
  depot,
  onSelect,
  selectedVehicleId,
  selectedDriverId,
}: AssignmentSuggestionsProps) {
  // Calculer la distance estimée
  const estimatedDistance = useMemo(() => {
    if (stops.length < 2) return 50;
    const result = optimizeRouteV2(
      stops.filter((s): s is { latitude: number; longitude: number } => 
        typeof s.latitude === 'number' && typeof s.longitude === 'number'
      ).map((s, i) => ({
        id: i.toString(),
        latitude: s.latitude,
        longitude: s.longitude,
        address: '',
        serviceDuration: 15,
        priority: 'NORMAL',
        constraints: stops[i]?.constraints,
      })),
      depot,
      constraints
    );
    return result.totalDistanceKm || 50;
  }, [stops, constraints, depot]);

  // Extraire les contraintes des arrêts
  const stopConstraints = useMemo(() => 
    stops.map((s, i) => s.constraints || { stopId: i.toString() }),
    [stops]
  );

  // Trouver la meilleure affectation
  const bestAssignment = useMemo(() => 
    findBestAssignment(vehicles, drivers, constraints, stopConstraints, estimatedDistance),
    [vehicles, drivers, constraints, stopConstraints, estimatedDistance]
  );

  // Calculer les top 3 alternatives
  const alternatives = useMemo(() => {
    const allAssignments: Array<{
      vehicle: Vehicle;
      driver: Driver;
      totalScore: number;
    }> = [];

    for (const vehicle of vehicles) {
      for (const driver of drivers) {
        if (vehicle.id === bestAssignment?.vehicle.id && driver.id === bestAssignment?.driver.id) {
          continue;
        }
        
        // Calcul rapide du score
        const assignment = findBestAssignment(
          [vehicle],
          [driver],
          constraints,
          stopConstraints,
          estimatedDistance
        );
        
        if (assignment && assignment.totalScore > 50) {
          allAssignments.push({
            vehicle,
            driver,
            totalScore: assignment.totalScore,
          });
        }
      }
    }

    return allAssignments
      .sort((a, b) => b.totalScore - a.totalScore)
      .slice(0, 3);
  }, [vehicles, drivers, constraints, stopConstraints, estimatedDistance, bestAssignment]);

  if (!bestAssignment) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Aucune suggestion automatique</p>
            <p className="text-xs mt-1">Sélectionnez manuellement un véhicule et un chauffeur ci-dessous</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const isSelected = selectedVehicleId === bestAssignment.vehicle.id && 
                     selectedDriverId === bestAssignment.driver.id;

  return (
    <div className="space-y-4">
      {/* Meilleure suggestion */}
      <Card className={isSelected ? 'ring-2 ring-primary' : ''}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-500" />
              Suggestion optimale
            </CardTitle>
            <Badge variant={bestAssignment.totalScore > 80 ? 'default' : 'secondary'}>
              <Star className="w-3 h-3 mr-1" />
              {Math.round(bestAssignment.totalScore)}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Véhicule */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <Truck className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {bestAssignment.vehicle.registration_number}
              </p>
              <p className="text-sm text-muted-foreground">
                {bestAssignment.vehicle.brand} {bestAssignment.vehicle.model} • {bestAssignment.vehicle.category}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Vitesse moyenne: {calculateAverageSpeed(bestAssignment.vehicle.category)} km/h
                {isHeavyVehicle(bestAssignment.vehicle.category) && ' (PL limité à 90 km/h)'}
              </p>
              {bestAssignment.vehicleScore < 100 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ {bestAssignment.vehicleScore}% compatibilité
                </p>
              )}
            </div>
          </div>

          {/* Chauffeur */}
          <div className="flex items-start gap-3 p-3 bg-muted rounded-lg">
            <User className="w-5 h-5 text-primary mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">
                {bestAssignment.driver.first_name} {bestAssignment.driver.last_name}
              </p>
              <p className="text-sm text-muted-foreground">
                Permis: {bestAssignment.driver.license_type} • {bestAssignment.driver.cqc_card ? 'CQC ✓' : 'Sans CQC'}
              </p>
              {bestAssignment.driverScore < 100 && (
                <p className="text-xs text-amber-600 mt-1">
                  ⚠ {bestAssignment.driverScore}% compatibilité
                </p>
              )}
            </div>
          </div>

          {/* Warnings */}
          {bestAssignment.warnings.length > 0 && (
            <div className="text-xs text-amber-600 space-y-1">
              {bestAssignment.warnings.map((w, i) => (
                <p key={i}>⚠ {w}</p>
              ))}
            </div>
          )}

          {/* Bouton */}
          <Button
            onClick={() => onSelect(bestAssignment.vehicle.id, bestAssignment.driver.id)}
            className="w-full"
            variant={isSelected ? 'secondary' : 'default'}
          >
            {isSelected ? (
              <>
                <Check className="w-4 h-4 mr-2" />
                Sélectionné
              </>
            ) : (
              'Utiliser cette affectation'
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Alternatives */}
      {alternatives.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base text-muted-foreground">
              Alternatives ({alternatives.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {alternatives.map((alt, i) => {
              const isAltSelected = selectedVehicleId === alt.vehicle.id && 
                                    selectedDriverId === alt.driver.id;
              
              return (
                <button
                  key={i}
                  onClick={() => onSelect(alt.vehicle.id, alt.driver.id)}
                  className={`
                    w-full p-3 rounded-lg border text-left transition-all
                    ${isAltSelected 
                      ? 'border-primary bg-primary/5' 
                      : 'border-border hover:border-primary/50'
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="font-medium text-sm">
                        {alt.vehicle.registration_number} + {alt.driver.first_name} {alt.driver.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {alt.vehicle.category} • {alt.driver.license_type}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {Math.round(alt.totalScore)}%
                    </Badge>
                  </div>
                </button>
              );
            })}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
