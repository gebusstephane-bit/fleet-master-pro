"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";
import { GlassCard } from "@/components/ui/glass-card";
// @ts-ignore
import { Vehicle } from "@/types/vehicle";

interface FleetStatusChartProps {
  // @ts-ignore
  vehicles: Vehicle[];
}

// Tous les statuts possibles en DB (FR uppercase, EN lowercase, variantes)
const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  // Actif
  ACTIF:          { label: "Actif",        color: "#22c55e" },
  active:         { label: "Actif",        color: "#22c55e" },
  ACTIVE:         { label: "Actif",        color: "#22c55e" },
  // En maintenance
  EN_MAINTENANCE: { label: "Maintenance",  color: "#f59e0b" },
  maintenance:    { label: "Maintenance",  color: "#f59e0b" },
  MAINTENANCE:    { label: "Maintenance",  color: "#f59e0b" },
  // Inactif
  INACTIF:        { label: "Inactif",      color: "#6b7280" },
  inactive:       { label: "Inactif",      color: "#6b7280" },
  INACTIVE:       { label: "Inactif",      color: "#6b7280" },
  // Hors service
  HORS_SERVICE:   { label: "Hors service", color: "#ef4444" },
  retired:        { label: "Hors service", color: "#ef4444" },
  OUT_OF_SERVICE: { label: "Hors service", color: "#ef4444" },
};

interface StatusData {
  name: string;
  value: number;
  color: string;
}

// @ts-ignore
export function FleetStatusChart({ vehicles }: FleetStatusChartProps) {
  // Compter par statut
  const statusCount = vehicles.reduce((acc: Record<string, number>, vehicle: any) => {
    const status = vehicle.status || "INACTIVE";
    acc[status] = (acc[status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const data: StatusData[] = Object.entries(statusCount)
    .map(([status, count]) => ({
      name: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.label || status,
      // @ts-ignore
      value: count as number,
      color: STATUS_CONFIG[status as keyof typeof STATUS_CONFIG]?.color || "#6b7280",
    }))
    .filter((item) => item.value > 0)
    // @ts-ignore
    .sort((a, b) => b.value - a.value);

  const total = vehicles.length;

  if (total === 0) {
    return (
      <GlassCard className="p-6">
        <h3 className="text-lg font-semibold text-white mb-2">Répartition de la flotte</h3>
        <div className="h-[280px] flex items-center justify-center">
          <p className="text-slate-500 text-center">
            Aucun véhicule enregistré
            <br />
            <span className="text-sm">Ajoutez vos véhicules pour voir la répartition</span>
          </p>
        </div>
      </GlassCard>
    );
  }

  return (
    <GlassCard className="p-6">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">Répartition de la flotte</h3>
          <p className="text-sm text-slate-400">{total} véhicule(s) au total</p>
        </div>
      </div>

      <div className="h-[250px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={4}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} stroke="#0f172a" strokeWidth={2} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (active && payload && payload.length) {
                  const item = payload[0].payload as StatusData;
                  // @ts-ignore
                  const percentage = ((item.value / total) * 100).toFixed(1);
                  return (
                    <div className="bg-[#1e293b] border border-slate-600 rounded-lg p-3 shadow-xl">
                      <p className="text-white font-medium">{item.name}</p>
                      <p className="text-slate-400 text-sm">
                        {item.value} véhicule(s) ({percentage}%)
                      </p>
                    </div>
                  );
                }
                return null;
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              content={({ payload }) => (
                <div className="flex flex-wrap justify-center gap-3 mt-4">
                  {payload?.map((entry: any, index: number) => (
                    <div key={index} className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: entry.color }}
                      />
                      <span className="text-sm text-slate-400">{entry.value}</span>
                    </div>
                  ))}
                </div>
              )}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Résumé texte */}
      <div className="mt-4 pt-4 border-t border-slate-700/50">
        <div className="grid grid-cols-2 gap-2">
          {data.slice(0, 4).map((item) => (
            <div key={item.name} className="flex items-center gap-2">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-slate-400">
                {item.name}: <span className="text-white">{item.value}</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </GlassCard>
  );
}
