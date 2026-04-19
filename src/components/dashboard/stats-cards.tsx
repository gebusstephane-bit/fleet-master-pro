'use client';

/**
 * Composant StatsCards - Dashboard SaaS 2026
 * Affiche les cartes de statistiques du dashboard
 * Glassmorphism Design System
 */

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, 
  Users, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Wrench,
} from 'lucide-react';
import { DashboardStats } from '@/types';
import { cn } from '@/lib/utils';

interface StatsCardsProps {
  stats: DashboardStats;
}

export function StatsCards({ stats }: StatsCardsProps) {
  const cards = [
    {
      title: 'Véhicules',
      value: stats.totalVehicles,
      subtitle: `${stats.activeVehicles} actifs`,
      icon: Truck,
      href: '/vehicles',
      trend: null,
      trendValue: null,
      color: 'text-blue-400',
      bgColor: 'bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Chauffeurs',
      value: stats.totalDrivers,
      subtitle: `${stats.activeDrivers} en service`,
      icon: Users,
      href: '/drivers',
      trend: null,
      trendValue: null,
      color: 'text-emerald-400',
      bgColor: 'bg-emerald-500/10 border-emerald-500/20',
    },
    {
      title: 'Maintenances',
      value: stats.upcomingMaintenance || 0,
      subtitle: 'À venir ce mois',
      icon: Wrench,
      href: '/maintenance',
      trend: (stats.overdueMaintenance || 0) > 0 ? 'down' : null,
      trendValue: (stats.overdueMaintenance || 0) > 0 ? `${stats.overdueMaintenance} urgentes` : null,
      color: (stats.overdueMaintenance || 0) > 0 ? 'text-red-400' : 'text-amber-400',
      bgColor: (stats.overdueMaintenance || 0) > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-amber-500/10 border-amber-500/20',
    },
    {
      title: 'Alertes',
      value: stats.alertsCount || 0,
      subtitle: `${stats.criticalAlerts || 0} critiques`,
      icon: AlertTriangle,
      href: '/alerts',
      trend: (stats.criticalAlerts || 0) > 0 ? 'down' : null,
      trendValue: (stats.criticalAlerts || 0) > 0 ? 'Action requise' : null,
      color: (stats.criticalAlerts || 0) > 0 ? 'text-red-400' : 'text-slate-400',
      bgColor: (stats.criticalAlerts || 0) > 0 ? 'bg-red-500/10 border-red-500/20' : 'bg-slate-500/10 border-slate-500/20',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="hover:shadow-[0_0_30px_rgba(6,182,212,0.15)] hover:border-cyan-500/30 transition-all cursor-pointer bg-[#0f172a]/60 border-cyan-500/15 backdrop-blur-xl group h-full">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs font-medium text-slate-500 uppercase tracking-wider">
                {card.title}
              </CardTitle>
              <div className={cn("p-2 rounded-lg border", card.bgColor)}>
                <card.icon className={cn("h-4 w-4", card.color)} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white tabular-nums tracking-tight">{card.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-slate-500">{card.subtitle}</p>
                {card.trend && (
                  <span className={cn(
                    "text-xs flex items-center px-1.5 py-0.5 rounded-full border",
                    card.trend === 'up' 
                      ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' 
                      : 'text-red-400 bg-red-500/10 border-red-500/20'
                  )}>
                    {card.trend === 'up' ? (
                      <TrendingUp className="h-3 w-3 mr-0.5" />
                    ) : (
                      <TrendingDown className="h-3 w-3 mr-0.5" />
                    )}
                    {card.trendValue}
                  </span>
                )}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
