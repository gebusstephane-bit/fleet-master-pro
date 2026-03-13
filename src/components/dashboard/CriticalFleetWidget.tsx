'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ArrowRight, ShieldCheck, Crown } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { getCriticalVehicles } from '@/actions/ai/get-critical-vehicles';
import { cn } from '@/lib/utils';
import type { PlanType } from '@/lib/plans';

interface CriticalVehicle {
  id: string;
  registration_number: string;
  type: string;
  ai_global_score: number;
  ai_score_summary: string | null;
  ai_score_updated_at: string | null;
}

const typeLabels: Record<string, string> = {
  VOITURE: 'Voiture',
  FOURGON: 'Fourgon',
  POIDS_LOURD: 'Poids Lourd',
  POIDS_LOURD_FRIGO: 'PL Frigo',
};

function getScoreConfig(score: number) {
  if (score < 40) return { color: 'text-red-400', bg: 'bg-red-500/20', ring: 'ring-red-500/30', label: 'URGENT' };
  if (score < 60) return { color: 'text-amber-400', bg: 'bg-amber-500/20', ring: 'ring-amber-500/30', label: 'ATTENTION' };
  return { color: 'text-blue-400', bg: 'bg-blue-500/20', ring: 'ring-blue-500/30', label: '' };
}

function relativeDate(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  if (days === 0) return "aujourd'hui";
  if (days === 1) return 'hier';
  if (days < 7) return `il y a ${days} jours`;
  return `il y a ${Math.floor(days / 7)} sem.`;
}

interface Props {
  companyId: string;
  plan: PlanType;
}

export function CriticalFleetWidget({ companyId, plan }: Props) {
  const [vehicles, setVehicles] = useState<CriticalVehicle[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getCriticalVehicles({ limit: 3 })
      .then((result) => {
        const data = result?.data;
        if (data && Array.isArray(data) && data.length > 0) {
          setVehicles(data as CriticalVehicle[]);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [companyId]);

  // Loading or no data → invisible
  if (loading || !vehicles || vehicles.length === 0) return null;

  // All vehicles above 75 → fleet is healthy
  const allHealthy = vehicles.every((v) => v.ai_global_score >= 75);
  const canSeeSummary = plan === 'PRO' || plan === 'UNLIMITED';
  const lastUpdated = vehicles[0]?.ai_score_updated_at;

  return (
    <GlassCard className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-amber-400" />
          <h3 className="text-sm font-semibold text-white">Véhicules à surveiller</h3>
        </div>
        <span className="text-[10px] text-slate-500 uppercase tracking-wider">Score global IA</span>
      </div>

      {allHealthy ? (
        <div className="flex items-center gap-3 py-4">
          <div className="p-2 rounded-xl bg-emerald-500/20">
            <ShieldCheck className="h-6 w-6 text-emerald-400" />
          </div>
          <div>
            <p className="text-sm font-medium text-emerald-400">Flotte en bon état cette semaine</p>
            <p className="text-xs text-slate-500">Aucun véhicule ne nécessite d'attention urgente</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          {vehicles.map((v) => {
            const config = getScoreConfig(v.ai_global_score);
            return (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="flex items-center gap-3 p-2.5 rounded-lg hover:bg-slate-800/50 transition-colors group"
              >
                {/* Score circle */}
                <div
                  className={cn(
                    'w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ring-2 shrink-0',
                    config.bg, config.color, config.ring
                  )}
                >
                  {v.ai_global_score}
                </div>

                {/* Vehicle info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-white group-hover:text-cyan-400 transition-colors">
                      {v.registration_number?.toUpperCase()}
                    </span>
                    <span className="text-xs text-slate-500">
                      {typeLabels[v.type] || v.type}
                    </span>
                    {config.label && (
                      <Badge
                        className={cn(
                          'text-[9px] px-1.5 py-0 h-4 border',
                          v.ai_global_score < 40
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                        )}
                      >
                        {config.label}
                      </Badge>
                    )}
                  </div>

                  {/* Summary — visible for PRO+, blurred for ESSENTIAL */}
                  {v.ai_score_summary && (
                    <div className="relative mt-0.5">
                      {canSeeSummary ? (
                        <p className="text-xs text-slate-400 truncate">{v.ai_score_summary}</p>
                      ) : (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="flex items-center gap-1.5">
                                <p className="text-xs text-slate-400 truncate blur-sm select-none">
                                  {v.ai_score_summary}
                                </p>
                                <Link
                                  href="/settings/billing"
                                  onClick={(e) => e.stopPropagation()}
                                  className="shrink-0"
                                >
                                  <Badge className="text-[8px] px-1 py-0 h-3.5 bg-purple-500/20 text-purple-400 border border-purple-500/30 hover:bg-purple-500/30">
                                    <Crown className="h-2 w-2 mr-0.5" />
                                    PRO
                                  </Badge>
                                </Link>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent
                              side="top"
                              className="bg-[#1e293b] border-slate-700 text-slate-200 text-xs"
                            >
                              Résumé IA disponible en plan PRO
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-700/50">
        <Link
          href="/vehicles"
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          Voir tous les véhicules
          <ArrowRight className="h-3 w-3" />
        </Link>
        {lastUpdated && (
          <span className="text-[10px] text-slate-500">
            Mis à jour {relativeDate(lastUpdated)}
          </span>
        )}
      </div>
    </GlassCard>
  );
}
