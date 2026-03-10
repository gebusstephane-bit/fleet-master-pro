'use client';

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Fuel, Plus, Filter, MoreHorizontal } from 'lucide-react';
import { useFuelRecords, useFuelStats, useCreateFuelRecord, useFuelAnomalies, useDismissFuelAnomaly } from '@/hooks/use-fuel';
import { useVehicles } from '@/hooks/use-vehicles';
import { useUser } from '@/hooks/use-user';
import { FuelForm } from '@/components/fuel/fuel-form';
import { FuelStatsCards } from '@/components/fuel/fuel-stats-cards';
import { FuelFiltersPanel } from '@/components/fuel/fuel-filters';
import { FuelTable } from '@/components/fuel/fuel-table';
import { FuelMobileCards } from '@/components/fuel/fuel-mobile-cards';
import { FuelExportButtons } from '@/components/fuel/fuel-export-buttons';
import { FuelAnomaliesPanel } from '@/components/fuel/fuel-anomalies-panel';
import { FuelRecord, FuelFilters } from '@/types/fuel';
import { USER_ROLE } from '@/constants/enums';
import { toast } from 'sonner';

export default function FuelPage() {
  // Hooks de données
  const { data: recordsData, isLoading: isLoadingRecords } = useFuelRecords();
  const { data: statsData, isLoading: isLoadingStats } = useFuelStats();
  const { data: anomaliesData, isLoading: isLoadingAnomalies } = useFuelAnomalies();
  const dismissMutation = useDismissFuelAnomaly();
  const { data: vehiclesData } = useVehicles();
  const createMutation = useCreateFuelRecord();
  const { data: user } = useUser();

  // États locaux
  const [dialogOpen, setDialogOpen] = useState(false);
  const [filters, setFilters] = useState<FuelFilters>({
    startDate: null,
    endDate: null,
    vehicleIds: [],
    fuelTypes: [],
    driverName: '',
    minConsumption: null,
    maxConsumption: null,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  // Données filtrées
  const filteredRecords = useMemo(() => {
    const records = (recordsData as FuelRecord[]) || [];

    return records.filter((record) => {
      // Filtre date début
      if (filters.startDate) {
        const recordDate = new Date(record.date);
        if (recordDate < filters.startDate) return false;
      }

      // Filtre date fin
      if (filters.endDate) {
        const recordDate = new Date(record.date);
        if (recordDate > filters.endDate) return false;
      }

      // Filtre véhicules
      if (filters.vehicleIds?.length && !filters.vehicleIds.includes(record.vehicle_id)) {
        return false;
      }

      // Filtre type carburant
      if (filters.fuelTypes?.length && !filters.fuelTypes.includes(record.fuel_type)) {
        return false;
      }

      // Filtre conducteur
      if (filters.driverName) {
        const driverName = record.drivers
          ? `${record.drivers.first_name} ${record.drivers.last_name}`.toLowerCase()
          : 'anonyme';
        if (!driverName.includes(filters.driverName.toLowerCase())) return false;
      }

      // Filtre consommation min
      if (filters.minConsumption !== null && filters.minConsumption !== undefined) {
        const consumption = record.consumption_l_per_100km || 0;
        if (consumption < filters.minConsumption) return false;
      }

      // Filtre consommation max
      if (filters.maxConsumption !== null && filters.maxConsumption !== undefined) {
        const consumption = record.consumption_l_per_100km || 0;
        if (consumption > filters.maxConsumption) return false;
      }

      return true;
    });
  }, [recordsData, filters]);

  // Handlers
  const handleCreateFuel = async (data: any) => {
    try {
      await createMutation.mutateAsync(data);
      setDialogOpen(false);
      toast.success('Plein enregistré avec succès');
    } catch (error) {
      toast.error('Erreur lors de l\'enregistrement');
    }
  };

  const handleDelete = async (id: string) => {
    // TODO: Implémenter la suppression
    toast.info('Fonctionnalité de suppression à implémenter');
  };

  // Permissions
  const canCreate = user?.role === USER_ROLE.ADMIN || user?.role === USER_ROLE.AGENT_DE_PARC;
  const userRole = user?.role;

  // Véhicules pour filtres
  const vehicles = useMemo(() => {
    return (vehiclesData as any[])?.map((v) => ({
      id: v.id,
      registration_number: v.registration_number,
      brand: v.brand,
      model: v.model,
    }));
  }, [vehiclesData]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Carburant</h1>
          <p className="text-slate-400">Suivi des consommations et dépenses</p>
        </div>
        {canCreate && (
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-cyan-500 hover:bg-cyan-600">
                <Plus className="mr-2 h-4 w-4" />
                Nouveau plein
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md bg-slate-900 border-slate-800">
              <DialogHeader>
                <DialogTitle className="text-white">Enregistrer un plein</DialogTitle>
              </DialogHeader>
              <FuelForm
                onSubmit={handleCreateFuel}
                isSubmitting={createMutation.isPending}
              />
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Stats Cards */}
      <FuelStatsCards stats={statsData as any} isLoading={isLoadingStats} />

      {/* Anomalies récentes — affiché seulement si des anomalies existent */}
      {(isLoadingAnomalies || (anomaliesData as any[])?.length > 0) && (
        <FuelAnomaliesPanel
          anomalies={(anomaliesData as any[]) ?? []}
          isLoading={isLoadingAnomalies}
          onDismiss={(id) => dismissMutation.mutate(id)}
          isDismissing={dismissMutation.isPending}
        />
      )}

      {/* Historique Section */}
      <Card className="bg-slate-900/50 border-slate-800">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <CardTitle className="text-xl text-white flex items-center gap-2">
              <Fuel className="h-5 w-5 text-cyan-400" />
              Historique des pleins
            </CardTitle>

            {/* Toolbar - Desktop */}
            <div className="hidden sm:flex items-center gap-2">
              <FuelFiltersPanel
                filters={filters}
                onFiltersChange={setFilters}
                vehicles={vehicles}
              />
              <FuelExportButtons
                records={filteredRecords}
                selectedIds={selectedIds}
                filters={filters}
              />
            </div>

            {/* Toolbar - Mobile */}
            <div className="flex sm:hidden items-center gap-2">
              <Sheet open={mobileFiltersOpen} onOpenChange={setMobileFiltersOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Filter className="mr-2 h-4 w-4" />
                    Filtres
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="h-[80vh] bg-slate-900 border-slate-800">
                  <SheetHeader>
                    <SheetTitle className="text-white">Filtres</SheetTitle>
                  </SheetHeader>
                  <div className="py-4">
                    <FuelFiltersPanel
                      filters={filters}
                      onFiltersChange={(f) => {
                        setFilters(f);
                        setMobileFiltersOpen(false);
                      }}
                      vehicles={vehicles}
                    />
                  </div>
                </SheetContent>
              </Sheet>

              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="bg-slate-900 border-slate-800">
                  <div className="flex flex-col gap-2 py-4">
                    <FuelExportButtons
                      records={filteredRecords}
                      selectedIds={selectedIds}
                      filters={filters}
                    />
                  </div>
                </SheetContent>
              </Sheet>
            </div>
          </div>

          {/* Filtres actifs */}
          {(filters.startDate ||
            filters.endDate ||
            filters.vehicleIds?.length ||
            filters.fuelTypes?.length) && (
            <div className="flex flex-wrap gap-2 mt-3">
              {filters.startDate && (
                <Badge variant="secondary" className="bg-slate-800">
                  Du: {filters.startDate.toLocaleDateString('fr-FR')}
                </Badge>
              )}
              {filters.endDate && (
                <Badge variant="secondary" className="bg-slate-800">
                  Au: {filters.endDate.toLocaleDateString('fr-FR')}
                </Badge>
              )}
              {(filters.vehicleIds?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="bg-slate-800">
                  {filters.vehicleIds?.length ?? 0} véhicule(s)
                </Badge>
              )}
              {(filters.fuelTypes?.length ?? 0) > 0 && (
                <Badge variant="secondary" className="bg-slate-800">
                  {filters.fuelTypes?.length ?? 0} type(s) carburant
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs text-slate-400 hover:text-white"
                onClick={() =>
                  setFilters({
                    startDate: null,
                    endDate: null,
                    vehicleIds: [],
                    fuelTypes: [],
                    driverName: '',
                    minConsumption: null,
                    maxConsumption: null,
                  })
                }
              >
                Réinitialiser
              </Button>
            </div>
          )}

          {/* Sélection */}
          {selectedIds.length > 0 && (
            <div className="flex items-center gap-2 mt-3 text-sm text-slate-400">
              <span>{selectedIds.length} sélectionné(s)</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-xs"
                onClick={() => setSelectedIds([])}
              >
                Tout désélectionner
              </Button>
            </div>
          )}
        </CardHeader>

        <CardContent>
          {/* Table - Desktop */}
          <div className="hidden md:block">
            <FuelTable
              records={filteredRecords}
              isLoading={isLoadingRecords}
              onDelete={handleDelete}
              userRole={userRole}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>

          {/* Cards - Mobile */}
          <div className="md:hidden">
            <FuelMobileCards
              records={filteredRecords}
              isLoading={isLoadingRecords}
              onDelete={handleDelete}
              userRole={userRole}
              selectedIds={selectedIds}
              onSelectionChange={setSelectedIds}
            />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
