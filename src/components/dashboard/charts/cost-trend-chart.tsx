"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { MonthlyCostData } from "@/actions/dashboard-analytics";
import { formatCurrency } from "@/lib/analytics/formatters";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CostTrendChartProps {
  data: MonthlyCostData[];
  totalCost: number;
  avgMonthlyCost: number;
}

export function CostTrendChart({
  data,
  totalCost,
  avgMonthlyCost,
}: CostTrendChartProps) {
  // Calculer la tendance (dernier mois vs moyenne)
  const lastMonth = data[data.length - 1]?.cost || 0;
  const previousMonth = data[data.length - 2]?.cost || 0;
  const trend = previousMonth > 0 ? ((lastMonth - previousMonth) / previousMonth) * 100 : 0;
  const isPositive = trend >= 0;

  // Afficher le graphique dès qu'il y a des interventions, même si cost=0
  const hasInterventions = data.some((d) => d.interventions > 0);
  const hasCosts = data.some((d) => d.cost > 0);

  if (!hasInterventions) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Activité maintenance (12 mois)
        </h3>
        <div className="h-[300px] flex items-center justify-center">
          <p className="text-slate-500 text-center">
            Aucune intervention enregistrée
            <br />
            <span className="text-sm">Les données apparaîtront après vos premières maintenances</span>
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Activité maintenance (12 mois)
          </h3>
          {hasCosts
            ? <p className="text-sm text-slate-400">Total: {formatCurrency(totalCost)}</p>
            : <p className="text-sm text-amber-400/80">Coûts non renseignés — {data.reduce((s, d) => s + d.interventions, 0)} intervention(s)</p>
          }
        </div>
        <div className="text-right">
          <div className="flex items-center gap-1 text-sm">
            {isPositive ? (
              <>
                <TrendingUp className="w-4 h-4 text-red-400" />
                <span className="text-red-400">+{trend.toFixed(1)}%</span>
              </>
            ) : (
              <>
                <TrendingDown className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400">{trend.toFixed(1)}%</span>
              </>
            )}
          </div>
          <p className="text-xs text-slate-500">vs mois précédent</p>
        </div>
      </div>

      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorCost" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.5} />
            <XAxis
              dataKey="monthLabel"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}€`}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (active && payload && payload.length) {
                  return (
                    <div className="bg-[#1e293b] border border-slate-600 rounded-lg p-3 shadow-xl">
                      <p className="text-slate-300 text-sm mb-1">{label}</p>
                      <p className="text-blue-400 font-semibold">
                        {formatCurrency(payload[0].value as number)}
                      </p>
                      {payload[0].payload.interventions > 0 && (
                        <p className="text-slate-500 text-xs mt-1">
                          {payload[0].payload.interventions} intervention(s)
                        </p>
                      )}
                    </div>
                  );
                }
                return null;
              }}
            />
            <Area
              type="monotone"
              dataKey={hasCosts ? "cost" : "interventions"}
              stroke="#3b82f6"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCost)"
              name={hasCosts ? "Coût" : "Interventions"}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-700/50 flex justify-between text-sm">
        <span className="text-slate-400">Moyenne mensuelle:</span>
        <span className="text-white font-medium">{formatCurrency(avgMonthlyCost)}</span>
      </div>
    </GlassCard>
  );
}
