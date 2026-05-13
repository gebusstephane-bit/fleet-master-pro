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
  AlertTriangle,
  TrendingUp,
  Activity,
  Zap,
  ShieldAlert,
  ClipboardCheck,
} from "lucide-react";
import { CriticalVehiclesWidget } from "@/components/vehicles/ReliabilityScore";
import { CriticalDocumentsBanner } from "@/components/dashboard/CriticalDocumentsBanner";
import { DailyBriefing } from "@/components/ai/DailyBriefing";
import { CriticalFleetWidget } from "@/components/dashboard/CriticalFleetWidget";
import { planHasFeature } from "@/lib/plans";
import { Suspense } from "react";
import { MaintenanceUrgenciesWidget } from "@/components/dashboard/MaintenanceUrgenciesWidget";
import { IncidentStatsWidget } from "@/components/dashboard/IncidentStatsWidget";
import { MaintenanceFleetOverview } from "@/components/dashboard/MaintenanceFleetOverview";
import { DashboardSkeleton } from "@/components/ui/skeletons";
import { GlassCard, MetricCard } from "@/components/ui/glass-card";
import { cn } from "@/lib/utils";
import Link from "next/link";

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
      href: "/vehicles",
    },
    {
      title: "Chauffeurs",
      value: stats.drivers.total,
      subtitle: `${stats.drivers.active} Disponibles`,
      icon: Users,
      href: "/drivers",
    },
    {
      title: "Maintenances",
      value: upcomingMaintenance.length,
      subtitle: upcomingMaintenance.length > 0 ? `${upcomingMaintenance.length} en attente` : "À jour",
      trend: upcomingMaintenance.length > 0 ? `${upcomingMaintenance.length} urgentes` : undefined,
      trendUp: false,
      icon: Wrench,
      href: "/maintenance",
    },
    {
      title: "Inspections",
      value: stats.inspections?.pending || 0,
      subtitle: `${stats.inspections?.completedThisMonth || 0} ce mois`,
      icon: ClipboardCheck,
      href: "/inspections",
    },
  ] : [];

  if (isLoading) {
    return <DashboardSkeleton />;
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <GlassCard className="p-8 text-center">
          <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
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
        <h1 className="text-3xl font-bold text-white tracking-tight">
          Bonjour, <span className="text-gradient-blue">{userName}</span>
        </h1>
        <p className="mt-1 text-slate-400 text-sm">
          Voici un aperçu de votre flotte aujourd&apos;hui
        </p>
      </motion.div>

      {/* Bannière documents expirés — affichée seulement si au moins 1 expiré */}
      <motion.div variants={itemVariants}>
        <CriticalDocumentsBanner />
      </motion.div>

      {/* AI Daily Briefing */}
      {user?.company_id && user?.companies?.plan && planHasFeature(user.companies.plan, 'ai_briefing') && (
        <Suspense fallback={null}>
          <motion.div variants={itemVariants}>
            <DailyBriefing companyId={user.company_id} plan={user.companies.plan} />
          </motion.div>
        </Suspense>
      )}

      {/* Critical Fleet Widget — lecture BDD uniquement, 0 appel IA */}
      {user?.company_id && user?.companies?.plan && (
        <Suspense fallback={null}>
          <CriticalFleetWidget companyId={user.company_id} plan={user.companies.plan as any} />
        </Suspense>
      )}

      {/* KPI Grid - 4 colonnes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpiData.map((kpi, index) => (
          <motion.div key={kpi.title} variants={itemVariants}>
            <Link href={kpi.href} className="block">
              <MetricCard
                title={kpi.title}
                value={kpi.value}
                subtitle={kpi.subtitle}
                trend={kpi.trend}
                trendUp={kpi.trendUp}
                icon={kpi.icon}
                delay={index}
              />
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Main Bento Grid */}
      <div className="grid grid-cols-12 gap-4">
        {/* Maintenances à venir */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-8">
          <GlassCard className="h-full p-5">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-base font-semibold text-white">
                  Maintenances à venir
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  {upcomingMaintenance.length} interventions programmées
                </p>
              </div>
              <Link 
                href="/maintenance" 
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors px-3 py-1.5 rounded-lg bg-cyan-500/10 border border-cyan-500/20"
              >
                Voir tout
              </Link>
            </div>

            <div className="space-y-2">
              {upcomingMaintenance.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-[#0f172a]/20 rounded-xl border border-dashed border-white/5">
                  <Wrench className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  <p className="text-sm">Aucune maintenance à venir</p>
                  <p className="text-xs mt-1 opacity-70">Votre flotte est à jour</p>
                </div>
              ) : (
                upcomingMaintenance.slice(0, 5).map((item: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 + index * 0.1 }}
                    className="flex items-center gap-3 p-3 rounded-xl bg-[#0f172a]/40 border border-cyan-500/10 hover:bg-[#0f172a]/60 hover:border-cyan-500/20 transition-all"
                  >
                    <div className={cn(
                      "h-8 w-1 rounded-full",
                      item.severity === "CRITICAL" || item.severity === "WARNING" ? "bg-red-500" : "bg-cyan-500"
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-white text-sm truncate">{item.vehicleName}</div>
                      <div className="text-xs text-slate-500">{item.type === "MILEAGE_DUE" ? "Entretien kilométrage" : "Entretien périodique"}</div>
                    </div>
                    <div className="px-2.5 py-1 rounded-lg bg-[#0f172a]/80 border border-cyan-500/20 text-xs text-cyan-400/80 font-medium">
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
          <GlassCard className="h-full p-5" glow="amber">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-amber-500/10 border border-amber-500/20">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Alertes</h2>
                <p className="text-xs text-slate-500">
                  {alertsData?.length || 0} notifications
                </p>
              </div>
            </div>

            <div className="space-y-2">
              {alertsData?.length === 0 ? (
                <div className="text-center py-8 text-slate-500 bg-[#0f172a]/20 rounded-xl border border-dashed border-white/5">
                  <div className="w-10 h-10 mx-auto mb-2 rounded-full bg-emerald-500/10 flex items-center justify-center">
                    <TrendingUp className="h-5 w-5 text-emerald-400" />
                  </div>
                  <p className="text-sm">Tout va bien !</p>
                  <p className="text-xs mt-1 opacity-70">Aucune alerte critique</p>
                </div>
              ) : (
                alertsData?.slice(0, 5).map((alert: any, index: number) => (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 + index * 0.1 }}
                    className={cn(
                      "p-3 rounded-xl border",
                      alert.severity === "CRITICAL" && "bg-red-500/10 border-red-500/20",
                      alert.severity === "WARNING" && "bg-amber-500/10 border-amber-500/20",
                      alert.severity === "INFO" && "bg-cyan-500/10 border-cyan-500/20"
                    )}
                  >
                    <div className={cn(
                      "text-xs font-medium mb-0.5",
                      alert.severity === "CRITICAL" && "text-red-400",
                      alert.severity === "WARNING" && "text-amber-400",
                      alert.severity === "INFO" && "text-cyan-400"
                    )}>
                      {alert.message}
                    </div>
                    <div className="text-[10px] text-slate-500">{alert.vehicleName}</div>
                  </motion.div>
                ))
              )}
            </div>
          </GlassCard>
        </motion.div>

        {/* Widget maintenance préventive */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <MaintenanceFleetOverview />
        </motion.div>

        {/* Widget maintenance urgences */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <GlassCard className="p-5 h-full">
            <MaintenanceUrgenciesWidget />
          </GlassCard>
        </motion.div>

        {/* Widget Sinistralité */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <GlassCard className="p-5">
            <IncidentStatsWidget />
          </GlassCard>
        </motion.div>

        {/* Activité du mois */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <GlassCard className="h-full p-5">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                  <Activity className="h-4 w-4 text-cyan-400" />
                </div>
                <div>
                  <h2 className="text-base font-semibold text-white">
                    Activité du mois
                  </h2>
                  <p className="text-xs text-slate-500">Tendances de la flotte</p>
                </div>
              </div>
            </div>

            {(stats?.costs?.total || 0) > 0 ? (
              <div className="space-y-2">
                <div className="flex justify-between items-center p-3 bg-[#0f172a]/40 border border-cyan-500/10 rounded-xl">
                  <span className="text-xs text-slate-400">Carburant</span>
                  <span className="text-sm text-white font-medium tabular-nums">{(stats?.costs?.fuel || 0).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-[#0f172a]/40 border border-cyan-500/10 rounded-xl">
                  <span className="text-xs text-slate-400">Maintenance</span>
                  <span className="text-sm text-white font-medium tabular-nums">{(stats?.costs?.maintenance || 0).toLocaleString('fr-FR')} €</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 rounded-xl">
                  <span className="text-xs text-cyan-400 font-medium">Total</span>
                  <span className="text-base text-white font-bold tabular-nums">{(stats?.costs?.total || 0).toLocaleString('fr-FR')} €</span>
                </div>
              </div>
            ) : (
              <div className="h-40 flex flex-col items-center justify-center text-slate-500 bg-[#0f172a]/20 rounded-xl border border-dashed border-white/5">
                <Activity className="h-10 w-10 mb-2 opacity-20" />
                <p className="text-sm">Pas encore d&apos;activité ce mois</p>
                <p className="text-xs mt-1 opacity-70">Les données apparaîtront avec vos premières tournées</p>
              </div>
            )}
          </GlassCard>
        </motion.div>

        {/* Quick Actions */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <GlassCard className="h-full p-5">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <Zap className="h-4 w-4 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">
                  Actions rapides
                </h2>
                <p className="text-xs text-slate-500">Accès direct</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {[
                { label: "Nouveau véhicule", icon: Car, color: "blue", href: "/vehicles/new" },
                { label: "Nouveau chauffeur", icon: Users, color: "emerald", href: "/drivers/new" },
                { label: "Planifier maintenance", icon: Wrench, color: "amber", href: "/maintenance/new" },
                { label: "Nouvelle inspection", icon: ClipboardCheck, color: "violet", href: "/inspections/new" },
              ].map((action, index) => (
                <motion.a
                  key={action.label}
                  href={action.href}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.9 + index * 0.1 }}
                  className={cn(
                    "flex flex-col items-center gap-2 p-4 rounded-xl",
                    "bg-[#0f172a]/40 border border-cyan-500/10",
                    "hover:bg-[#0f172a]/60 hover:border-cyan-500/20 hover:shadow-[0_0_20px_rgba(6,182,212,0.1)]",
                    "transition-all duration-200 cursor-pointer"
                  )}
                >
                  <div className={cn(
                    "p-2.5 rounded-xl",
                    action.color === "blue" && "bg-gradient-to-br from-blue-500 to-cyan-500 text-white shadow-[0_0_15px_rgba(59,130,246,0.3)]",
                    action.color === "emerald" && "bg-gradient-to-br from-emerald-500 to-teal-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)]",
                    action.color === "amber" && "bg-gradient-to-br from-amber-500 to-orange-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.3)]",
                    action.color === "violet" && "bg-gradient-to-br from-violet-500 to-purple-500 text-white shadow-[0_0_15px_rgba(139,92,246,0.3)]"
                  )}>
                    <action.icon className="h-5 w-5" strokeWidth={1.5} />
                  </div>
                  <span className="text-xs font-medium text-slate-400 group-hover:text-cyan-300 transition-colors">
                    {action.label}
                  </span>
                </motion.a>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* Véhicules critiques */}
        <motion.div variants={itemVariants} className="col-span-12 lg:col-span-6">
          <GlassCard className="h-full p-5" glow="red">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <ShieldAlert className="h-4 w-4 text-red-400" />
              </div>
              <div>
                <h2 className="text-base font-semibold text-white">Fiabilité critique</h2>
                <p className="text-xs text-slate-500">Véhicules les plus à risque</p>
              </div>
            </div>
            <CriticalVehiclesWidget
              vehicles={(vehicles as Array<{ id: string; registration_number: string; brand: string; model: string }>)}
            />
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
