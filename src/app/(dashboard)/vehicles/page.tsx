'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, Search, Truck, MoreHorizontal, Edit, Trash2, AlertTriangle, Car } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useVehicles, useDeleteVehicle, Vehicle } from '@/hooks/use-vehicles';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { PaginatedDataTable, Column } from '@/components/ui/paginated-data-table';
import { EmptyState } from '@/components/ui/data-table';
import { StatsGridSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeletons';
import { ExportButton } from '@/components/export/export-button';
import { useSelection } from '@/hooks/use-selection';
import { DataTableBulkActions } from '@/components/ui/data-table-bulk-actions';

const typeLabels: Record<string, string> = {
  truck: 'Camion',
  van: 'Fourgon',
  car: 'Voiture',
  motorcycle: 'Moto',
  trailer: 'Remorque',
  VOITURE: 'Voiture',
  FOURGON: 'Fourgon',
  POIDS_LOURD: 'Poids Lourd',
  POIDS_LOURD_FRIGO: 'PL Frigorifique',
};

const statusConfig: Record<string, { color: string; label: string; bg: string }> = {
  active: { color: 'text-emerald-400', label: 'Actif', bg: 'bg-emerald-500/15' },
  ACTIF: { color: 'text-emerald-400', label: 'Actif', bg: 'bg-emerald-500/15' },
  inactive: { color: 'text-gray-400', label: 'Inactif', bg: 'bg-slate-500/15' },
  INACTIF: { color: 'text-gray-400', label: 'Inactif', bg: 'bg-slate-500/15' },
  maintenance: { color: 'text-amber-400', label: 'Maintenance', bg: 'bg-amber-500/15' },
  EN_MAINTENANCE: { color: 'text-amber-400', label: 'Maintenance', bg: 'bg-amber-500/15' },
  retired: { color: 'text-red-400', label: 'Hors service', bg: 'bg-red-500/15' },
  HORS_SERVICE: { color: 'text-red-400', label: 'Hors service', bg: 'bg-red-500/15' },
};

const statusFilters = [
  { value: 'ACTIF', label: 'Actif' },
  { value: 'EN_MAINTENANCE', label: 'Maintenance' },
  { value: 'INACTIF', label: 'Inactif' },
  { value: 'HORS_SERVICE', label: 'Hors service' },
];

const typeFilters = [
  { value: 'VOITURE', label: 'Voiture' },
  { value: 'FOURGON', label: 'Fourgon' },
  { value: 'POIDS_LOURD', label: 'Poids Lourd' },
  { value: 'POIDS_LOURD_FRIGO', label: 'PL Frigorifique' },
];

export default function VehiclesPage() {
  const router = useRouter();
  const { data: vehicles, isLoading, error } = useVehicles();
  const deleteMutation = useDeleteVehicle();
  const selection = useSelection(vehicles ?? [], 'id');

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | null>>({
    status: null,
    type: null,
  });

  // Filter vehicles based on search and filters
  const filteredVehicles = useMemo(() => {
    if (!vehicles) return [];

    return vehicles.filter((vehicle) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          vehicle.registration_number?.toLowerCase().includes(searchLower) ||
          vehicle.brand?.toLowerCase().includes(searchLower) ||
          vehicle.model?.toLowerCase().includes(searchLower) ||
          vehicle.vin?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (activeFilters.status && vehicle.status !== activeFilters.status) {
        return false;
      }

      // Type filter
      if (activeFilters.type && vehicle.type !== activeFilters.type) {
        return false;
      }

      return true;
    });
  }, [vehicles, searchQuery, activeFilters]);

  // Stats calculation
  const stats = {
    total: vehicles?.length || 0,
    active: vehicles?.filter((v: Vehicle) => v.status === 'active' || v.status === 'ACTIF').length || 0,
    maintenance: vehicles?.filter((v: Vehicle) => v.status === 'maintenance' || v.status === 'EN_MAINTENANCE').length || 0,
    inactive: vehicles?.filter((v: Vehicle) => ['inactive', 'INACTIF', 'retired', 'HORS_SERVICE'].includes(v.status)).length || 0,
  };

  // Bulk delete handler
  const handleBulkDelete = () => {
    selection.selectedIds.forEach((id) => {
      deleteMutation.mutate({ id } as any);
    });
    selection.clear();
  };

  // Table columns
  const columns: Column<Vehicle>[] = [
    {
      key: 'select',
      header: '',
      width: '44px',
      render: (vehicle) => (
        <input
          type="checkbox"
          checked={selection.isSelected(vehicle.id)}
          onChange={() => selection.toggle(vehicle.id)}
          onClick={(e) => e.stopPropagation()}
          className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-cyan-500 cursor-pointer"
        />
      ),
    },
    {
      key: 'registration_number',
      header: 'Immatriculation',
      width: '180px',
      render: (vehicle) => (
        <div>
          <p className="font-medium text-white">{vehicle.registration_number}</p>
          <p className="text-xs text-slate-500">{vehicle.vin || 'N/A'}</p>
        </div>
      ),
    },
    {
      key: 'brand',
      header: 'Véhicule',
      render: (vehicle) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-800 flex items-center justify-center">
            <Car className="h-5 w-5 text-slate-400" />
          </div>
          <div>
            <p className="font-medium text-white">{vehicle.brand} {vehicle.model}</p>
            <p className="text-xs text-slate-500">{vehicle.year} • {typeLabels[vehicle.type] || vehicle.type}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'mileage',
      header: 'Kilométrage',
      width: '140px',
      align: 'right',
      sortable: true,
      render: (vehicle) => (
        <span className="font-medium text-white font-mono">
          {vehicle.mileage?.toLocaleString('fr-FR')} km
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Statut',
      width: '140px',
      sortable: true,
      render: (vehicle) => (
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            statusConfig[vehicle.status]?.bg,
            statusConfig[vehicle.status]?.color
          )}
        >
          {statusConfig[vehicle.status]?.label || vehicle.status}
        </span>
      ),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      align: 'right',
      render: (vehicle) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#18181b] border-slate-700">
            <DropdownMenuItem
              onClick={() => router.push(`/vehicles/${vehicle.id}/edit`)}
              className="text-slate-300 focus:text-white focus:bg-slate-800"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
              onClick={() => deleteMutation.mutate({ id: vehicle.id } as any)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  // Afficher l'erreur de récursion
  const isRecursionError = error?.message?.includes('RLS_RECURSION') || error?.message?.includes('infinite recursion');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-10 w-40" />
        </div>
        <StatsGridSkeleton count={4} columns={4} />
        <TableSkeleton columns={5} rows={8} showToolbar />
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Véhicules</h1>
          <p className="text-slate-400 mt-1">Gérez votre parc automobile</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="vehicles" count={filteredVehicles.length} />
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-500">
            <Link href="/vehicles/new">
              <Plus className="h-4 w-4" />
              Ajouter un véhicule
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Erreur de récursion */}
      {isRecursionError && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Problème de sécurité détecté</AlertTitle>
          <AlertDescription className="text-slate-400">
            Les politiques de sécurité (RLS) créent une boucle infinie.
          </AlertDescription>
        </Alert>
      )}

      {/* Erreur générale */}
      {error && !isRecursionError && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Erreur</AlertTitle>
          <AlertDescription className="text-slate-400">{error.message}</AlertDescription>
        </Alert>
      )}

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
              <Truck className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total véhicules</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.total} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <div className="h-6 w-6 rounded-full bg-emerald-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Actifs</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.active} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-amber-500/20 text-amber-400">
              <div className="h-6 w-6 rounded-full bg-amber-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">En maintenance</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.maintenance} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-500/20 text-slate-400">
              <div className="h-6 w-6 rounded-full bg-slate-500" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Inactifs</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.inactive} />
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Toolbar with Search and Filters */}
      <DataTableToolbar
        searchPlaceholder="Rechercher un véhicule..."
        searchValue={searchQuery}
        onSearchChange={setSearchQuery}
        filters={[
          { key: 'status', label: 'Statut', options: statusFilters },
          { key: 'type', label: 'Type', options: typeFilters },
        ]}
        activeFilters={activeFilters}
        onFilterChange={(key, value) =>
          setActiveFilters((prev) => ({ ...prev, [key]: value }))
        }
        onClearFilters={() => setActiveFilters({ status: null, type: null })}
      />

      {/* Bulk Actions */}
      <DataTableBulkActions
        selectedCount={selection.selectedCount}
        onExport={() => {/* handled by ExportButton logic */}}
        onDelete={handleBulkDelete}
        onClear={selection.clear}
        isDeleting={deleteMutation.isPending}
      />

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <PaginatedDataTable
          columns={columns}
          data={filteredVehicles}
          keyExtractor={(v) => v.id}
          onRowClick={(vehicle) => router.push(`/vehicles/${vehicle.id}`)}
          pageSize={10}
          searchable
          searchKeys={['registration_number', 'brand', 'model', 'vin']}
          searchValue={searchQuery}
          emptyState={
            <EmptyState
              icon={<Truck className="h-8 w-8 text-slate-500" />}
              title={searchQuery || Object.values(activeFilters).some(Boolean) ? 'Aucun résultat' : 'Aucun véhicule'}
              description={
                searchQuery || Object.values(activeFilters).some(Boolean)
                  ? 'Modifiez vos critères de recherche ou filtres.'
                  : 'Commencez par ajouter votre premier véhicule à la flotte.'
              }
              action={
                !searchQuery && !Object.values(activeFilters).some(Boolean) ? (
                  <Button asChild className="bg-blue-600 hover:bg-blue-500">
                    <Link href="/vehicles/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un véhicule
                    </Link>
                  </Button>
                ) : (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearchQuery('');
                      setActiveFilters({ status: null, type: null });
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
