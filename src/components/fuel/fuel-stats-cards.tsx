'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingDown, TrendingUp, Fuel, Droplets, Euro, AlertTriangle } from 'lucide-react';
import { FuelStats } from '@/types/fuel';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

interface FuelStatsCardsProps {
  stats?: FuelStats;
  isLoading?: boolean;
}

export function FuelStatsCards({ stats, isLoading }: FuelStatsCardsProps) {
  if (isLoading || !stats) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-20" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const { 
    averageConsumption = null, 
    totalCost = 0, 
    totalRecords = 0, 
    vehicleStats = [], 
    monthOverMonthChange = { liters: 0, cost: 0, consumption: 0 } 
  } = stats || {};

  // S'assurer que les tableaux/objets existent
  const safeVehicleStats = vehicleStats || [];
  const safeMonthOverMonthChange = monthOverMonthChange || { liters: 0, cost: 0, consumption: 0 };

  // Trouver le véhicule le plus gourmand
  const highestConsumer = safeVehicleStats.length > 0
    ? safeVehicleStats.reduce((max, v) => (v.averageConsumption > max.averageConsumption ? v : max))
    : null;

  // Calculer la moyenne globale pour comparaison
  const globalAvgConsumption = safeVehicleStats.length > 0
    ? safeVehicleStats.reduce((sum, v) => sum + v.averageConsumption, 0) / safeVehicleStats.length
    : 0;

  const isHighConsumer = highestConsumer && globalAvgConsumption > 0
    ? highestConsumer.averageConsumption > globalAvgConsumption * 1.2
    : false;

  const statsCards = [
    {
      title: 'Consommation moyenne',
      value: averageConsumption ? `${averageConsumption.toFixed(1)} L/100km` : 'N/A',
      icon: Fuel,
      iconBg: 'bg-blue-500/20',
      iconColor: 'text-blue-400',
      trend: safeMonthOverMonthChange.consumption,
      trendLabel: 'vs mois dernier',
    },
    {
      title: 'Total dépensé ce mois',
      value: `${totalCost.toFixed(0)} €`,
      icon: Euro,
      iconBg: 'bg-emerald-500/20',
      iconColor: 'text-emerald-400',
      trend: safeMonthOverMonthChange.cost,
      trendLabel: 'vs mois dernier',
    },
    {
      title: 'Pleins enregistrés',
      value: totalRecords.toString(),
      icon: Droplets,
      iconBg: 'bg-cyan-500/20',
      iconColor: 'text-cyan-400',
      trend: safeMonthOverMonthChange.liters,
      trendLabel: 'vs mois dernier',
      trendPositive: safeMonthOverMonthChange.liters > 0,
    },
    {
      title: 'Véhicule le plus gourmand',
      value: highestConsumer ? highestConsumer.registration_number : 'N/A',
      subValue: highestConsumer ? `${highestConsumer.averageConsumption.toFixed(1)} L/100km` : undefined,
      icon: AlertTriangle,
      iconBg: isHighConsumer ? 'bg-red-500/20' : 'bg-amber-500/20',
      iconColor: isHighConsumer ? 'text-red-400' : 'text-amber-400',
      alert: isHighConsumer,
      vehicleInfo: highestConsumer ? `${highestConsumer.brand} ${highestConsumer.model}` : undefined,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {statsCards.map((card, index) => (
        <Card key={index} className={cn(card.alert && 'border-red-500/30')}>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {card.title}
            </CardTitle>
            <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', card.iconBg)}>
              <card.icon className={cn('h-5 w-5', card.iconColor)} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{card.value}</div>
            {card.subValue && (
              <div className={cn('text-sm font-medium', card.alert ? 'text-red-400' : 'text-amber-400')}>
                {card.subValue}
              </div>
            )}
            {card.vehicleInfo && (
              <div className="text-xs text-[#52525b] mt-1">{card.vehicleInfo}</div>
            )}
            {card.trend !== undefined && card.trend !== 0 && (
              <div className="flex items-center gap-1 mt-2">
                {card.trend > 0 ? (
                  <TrendingUp className="h-3 w-3 text-red-400" />
                ) : (
                  <TrendingDown className="h-3 w-3 text-green-400" />
                )}
                <span
                  className={cn(
                    'text-xs',
                    card.trend > 0 && card.title === 'Pleins enregistrés'
                      ? 'text-emerald-400'
                      : card.trend > 0
                      ? 'text-red-400'
                      : 'text-green-400'
                  )}
                >
                  {Math.abs(card.trend).toFixed(1)}%
                </span>
                <span className="text-xs text-[#52525b]">{card.trendLabel}</span>
              </div>
            )}
            {card.alert && (
              <div className="flex items-center gap-1 mt-2 text-xs text-red-400">
                <AlertTriangle className="h-3 w-3" />
                <span>+20% vs moyenne</span>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
