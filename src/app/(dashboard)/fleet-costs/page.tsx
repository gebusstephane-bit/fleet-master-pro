'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useFleetTCO } from '@/hooks/use-tco';
import { Download, TrendingUp, TrendingDown, Minus, Car } from 'lucide-react';

const PERIOD_OPTIONS: { label: string; value: 3 | 6 | 12 | 24 }[] = [
  { label: '3 mois', value: 3 },
  { label: '6 mois', value: 6 },
  { label: '12 mois', value: 12 },
  { label: '24 mois', value: 24 },
];

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtEur(n: number) {
  return `${fmt(n)} €`;
}

export default function FleetCostsPage() {
  const [months, setMonths] = useState<3 | 6 | 12 | 24>(12);
  const { data: fleet, isLoading } = useFleetTCO(months);

  const avgCostPerMonth = useMemo(() => {
    if (!fleet || fleet.length === 0) return 0;
    const total = fleet.reduce((s, r) => s + r.tco.costPerMonth, 0);
    return total / fleet.length;
  }, [fleet]);

  function exportCSV() {
    if (!fleet) return;
    const headers = [
      'Immatriculation',
      'Marque',
      'Modèle',
      'Type',
      'Statut',
      `Carburant (€)`,
      `Maintenance (€)`,
      `Total (€)`,
      `Coût/mois (€)`,
      `Coût/km (€)`,
    ];
    const rows = fleet.map(({ vehicle, tco }) => [
      vehicle.registration_number,
      vehicle.brand,
      vehicle.model,
      vehicle.type,
      vehicle.status,
      tco.fuelCost.toFixed(2),
      tco.maintenanceCost.toFixed(2),
      tco.totalCost.toFixed(2),
      tco.costPerMonth.toFixed(2),
      tco.costPerKm.toFixed(4),
    ]);
    const csv = [headers, ...rows].map((r) => r.join(';')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `tco-flotte-${months}mois.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Coûts de la Flotte</h1>
          <p className="text-slate-400 text-sm mt-1">
            Comparatif TCO de tous les véhicules
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-1 bg-slate-800 rounded-lg p-1">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setMonths(opt.value)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  months === opt.value
                    ? 'bg-cyan-500 text-white shadow'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={exportCSV}
            disabled={!fleet || fleet.length === 0}
            className="border-slate-600 text-slate-200 hover:bg-slate-700"
          >
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* Summary cards */}
      {!isLoading && fleet && fleet.length > 0 && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <SummaryCard
            label="Véhicules analysés"
            value={String(fleet.length)}
            sub="dans la flotte"
          />
          <SummaryCard
            label="Coût total flotte"
            value={fmtEur(fleet.reduce((s, r) => s + r.tco.totalCost, 0))}
            sub={`sur ${months} mois`}
          />
          <SummaryCard
            label="Coût moyen/véhicule"
            value={fmtEur(avgCostPerMonth)}
            sub="par mois"
          />
          <SummaryCard
            label="Véhicule le + cher"
            value={fleet[0] ? fmtEur(fleet[0].tco.costPerMonth) : '—'}
            sub={fleet[0]?.vehicle.registration_number ?? ''}
          />
        </div>
      )}

      {/* Table */}
      <Card className="bg-slate-900 border-slate-700">
        <CardHeader>
          <CardTitle className="text-white text-base">
            Comparatif TCO — {months} derniers mois
          </CardTitle>
          <CardDescription className="text-slate-400">
            Trié par coût total décroissant
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-14 w-full" />
              ))}
            </div>
          ) : !fleet || fleet.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-500">
              <Car className="h-12 w-12 mb-4 opacity-30" />
              <p>Aucun véhicule trouvé</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-700 text-slate-400">
                    <th className="text-left px-4 py-3 font-medium">#</th>
                    <th className="text-left px-4 py-3 font-medium">Véhicule</th>
                    <th className="text-left px-4 py-3 font-medium">Statut</th>
                    <th className="text-right px-4 py-3 font-medium">Carburant</th>
                    <th className="text-right px-4 py-3 font-medium">Maintenance</th>
                    <th className="text-right px-4 py-3 font-medium">Total</th>
                    <th className="text-right px-4 py-3 font-medium">/mois</th>
                    <th className="text-right px-4 py-3 font-medium">vs moy.</th>
                  </tr>
                </thead>
                <tbody>
                  {fleet.map(({ vehicle, tco }, index) => {
                    const diff =
                      avgCostPerMonth > 0
                        ? ((tco.costPerMonth - avgCostPerMonth) / avgCostPerMonth) * 100
                        : 0;
                    const isHigh = diff > 20;
                    const isLow = diff < -5;

                    return (
                      <tr
                        key={vehicle.id}
                        className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors"
                      >
                        <td className="px-4 py-3 text-slate-500 font-mono">{index + 1}</td>
                        <td className="px-4 py-3">
                          <Link
                            href={`/vehicles/${vehicle.id}`}
                            className="group flex flex-col"
                          >
                            <span className="font-semibold text-white group-hover:text-cyan-400 transition-colors">
                              {vehicle.registration_number}
                            </span>
                            <span className="text-xs text-slate-500">
                              {vehicle.brand} {vehicle.model}
                            </span>
                          </Link>
                        </td>
                        <td className="px-4 py-3">
                          <StatusBadge status={vehicle.status} />
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {tco.fuelCost > 0 ? fmtEur(tco.fuelCost) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {tco.maintenanceCost > 0 ? fmtEur(tco.maintenanceCost) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-white">
                          {tco.totalCost > 0 ? fmtEur(tco.totalCost) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right text-slate-300">
                          {tco.costPerMonth > 0 ? fmtEur(tco.costPerMonth) : <span className="text-slate-600">—</span>}
                        </td>
                        <td className="px-4 py-3 text-right">
                          {tco.totalCost === 0 ? (
                            <span className="text-slate-600">—</span>
                          ) : isHigh ? (
                            <Badge className="bg-red-500/20 text-red-400 border-red-500/30 gap-1">
                              <TrendingUp className="h-3 w-3" />
                              +{Math.round(diff)}%
                            </Badge>
                          ) : isLow ? (
                            <Badge className="bg-green-500/20 text-green-400 border-green-500/30 gap-1">
                              <TrendingDown className="h-3 w-3" />
                              {Math.round(diff)}%
                            </Badge>
                          ) : (
                            <Badge className="bg-slate-700 text-slate-400 border-slate-600 gap-1">
                              <Minus className="h-3 w-3" />
                              {diff >= 0 ? '+' : ''}{Math.round(diff)}%
                            </Badge>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function SummaryCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <Card className="bg-slate-900 border-slate-700">
      <CardContent className="pt-4 pb-4">
        <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
        <p className="text-xl font-bold text-white mt-1">{value}</p>
        <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
      </CardContent>
    </Card>
  );
}

const STATUS_LABELS: Record<string, { label: string; cls: string }> = {
  ACTIF: { label: 'Actif', cls: 'bg-green-500/20 text-green-400 border-green-500/30' },
  INACTIF: { label: 'Inactif', cls: 'bg-slate-700 text-slate-400 border-slate-600' },
  EN_MAINTENANCE: { label: 'En maintenance', cls: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
  ARCHIVE: { label: 'Archivé', cls: 'bg-slate-600/20 text-slate-400 border-slate-500/30' },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_LABELS[status] ?? { label: status, cls: 'bg-slate-700 text-slate-400' };
  return <Badge className={`${cfg.cls} border text-xs`}>{cfg.label}</Badge>;
}
