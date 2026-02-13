'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Plus, Search, MoreHorizontal, Edit, Trash2, Users, Phone, Mail, Calendar } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { DataTable, StatusBadge } from '@/components/ui/data-table';
import { KpiCard, KpiCardSkeleton } from '@/components/ui/kpi-card';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyState } from '@/components/ui/empty-state';
import { useDrivers, useDeleteDriver } from '@/hooks/use-drivers';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useRouter } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
const statusConfig: Record<string, 'active' | 'inactive' | 'warning' | 'error' | 'pending'> = {
  active: 'active',
  inactive: 'inactive',
  on_leave: 'warning',
  terminated: 'error',
};

const statusLabels: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
  terminated: 'Terminé',
};

export default function DriversPage() {
  const router = useRouter();
  const { data: drivers, isLoading } = useDrivers();
  const deleteMutation = useDeleteDriver();

  const stats = {
    total: drivers?.length || 0,
    active: drivers?.filter((d: any) => d.status === 'active').length || 0,
    onLeave: drivers?.filter((d: any) => d.status === 'on_leave').length || 0,
    avgScore: drivers?.length 
      ? Math.round(drivers.reduce((acc: number, d: any) => acc + (d.safety_score || 0), 0) / drivers.length)
      : 0,
  };

  const columns = [
    {
      key: 'name',
      header: 'Chauffeur',
      render: (driver: any) => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-semibold">
            {driver.first_name?.[0]}{driver.last_name?.[0]}
          </div>
          <div>
            <p className="font-medium text-white">{driver.first_name} {driver.last_name}</p>
            <p className="text-xs text-gray-400">Permis {driver.license_type || 'B'}</p>
          </div>
        </div>
      ),
    },
    {
      key: 'contact',
      header: 'Contact',
      render: (driver: any) => (
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Mail className="h-3.5 w-3.5 text-gray-400" />
            {driver.email}
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-300">
            <Phone className="h-3.5 w-3.5 text-gray-400" />
            {driver.phone}
          </div>
        </div>
      ),
    },
    {
      key: 'license',
      header: 'Permis',
      render: (driver: any) => {
        const expiry = driver.license_expiry ? new Date(driver.license_expiry) : null;
        const isExpiringSoon = expiry && expiry < new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
        
        return (
          <div>
            <p className="font-medium text-white">{driver.license_number}</p>
            {expiry && (
              <p className={cn(
                'text-xs flex items-center gap-1',
                isExpiringSoon ? 'text-red-600' : 'text-gray-400'
              )}>
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
      render: (driver: any) => (
        <StatusBadge status={statusConfig[driver.status] || 'inactive'}>
          {statusLabels[driver.status] || driver.status}
        </StatusBadge>
      ),
    },
    {
      key: 'vehicle',
      header: 'Véhicule',
      render: (driver: any) => (
        driver.vehicles ? (
          <Badge variant="outline" className="font-normal">
            {driver.vehicles.registration_number}
          </Badge>
        ) : (
          <span className="text-gray-400 text-sm">Non assigné</span>
        )
      ),
    },
    {
      key: 'actions',
      header: '',
      align: 'right' as const,
      render: (driver: any) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => router.push(`/drivers/${driver.id}/edit`)}>
              <Edit className="h-4 w-4 mr-2" />
              Modifier
            </DropdownMenuItem>
            <DropdownMenuItem 
              className="text-red-600"
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

  return (
    <div className="space-y-6">
      <PageHeader
        title="Chauffeurs"
        description="Gérez votre équipe de chauffeurs"
        action={{
          label: 'Ajouter un chauffeur',
          href: '/drivers/new',
          icon: <Plus className="h-4 w-4" />,
        }}
      />

      {/* Stats */}
      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <KpiCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard
            title="Total chauffeurs"
            value={stats.total}
            icon={<Users className="h-5 w-5" />}
            iconBg="bg-blue-100 text-blue-600"
          />
          <KpiCard
            title="Actifs"
            value={stats.active}
            icon={<div className="h-2 w-2 rounded-full bg-emerald-500" />}
            iconBg="bg-emerald-100 text-emerald-600"
          />
          <KpiCard
            title="En congé"
            value={stats.onLeave}
            icon={<div className="h-2 w-2 rounded-full bg-amber-500" />}
            iconBg="bg-amber-100 text-amber-600"
          />
          <KpiCard
            title="Score moyen"
            value={`${stats.avgScore}/100`}
            icon={<div className="h-2 w-2 rounded-full bg-purple-500" />}
            iconBg="bg-purple-100 text-purple-600"
          />
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            placeholder="Rechercher un chauffeur..." 
            className="pl-10 bg-gray-900" 
          />
        </div>
      </div>

      {/* Table */}
      <DataTable
        columns={columns}
        data={drivers || []}
        keyExtractor={(d) => d.id}
        isLoading={isLoading}
        onRowClick={(driver) => router.push(`/drivers/${driver.id}`)}
        emptyState={
          <EmptyState
            icon={Users}
            title="Aucun chauffeur"
            description="Commencez par ajouter votre premier chauffeur à l'équipe."
            action={{
              label: 'Ajouter un chauffeur',
              href: '/drivers/new',
            }}
          />
        }
      />
    </div>
  );
}

import { cn } from '@/lib/utils';
