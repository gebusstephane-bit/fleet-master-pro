/**
 * Composant StatsCards
 * Affiche les cartes de statistiques du dashboard
 */

'use client';

import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Truck, 
  Users, 
  Route, 
  AlertTriangle,
  TrendingUp,
  TrendingDown
} from 'lucide-react';
// @ts-ignore
import { DashboardStats } from '@/types';

interface StatsCardsProps {
  // @ts-ignore
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
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
    },
    {
      title: 'Chauffeurs',
      value: stats.totalDrivers,
      subtitle: `${stats.activeDrivers} en service`,
      icon: Users,
      href: '/drivers',
      trend: null,
      trendValue: null,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
    },
    {
      title: 'Tournées aujourd\'hui',
      // @ts-ignore
      value: stats.todayRoutes || 0,
      subtitle: 'En cours et planifiées',
      icon: Route,
      href: '/routes',
      trend: 'up',
      trendValue: '+12%',
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
    },
    {
      title: 'Alertes',
      // @ts-ignore
      value: stats.alertsCount || 0,
      subtitle: `${stats.criticalAlerts || 0} critiques`,
      icon: AlertTriangle,
      href: '/alerts',
      trend: (stats.criticalAlerts || 0) > 0 ? 'down' : null,
      trendValue: (stats.criticalAlerts || 0) > 0 ? 'Action requise' : null,
      color: (stats.criticalAlerts || 0) > 0 ? 'text-red-600' : 'text-amber-600',
      bgColor: (stats.criticalAlerts || 0) > 0 ? 'bg-red-50' : 'bg-amber-50',
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((card) => (
        <Link key={card.title} href={card.href}>
          <Card className="hover:border-primary/50 transition-colors cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {card.title}
              </CardTitle>
              <div className={`p-2 rounded-lg ${card.bgColor}`}>
                <card.icon className={`h-4 w-4 ${card.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{card.value}</div>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-xs text-muted-foreground">{card.subtitle}</p>
                {card.trend && (
                  <span className={`text-xs flex items-center ${
                    card.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
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
