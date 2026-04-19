'use client';

/**
 * Carte Maintenance Prédictive — V2
 * Source : table `predictive_alerts` (calcul basé sur inspections réelles)
 * Remplace l'ancien système `ai_predictions` (source externe opaque)
 */

import { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  TrendingDown,
  TrendingUp,
  Clock,
  Activity,
  Wrench,
  ThumbsUp,
  ThumbsDown,
  BrainCircuit,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import {
  useVehiclePredictiveAlert,
  useAlertFeedback,
  PREDICTIVE_URGENCY_CONFIG,
  PredictiveUrgencyLevel,
} from '@/hooks/use-ai-predictions';
import { cn } from '@/lib/utils';
import { formatDistanceToNow, differenceInDays } from 'date-fns';
import { fr } from 'date-fns/locale';
import { toast } from 'sonner';

interface PredictionCardProps {
  vehicleId: string;
}

// Mapping urgency_level → probability de la barre de progression
const URGENCY_TO_PROB: Record<PredictiveUrgencyLevel, number> = {
  intervention_immediate: 95,
  controle_urgent: 80,
  controle_recommande: 60,
  surveillance: 30,
};

const COMPONENT_ICONS: Record<string, string> = {
  Pneumatiques: '🛞',
  Freinage: '🛑',
  Moteur: '⚙️',
  Carrosserie: '🚗',
  Éclairage: '💡',
  Général: '🔍',
};

export function PredictionCard({ vehicleId }: PredictionCardProps) {
  const { data: alert, isLoading } = useVehiclePredictiveAlert(vehicleId);
  const feedbackMutation = useAlertFeedback();
  const [showFeedback, setShowFeedback] = useState(false);

  // ── LOADING ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-slate-700 rounded w-1/3" />
            <div className="h-8 bg-slate-700 rounded w-1/2" />
            <div className="h-20 bg-slate-700 rounded" />
          </div>
        </CardContent>
      </Card>
    );
  }

  // ── PAS D'ALERTE → VÉHICULE STABLE ──────────────────────────
  if (!alert) {
    return (
      <Card className="w-full border-emerald-700/30 bg-emerald-950/10">
        <CardContent className="p-6 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="h-7 w-7 text-emerald-400" />
          </div>
          <p className="font-medium text-slate-200">Aucune alerte prédictive</p>
          <p className="text-sm text-emerald-400 mt-1">Véhicule stable</p>
          <p className="text-xs text-slate-500 mt-3">
            Les alertes sont calculées quotidiennement à partir de vos inspections.
            <br />
            Au moins 2 inspections sont nécessaires pour générer une prédiction.
          </p>
        </CardContent>
      </Card>
    );
  }

  // ── DONNÉES CALCULÉES ────────────────────────────────────────
  const urgencyLevel = alert.urgency_level as PredictiveUrgencyLevel;
  const cfg = PREDICTIVE_URGENCY_CONFIG[urgencyLevel] ?? PREDICTIVE_URGENCY_CONFIG.surveillance;
  const displayProbability = URGENCY_TO_PROB[urgencyLevel] ?? Math.round(alert.urgency_score * 100);
  const isHighRisk = urgencyLevel === 'intervention_immediate' || urgencyLevel === 'controle_urgent';

  const daysUntil = differenceInDays(
    new Date(alert.predicted_control_date),
    new Date(),
  );
  const daysUntilLabel =
    daysUntil <= 0
      ? 'Dépassé — intervention requise'
      : `${daysUntil} jour${daysUntil > 1 ? 's' : ''}`;

  const calculatedAgo = formatDistanceToNow(new Date(alert.calculated_at), {
    addSuffix: true,
    locale: fr,
  });

  const componentIcon = COMPONENT_ICONS[alert.component_concerned] ?? '🔍';

  const handleFeedback = (result: 'anomaly_confirmed' | 'no_anomaly') => {
    feedbackMutation.mutate(
      { alertId: alert.id, result, vehicleId },
      {
        onSuccess: () => {
          toast.success(
            result === 'anomaly_confirmed'
              ? 'Anomalie confirmée — merci pour votre retour.'
              : 'Faux positif enregistré — seuil ajusté automatiquement.',
          );
          setShowFeedback(false);
        },
        onError: (err) => {
          toast.error((err as Error).message || 'Erreur lors de l\'envoi du feedback.');
        },
      },
    );
  };

  const alreadyHandled =
    alert.control_result !== null && alert.status === 'control_done';

  // ── RENDU PRINCIPAL ──────────────────────────────────────────
  return (
    <Card
      className={cn(
        'w-full border',
        isHighRisk ? 'border-red-700/50' : cfg.borderClass,
      )}
    >
      {/* Header */}
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2">
            <BrainCircuit
              className={cn('h-5 w-5', isHighRisk ? 'text-red-400' : 'text-cyan-400')}
            />
            <CardTitle className="text-lg text-slate-200">Maintenance Prédictive</CardTitle>
          </div>
          <Badge variant="outline" className={cn('text-xs border', cfg.badgeClass)}>
            {cfg.label}
          </Badge>
        </div>
        <p className="text-xs text-slate-500 mt-0.5">
          Calculé {calculatedAgo}
          {' · '}
          <span className="text-slate-400">Basé sur vos inspections</span>
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Score de probabilité d'intervention */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-slate-300">
              Probabilité d&apos;intervention
            </span>
            <span className={cn('text-2xl font-bold', cfg.textClass)}>
              {displayProbability}%
            </span>
          </div>
          {/* Progress bar avec couleur dynamique */}
          <div className="h-2 rounded-full bg-slate-700 overflow-hidden">
            <div
              className={cn('h-full rounded-full transition-all duration-700', cfg.progressClass)}
              style={{ width: `${displayProbability}%` }}
            />
          </div>
          <div className="flex justify-between text-xs text-slate-500">
            <span>Préventif uniquement</span>
            <span>Intervention recommandée</span>
          </div>
        </div>

        <Separator className="bg-slate-700" />

        {/* Composant concerné */}
        <div className="flex items-start gap-3">
          <Wrench className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-300">Composant à vérifier</p>
            <p className="text-slate-200 font-semibold">
              {componentIcon} {alert.component_concerned}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Dégradation : <span className="text-slate-400 font-mono">
                −{alert.degradation_speed.toFixed(1)} pts/jour
              </span>
              {' · '}Score actuel : <span className="text-slate-400">{alert.current_score}/100</span>
            </p>
          </div>
        </div>

        {/* Délai estimé */}
        <div className="flex items-start gap-3">
          <Clock className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-slate-300">Délai estimé</p>
            <p className={cn('font-semibold', daysUntil <= 0 ? 'text-red-400' : 'text-slate-200')}>
              {daysUntilLabel}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Seuil critique prévu le{' '}
              {new Date(alert.predicted_control_date).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>

        {/* Facteur de risque */}
        <div
          className={cn(
            'rounded-lg p-3 border',
            isHighRisk
              ? 'bg-red-950/20 border-red-700/30'
              : 'bg-slate-800 border-slate-700',
          )}
        >
          <p className="text-sm font-medium mb-1.5 flex items-center gap-2 text-slate-300">
            <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0" />
            Facteur de risque détecté
          </p>
          <ul className="space-y-1">
            <li className="flex items-center gap-2 text-sm text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
              {alert.component_concerned} — dégradation de{' '}
              {alert.previous_score}→{alert.current_score} pts détectée
            </li>
          </ul>
        </div>

        {/* Recommandation / Reasoning */}
        <div
          className={cn(
            'p-4 rounded-lg border',
            isHighRisk
              ? 'bg-red-950/20 border-red-700/30'
              : 'bg-slate-800 border-slate-700',
          )}
        >
          <p className={cn('text-sm font-medium mb-1 flex items-center gap-2', cfg.textClass)}>
            <TrendingUp className="h-4 w-4" />
            Recommandation
          </p>
          <p className="text-sm text-slate-300 leading-relaxed">{alert.reasoning}</p>
        </div>
      </CardContent>

      {/* Footer — Feedback */}
      {alreadyHandled ? (
        <CardFooter>
          <div className="flex items-center gap-2 text-sm text-slate-500 w-full">
            {alert.control_result === 'anomaly_confirmed' ? (
              <>
                <AlertTriangle className="h-4 w-4 text-orange-400" />
                <span className="text-orange-400">Anomalie confirmée — maintenance créée</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Faux positif enregistré — seuil ajusté</span>
              </>
            )}
          </div>
        </CardFooter>
      ) : (
        <>
          {!showFeedback && (
            <CardFooter className="flex flex-col gap-3 pt-0">
              <Separator className="bg-slate-700" />
              <div className="w-full">
                <p className="text-xs text-slate-500 mb-2">
                  Cette alerte s&apos;est-elle révélée exacte ?
                </p>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full border-slate-600 text-slate-300 hover:bg-slate-700"
                  onClick={() => setShowFeedback(true)}
                >
                  Donner mon avis
                </Button>
              </div>
            </CardFooter>
          )}

          {showFeedback && (
            <CardFooter className="flex flex-col gap-3 pt-0">
              <Separator className="bg-slate-700" />
              <div className="w-full space-y-2">
                <p className="text-xs text-slate-400">
                  Avez-vous effectué le contrôle ? Quel était le résultat ?
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-red-700/50 text-red-400 hover:bg-red-950/30"
                    onClick={() => handleFeedback('anomaly_confirmed')}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsUp className="h-4 w-4 mr-1.5" />
                    Anomalie confirmée
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-emerald-700/50 text-emerald-400 hover:bg-emerald-950/30"
                    onClick={() => handleFeedback('no_anomaly')}
                    disabled={feedbackMutation.isPending}
                  >
                    <ThumbsDown className="h-4 w-4 mr-1.5" />
                    Véhicule OK
                  </Button>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-slate-500 hover:text-slate-300"
                  onClick={() => setShowFeedback(false)}
                  disabled={feedbackMutation.isPending}
                >
                  Annuler
                </Button>
              </div>
            </CardFooter>
          )}
        </>
      )}
    </Card>
  );
}
