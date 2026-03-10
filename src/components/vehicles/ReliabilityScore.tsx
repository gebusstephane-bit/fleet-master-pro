'use client';

import { useVehicleReliabilityScore, useFleetReliabilityScores } from '@/hooks/use-reliability-score';
import { type ReliabilityScore } from '@/lib/reliability-score';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { TrendingUp, TrendingDown, Minus, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';

// ─── Badge compact (liste véhicules) ─────────────────────────────────────────

export function ReliabilityScoreBadge({ score }: { score: ReliabilityScore }) {
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex items-center gap-1.5 cursor-default">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0"
              style={{ backgroundColor: score.color }}
            >
              {score.score}
            </div>
            <span className="text-xs font-semibold" style={{ color: score.color }}>
              {score.grade}
            </span>
          </div>
        </TooltipTrigger>
        <TooltipContent side="right" className="bg-slate-900 border-slate-700 p-3 max-w-48">
          <p className="text-white font-semibold mb-1">{score.label}</p>
          <div className="space-y-1 text-xs text-slate-400">
            <div className="flex justify-between gap-4">
              <span>Inspection</span>
              <span className="text-white">{score.breakdown.inspection}/100</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Maintenance</span>
              <span className="text-white">{score.breakdown.maintenance}/100</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Carburant</span>
              <span className="text-white">{score.breakdown.fuel}/100</span>
            </div>
            <div className="flex justify-between gap-4">
              <span>Conformité</span>
              <span className="text-white">{score.breakdown.compliance}/100</span>
            </div>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Jauge horizontale ────────────────────────────────────────────────────────

function ScoreBar({
  label,
  value,
  weight,
  tooltip,
}: {
  label: string;
  value: number;
  weight: string;
  tooltip: string;
}) {
  const color =
    value >= 85 ? '#16a34a' :
    value >= 70 ? '#22c55e' :
    value >= 55 ? '#eab308' :
    value >= 40 ? '#f97316' : '#ef4444';

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="space-y-1.5 cursor-default">
            <div className="flex justify-between items-center text-sm">
              <span className="text-slate-300">{label}</span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-500">{weight}</span>
                <span className="font-semibold text-white w-8 text-right">{value}</span>
              </div>
            </div>
            <div className="h-2 w-full bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${value}%`, backgroundColor: color }}
              />
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent side="top" className="bg-slate-900 border-slate-700 text-xs max-w-56">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ─── Cercle animé ─────────────────────────────────────────────────────────────

function ScoreCircle({ score, color }: { score: number; color: string }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 -rotate-90" viewBox="0 0 120 120" width="144" height="144">
        {/* Track */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="10"
        />
        {/* Progress */}
        <circle
          cx="60"
          cy="60"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease-out' }}
        />
      </svg>
      <div className="flex flex-col items-center">
        <span className="text-4xl font-bold text-white leading-none">{score}</span>
        <span className="text-sm text-slate-400 mt-1">/100</span>
      </div>
    </div>
  );
}

// ─── Carte détaillée (page véhicule) ─────────────────────────────────────────

export function ReliabilityScoreCard({ vehicleId }: { vehicleId: string }) {
  const { data: score, isLoading } = useVehicleReliabilityScore(vehicleId);

  const TrendIcon =
    score?.trend === 'improving' ? TrendingUp :
    score?.trend === 'declining' ? TrendingDown : Minus;

  const trendColor =
    score?.trend === 'improving' ? 'text-emerald-400' :
    score?.trend === 'declining' ? 'text-red-400' : 'text-slate-400';

  const trendLabel =
    score?.trend === 'improving' ? 'En progression' :
    score?.trend === 'declining' ? 'En dégradation' : 'Stable';

  if (isLoading) {
    return (
      <div className="detail-card p-6 rounded-xl space-y-4">
        <Skeleton className="h-5 w-40" />
        <div className="flex gap-6">
          <Skeleton className="w-36 h-36 rounded-full" />
          <div className="flex-1 space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (!score) return null;

  return (
    <div className="detail-card p-6 rounded-xl">
      {/* En-tête */}
      <div className="flex items-center gap-2 mb-5">
        <ShieldCheck className="h-5 w-5 text-cyan-400" />
        <h3 className="text-base font-semibold text-white">Score de fiabilité</h3>
        <div
          className="ml-auto px-2 py-0.5 rounded text-xs font-bold text-white"
          style={{ backgroundColor: score.color }}
        >
          {score.grade}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start">
        {/* Cercle */}
        <div className="flex flex-col items-center gap-2 shrink-0">
          <ScoreCircle score={score.score} color={score.color} />
          <p className="text-sm font-medium" style={{ color: score.color }}>
            {score.label}
          </p>
          <div className={`flex items-center gap-1 text-xs ${trendColor}`}>
            <TrendIcon className="h-3.5 w-3.5" />
            <span>{trendLabel}</span>
          </div>
        </div>

        {/* Jauges */}
        <div className="flex-1 w-full space-y-4">
          <ScoreBar
            label="Inspection"
            value={score.breakdown.inspection}
            weight="30%"
            tooltip="Score moyen des contrôles + nombre de défauts critiques sur 90 jours"
          />
          <ScoreBar
            label="Maintenance"
            value={score.breakdown.maintenance}
            weight="35%"
            tooltip="Ratio préventif/correctif, délai de résolution des urgences, coûts"
          />
          <ScoreBar
            label="Carburant"
            value={score.breakdown.fuel}
            weight="20%"
            tooltip="Cohérence de la consommation et détection d'anomalies sur 90 jours"
          />
          <ScoreBar
            label="Conformité"
            value={score.breakdown.compliance}
            weight="15%"
            tooltip="CT, assurance, tachygraphe, ATP — % de documents réglementaires valides"
          />
        </div>
      </div>

      <p className="mt-4 text-xs text-slate-600">
        Calculé le {(score.lastCalculated instanceof Date ? score.lastCalculated : new Date(score.lastCalculated)).toLocaleDateString('fr-FR')} à{' '}
        {(score.lastCalculated instanceof Date ? score.lastCalculated : new Date(score.lastCalculated)).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
      </p>
    </div>
  );
}

// ─── Widget dashboard — 3 véhicules critiques ─────────────────────────────────

interface CriticalVehicle {
  id: string;
  registration_number: string;
  brand: string;
  model: string;
}

export function CriticalVehiclesWidget({ vehicles }: { vehicles: CriticalVehicle[] }) {
  const { data: scores, isLoading } = useFleetReliabilityScores();

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <Skeleton key={i} className="h-14 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!scores || scores.size === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Aucune donnée disponible
      </div>
    );
  }

  // Trier par score croissant, garder les 3 plus critiques
  const critical = vehicles
    .map(v => ({ vehicle: v, score: scores.get(v.id) }))
    .filter(({ score }) => score !== undefined)
    .sort((a, b) => a.score!.score - b.score!.score)
    .slice(0, 3);

  if (critical.length === 0) {
    return (
      <div className="text-center py-8 text-slate-500 text-sm">
        Aucune donnée de fiabilité
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {critical.map(({ vehicle, score }) => (
        <Link
          key={vehicle.id}
          href={`/vehicles/${vehicle.id}`}
          className="flex items-center gap-3 p-3 rounded-xl bg-[#0f172a]/40 border border-red-500/20 hover:bg-[#0f172a]/60 hover:border-red-500/30 transition-all"
        >
          {/* Badge score */}
          <div
            className="w-10 h-10 rounded-full flex flex-col items-center justify-center text-white shrink-0"
            style={{ backgroundColor: score!.color }}
          >
            <span className="text-sm font-bold leading-none">{score!.score}</span>
            <span className="text-[9px] font-semibold">{score!.grade}</span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-white truncate">
              {vehicle.registration_number}
            </p>
            <p className="text-xs text-slate-500 truncate">
              {vehicle.brand} {vehicle.model}
            </p>
          </div>

          {/* Label */}
          <span
            className="text-xs font-medium px-2 py-0.5 rounded shrink-0"
            style={{ color: score!.color, backgroundColor: `${score!.color}20` }}
          >
            {score!.label}
          </span>
        </Link>
      ))}
    </div>
  );
}
