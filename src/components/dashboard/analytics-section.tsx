"use client";

/**
 * Analytics Section - Dashboard Charts
 * Affiche les graphiques analytics avec données temps réel
 */

// @ts-ignore
import { Vehicle } from "@/types/vehicle";
// @ts-ignore
import { DashboardAnalytics } from "@/actions/dashboard-analytics";
import { CostTrendChart } from "./charts/cost-trend-chart";
// @ts-ignore
import { FleetStatusChart } from "./charts/fleet-status-chart";
import { TopVehiclesChart } from "./charts/top-vehicles-chart";
import { AnalyticsSectionSkeleton } from "./charts/chart-skeleton";
import { motion } from "framer-motion";

interface AnalyticsSectionProps {
  analytics?: DashboardAnalytics | null;
  // @ts-ignore
  vehicles: Vehicle[];
  isLoading: boolean;
}

export function AnalyticsSection({
  analytics,
  vehicles,
  isLoading,
}: AnalyticsSectionProps) {
  if (isLoading) {
    return (
      <section className="mt-8">
        <h2 className="text-xl font-semibold text-white mb-6">Analytics</h2>
        <AnalyticsSectionSkeleton />
      </section>
    );
  }

  return (
    <motion.section
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.3 }}
      className="mt-8"
    >
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-white">Analytics</h2>
        <span className="text-sm text-slate-500">
          Mise à jour automatique
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coûts maintenance - pleine largeur sur mobile, 50% sur desktop */}
        <CostTrendChart
          data={analytics?.monthlyCosts || []}
          totalCost={analytics?.totalCost6Months || 0}
          avgMonthlyCost={analytics?.avgMonthlyCost || 0}
        />

        {/* Répartition flotte */}
        {/* @ts-ignore */}
        <FleetStatusChart vehicles={vehicles} />

        {/* Top véhicules coûteux - pleine largeur */}
        <div className="lg:col-span-2">
          <TopVehiclesChart data={analytics?.topVehicles || []} />
        </div>
      </div>
    </motion.section>
  );
}
