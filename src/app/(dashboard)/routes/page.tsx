'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Route, Calendar, MapPin, MoreHorizontal, Play, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { PaginatedDataTable, Column } from '@/components/ui/paginated-data-table';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { useRoutes, useDeleteRoute, useStartRoute } from '@/hooks/use-routes';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { EmptyState } from '@/components/ui/data-table';
import { StatsGridSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeletons';
import { SearchInput } from '@/components/ui/search-input';

interface Route {
  id: string;
  name: string;
  route_date: string;
  status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  vehicle_id: string;
  driver_id: string;
  total_distance: number | null;
  estimated_duration: number | null;
  vehicles?: {
    registration_number: string;
  };
  drivers?: {
    first_name: string;
    last_name: string;
  };
  route_stops?: {
    count: number;
  };
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PLANNED: { label: 'Planifiée', color: 'text-blue-400', bg: 'bg-blue-500/15', icon: Calendar },
  IN_PROGRESS: { label: 'En cours', color: 'text-amber-400', bg: 'bg-amber-500/15', icon: Play },
  COMPLETED: { label: 'Terminée', color: 'text-emerald-400', bg: 'bg-emerald-500/15', icon: CheckCircle2 },
  CANCELLED: { label: 'Annulée', color: 'text-red-400', bg: 'bg-red-500/15', icon: XCircle },
};

const statusFilters = [
  { value: 'PLANNED', label: 'Planifiée' },
  { value: 'IN_PROGRESS', label: 'En cours' },
  { value: 'COMPLETED', label: 'Terminée' },
  { value: 'CANCELLED', label: 'Annulée' },
];

export default function RoutesPage() {
  const router = useRouter();
  const { data: routes, isLoading } = useRoutes();
  const deleteMutation = useDeleteRoute();
  const startMutation = useStartRoute();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | null>>({
    status: null,
  });

  // Filter routes based on search and filters
  const filteredRoutes = useMemo(() => {
    if (!routes) return [];

    return ((routes as unknown) as any[]).filter((route: Route) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          route.name?.toLowerCase().includes(searchLower) ||
          route.vehicles?.registration_number?.toLowerCase().includes(searchLower) ||
          route.drivers?.first_name?.toLowerCase().includes(searchLower) ||
          route.drivers?.last_name?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (activeFilters.status && route.status !== activeFilters.status) {
        return false;
      }

      return true;
    });
  }, [routes, searchQuery, activeFilters]);

  const todayRoutes = ((routes as unknown) as any[])?.filter(
    (r: Route) =>
      r.route_date && format(new Date(r.route_date), 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
  );

  const stats = {
    today: todayRoutes?.length || 0,
    inProgress: ((routes as unknown) as any[])?.filter((r: Route) => r.status === 'IN_PROGRESS').length || 0,
    completed: ((routes as unknown) as any[])?.filter((r: Route) => r.status === 'COMPLETED').length || 0,
    planned: ((routes as unknown) as any[])?.filter((r: Route) => r.status === 'PLANNED').length || 0,
  };

  const columns: Column<Route>[] = [
    {
      key: 'date',
      header: 'Date',
      width: '120px',
      render: (route) => (
        <div>
          <p className="font-medium text-white">
            {format(new Date(route.route_date), 'dd MMM yyyy', { locale: fr })}
          </p>
          <p className="text-xs text-slate-500 capitalize">
            {format(new Date(route.route_date), 'EEEE', { locale: fr })}
          </p>
        </div>
      ),
    },
    {
      key: 'name',
      header: 'Tournée',
      render: (route) => (
        <Link
          href={`/routes/${route.id}`}
          className="font-medium text-blue-400 hover:text-blue-300 hover:underline"
        >
          {route.name}
        </Link>
      ),
    },
    {
      key: 'stops',
      header: 'Arrêts',
      width: '80px',
      align: 'center',
      render: (route) => (
        <div className="flex items-center justify-center gap-1 text-slate-400">
          <MapPin className="h-4 w-4" />
          <span className="font-mono">{route.route_stops?.count || 0}</span>
        </div>
      ),
    },
    {
      key: 'vehicle',
      header: 'Véhicule',
      width: '120px',
      render: (route) =>
        route.vehicles ? (
          <Link
            href={`/vehicles/${route.vehicle_id}`}
            className="text-sm text-slate-300 hover:text-white hover:underline"
          >
            {route.vehicles.registration_number}
          </Link>
        ) : (
          <span className="text-slate-500">-</span>
        ),
    },
    {
      key: 'driver',
      header: 'Chauffeur',
      width: '140px',
      render: (route) =>
        route.drivers ? (
          <Link
            href={`/drivers/${route.driver_id}`}
            className="text-sm text-slate-300 hover:text-white hover:underline"
          >
            {route.drivers.first_name} {route.drivers.last_name}
          </Link>
        ) : (
          <span className="text-slate-500">-</span>
        ),
    },
    {
      key: 'stats',
      header: 'Distance/Durée',
      width: '140px',
      render: (route) => (
        <div className="text-sm text-slate-400">
          {route.total_distance ? (
            <span className="font-mono text-slate-300">{route.total_distance} km</span>
          ) : (
            '-'
          )}
          {route.estimated_duration && (
            <span className="text-slate-500 ml-2">
              ({Math.round(route.estimated_duration / 60)}h{route.estimated_duration % 60})
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      sortable: true,
      render: (route) => {
        const config = statusConfig[route.status];
        const Icon = config.icon;
        return (
          <span
            className={cn(
              'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium',
              config.bg,
              config.color
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {config.label}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: '',
      width: '80px',
      align: 'right',
      render: (route) => (
        <div className="flex items-center justify-end gap-1">
          {route.status === 'PLANNED' && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10"
              onClick={() => startMutation.mutate(route.id)}
              title="Démarrer"
            >
              <Play className="h-4 w-4" />
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="bg-[#18181b] border-slate-700">
              <DropdownMenuItem
                onClick={() => router.push(`/routes/${route.id}`)}
                className="text-slate-300 focus:text-white focus:bg-slate-800"
              >
                Voir les détails
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => router.push(`/routes/${route.id}/edit`)}
                className="text-slate-300 focus:text-white focus:bg-slate-800"
              >
                Modifier
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
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

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-40" />
            <Skeleton className="h-4 w-64 mt-2" />
          </div>
          <Skeleton className="h-10 w-36" />
        </div>
        <StatsGridSkeleton count={4} columns={4} />
        <TableSkeleton columns={8} rows={8} showToolbar />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight">Tournées</h1>
          <p className="text-slate-400 mt-1">Planifiez et optimisez vos itinéraires de livraison</p>
        </div>
        <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-500">
          <Link href="/routes/new">
            <Plus className="h-4 w-4" />
            Nouvelle tournée
          </Link>
        </Button>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Aujourd'hui</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.today} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
              <Play className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">En cours</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.inProgress} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Terminées</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.completed} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
              <Route className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Planifiées</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.planned} />
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Toolbar with Search and Filters */}
      <DataTableToolbar
        searchPlaceholder="Rechercher une tournée..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[{ key: 'status', label: 'Statut', options: statusFilters }]}
        activeFilters={activeFilters}
        onFilterChange={(key, value) => setActiveFilters((prev) => ({ ...prev, [key]: value }))}
        onClearFilters={() => setActiveFilters({ status: null })}
      />

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <PaginatedDataTable
          columns={columns}
          data={filteredRoutes as unknown as any[]}
          keyExtractor={(r) => r.id}
          onRowClick={(route) => router.push(`/routes/${route.id}`)}
          pageSize={10}
          searchable
          searchKeys={['name', 'vehicles.registration_number', 'drivers.first_name', 'drivers.last_name']}
          searchValue={searchQuery}
          emptyState={
            <EmptyState
              icon={<Route className="h-8 w-8 text-slate-500" />}
              title={searchQuery || activeFilters.status ? 'Aucun résultat' : 'Aucune tournée'}
              description={
                searchQuery || activeFilters.status
                  ? 'Modifiez vos critères de recherche ou filtres.'
                  : 'Commencez par créer votre première tournée.'
              }
              action={
                !searchQuery && !activeFilters.status ? (
                  <Button asChild className="bg-blue-600 hover:bg-blue-500">
                    <Link href="/routes/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Nouvelle tournée
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilters({ status: null });
                    }}
                  >
                    Réinitialiser les filtres
                  </Button>
                )
              }
            />
          }
        />
      </GlassCard>
    </div>
  );
}
