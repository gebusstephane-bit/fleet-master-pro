'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Brain, ChevronDown, ChevronUp, Wrench, ClipboardCheck, Fuel, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VehicleScoreCardProps {
  score: number | null | undefined;
  summary: string | null | undefined;
  detail: {
    maintenance_score: number;
    inspection_score: number;
    consumption_score: number;
    flags: string[];
  } | null | undefined;
  updatedAt: string | null | undefined;
}

const SCORE_CONFIG = [
  { min: 80, label: 'Excellent', color: 'text-emerald-400', bg: 'bg-emerald-500/20', border: 'border-emerald-500/30', ring: 'ring-emerald-500/30' },
  { min: 60, label: 'Bon', color: 'text-blue-400', bg: 'bg-blue-500/20', border: 'border-blue-500/30', ring: 'ring-blue-500/30' },
  { min: 40, label: 'Moyen', color: 'text-amber-400', bg: 'bg-amber-500/20', border: 'border-amber-500/30', ring: 'ring-amber-500/30' },
  { min: 0, label: 'Attention', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30', ring: 'ring-red-500/30' },
] as const;

function getConfig(score: number) {
  return SCORE_CONFIG.find((c) => score >= c.min) || SCORE_CONFIG[SCORE_CONFIG.length - 1];
}

function ScoreBar({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) {
  const config = getConfig(value);
  return (
    <div className="flex items-center gap-3">
      <div className={cn('p-1.5 rounded-lg', config.bg)}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-slate-400">{label}</span>
          <span className={cn('text-xs font-semibold', config.color)}>{value}/100</span>
        </div>
        <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all duration-500', config.bg)}
            style={{ width: `${value}%` }}
          />
        </div>
      </div>
    </div>
  );
}

export function VehicleScoreCard({ score, summary, detail, updatedAt }: VehicleScoreCardProps) {
  const [expanded, setExpanded] = useState(false);

  if (score == null) return null;

  const config = getConfig(score);

  return (
    <Card className={cn('detail-card', config.border)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className={cn('h-5 w-5', config.color)} />
            <CardTitle className="text-base text-white">Score IA Global</CardTitle>
          </div>
          {detail && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-slate-400 hover:text-white"
              onClick={() => setExpanded(!expanded)}
            >
              {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Score principal */}
        <div className="flex items-center gap-4">
          <div
            className={cn(
              'w-16 h-16 rounded-full flex items-center justify-center font-bold text-xl ring-2',
              config.bg, config.color, config.ring
            )}
          >
            {score}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-white">{score}/100</p>
            <p className={cn('text-sm font-medium', config.color)}>{config.label}</p>
          </div>
        </div>

        {/* Résumé IA */}
        {summary && (
          <p className="text-sm text-slate-300 italic border-l-2 border-slate-600 pl-3">
            {summary}
          </p>
        )}

        {/* Flags */}
        {detail && detail.flags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {detail.flags.map((flag, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20"
              >
                <AlertTriangle className="h-2.5 w-2.5" />
                {flag}
              </span>
            ))}
          </div>
        )}

        {/* Détail collapsible */}
        {expanded && detail && (
          <div className="space-y-3 pt-2 border-t border-slate-700/50">
            <ScoreBar
              label="Maintenance (40%)"
              value={detail.maintenance_score}
              icon={<Wrench className="h-3.5 w-3.5 text-slate-300" />}
            />
            <ScoreBar
              label="Inspection (35%)"
              value={detail.inspection_score}
              icon={<ClipboardCheck className="h-3.5 w-3.5 text-slate-300" />}
            />
            <ScoreBar
              label="Consommation (25%)"
              value={detail.consumption_score}
              icon={<Fuel className="h-3.5 w-3.5 text-slate-300" />}
            />
          </div>
        )}

        {/* Date de mise à jour */}
        {updatedAt && (
          <p className="text-[10px] text-slate-500">
            Mis à jour le {new Date(updatedAt).toLocaleDateString('fr-FR', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
