/**
 * Badge de risque pour la liste des véhicules
 * Affiche un indicateur visuel si le véhicule est à haut risque
 */

'use client';

import Link from 'next/link';
import { AlertTriangle, Activity, Loader2, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { 
  Tooltip, 
  TooltipContent, 
  TooltipProvider, 
  TooltipTrigger 
} from '@/components/ui/tooltip';
import { useVehiclePrediction, useAllPredictions, getRiskBadgeVariant } from '@/hooks/use-ai-predictions';
import { cn } from '@/lib/utils';

interface VehicleRiskBadgeProps {
  vehicleId: string;
  showDetails?: boolean;
}

/**
 * Badge optimisé pour les listes (utilise l'API batch)
 */
export function VehicleRiskBadge({ vehicleId, showDetails = false }: VehicleRiskBadgeProps) {
  const { data: predictions, isLoading } = useAllPredictions();
  
  const prediction = predictions?.[vehicleId];

  if (isLoading) {
    return (
      <div className="h-5 w-16 bg-slate-100 animate-pulse rounded"></div>
    );
  }

  if (!prediction) {
    return (
      <Badge variant="outline" className="text-slate-400 text-xs">
        <Activity className="h-3 w-3 mr-1" />
        Analyse en cours
      </Badge>
    );
  }

  const probability = prediction.failure_probability;
  const isHighRisk = probability >= 0.5;

  // Ne pas afficher si risque faible (sauf si showDetails)
  if (!isHighRisk && !showDetails) {
    return (
      <Badge variant="outline" className="text-green-600 bg-green-50 text-xs">
        <CheckCircle2 className="h-3 w-3 mr-1" />
        À jour
      </Badge>
    );
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={`/vehicles/${vehicleId}?tab=prediction`}>
            <Badge 
              variant={getRiskBadgeVariant(probability)}
              className={cn(
                'cursor-pointer hover:opacity-80 transition-opacity text-xs',
                isHighRisk && 'animate-pulse'
              )}
            >
              <AlertTriangle className="h-3 w-3 mr-1" />
              {isHighRisk ? 'Préventif urgent' : 'Préventif à planifier'}
              <span className="ml-1">
                {(probability * 100).toFixed(0)}%
              </span>
            </Badge>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" className="max-w-xs">
          <div className="space-y-2">
            <p className="font-medium">{prediction.predicted_failure_type}</p>
            <p className="text-xs text-slate-400">
              Cliquez pour voir les détails
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Indicateur de risque compact (pour tableaux)
 */
export function RiskIndicator({ vehicleId }: { vehicleId: string }) {
  const { data: predictions } = useAllPredictions();
  const prediction = predictions?.[vehicleId];

  if (!prediction) {
    return <div className="w-2 h-2 rounded-full bg-slate-200"></div>;
  }

  const probability = prediction.failure_probability;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={`/vehicles/${vehicleId}?tab=prediction`}>
            <div
              className={cn(
                'w-2 h-2 rounded-full cursor-pointer',
                probability >= 0.7 && 'bg-red-500',
                probability >= 0.5 && probability < 0.7 && 'bg-orange-500',
                probability >= 0.3 && probability < 0.5 && 'bg-yellow-500',
                probability < 0.3 && 'bg-green-500'
              )}
            />
          </Link>
        </TooltipTrigger>
        <TooltipContent>
          <p>Risque: {(probability * 100).toFixed(0)}%</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Version détaillée pour la fiche véhicule
 */
export function VehicleRiskBadgeDetail({ vehicleId }: { vehicleId: string }) {
  const { data: prediction, isLoading } = useVehiclePrediction(vehicleId);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm text-slate-500">Chargement...</span>
      </div>
    );
  }

  if (!prediction) {
    return (
      <Badge variant="outline" className="text-slate-400">
        <Activity className="h-4 w-4 mr-2" />
        Pas de prédiction disponible
      </Badge>
    );
  }

  const probability = prediction.failure_probability;
  const isHighRisk = probability >= 0.5;

  return (
    <Badge 
      variant={getRiskBadgeVariant(probability)}
      className={cn(
        'text-sm',
        isHighRisk && 'animate-pulse'
      )}
    >
      <AlertTriangle className="h-4 w-4 mr-2" />
      {(probability * 100).toFixed(1)}% - {prediction.predicted_failure_type}
    </Badge>
  );
}
