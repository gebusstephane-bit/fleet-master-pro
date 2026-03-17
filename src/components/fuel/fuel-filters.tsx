'use client';

import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Slider } from '@/components/ui/slider';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Funnel, CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { fr } from 'date-fns/locale';
import { FuelFilters, FuelType, FUEL_TYPE_CONFIG } from '@/types/fuel';
import { cn } from '@/lib/utils';

interface FuelFiltersPanelProps {
  filters: FuelFilters;
  onFiltersChange: (filters: FuelFilters) => void;
  vehicles?: { id: string; registration_number: string; brand: string; model: string }[];
}

const PRESETS = [
  { label: 'Aujourd\'hui', days: 0 },
  { label: 'Cette semaine', days: 7 },
  { label: 'Ce mois', days: 30 },
  { label: 'Ce trimestre', days: 90 },
];

const FUEL_TYPES: FuelType[] = ['diesel', 'adblue', 'gnr', 'gasoline', 'electric', 'hybrid', 'lpg'];

export function FuelFiltersPanel({ filters, onFiltersChange, vehicles }: FuelFiltersPanelProps) {
  const [open, setOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<FuelFilters>(filters);

  const applyFilters = () => {
    onFiltersChange(localFilters);
    setOpen(false);
  };

  const resetFilters = () => {
    const empty: FuelFilters = {
      startDate: null,
      endDate: null,
      vehicleIds: [],
      fuelTypes: [],
      driverName: '',
      minConsumption: null,
      maxConsumption: null,
    };
    setLocalFilters(empty);
    onFiltersChange(empty);
  };

  const activeFiltersCount = [
    filters.startDate || filters.endDate ? 1 : 0,
    filters.vehicleIds?.length ? 1 : 0,
    filters.fuelTypes?.length ? 1 : 0,
    filters.driverName ? 1 : 0,
    filters.minConsumption !== null || filters.maxConsumption !== null ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    setLocalFilters({ ...localFilters, startDate: start, endDate: end });
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" className="relative">
          <Funnel className="mr-2 h-4 w-4" />
          Filtrer
          {activeFiltersCount > 0 && (
            <Badge variant="secondary" className="ml-2 h-5 min-w-5 px-1">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Filtres</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Période */}
          <div className="space-y-3">
            <Label>Période</Label>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <Button
                  key={preset.label}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset.days)}
                >
                  {preset.label}
                </Button>
              ))}
            </div>
            <div className="flex gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !localFilters.startDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.startDate ? (
                      format(localFilters.startDate, 'dd/MM/yyyy')
                    ) : (
                      <span>Du</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={localFilters.startDate || undefined}
                    onSelect={(date) =>
                      setLocalFilters({ ...localFilters, startDate: date || null })
                    }
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      'flex-1 justify-start text-left font-normal',
                      !localFilters.endDate && 'text-muted-foreground'
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {localFilters.endDate ? (
                      format(localFilters.endDate, 'dd/MM/yyyy')
                    ) : (
                      <span>Au</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={localFilters.endDate || undefined}
                    onSelect={(date) =>
                      setLocalFilters({ ...localFilters, endDate: date || null })
                    }
                    locale={fr}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          {/* Type de carburant */}
          <div className="space-y-3">
            <Label>Type de carburant</Label>
            <div className="grid grid-cols-2 gap-2">
              {FUEL_TYPES.map((type) => (
                <div key={type} className="flex items-center space-x-2">
                  <Checkbox
                    id={`fuel-${type}`}
                    checked={localFilters.fuelTypes?.includes(type)}
                    onCheckedChange={(checked) => {
                      const current = localFilters.fuelTypes || [];
                      setLocalFilters({
                        ...localFilters,
                        fuelTypes: checked
                          ? [...current, type]
                          : current.filter((t) => t !== type),
                      });
                    }}
                  />
                  <label
                    htmlFor={`fuel-${type}`}
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    {FUEL_TYPE_CONFIG[type].label}
                  </label>
                </div>
              ))}
            </div>
          </div>

          {/* Véhicules */}
          {vehicles && vehicles.length > 0 && (
            <div className="space-y-3">
              <Label>Véhicules</Label>
              <div className="max-h-40 overflow-y-auto space-y-2 border rounded-md p-2">
                {vehicles.map((vehicle) => (
                  <div key={vehicle.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`vehicle-${vehicle.id}`}
                      checked={localFilters.vehicleIds?.includes(vehicle.id)}
                      onCheckedChange={(checked) => {
                        const current = localFilters.vehicleIds || [];
                        setLocalFilters({
                          ...localFilters,
                          vehicleIds: checked
                            ? [...current, vehicle.id]
                            : current.filter((id) => id !== vehicle.id),
                        });
                      }}
                    />
                    <label
                      htmlFor={`vehicle-${vehicle.id}`}
                      className="text-sm font-medium leading-none"
                    >
                      {vehicle.registration_number} ({vehicle.brand} {vehicle.model})
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fourchette de consommation */}
          <div className="space-y-3">
            <Label>Consommation (L/100km)</Label>
            <div className="px-2">
              <Slider
                defaultValue={[
                  localFilters.minConsumption || 0,
                  localFilters.maxConsumption || 50,
                ]}
                max={50}
                step={1}
                onValueChange={(values) =>
                  setLocalFilters({
                    ...localFilters,
                    minConsumption: values[0],
                    maxConsumption: values[1],
                  })
                }
              />
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>{localFilters.minConsumption || 0} L/100km</span>
              <span>{localFilters.maxConsumption || 50} L/100km</span>
            </div>
          </div>
        </div>

        {/* Boutons d'action */}
        <div className="flex gap-2 pt-4 border-t">
          <Button variant="outline" onClick={resetFilters} className="flex-1">
            <X className="mr-2 h-4 w-4" />
            Réinitialiser
          </Button>
          <Button onClick={applyFilters} className="flex-1">
            Appliquer
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
