/**
 * Carte de prédiction de panne AI
 * Affiche le risque, le type de panne probable, et les recommandations
 */

'use client';

import { useState } from 'react';
import { 
  AlertTriangle, 
  CheckCircle2, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Activity,
  Wrench,
  ThumbsUp,
  ThumbsDown
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { 
  useVehiclePrediction, 
  usePredictionFeedback,
  getRiskColor,
  getRiskBadgeVariant,
  getUrgencyLabel,
  AIPrediction 
} from '@/hooks/use-ai-predictions';
import { cn } from '@/lib/utils';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface PredictionCardProps {
  vehicleId: string;
}

export function PredictionCard({ vehicleId }: PredictionCardProps) {
  const { data: prediction, isLoading } = useVehiclePrediction(vehicleId);
  const feedbackMutation = usePredictionFeedback();
  const [showFeedback, setShowFeedback] = useState(false);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-200 rounded w-1/3"></div>
            <div className="h-8 bg-slate-200 rounded w-1/2"></div>
            <div className="h-20 bg-slate-200 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) {
    return (
      <Card className="w-full border-dashed">
        <CardContent className="p-6 text-center">
          <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-500">Aucune prédiction disponible pour ce véhicule</p>
          <p className="text-sm text-slate-400 mt-1">
            Les prédictions sont générées quotidiennement
          </p>
        </CardContent>
      </Card>
    );
  }

  const probability = prediction.failure_probability;
  const riskColorClass = getRiskColor(probability);
  const isHighRisk = probability >= 0.5;

  const handleFeedback = (occurred: boolean) => {
    feedbackMutation.mutate(
      {
        predictionId: prediction.id,
        actualFailureOccurred: occurred,
      },
      {
        onSuccess: () => {
          toast.success('Merci pour votre retour !');
          setShowFeedback(false);
        },
      }
    );
  };

  return (
    <Card className={cn('w-full', isHighRisk && 'border-red-200 shadow-red-100')}
    
    >
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className={cn('h-5 w-5', isHighRisk ? 'text-red-500' : 'text-green-500')} />
            <CardTitle className="text-lg">Maintenance Prédictive</CardTitle>
          </div>
          <Badge variant={getRiskBadgeVariant(probability)}>
            {getUrgencyLabel(prediction.urgency_level)}
          </Badge>
        </div>
        <p className="text-xs text-gray-400">
          Généré il y a {formatDistanceToNow(new Date(prediction.created_at), { locale: fr })}
          {' • '}Modèle v{prediction.model_version}
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score de risque */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-white">Probabilité d&apos;intervention</span>
            <span className={cn('text-2xl font-bold', riskColorClass.split(' ')[0])}>
              {(probability * 100).toFixed(1)}%
            </span>
          </div>
          <Progress 
            value={probability * 100} 
            className="h-2"
          />
          <div className="flex justify-between text-xs text-gray-400">
            <span>Préventif uniquement</span>
            <span>Intervention recommandée</span>
          </div>
        </div>

        <Separator />

        {/* Type de maintenance préventive suggérée */}
        <div className="flex items-start gap-3">
          <Wrench className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium">Maintenance préventive suggérée</p>
            <p className="text-slate-700">{prediction.predicted_failure_type}</p>
            <p className="text-xs text-gray-400">
              Confiance: {(prediction.confidence_score * 100).toFixed(0)}%
            </p>
          </div>
        </div>

        {/* Horizon de prédiction */}
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">Délai estimé</p>
            <p className="text-gray-300">
              {prediction.prediction_horizon_days} jours
            </p>
          </div>
        </div>

        {/* ROI estimé */}
        <div className="flex items-start gap-3">
          <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-white">ROI estimé</p>
            <p className="text-gray-300">
              {prediction.estimated_roi.toLocaleString('fr-FR')} € d'économie potentielle
            </p>
          </div>
        </div>

        {/* Facteurs de risque */}
        {prediction.risk_factors && prediction.risk_factors.length > 0 && (
          <div className="bg-slate-50 p-3 rounded-lg">
            <p className="text-sm font-medium mb-2 flex items-center gap-2 text-gray-900">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Facteurs de risque identifiés
            </p>
            <ul className="text-sm text-slate-700 space-y-1">
              {prediction.risk_factors.map((factor, idx) => (
                <li key={idx} className="flex items-center gap-2 text-gray-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
                  {factor}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Recommandation */}
        <div className={cn(
          'p-4 rounded-lg border',
          isHighRisk ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'
        )}>
          <p className={cn(
            'text-sm font-medium mb-1 flex items-center gap-2',
            isHighRisk ? 'text-red-900' : 'text-blue-900'
          )}>
            <TrendingUp className="h-4 w-4" />
            Recommandation
          </p>
          <p className={cn(
            'text-sm',
            isHighRisk ? 'text-red-800' : 'text-blue-800'
          )}>{prediction.recommended_action}</p>
        </div>
      </CardContent>

      {/* Feedback */}
      {!showFeedback && prediction.actual_failure_occurred === null && (
        <CardFooter className="flex flex-col gap-3 pt-0">
          <Separator />
          <div className="w-full">
            <p className="text-xs text-slate-500 mb-2">
              Cette prédiction s'est-elle réalisée ?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => setShowFeedback(true)}
              >
                Donner mon avis
              </Button>
            </div>
          </div>
        </CardFooter>
      )}

      {showFeedback && (
        <CardFooter className="flex flex-col gap-3 pt-0">
          <Separator />
          <div className="w-full">
            <p className="text-xs text-slate-500 mb-2">
              Une panne s'est-elle produite dans les délais prédits ?
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleFeedback(true)}
                disabled={feedbackMutation.isPending}
              >
                <ThumbsUp className="h-4 w-4 mr-2" />
                Oui, prédiction correcte
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={() => handleFeedback(false)}
                disabled={feedbackMutation.isPending}
              >
                <ThumbsDown className="h-4 w-4 mr-2" />
                Non, pas de panne
              </Button>
            </div>
          </div>
        </CardFooter>
      )}

      {prediction.actual_failure_occurred !== null && (
        <CardFooter>
          <div className="flex items-center gap-2 text-sm text-slate-500">
            {prediction.actual_failure_occurred ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                Prédiction confirmée
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-blue-500" />
                Retour enregistré
              </>
            )}
          </div>
        </CardFooter>
      )}
    </Card>
  );
}
