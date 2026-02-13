"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Plus, Search, Filter, Truck, MoreHorizontal, Edit, Trash2, AlertTriangle, Car } from "lucide-react";
import { Input } from "@/components/ui/input";
import { GlassCard, MetricCard } from "@/components/ui/glass-card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { useVehicles, useDeleteVehicle, Vehicle } from "@/hooks/use-vehicles";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

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

export default function VehiclesPage() {
  const router = useRouter();
  const { data: vehicles, isLoading, error } = useVehicles();
  const deleteMutation = useDeleteVehicle();

  const stats = {
    total: vehicles?.length || 0,
    active: vehicles?.filter((v: Vehicle) => v.status === 'active' || v.status === 'ACTIF').length || 0,
    maintenance: vehicles?.filter((v: Vehicle) => v.status === 'maintenance' || v.status === 'EN_MAINTENANCE').length || 0,
    inactive: vehicles?.filter((v: Vehicle) => ['inactive', 'INACTIF', 'retired', 'HORS_SERVICE'].includes(v.status)).length || 0,
  };

  // Afficher l'erreur de récursion
  const isRecursionError = error?.message?.includes('RLS_RECURSION') || error?.message?.includes('infinite recursion');

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <div className="h-8 w-48 bg-[#27272a] rounded animate-pulse" />
            <div className="h-4 w-32 bg-[#27272a] rounded animate-pulse mt-2" />
          </div>
          <div className="h-10 w-40 bg-[#27272a] rounded animate-pulse" />
        </div>
        <div className="grid gap-4 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#18181b] rounded-xl animate-pulse" />
          ))}
        </div>
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
          <p className="text-[#a1a1aa] mt-1">Gérez votre parc automobile</p>
        </div>
        <Button asChild className="gap-2 bg-blue-600 hover:bg-blue-500">
          <Link href="/vehicles/new">
            <Plus className="h-4 w-4" />
            Ajouter un véhicule
          </Link>
        </Button>
      </motion.div>

      {/* Erreur de récursion */}
      {isRecursionError && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Problème de sécurité détecté</AlertTitle>
          <AlertDescription className="text-[#a1a1aa]">
            Les politiques de sécurité (RLS) créent une boucle infinie.
          </AlertDescription>
        </Alert>
      )}

      {/* Erreur générale */}
      {error && !isRecursionError && (
        <Alert variant="destructive" className="bg-red-500/10 border-red-500/20">
          <AlertTriangle className="h-4 w-4 text-red-400" />
          <AlertTitle className="text-red-400">Erreur</AlertTitle>
          <AlertDescription className="text-[#a1a1aa]">{error.message}</AlertDescription>
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
              <p className="text-sm text-[#a1a1aa]">Total véhicules</p>
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
              <p className="text-sm text-[#a1a1aa]">Actifs</p>
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
              <p className="text-sm text-[#a1a1aa]">En maintenance</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.maintenance} />
              </p>
            </div>
          </div>
        </GlassCard>
        
        <GlassCard className="p-6">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-slate-500/20 text-gray-400">
              <div className="h-6 w-6 rounded-full bg-slate-500" />
            </div>
            <div>
              <p className="text-sm text-[#a1a1aa]">Inactifs</p>
              <p className="text-2xl font-bold text-white">
                <AnimatedNumber value={stats.inactive} />
              </p>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#71717a]" />
          <Input 
            placeholder="Rechercher un véhicule..." 
            className="pl-10 bg-[#18181b] border-white/[0.08] text-white placeholder:text-[#71717a]" 
          />
        </div>
        <Button variant="outline" className="gap-2 border-white/[0.08] text-[#a1a1aa] hover:bg-[#27272a] hover:text-white">
          <Filter className="h-4 w-4" />
          Filtrer
        </Button>
      </div>

      {/* Table */}
      <GlassCard className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-white/[0.08]">
                <th className="text-left py-4 px-6 text-sm font-medium text-[#a1a1aa]">Immatriculation</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#a1a1aa]">Véhicule</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#a1a1aa]">Kilométrage</th>
                <th className="text-left py-4 px-6 text-sm font-medium text-[#a1a1aa]">Statut</th>
                <th className="text-right py-4 px-6 text-sm font-medium text-[#a1a1aa]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {vehicles?.map((vehicle: Vehicle, index: number) => (
                <motion.tr 
                  key={vehicle.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors cursor-pointer"
                  onClick={() => router.push(`/vehicles/${vehicle.id}`)}
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-white">{vehicle.registration_number}</p>
                      <p className="text-xs text-[#71717a]">{vehicle.vin || 'N/A'}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 rounded-lg bg-[#27272a] flex items-center justify-center">
                        <Car className="h-5 w-5 text-[#a1a1aa]" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{vehicle.brand} {vehicle.model}</p>
                        <p className="text-xs text-[#71717a]">{vehicle.year} • {typeLabels[vehicle.type] || vehicle.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-medium text-white">{vehicle.mileage?.toLocaleString('fr-FR')} km</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-medium",
                      statusConfig[vehicle.status]?.bg,
                      statusConfig[vehicle.status]?.color
                    )}>
                      {statusConfig[vehicle.status]?.label || vehicle.status}
                    </span>
                  </td>
                  <td className="py-4 px-6 text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-[#a1a1aa] hover:text-white hover:bg-[#27272a]">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="bg-[#18181b] border-white/[0.08]">
                        <DropdownMenuItem 
                          onClick={() => router.push(`/vehicles/${vehicle.id}/edit`)}
                          className="text-[#a1a1aa] focus:text-white focus:bg-[#27272a]"
                        >
                          <Edit className="h-4 w-4 mr-2" />
                          Modifier
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          className="text-red-400 focus:text-red-400 focus:bg-red-500/10"
                          onClick={() => deleteMutation.mutate({ id: vehicle.id, companyId: vehicle.company_id })}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Supprimer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {(!vehicles || vehicles.length === 0) && !isLoading && (
          <div className="p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-[#27272a] flex items-center justify-center mx-auto mb-4">
              <Truck className="h-8 w-8 text-[#71717a]" />
            </div>
            <h3 className="text-lg font-medium text-white mb-1">Aucun véhicule</h3>
            <p className="text-[#71717a] mb-4">Commencez par ajouter votre premier véhicule à la flotte.</p>
            <Button asChild className="bg-blue-600 hover:bg-blue-500">
              <Link href="/vehicles/new">
                <Plus className="h-4 w-4 mr-2" />
                Ajouter un véhicule
              </Link>
            </Button>
          </div>
        )}
      </GlassCard>
    </div>
  );
}
