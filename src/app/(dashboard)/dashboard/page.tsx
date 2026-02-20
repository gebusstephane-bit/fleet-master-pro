"use client";

import { motion, type Variants } from "framer-motion";
import { useDashboardStats, useDashboardAnalytics } from "@/hooks/use-dashboard";
import { useVehicles } from "@/hooks/use-vehicles";
import { AnalyticsSection } from "@/components/dashboard/analytics-section";
import { useUser } from "@/hooks/use-user";
import { useMaintenanceAlerts } from "@/hooks/use-maintenance";
import {
  Car,
  Users,
  Wrench,
  ClipboardCheck,
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap,
} from "lucide-react";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { GlassCard, MetricCard } from "@/components/ui/glass-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { cn } from "@/lib/utils";

// Animation variants
const containerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.2,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.22, 1, 0.36, 1],
    },
  },
};


export default function DashboardPage() {
  const { data: stats, isLoading, error } = useDashboardStats();
  const { data: analytics, isLoading: isAnalyticsLoading } = useDashboardAnalytics();
  const { data: vehicles = [], isLoading: isVehiclesLoading } = useVehicles();
  const { data: user } = useUser();
  const { data: alertsData } = useMaintenanceAlerts();
  
  const userName = user?.first_name || user?.email?.split('@')[0] || "Utilisateur";
  const upcomingMaintenance = alertsData || [];

  const kpiData = stats ? [
    {
      title: "Véhicules",
      value: stats.vehicles.total,
      subtitle: `${stats.vehicles.active} Actifs`,
      icon: Car,
    },
    {
      title: "Chauffeurs",
      value: stats.drivers.total,
      subtitle: `${stats.drivers.active} Disponibles`,
      icon: Users,
    },
    {
      title: "Maintenances",
      value: upcomingMaintenance.length,
      subtitle: "À venir",
      trend: upcomingMaintenance.length > 0 ? `${upcomingMaintenance.length} en attente` : undefined,
      trendUp: false,
      icon: Wrench,
    },
    {
      title: "Tournées",
      value: stats.routes.today,
      subtitle: `${stats.routes.ongoing} En cours`,
      icon: ClipboardCheck,
    },
  ] : [];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Erreur de chargement</h2>
          <p className="text-slate-400">Impossible de charger les données du dashboard.</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-4 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white rounded-lg transition-all"
          >
            Réessayer
          </button>
        </GlassCard>
      </div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Welcome Header */}
      <motion.div variants={itemVariants} className="mb-8">
        <h1 className="text-3xl font-bold text-white">
          Bonjour, <span className="text-gradient-blue">{userName}</span>
        </h1>
        <p className="mt-1 text-slate-400">
          Voici un aperçu de votre flotte aujourd&apos;hui
        </p>
      </motion.div>

      {/* KPI Grid */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <motion.div key={kpi.title} variants={itemVariants}>
            <MetricCard
              title={kpi.title}
              value={kpi.value}
              subtitle={kpi.subtitle}
              trend={kpi.trend}
              trendUp={kpi.trendUp}
              icon={kpi.icon}
              delay={index}
            />
          </motion.div>
        ))}
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-12 gap-6">
        {/* Maintenances à venir */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
          <GlassCard className="h-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Maintenances à venir
                </h2>
                <p className="text-sm text-slate-500">
                  {upcomingMaintenance.length} interventions programmées
                </p>
              </div>
              <button className="glass-button text-sm">
                Voir tout
              </button>
            </div>

            <div className="space-y-3">
              {upcomingMaintenance.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Aucune maintenance à venir
                </div>
              ) : (
                upcomingMaintenance.slice(0, 5).map((item: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-4 p-4 rounded-xl bg-[#0f172a]/40 border border-cyan-500/10 hover:bg-[#0f172a]/60 hover:border-cyan-500/20 transition-all"
                  >
                    <div className={cn(
                      "h-10 w-1 rounded-full",
                      item.severity === "CRITICAL" || item.severity === "WARNING" ? "bg-red-500" : "bg-blue-500"
                    )} />
                    <div className="flex-1">
                      <div className="font-medium text-white">{item.vehicleName}</div>
                      <div className="text-sm text-slate-500">{item.type === "MILEAGE_DUE" ? "Entretien kilométrage" : "Entretien périodique"}</div>
                    </div>
                    <div className="px-3 py-1 rounded-full bg-[#0f172a]/80 border border-cyan-500/20 text-sm text-cyan-400/70">
                      {item.dueMileage ? `${item.remainingKm} km` : item.dueDate}
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Alerts Panel */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-4">
          <GlassCard className="h-full p-6" glow="amber">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-amber-500/20">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">Alertes</h2>
                <p className="text-sm text-slate-500">
                  {alertsData?.length || 0} notifications
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {alertsData?.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  Aucune alerte
                </div>
              ) : (
                alertsData?.slice(0, 5).map((alert: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={cn(
                      "p-4 rounded-xl border",
                      alert.severity === "CRITICAL" && "bg-red-500/10 border-red-500/20",
                      alert.severity === "WARNING" && "bg-amber-500/10 border-amber-500/20",
                      alert.severity === "INFO" && "bg-blue-500/10 border-blue-500/20"
                    )}
                  >
                    <div className={cn(
                      "text-sm font-medium mb-1",
                      alert.severity === "CRITICAL" && "text-red-400",
                      alert.severity === "WARNING" && "text-amber-400",
                      alert.severity === "INFO" && "text-blue-400"
                    )}>
                      {alert.message}
                    </div>
                    <div className="text-xs text-[#71717a]">{alert.vehicleName}</div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Activity Chart - Réel ou Message */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <GlassCard className="h-full p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-[#27272a]">
                  <Activity className="h-5 w-5 text-[#a1a1aa]" />
                </div>
                <div>
                  <h2 className="text-lg font-semibold text-white">
                    Activité du mois
                  </h2>
                  <p className="text-sm text-[#71717a]">Tendances de la flotte</p>
                </div>
              </div>
            </div>

            {(stats?.costs?.total || 0) > 0 ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-[#0f172a]/40 border border-cyan-500/10 rounded-lg">
                  <span className="text-slate-400">Carburant</span>
                  <span className="text-white font-medium">{(stats?.costs?.fuel || 0).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#0f172a]/40 border border-cyan-500/10 rounded-lg">
                  <span className="text-slate-400">Maintenance</span>
                  <span className="text-white font-medium">{(stats?.costs?.maintenance || 0).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/20 rounded-lg">
                  <span className="text-cyan-400">Total</span>
                  <span className="text-white font-bold">{(stats?.costs?.total || 0).toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            ) : (
              <div className="h-48 flex flex-col items-center justify-center text-[#71717a]">
                <Activity className="h-12 w-12 mb-3 opacity-30" />
                <p>Pas encore d'activité ce mois</p>
                <p className="text-sm mt-1">Les données apparaîtront avec vos premières tournées</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <GlassCard className="h-full p-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Zap className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Actions rapides
                </h2>
                <p className="text-sm text-slate-500">Accès direct</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Nouveau véhicule", icon: Car, color: "blue", href: "/vehicles/new" },
                { label: "Nouveau chauffeur", icon: Users, color: "emerald", href: "/drivers/new" },
                { label: "Planifier maintenance", icon: Wrench, color: "amber", href: "/maintenance/new" },
                { label: "Nouvelle inspection", icon: ClipboardCheck, color: "violet", href: "/inspections/new" },
              ].map((action, index) => (
                <motion.a
                  key={action.label}
                  href={action.href}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className={cn(
                    "flex flex-col items-center gap-3 p-6 rounded-xl",
                    "bg-[#0f172a]/40 border border-cyan-500/10",
                    "hover:bg-[#0f172a]/60 hover:border-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]",
                    "transition-all duration-200 cursor-pointer"
                  )}
                >
                  <div className={cn(
                    "p-3 rounded-xl",
                    action.color === "blue" && "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.4)]",
                    action.color === "emerald" && "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.4)]",
                    action.color === "amber" && "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]",
                    action.color === "violet" && "bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.4)]"
                  )}>
                    <action.icon className="h-6 w-6" strokeWidth={1.5} />
                  </div>
                  <span className="text-sm font-medium text-slate-400 group-hover:text-cyan-300 transition-colors">
                    {action.label}
                  </span>
                </motion.a>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      {/* Analytics Section - Graphiques Recharts */}
      <AnalyticsSection
        analytics={analytics}
        vehicles={vehicles}
        isLoading={isAnalyticsLoading || isVehiclesLoading}
      />
    </motion.div>
  );
}
