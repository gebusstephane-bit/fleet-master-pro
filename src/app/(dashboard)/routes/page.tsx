'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Route, Calendar, Clock, MapPin, MoreHorizontal, Play, CheckCircle2, XCircle } from 'lucide-react';
import { DataTable, StatusBadge } from '@/components/ui/data-table';
import { KpiCard } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { useRoutes, useDeleteRoute, useStartRoute } from '@/hooks/use-routes';
import { useVehicles } from '@/hooks/use-vehicles';
import { useDrivers } from '@/hooks/use-drivers';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';

const statusConfig = {
  PLANNED: { label: 'Planifiée', status: 'pending' as const, icon: Calendar },
  IN_PROGRESS: { label: 'En cours', status: 'warning' as const, icon: Play },
  COMPLETED: { label: 'Terminée', status: 'active' as const, icon: CheckCircle2 },
  CANCELLED: { label: 'Annulée', status: 'error' as const, icon: XCircle },
};

export default function RoutesPage() {
  const router = useRouter();
  const { data: routes, isLoading } = useRoutes();
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  const deleteMutation = useDeleteRoute();
  const startMutation = useStartRoute();

  const todayRoutes = routes?.filter((r: any) => 
    r.route_date && format(new Date(r.route_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const stats = {
    today: todayRoutes?.length || 0,
    inProgress: routes?.filter((r: any) => r.status === 'IN_PROGRESS').length || 0,
    completed: routes?.filter((r: any) => r.status === 'COMPLETED').length || 0,
    planned: routes?.filter((r: any) => r.status === 'PLANNED').length || 0,
  };

  const columns = [
    {
      key: 'date',
      header: 'Date',
      render: (route: any) => (
        <div>
          <p className="font-medium">
            {format(new Date(route.route_date), 'dd MMM yyyy', { locale: fr })}
          </p>
          <p className="text-xs text-slate-500">
            {format(new Date(route.route_date), 'EEEE', { locale: fr })}
          </p>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Tournée',
      render: (route: any) => (
        <Link 
          href={`/routes/${route.id}`}
          className="font-medium text-blue-600 hover:text-blue-800 hover:underline"
        >
          {route.name}
        </Link>
      ),
    },
    {
      key: 'stops',
      header: 'Arrêts',
      render: (route: any) => (
        <div className="flex items-center gap-1 text-slate-600">
          <MapPin className="h-4 w-4" />
          <span>{route.route_stops?.count || 0}</span>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Véhicule',
      render: (route: any) => (
        route.vehicles ? (
          <Link 
            href={`/vehicles/${route.vehicle_id}`}
            className="text-sm hover:underline"
          >
            {route.vehicles.registration_number}
          </Link>
        ) : (
          <span className="text-slate-400">-</span>
        )
      ),
    },
    {
      key: 'driver',
      header: 'Chauffeur',
      render: (route: any) => (
        route.drivers ? (
          <Link 
            href={`/drivers/${route.driver_id}`}
            className="text-sm hover:underline"
          >
            {route.drivers.first_name} {route.drivers.last_name}
          </Link>
        ) : (
          <span className="text-slate-400">-</span>
        )
      ),
    },
    {
      key: 'stats',
      header: 'Distance/Durée',
      render: (route: any) => (
        <div className="text-sm text-slate-600">
          {route.total_distance ? `${route.total_distance} km` : '-'}
          {route.estimated_duration && (
            <span className="text-slate-400 ml-2">
              ({Math.round(route.estimated_duration / 60)}h{route.estimated_duration % 60})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      render: (route: any) => {
        const config = statusConfig[route.status as keyof typeof statusConfig];
        return (
          <StatusBadge status={config.status}>
            {config.label}
          </StatusBadge>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (route: any) => (
        <div className="flex items-center gap-1">
          {route.status === 'PLANNED' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-green-600"
              onClick={() => startMutation.mutate(route.id)}
              title="Démarrer"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => router.push(`/routes/${route.id}`)}>
                Voir les détails
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => router.push(`/routes/${route.id}/edit`)}>
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem 
                className="text-red-600"
                onClick={() => deleteMutation.mutate(route.id)}
              >
                Supprimer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tournées"
        description="Planifiez et optimisez vos itinéraires de livraison"
        action={{
          label: 'Nouvelle tournée',
          href: '/routes/new',
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard
          title="Aujourd'hui"
          value={stats.today}
          icon={<Calendar className="h-5 w-5" />}
          iconBg="bg-blue-100 text-blue-600"
        />
        <KpiCard
          title="En cours"
          value={stats.inProgress}
          icon={<Play className="h-5 w-5" />}
          iconBg="bg-amber-100 text-amber-600"
        />
        <KpiCard
          title="Terminées"
          value={stats.completed}
          icon={<CheckCircle2 className="h-5 w-5" />}
          iconBg="bg-emerald-100 text-emerald-600"
        />
        <KpiCard
          title="Planifiées"
          value={stats.planned}
          icon={<Route className="h-5 w-5" />}
          iconBg="bg-purple-100 text-purple-600"
        />
      </div>

      {/* Liste */}
      <DataTable
        columns={columns}
        data={routes || []}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
      />
    </div>
  );
}
