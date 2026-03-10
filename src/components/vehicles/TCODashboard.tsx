'use client';

import { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useTCO, useFleetAvgCostPerMonth } from '@/hooks/use-tco';
import { TrendingUp, Fuel, Wrench, Gauge } from 'lucide-react';

const PERIOD_OPTIONS: { label: string; value: 3 | 6 | 12 | 24 }[] = [
  { label: '3 mois', value: 3 },
  { label: '6 mois', value: 6 },
  { label: '12 mois', value: 12 },
  { label: '24 mois', value: 24 },
];

const PIE_COLORS = ['#06b6d4', '#f59e0b', '#6b7280'];

function fmt(n: number) {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
}

function fmtEur(n: number) {
  return `${fmt(n)} €`;
}

interface Props {
  vehicleId: string;
}

export function TCODashboard({ vehicleId }: Props) {
  const [months, setMonths] = useState<3 | 6 | 12 | 24>(12);
  const { data: tco, isLoading } = useTCO(vehicleId, months);
  const { data: fleetAvg } = useFleetAvgCostPerMonth(months);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Skeleton className="h-64" />
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (!tco) return null;

  const pieData = [
    { name: 'Carburant', value: tco.fuelCost },
    { name: 'Maintenance', value: tco.maintenanceCost },
    ...(tco.totalCost > 0 && tco.breakdown.other > 0
      ? [{ name: 'Autre', value: tco.totalCost * (tco.breakdown.other / 100) }]
      : []),
  ].filter((d) => d.value > 0);

  const isAboveFleetAvg = fleetAvg !== undefined && tco.costPerMonth > fleetAvg * 1.2;
  const isBelowFleetAvg = fleetAvg !== undefined && tco.costPerMonth < fleetAvg;

  return (
    <div className="space-y-6">
      {/* Header + sélecteur période */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-cyan-400" />
          <h2 className="text-lg font-semibold text-white">Coût Total de Possession</h2>
        </div>
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
      </div>

      {/* 4 KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          icon={<TrendingUp className="h-5 w-5 text-cyan-400" />}
          label="Coût total"
          value={fmtEur(tco.totalCost)}
          sub={`sur ${months} mois`}
          color="cyan"
        />
        <KpiCard
          icon={<Fuel className="h-5 w-5 text-blue-400" />}
          label="Carburant"
          value={fmtEur(tco.fuelCost)}
          sub={tco.totalCost > 0 ? `${tco.breakdown.fuel}% du total` : '—'}
          color="blue"
        />
        <KpiCard
          icon={<Wrench className="h-5 w-5 text-amber-400" />}
          label="Maintenance"
          value={fmtEur(tco.maintenanceCost)}
          sub={tco.totalCost > 0 ? `${tco.breakdown.maintenance}% du total` : '—'}
          color="amber"
        />
        <KpiCard
          icon={<Gauge className="h-5 w-5 text-green-400" />}
          label="Coût/km"
          value={tco.costPerKm > 0 ? `${(tco.costPerKm * 100).toFixed(1)} c€/km` : '—'}
          sub={tco.avgConsumption > 0 ? `${tco.avgConsumption.toFixed(1)} L/100km` : 'km non disponibles'}
          color="green"
        />
      </div>

      {/* Graphiques */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donut */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Répartition des coûts</CardTitle>
          </CardHeader>
          <CardContent>
            {pieData.length === 0 ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={3}
                    dataKey="value"
                    label={({ name, percent }) =>
                      `${name} ${Math.round((percent ?? 0) * 100)}%`
                    }
                    labelLine={false}
                  >
                    {pieData.map((_, index) => (
                      <Cell key={index} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v: unknown) => [fmtEur(Number(v)), '']}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend
                    formatter={(value) => <span style={{ color: '#94a3b8', fontSize: 12 }}>{value}</span>}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Barres empilées */}
        <Card className="bg-slate-900 border-slate-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-slate-300">Évolution mensuelle</CardTitle>
          </CardHeader>
          <CardContent>
            {tco.monthlyData.every((d) => d.total === 0) ? (
              <EmptyChart />
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={tco.monthlyData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                  <XAxis
                    dataKey="month"
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    interval="preserveStartEnd"
                  />
                  <YAxis
                    tick={{ fill: '#64748b', fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${Math.round(v / 1000)}k`}
                    width={36}
                  />
                  <Tooltip
                    formatter={(v: unknown, name: unknown) => [
                      fmtEur(Number(v)),
                      name === 'fuelCost' ? 'Carburant' : 'Maintenance',
                    ]}
                    contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: 8 }}
                    labelStyle={{ color: '#94a3b8' }}
                    itemStyle={{ color: '#e2e8f0' }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span style={{ color: '#94a3b8', fontSize: 12 }}>
                        {value === 'fuelCost' ? 'Carburant' : 'Maintenance'}
                      </span>
                    )}
                  />
                  <Bar dataKey="fuelCost" stackId="a" fill="#06b6d4" radius={[0, 0, 0, 0]} />
                  <Bar dataKey="maintenanceCost" stackId="a" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comparaison flotte */}
      {fleetAvg !== undefined && fleetAvg > 0 && (
        <Card className="bg-slate-900 border-slate-700">
          <CardContent className="pt-5 pb-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-sm text-slate-400">
                  Ce véhicule coûte{' '}
                  <span className="font-semibold text-white">{fmtEur(tco.costPerMonth)}/mois</span>
                  {' '}— la moyenne de votre flotte est{' '}
                  <span className="font-semibold text-white">{fmtEur(fleetAvg)}/mois</span>
                </p>
              </div>
              {isAboveFleetAvg && (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
                  +{Math.round(((tco.costPerMonth - fleetAvg) / fleetAvg) * 100)}% vs flotte
                </Badge>
              )}
              {isBelowFleetAvg && (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
                  -{Math.round(((fleetAvg - tco.costPerMonth) / fleetAvg) * 100)}% vs flotte
                </Badge>
              )}
              {!isAboveFleetAvg && !isBelowFleetAvg && (
                <Badge className="bg-slate-700 text-slate-300 border-slate-600">
                  Dans la moyenne
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  sub,
  color,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  sub: string;
  color: 'cyan' | 'blue' | 'amber' | 'green';
}) {
  const colors = {
    cyan: 'bg-cyan-500/10 border-cyan-500/20',
    blue: 'bg-blue-500/10 border-blue-500/20',
    amber: 'bg-amber-500/10 border-amber-500/20',
    green: 'bg-green-500/10 border-green-500/20',
  };
  return (
    <Card className={`${colors[color]} border`}>
      <CardContent className="pt-4 pb-4">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs text-slate-400 uppercase tracking-wider">{label}</p>
            <p className="text-xl font-bold text-white mt-1">{value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{sub}</p>
          </div>
          <div className="opacity-80">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyChart() {
  return (
    <div className="h-[240px] flex items-center justify-center text-slate-500 text-sm">
      Aucune donnée sur la période
    </div>
  );
}
