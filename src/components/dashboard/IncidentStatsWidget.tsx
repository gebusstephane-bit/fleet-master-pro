'use client';

/**
 * Widget Sinistralité — Dashboard
 * Affiche les 12 derniers mois de sinistralité
 */

import Link from 'next/link';
import { motion } from 'framer-motion';
import { AlertTriangle, Euro, Car, User, TrendingUp, ArrowRight } from 'lucide-react';
import { useIncidentStats, useIncidents } from '@/hooks/use-incidents';
import { cn } from '@/lib/utils';

export function IncidentStatsWidget() {
  const { data: stats, isLoading } = useIncidentStats();
  const { data: incidents = [] } = useIncidents();

  // Sinistres actifs (non clôturés)
  const activeIncidents = incidents.filter((i) => i.status !== 'clôturé');

  if (isLoading) {
    return (
      <div className="h-40 flex items-center justify-center">
        <div className="text-sm text-slate-500">Chargement sinistralité...</div>
      </div>
    );
  }

  if (!stats || stats.total === 0) {
    return (
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Sinistralité</h3>
            <p className="text-sm text-slate-500">Aucun sinistre sur les 12 derniers mois</p>
          </div>
        </div>
        <Link
          href="/incidents"
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          Gérer <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    );
  }

  // Barres par mois
  const monthEntries = Object.entries(stats.byMonth);
  const maxVal = Math.max(...monthEntries.map(([, v]) => v), 1);

  return (
    <div className="space-y-5">
      {/* En-tête */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-white">Sinistralité</h3>
            <p className="text-sm text-slate-500">12 derniers mois</p>
          </div>
        </div>
        <Link
          href="/incidents"
          className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 transition-colors"
        >
          Voir tout <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl bg-[#0f172a]/50 border border-white/[0.06] p-3">
          <p className="text-xs text-slate-500">Sinistres</p>
          <p className="text-xl font-bold text-white mt-0.5">{stats.total}</p>
          <p className="text-xs text-slate-500">{activeIncidents.length} en cours</p>
        </div>
        <div className="rounded-xl bg-[#0f172a]/50 border border-white/[0.06] p-3">
          <div className="flex items-center gap-1.5 mb-0.5">
            <Euro className="h-3.5 w-3.5 text-amber-400" />
            <p className="text-xs text-slate-500">Coût total</p>
          </div>
          <p className="text-lg font-bold text-white">
            {stats.totalCost.toLocaleString('fr-FR', {
              style: 'currency',
              currency: 'EUR',
              maximumFractionDigits: 0,
            })}
          </p>
        </div>
        {stats.topVehicle && (
          <div className="rounded-xl bg-[#0f172a]/50 border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <Car className="h-3.5 w-3.5 text-orange-400" />
              <p className="text-xs text-slate-500">Véhicule</p>
            </div>
            <p className="text-xs font-medium text-slate-200 truncate">{stats.topVehicle.label}</p>
            <p className="text-xs text-slate-500">{stats.topVehicle.count} sinistre(s)</p>
          </div>
        )}
        {stats.topDriver && (
          <div className="rounded-xl bg-[#0f172a]/50 border border-white/[0.06] p-3">
            <div className="flex items-center gap-1.5 mb-0.5">
              <User className="h-3.5 w-3.5 text-purple-400" />
              <p className="text-xs text-slate-500">Conducteur</p>
            </div>
            <p className="text-xs font-medium text-slate-200 truncate">{stats.topDriver.label}</p>
            <p className="text-xs text-slate-500">{stats.topDriver.count} sinistre(s)</p>
          </div>
        )}
      </div>

      {/* Histogramme par mois */}
      {monthEntries.length > 0 && (
        <div>
          <p className="text-xs text-slate-500 mb-3 flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5" /> Sinistres par mois
          </p>
          <div className="flex items-end gap-1.5 h-16">
            {monthEntries.map(([month, count]) => (
              <div key={month} className="flex flex-col items-center gap-1 flex-1">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${(count / maxVal) * 52}px` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                  className={cn(
                    'w-full rounded-sm',
                    count > 2 ? 'bg-red-500/60' : count > 1 ? 'bg-amber-500/60' : 'bg-cyan-500/40'
                  )}
                />
                <span className="text-[9px] text-slate-600 leading-none">{month}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
