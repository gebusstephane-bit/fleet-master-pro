"use client";

/**
 * DebugDataShowcase — Diagnostic component
 * Shows raw DB data to verify what is actually stored.
 * Mount temporarily on a page to diagnose empty-chart issues.
 * Remove once data issues are resolved.
 */

import { useEffect, useState } from "react";
import { getSupabaseClient } from "@/lib/supabase/client";
import { useUserContext } from "@/components/providers/user-provider";
import { GlassCard } from "@/components/ui/glass-card";
import { Bug, Database, Car, Wrench } from "lucide-react";

interface DebugStats {
  vehicleCount: number;
  vehicleStatuses: Record<string, number>;
  maintenanceCount: number;
  maintenanceStatuses: Record<string, number>;
  maintenanceDateRange: { min: string | null; max: string | null };
  sampleRecords: Array<{
    id: string;
    status: string;
    rdv_date: string | null;
    created_at: string;
    cost: number | null;
  }>;
}

export function DebugDataShowcase() {
  const { user } = useUserContext();
  const companyId = user?.company_id;
  const [stats, setStats] = useState<DebugStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!companyId) return;

    async function load() {
      try {
        const supabase = getSupabaseClient();

        // Vehicles
        const { data: vehicles } = await supabase
          .from("vehicles")
          .select("id, status")
          .eq("company_id", companyId!);

        const vehicleStatuses: Record<string, number> = {};
        (vehicles || []).forEach((v) => {
          vehicleStatuses[v.status] = (vehicleStatuses[v.status] || 0) + 1;
        });

        // Maintenances
        const { data: maintenances } = await supabase
          .from("maintenance_records")
          .select("id, status, rdv_date, created_at, cost")
          .eq("company_id", companyId!)
          .order("created_at", { ascending: false })
          .limit(100);

        const maintenanceStatuses: Record<string, number> = {};
        (maintenances || []).forEach((m) => {
          maintenanceStatuses[m.status] = (maintenanceStatuses[m.status] || 0) + 1;
        });

        const dates = (maintenances || [])
          .map((m) => m.rdv_date || m.created_at)
          .filter(Boolean)
          .sort();

        setStats({
          vehicleCount: vehicles?.length || 0,
          vehicleStatuses,
          maintenanceCount: maintenances?.length || 0,
          maintenanceStatuses,
          maintenanceDateRange: {
            min: dates[0] || null,
            max: dates[dates.length - 1] || null,
          },
          sampleRecords: (maintenances || []).slice(0, 3).map((m) => ({
            id: m.id,
            status: m.status,
            rdv_date: m.rdv_date,
            created_at: m.created_at,
            cost: m.cost,
          })),
        });
      } catch (e: any) {
        setError(e.message);
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [companyId]);

  if (!companyId) return null;

  return (
    <GlassCard className="p-6 border-amber-500/30">
      <div className="flex items-center gap-2 mb-4 text-amber-400">
        <Bug className="w-5 h-5" />
        <h3 className="font-semibold">Debug — Données brutes DB</h3>
        <span className="text-xs text-slate-500 ml-auto">Supprimer en prod</span>
      </div>

      {loading && <p className="text-slate-500 text-sm">Chargement…</p>}
      {error && <p className="text-red-400 text-sm">Erreur: {error}</p>}

      {stats && (
        <div className="space-y-4 text-sm">
          {/* Vehicles */}
          <div>
            <div className="flex items-center gap-2 text-cyan-400 mb-2">
              <Car className="w-4 h-4" />
              <span className="font-medium">Véhicules ({stats.vehicleCount})</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(stats.vehicleStatuses).map(([status, count]) => (
                <span
                  key={status}
                  className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono text-xs"
                >
                  {status}: {count}
                </span>
              ))}
              {Object.keys(stats.vehicleStatuses).length === 0 && (
                <span className="text-slate-500">Aucun véhicule</span>
              )}
            </div>
          </div>

          {/* Maintenances */}
          <div>
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Wrench className="w-4 h-4" />
              <span className="font-medium">Maintenances ({stats.maintenanceCount})</span>
            </div>
            <div className="flex flex-wrap gap-2 mb-2">
              {Object.entries(stats.maintenanceStatuses).map(([status, count]) => (
                <span
                  key={status}
                  className="px-2 py-0.5 rounded bg-slate-700/60 text-slate-300 font-mono text-xs"
                >
                  {status}: {count}
                </span>
              ))}
              {Object.keys(stats.maintenanceStatuses).length === 0 && (
                <span className="text-slate-500">Aucune maintenance</span>
              )}
            </div>
            {stats.maintenanceDateRange.min && (
              <p className="text-xs text-slate-500">
                Plage de dates — min:{" "}
                <span className="text-slate-300">{stats.maintenanceDateRange.min?.slice(0, 10)}</span>
                {" "}/ max:{" "}
                <span className="text-slate-300">{stats.maintenanceDateRange.max?.slice(0, 10)}</span>
              </p>
            )}
          </div>

          {/* Sample records */}
          {stats.sampleRecords.length > 0 && (
            <div>
              <div className="flex items-center gap-2 text-slate-400 mb-2">
                <Database className="w-4 h-4" />
                <span className="font-medium">3 derniers enregistrements</span>
              </div>
              <div className="space-y-1">
                {stats.sampleRecords.map((r) => (
                  <div
                    key={r.id}
                    className="font-mono text-xs text-slate-400 bg-slate-800/60 rounded px-3 py-1.5"
                  >
                    <span className="text-amber-300">{r.status}</span>
                    {" | "}rdv_date: <span className="text-cyan-300">{r.rdv_date || "null"}</span>
                    {" | "}cost: <span className="text-green-300">{r.cost ?? "null"}</span>
                    {" | "}
                    <span className="text-slate-500">{r.created_at.slice(0, 10)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </GlassCard>
  );
}
