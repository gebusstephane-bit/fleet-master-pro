'use client';

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Plus, MoreHorizontal, Edit, Trash2, Users, Phone, Mail, Calendar, UserCheck, UserX, Award } from 'lucide-react';
import { GlassCard } from '@/components/ui/glass-card';
import { AnimatedNumber } from '@/components/ui/animated-number';
import { useDrivers, useDeleteDriver } from '@/hooks/use-drivers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SearchInput } from '@/components/ui/search-input';
import { FilterDropdown } from '@/components/ui/filter-dropdown';
import { DataTableToolbar } from '@/components/ui/data-table-toolbar';
import { PaginatedDataTable, Column } from '@/components/ui/paginated-data-table';
import { EmptyState } from '@/components/ui/data-table';
import { StatsGridSkeleton, TableSkeleton, Skeleton } from '@/components/ui/skeletons';
import { ExportButton } from '@/components/export/export-button';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  status: 'active' | 'inactive' | 'on_leave' | 'terminated';
  license_number: string;
  license_type: string;
  license_expiry: string | null;
  safety_score: number | null;
  vehicles?: {
    registration_number: string;
  };
}

const statusConfig: Record<string, { color: string; bg: string; label: string }> = {
  active: { color: 'text-emerald-400', bg: 'bg-emerald-500/15', label: 'Actif' },
  inactive: { color: 'text-gray-400', bg: 'bg-slate-500/15', label: 'Inactif' },
  on_leave: { color: 'text-amber-400', bg: 'bg-amber-500/15', label: 'En congé' },
  terminated: { color: 'text-red-400', bg: 'bg-red-500/15', label: 'Terminé' },
};

const statusFilters = [
  { value: 'active', label: 'Actif' },
  { value: 'inactive', label: 'Inactif' },
  { value: 'on_leave', label: 'En congé' },
  { value: 'terminated', label: 'Terminé' },
];

export default function DriversPage() {
  const router = useRouter();
  const { data: drivers, isLoading } = useDrivers() as { data: Driver[] | undefined; isLoading: boolean };
  const deleteMutation = useDeleteDriver();

  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilters, setActiveFilters] = useState<Record<string, string | null>>({
    status: null,
  });

  // Filter drivers based on search and filters
  const filteredDrivers = useMemo(() => {
    if (!drivers) return [];

    return (drivers as any[]).filter((driver: any) => {
      // Search filter
      if (searchQuery) {
        const searchLower = searchQuery.toLowerCase();
        const matchesSearch =
          driver.first_name?.toLowerCase().includes(searchLower) ||
          driver.last_name?.toLowerCase().includes(searchLower) ||
          driver.email?.toLowerCase().includes(searchLower) ||
          driver.license_number?.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      // Status filter
      if (activeFilters.status && driver.status !== activeFilters.status) {
        return false;
      }

      return true;
    });
  }, [drivers, searchQuery, activeFilters]);

  // Stats calculation
  const stats = {
    total: (drivers as any[])?.length || 0,
    active: (drivers as any[])?.filter((d: any) => d.status === 'active').length || 0,
    onLeave: (drivers as any[])?.filter((d: any) => d.status === 'on_leave').length || 0,
    avgScore: (drivers as any[])?.length
      ? Math.round((drivers as any[]).reduce((acc: number, d: any) => acc + (d.safety_score || 0), 0) / (drivers as any[]).length)
      : 0,
  };

  // Table columns
  const columns: Column<Driver>[] = [
    {
      key: 'name',
      header: 'Chauffeur',
      render: (driver) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            {driver.first_name?.[0]}
            {driver.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium text-white">
              {driver.first_name} {driver.last_name}
            </p>
            <p className="text-xs text-slate-500">Permis {driver.license_type || 'B'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (driver) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Mail className="h-3.5 w-3.5 text-slate-400" />
            {driver.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <Phone className="h-3.5 w-3.5 text-slate-400" />
            {driver.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'license',
      header: 'Permis',
      width: '160px',
      render: (driver) => {
        const expiry = driver.license_expiry ? new Date(driver.license_expiry) : null;
        const isExpiringSoon = expiry && expiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

        return (
          <div>
            <p className="font-medium text-white font-mono text-sm">{driver.license_number}</p>
            {expiry && (
              <p
                className={cn(
                  'text-xs flex items-center gap-1 mt-0.5',
                  isExpiringSoon ? 'text-red-400' : 'text-slate-500'
                )}
              >
                <Calendar className="h-3 w-3" />
                Expire {expiry.toLocaleDateString('fr-FR')}
              </p>
            )}
          </div>
        );
      },
    },
    {
      key: 'status',
      header: 'Statut',
      width: '120px',
      sortable: true,
      render: (driver) => (
        <span
          className={cn(
            'px-3 py-1 rounded-full text-xs font-medium',
            statusConfig[driver.status]?.bg,
            statusConfig[driver.status]?.color
          )}
        >
          {statusConfig[driver.status]?.label || driver.status}
        </span>
      ),
    },
    {
      key: 'vehicle',
      header: 'Véhicule',
      width: '140px',
      render: (driver) =>
        driver.vehicles ? (
          <Badge variant="outline" className="font-normal border-slate-700 text-slate-300">
            {driver.vehicles.registration_number}
          </Badge>
        ) : (
          <span className="text-slate-500 text-sm">Non assigné</span>
        ),
    },
    {
      key: 'actions',
      header: '',
      width: '60px',
      align: 'right',
      render: (driver) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="bg-[#18181b] border-slate-700">
            <DropdownMenuItem
              onClick={() => router.push(`/drivers/${driver.id}/edit`)}
              className="text-slate-300 focus:text-white focus:bg-slate-800"
            >
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
              onClick={() => deleteMutation.mutate(driver.id)}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Supprimer
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-32 mt-2" />
          </div>
          <Skeleton className="h-10 w-44" />
        </div>
        <StatsGridSkeleton count={4} columns={4} />
        <TableSkeleton columns={6} rows={8} showToolbar />
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
          <h1 className="text-3xl font-bold text-white tracking-tight">Chauffeurs</h1>
          <p className="text-slate-400 mt-1">Gérez votre équipe de chauffeurs</p>
        </div>
        <div className="flex items-center gap-2">
          <ExportButton type="drivers" count={filteredDrivers.length} />
          <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-500">
            <Link href="/drivers/new">
              <Plus className="h-4 w-4" />
              Ajouter un chauffeur
            </Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-blue-500/20 text-blue-400">
              <Users className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Total chauffeurs</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.total} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-500/20 text-emerald-400">
              <UserCheck className="h-6 w-6" />
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
              <UserX className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">En congé</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.onLeave} />
              </p>
            </div>
          </div>
        </GlassCard>

        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-purple-500/20 text-purple-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <p className="text-sm text-slate-400">Score moyen</p>
              <p className="text-2xl font-bold text-white font-mono">{stats.avgScore}/100</p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Toolbar with Search and Filters */}
      <DataTableToolbar
        searchPlaceholder="Rechercher un chauffeur..."
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
          data={filteredDrivers as any}
          keyExtractor={(d) => d.id}
          onRowClick={(driver) => router.push(`/drivers/${driver.id}`)}
          pageSize={10}
          searchable
          searchKeys={['first_name', 'last_name', 'email', 'license_number']}
          searchValue={searchQuery}
          emptyState={
            <EmptyState
              icon={<Users className="h-8 w-8 text-slate-500" />}
              title={searchQuery || activeFilters.status ? 'Aucun résultat' : 'Aucun chauffeur'}
              description={
                searchQuery || activeFilters.status
                  ? 'Modifiez vos critères de recherche ou filtres.'
                  : 'Commencez par ajouter votre premier chauffeur à l\'équipe.'
              }
              action={
                !searchQuery && !activeFilters.status ? (
                  <Button asChild className="bg-blue-600 hover:bg-blue-500">
                    <Link href="/drivers/new">
                      <Plus className="h-4 w-4 mr-2" />
                      Ajouter un chauffeur
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
