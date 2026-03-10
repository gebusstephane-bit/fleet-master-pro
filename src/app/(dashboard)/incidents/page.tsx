'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Plus, FileWarning, Euro, Car, Users, Trash2, Eye, ShieldAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { GlassCard, MetricCard } from '@/components/ui/glass-card';
import { useIncidents, useDeleteIncident } from '@/hooks/use-incidents';
import {
  IncidentStatusBadge,
  IncidentSeverityBadge,
  IncidentTypeBadge,
  INCIDENT_TYPE_LABELS,
} from '@/components/incidents/incident-status-badge';
import { cn } from '@/lib/utils';
import { EmptyState } from '@/components/ui/empty-state';

export default function IncidentsPage() {
  const router = useRouter();
  const { data: incidents = [], isLoading } = useIncidents();
  const deleteMutation = useDeleteIncident();

  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [search, setSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  // ---- Filtres ----
  const filtered = useMemo(() => {
    return incidents.filter((i) => {
      if (filterStatus && i.status !== filterStatus) return false;
      if (filterType && i.incident_type !== filterType) return false;
      if (filterSeverity && i.severity !== filterSeverity) return false;
      if (search) {
        const q = search.toLowerCase();
        const vehicleMatch = i.vehicles?.registration_number?.toLowerCase().includes(q) ||
          `${i.vehicles?.brand} ${i.vehicles?.model}`.toLowerCase().includes(q);
        const numberMatch = i.incident_number?.toLowerCase().includes(q);
        const locationMatch = i.location_description?.toLowerCase().includes(q);
        if (!vehicleMatch && !numberMatch && !locationMatch) return false;
      }
      return true;
    });
  }, [incidents, filterStatus, filterType, filterSeverity, search]);

  // ---- Stats ----
  const currentYear = new Date().getFullYear();
  const thisYear = incidents.filter(
    (i) => new Date(i.incident_date).getFullYear() === currentYear
  );
  const totalCost = thisYear.reduce((s, i) => s + (i.estimated_damage ?? 0), 0);
  const avgCost = thisYear.length > 0 ? totalCost / thisYear.length : 0;
  const openCount = incidents.filter((i) => i.status === 'ouvert').length;

  const handleDelete = async (id: string) => {
    await deleteMutation.mutateAsync(id);
    setDeleteConfirm(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Sinistres</h1>
          <p className="text-slate-400">Gestion des accidents, vols et déclarations assurance</p>
        </div>
        <Button
          onClick={() => router.push('/incidents/new')}
          className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          Déclarer un sinistre
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <MetricCard
          title="Cette année"
          value={thisYear.length}
          subtitle="Sinistres déclarés"
          icon={FileWarning}
        />
        <MetricCard
          title="Ouverts"
          value={openCount}
          subtitle="En attente"
          icon={Car}
          trendUp={openCount > 0}
        />
        <MetricCard
          title="Coût total"
          value={totalCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          subtitle="Dommages estimés"
          icon={Euro}
        />
        <MetricCard
          title="Coût moyen"
          value={avgCost.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 })}
          subtitle="Par sinistre"
          icon={Users}
        />
      </div>

      {/* Filtres */}
      <GlassCard className="p-4">
        <div className="flex flex-wrap gap-3">
          <input
            type="text"
            placeholder="Rechercher..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 min-w-[180px] rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-cyan-500/40 focus:outline-none"
          />
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-3 py-2.5 text-sm text-white focus:outline-none"
          >
            <option value="">Tous statuts</option>
            <option value="ouvert">Ouvert</option>
            <option value="en_cours">En cours</option>
            <option value="clôturé">Clôturé</option>
          </select>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-3 py-2.5 text-sm text-white focus:outline-none"
          >
            <option value="">Tous types</option>
            {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-3 py-2.5 text-sm text-white focus:outline-none"
          >
            <option value="">Toutes gravités</option>
            <option value="mineur">Mineur</option>
            <option value="moyen">Moyen</option>
            <option value="grave">Grave</option>
            <option value="très_grave">Très grave</option>
          </select>
        </div>
      </GlassCard>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-slate-500">Chargement...</div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={ShieldAlert}
            title={incidents.length === 0 ? 'Aucun sinistre' : 'Aucun résultat'}
            description={
              incidents.length === 0
                ? 'Aucun sinistre n\'a encore été déclaré. Déclarez votre premier incident.'
                : 'Modifiez les filtres pour voir plus de résultats.'
            }
            action={
              incidents.length === 0
                ? {
                    label: 'Déclarer un sinistre',
                    onClick: () => router.push('/incidents/new'),
                  }
                : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/[0.06]">
                  {['N° Sinistre', 'Date', 'Type', 'Gravité', 'Véhicule', 'Conducteur', 'Statut', 'Dommages', ''].map(
                    (h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wide">
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {filtered.map((inc, idx) => (
                  <motion.tr
                    key={inc.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.03 }}
                    className="hover:bg-white/[0.03] cursor-pointer transition-colors"
                    onClick={() => router.push(`/incidents/${inc.id}`)}
                  >
                    <td className="px-4 py-3 font-mono text-cyan-400 text-xs">
                      {inc.incident_number ?? '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-300 whitespace-nowrap">
                      {new Date(inc.incident_date).toLocaleDateString('fr-FR')}
                    </td>
                    <td className="px-4 py-3">
                      <IncidentTypeBadge type={inc.incident_type} />
                    </td>
                    <td className="px-4 py-3">
                      <IncidentSeverityBadge severity={inc.severity} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {inc.vehicles ? (
                        <span>
                          <span className="font-medium">{inc.vehicles.registration_number}</span>
                          <br />
                          <span className="text-xs text-slate-500">
                            {inc.vehicles.brand} {inc.vehicles.model}
                          </span>
                        </span>
                      ) : '—'}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {inc.drivers
                        ? `${inc.drivers.first_name} ${inc.drivers.last_name}`
                        : '—'}
                    </td>
                    <td className="px-4 py-3">
                      <IncidentStatusBadge status={inc.status} />
                    </td>
                    <td className="px-4 py-3 text-slate-300">
                      {inc.estimated_damage != null
                        ? inc.estimated_damage.toLocaleString('fr-FR', {
                            style: 'currency',
                            currency: 'EUR',
                            maximumFractionDigits: 0,
                          })
                        : '—'}
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        <Link href={`/incidents/${inc.id}`}>
                          <button className="p-1.5 rounded-lg text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 transition-colors">
                            <Eye className="h-4 w-4" />
                          </button>
                        </Link>
                        {deleteConfirm === inc.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(inc.id)}
                              className="px-2 py-1 rounded text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 transition-colors"
                            >
                              Confirmer
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="px-2 py-1 rounded text-xs text-slate-500 hover:text-slate-300 transition-colors"
                            >
                              Annuler
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(inc.id)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
