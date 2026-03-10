/**
 * KPI Cards - Dashboard SaaS 2026
 * Affiche les indicateurs clés avec vraies données Supabase
 * Glassmorphism Design System
 */

'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Car, Users, Wrench, ClipboardCheck, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface KpiCardsProps {
  data: {
    vehicles: {
      total: number;
      active: number;
      maintenance: number;
      inactive: number;
    };
    drivers: {
      total: number;
      active: number;
    };
    maintenances: {
      urgent: number;
      upcoming: number;
      inProgress: number;
    };
    inspections: {
      pending: number;
      completedThisMonth: number;
    };
  } | null;
  isLoading: boolean;
}

export function KpiCards({ data, isLoading }: KpiCardsProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-[#0f172a]/60 border-cyan-500/15 backdrop-blur-xl">
            <CardContent className="p-6">
              <Skeleton className="h-4 w-24 mb-3 bg-slate-800/50" />
              <Skeleton className="h-8 w-16 bg-slate-800/50" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          title="Véhicules"
          value={0}
          subtitle="Aucun véhicule"
          icon={Car}
          color="text-slate-400"
          bgColor="bg-slate-500/10 border-slate-500/20"
        />
        <KpiCard
          title="Chauffeurs"
          value={0}
          subtitle="Aucun chauffeur"
          icon={Users}
          color="text-slate-400"
          bgColor="bg-slate-500/10 border-slate-500/20"
        />
        <KpiCard
          title="Maintenances"
          value={0}
          subtitle="À planifier"
          icon={Wrench}
          color="text-slate-400"
          bgColor="bg-slate-500/10 border-slate-500/20"
        />
        <KpiCard
          title="Inspections"
          value={0}
          subtitle="En attente"
          icon={ClipboardCheck}
          color="text-slate-400"
          bgColor="bg-slate-500/10 border-slate-500/20"
        />
      </div>
    );
  }

  const { vehicles, drivers, maintenances, inspections } = data;

  // Calculer taux d'utilisation (véhicules actifs / total)
  const utilizationRate = vehicles.total > 0 
    ? Math.round((vehicles.active / vehicles.total) * 100) 
    : 0;

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Véhicules */}
      <Link href="/vehicles">
        <KpiCard
          title="Véhicules"
          value={vehicles.total}
          subtitle={`${vehicles.active} en service • ${utilizationRate}% utilis.`}
          icon={Car}
          color="text-blue-400"
          bgColor="bg-blue-500/10 border-blue-500/20"
          alert={vehicles.maintenance > 0}
          alertCount={vehicles.maintenance}
        />
      </Link>

      {/* Chauffeurs */}
      <Link href="/drivers">
        <KpiCard
          title="Chauffeurs"
          value={drivers.total}
          subtitle={`${drivers.active} actifs`}
          icon={Users}
          color="text-emerald-400"
          bgColor="bg-emerald-500/10 border-emerald-500/20"
        />
      </Link>

      {/* Maintenances */}
      <Link href="/maintenance">
        <KpiCard
          title="Maintenances"
          value={maintenances.urgent + maintenances.inProgress}
          subtitle={maintenances.urgent > 0 
            ? `${maintenances.urgent} urgentes • ${maintenances.upcoming} à venir` 
            : `${maintenances.upcoming} planifiées ce mois`}
          icon={Wrench}
          color={maintenances.urgent > 0 ? "text-red-400" : "text-amber-400"}
          bgColor={maintenances.urgent > 0 ? "bg-red-500/10 border-red-500/20" : "bg-amber-500/10 border-amber-500/20"}
          alert={maintenances.urgent > 0}
          alertCount={maintenances.urgent}
        />
      </Link>

      {/* Inspections */}
      <Link href="/inspections">
        <KpiCard
          title="Inspections"
          value={inspections.pending}
          subtitle={inspections.pending > 0 
            ? `${inspections.pending} en attente` 
            : `${inspections.completedThisMonth} ce mois`}
          icon={ClipboardCheck}
          color={inspections.pending > 0 ? "text-violet-400" : "text-emerald-400"}
          bgColor={inspections.pending > 0 ? "bg-violet-500/10 border-violet-500/20" : "bg-emerald-500/10 border-emerald-500/20"}
          alert={inspections.pending > 0}
          alertCount={inspections.pending}
        />
      </Link>
    </div>
  );
}

interface KpiCardProps {
  title: string;
  value: number;
  subtitle: string;
  icon: React.ElementType;
  color: string;
  bgColor: string;
  alert?: boolean;
  alertCount?: number;
}

function KpiCard({ title, value, subtitle, icon: Icon, color, bgColor, alert, alertCount }: KpiCardProps) {
  return (
    <Card className="hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/30 transition-all cursor-pointer h-full bg-[#0f172a]/60 border-cyan-500/15 backdrop-blur-xl group">
      <CardContent className="p-4 sm:p-6">
        <div className="flex items-start justify-between">
          <div className={cn("p-2 rounded-lg border transition-colors", bgColor)}>
            <Icon className={cn("h-5 w-5", color)} />
          </div>
          {alert && alertCount && alertCount > 0 && (
            <div className="flex items-center gap-1 text-red-400 bg-red-500/10 px-2 py-1 rounded-full border border-red-500/20">
              <AlertTriangle className="h-3 w-3" />
              <span className="text-xs font-medium">{alertCount}</span>
            </div>
          )}
        </div>
        
        <div className="mt-4">
          <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">{title}</p>
          <p className={cn("text-2xl sm:text-3xl font-bold mt-1 tabular-nums tracking-tight", color)}>
            {value}
          </p>
          <p className="text-xs text-slate-500 mt-1 truncate">
            {subtitle}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
