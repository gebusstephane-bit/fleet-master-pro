"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
import { TopVehicleData } from "@/actions/dashboard-analytics";
import { formatCurrency } from "@/lib/analytics/formatters";
import { AlertTriangle } from "lucide-react";

interface TopVehiclesChartProps {
  data: TopVehicleData[];
}

const BAR_COLORS = ["#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e"];

export function TopVehiclesChart({ data }: TopVehiclesChartProps) {
  const hasData = data.length > 0;

  if (!hasData) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">
          Top 5 véhicules les plus coûteux
        </h3>
        <div className="h-[250px] flex items-center justify-center">
          <p className="text-slate-500 text-center">
            Pas d&apos;historique de coûts
            <br />
            <span className="text-sm">Les données apparaîtront après vos premières maintenances</span>
          </p>
        </div>
      </GlassCard>
    );
  }

  // Tronquer les immatriculations trop longues pour l'affichage
  const formattedData = data.map((item) => ({
    ...item,
    displayName:
      item.registrationNumber.length > 10
        ? item.registrationNumber.slice(0, 10) + "..."
        : item.registrationNumber,
  }));

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">
            Top 5 véhicules les plus coûteux
          </h3>
          <p className="text-sm text-slate-400">Année en cours</p>
        </div>
        {data[0]?.totalCost > 5000 && (
          <div className="flex items-center gap-1 text-amber-400 text-xs">
            <AlertTriangle className="w-4 h-4" />
            <span>Surcoût détecté</span>
          </div>
        )}
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={formattedData}
            layout="vertical"
            margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.3} horizontal={false} />
            <XAxis
              type="number"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => `${v}€`}
            />
            <YAxis
              type="category"
              dataKey="displayName"
              stroke="#94a3b8"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              width={80}
            />
            <Tooltip
              cursor={{ fill: "#1e293b", opacity: 0.5 }}
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as TopVehicleData;
                  return (
                    <div className="bg-[#1e293b] border border-slate-600 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-medium mb-1">{item.registrationNumber}</p>
                      <p className="text-red-400 font-semibold">
                        {formatCurrency(item.totalCost)}
                      </p>
                      <p className="text-slate-500 text-xs mt-1">
                        {item.interventions} intervention(s)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Bar dataKey="totalCost" radius={[0, 4, 4, 0]}>
              {formattedData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={BAR_COLORS[index] || "#3b82f6"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Légende des couleurs */}
      <div className="mt-4 pt-4 border-t border-slate-700/50 flex items-center justify-between text-xs">
        <span className="text-slate-500">Coût élevé</span>
        <div className="flex gap-1">
          {BAR_COLORS.map((color, i) => (
            <div
              key={i}
              className="w-8 h-2 rounded-full"
              style={{ backgroundColor: color }}
            />
          ))}
        </div>
        <span className="text-slate-500">Coût modéré</span>
      </div>
    </GlassCard>
  );
}
