/**
 * Risk Vehicles - Dashboard
 * Affiche les véhicules à risque selon l'IA
 */

'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Brain, AlertTriangle, ArrowRight, Car } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';

export interface RiskVehicle {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  failure_probability: number;
  predicted_failure_type: string;
  urgency_level: 'low' | 'medium' | 'high' | 'critical';
  days_until_predicted: number;
}

interface RiskVehiclesProps {
  vehicles: RiskVehicle[] | null;
  isLoading: boolean;
}

const urgencyConfig = {
  critical: { label: 'Critique', color: 'text-red-600 bg-red-100', progressColor: 'bg-red-600' },
  high: { label: 'Élevé', color: 'text-orange-600 bg-orange-100', progressColor: 'bg-orange-500' },
  medium: { label: 'Moyen', color: 'text-amber-600 bg-amber-100', progressColor: 'bg-amber-500' },
  low: { label: 'Faible', color: 'text-emerald-600 bg-emerald-100', progressColor: 'bg-emerald-500' },
};

export function RiskVehicles({ vehicles, isLoading }: RiskVehiclesProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <Skeleton className="h-5 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-20 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const items = vehicles || [];

  // Filtrer uniquement les véhicules avec risque significatif (> 30%)
  const significantRisks = items.filter(v => v.failure_probability >= 30);

  return (
    <Card className="h-full border-l-4 border-l-purple-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-600" />
            Prédictions IA
          </CardTitle>
          {significantRisks.length > 0 && (
            <Badge variant="secondary" className="bg-purple-100 text-purple-700 flex items-center gap-1">
              <AlertTriangle className="h-3 w-3" />
              {significantRisks.length} risque{significantRisks.length > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        <p className="text-xs text-gray-400">
          Véhicules à risque de panne prédits par l&apos;IA
        </p>
      </CardHeader>
      
      <CardContent className="pt-0">
        {significantRisks.length === 0 ? (
          <div className="text-center py-6 text-gray-300">
            <Brain className="h-10 w-10 mx-auto mb-2 opacity-30" />
            <p className="text-sm">Aucun véhicule à risque</p>
            <p className="text-xs mt-1">L&apos;IA n&apos;a détecté aucune anomalie</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
            {significantRisks.map((vehicle) => {
              const config = urgencyConfig[vehicle.urgency_level] || urgencyConfig.medium;
              
              return (
                <Link
                  key={vehicle.id}
                  href={`/vehicles/${vehicle.vehicle_id}`}
                  className="block p-3 rounded-lg border hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={cn("p-1.5 rounded-full shrink-0", config.color)}>
                        <Car className="h-3.5 w-3.5" />
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-sm truncate">{vehicle.vehicle_name}</p>
                        <p className="text-xs text-gray-400 truncate">{vehicle.predicted_failure_type}</p>
                      </div>
                    </div>
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs shrink-0", config.color)}
                    >
                      {config.label}
                    </Badge>
                  </div>
                  
                  <div className="mt-3">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="text-gray-400">Probabilité de panne</span>
                      <span className={cn("font-medium", 
                        vehicle.failure_probability >= 70 ? "text-red-600" :
                        vehicle.failure_probability >= 50 ? "text-orange-600" : "text-amber-600"
                      )}>
                        {vehicle.failure_probability}%
                      </span>
                    </div>
                    <Progress 
                      value={vehicle.failure_probability} 
                      className="h-2"
                    />
                    <p className="text-xs text-gray-300 mt-2">
                      Prédiction dans {vehicle.days_until_predicted} jour{vehicle.days_until_predicted > 1 ? 's' : ''}
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        
        <Link 
          href="/vehicles"
          className="flex items-center justify-center gap-1 mt-4 pt-3 border-t text-sm text-gray-400 hover:text-slate-700 transition-colors"
        >
          Voir tous les véhicules
          <ArrowRight className="h-4 w-4" />
        </Link>
      </CardContent>
    </Card>
  );
}
