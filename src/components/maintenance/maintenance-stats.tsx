'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useMaintenanceStats } from '@/hooks/use-maintenance';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Wrench, Euro, TrendingUp, PieChart, 
  AlertCircle, CheckCircle2, Clock 
} from 'lucide-react';
import { maintenanceTypeConfig } from '@/lib/schemas/maintenance';
import { Progress } from '@/components/ui/progress';

export function MaintenanceStats() {
  const { data: stats, isLoading } = useMaintenanceStats();

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  const totalCost = (stats as any)?.totalCost || 0;
  const count = (stats as any)?.count || 0;
  const byType = (stats as any)?.byType || {};

  // Trier les types par coût
  const sortedTypes = Object.entries(byType as Record<string, { cost: number; count: number }>)
    .sort((a, b) => b[1].cost - a[1].cost)
    .slice(0, 5);

  return (
    <div className="space-y-6">
      {/* KPIs principaux */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard
          title="Coût total (année)"
          value={`${totalCost.toLocaleString('fr-FR')} €`}
          icon={Euro}
          color="blue"
        />
        <StatCard
          title="Interventions"
          value={count.toString()}
          icon={Wrench}
          color="emerald"
        />
        <StatCard
          title="Coût moyen"
          value={count > 0 ? `${Math.round(totalCost / count)} €` : '-'}
          icon={TrendingUp}
          color="purple"
        />
        <StatCard
          title="Types d'intervention"
          value={Object.keys(byType).length.toString()}
          icon={PieChart}
          color="amber"
        />
      </div>

      {/* Répartition par type */}
      {sortedTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Répartition des coûts par type
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {sortedTypes.map(([type, data]) => {
                const config = maintenanceTypeConfig[type as keyof typeof maintenanceTypeConfig];
                const percentage = totalCost > 0 ? (data.cost / totalCost) * 100 : 0;
                
                return (
                  <div key={type} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{config?.label || type}</span>
                        <span className="text-sm text-muted-foreground">
                          ({data.count} intervention{data.count > 1 ? 's' : ''})
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-bold">{data.cost.toLocaleString('fr-FR')} €</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({percentage.toFixed(1)}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ 
  title, 
  value, 
  icon: Icon, 
  color 
}: { 
  title: string; 
  value: string; 
  icon: any; 
  color: 'blue' | 'emerald' | 'purple' | 'amber';
}) {
  const colors = {
    blue: 'bg-blue-50 text-blue-600',
    emerald: 'bg-emerald-50 text-emerald-600',
    purple: 'bg-purple-50 text-purple-600',
    amber: 'bg-amber-50 text-amber-600',
  };

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold mt-2">{value}</p>
          </div>
          <div className={`p-3 rounded-lg ${colors[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
