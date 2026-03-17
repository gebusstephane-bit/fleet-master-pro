'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useVehicles } from '@/hooks/use-vehicles';
import { useDrivers } from '@/hooks/use-drivers';

// Type du formulaire (défini manuellement car le schema est dynamique)
interface FormData {
  vehicle_id: string;
  driver_id?: string;
  date: string;
  quantity_liters: number;
  price_total: number;
  mileage_at_fill: number;
  fuel_type: 'diesel' | 'gasoline' | 'electric' | 'hybrid' | 'lpg';
  station_name?: string;
}

const createFormSchema = (vehicles: any[]) => z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().optional(),
  date: z.string(),
  quantity_liters: z.number().min(0.1, 'Quantité requise'),
  price_total: z.number().min(0.1, 'Prix requis'),
  mileage_at_fill: z.number().min(0, 'Kilométrage requis'),
  fuel_type: z.enum(['diesel', 'gasoline', 'electric', 'hybrid', 'lpg']),
  station_name: z.string().optional(),
}).refine((data) => {
  // Validation: le kilométrage doit être >= au kilométrage actuel du véhicule
  const selectedVehicle = vehicles.find(v => v.id === data.vehicle_id);
  if (selectedVehicle?.mileage && data.mileage_at_fill < selectedVehicle.mileage) {
    return false;
  }
  return true;
}, {
  message: 'Le kilométrage ne peut pas être inférieur au kilométrage actuel du véhicule',
  path: ['mileage_at_fill'],
});

interface FuelFormProps {
  onSubmit: (data: FormData) => void;
  isSubmitting?: boolean;
}

export function FuelForm({ onSubmit, isSubmitting = false }: FuelFormProps) {
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  
  // Schema dynamique avec validation du kilométrage
  const formSchema = useMemo(() => createFormSchema(vehicles || []), [vehicles]);
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      vehicle_id: '',
      driver_id: 'none',
      date: new Date().toISOString().split('T')[0],
      quantity_liters: 0,
      price_total: 0,
      mileage_at_fill: 0,
      fuel_type: 'diesel',
      station_name: '',
    },
  });
  
  // Récupérer le véhicule sélectionné pour afficher son kilométrage
  const selectedVehicleId = form.watch('vehicle_id');
  const selectedVehicle = useMemo(() => {
    return vehicles?.find((v: any) => v.id === selectedVehicleId);
  }, [vehicles, selectedVehicleId]);

  // Pré-remplir le conducteur attitré quand le véhicule est sélectionné
  useEffect(() => {
    const assignedDriverId = (selectedVehicle as any)?.drivers?.id;
    if (assignedDriverId && form.getValues('driver_id') === 'none') {
      form.setValue('driver_id', assignedDriverId);
    }
  }, [selectedVehicleId]); // eslint-disable-line react-hooks/exhaustive-deps

  const quantity = form.watch('quantity_liters');
  const price = form.watch('price_total');
  const pricePerLiter = quantity > 0 ? (price / quantity).toFixed(3) : '0.000';

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="vehicle_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Véhicule *</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un véhicule" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {vehicles?.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {v.registration_number} - {v.brand} {v.model}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="driver_id"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Chauffeur (optionnel)</FormLabel>
              <Select onValueChange={field.onChange} value={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un chauffeur" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="none">Aucun</SelectItem>
                  {((drivers as unknown) as any[])?.map((d: any) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.first_name} {d.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date *</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="fuel_type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Carburant *</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="diesel">Diesel</SelectItem>
                    <SelectItem value="gasoline">Essence</SelectItem>
                    <SelectItem value="electric">Électrique</SelectItem>
                    <SelectItem value="hybrid">Hybride</SelectItem>
                    <SelectItem value="lpg">GPL</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="quantity_liters"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Quantité (L) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="price_total"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prix total (€) *</FormLabel>
                <FormControl>
                  <Input
                    type="number"
                    step="0.01"
                    {...field}
                    onChange={(e) => field.onChange(Number(e.target.value))}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <div className="p-3 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            Prix au litre: <span className="font-medium">{pricePerLiter} €</span>
          </p>
        </div>

        <FormField
          control={form.control}
          name="mileage_at_fill"
          render={({ field }) => (
            <FormItem>
              <div className="flex items-center justify-between">
                <FormLabel>Kilométrage compteur *</FormLabel>
                {selectedVehicle && selectedVehicle.mileage > 0 && (
                  <span className="text-xs text-muted-foreground">
                    Actuel: <span className="text-amber-400 font-medium">{selectedVehicle.mileage.toLocaleString('fr-FR')} km</span>
                  </span>
                )}
              </div>
              <FormControl>
                <Input
                  type="number"
                  min={selectedVehicle?.mileage || 0}
                  placeholder={selectedVehicle?.mileage ? `Min: ${selectedVehicle.mileage.toLocaleString('fr-FR')} km` : 'Ex: 125000'}
                  aria-invalid={form.formState.errors.mileage_at_fill ? 'true' : 'false'}
                  {...field}
                  onChange={(e) => field.onChange(Number(e.target.value))}
                  className={form.formState.errors.mileage_at_fill ? 'border-red-500' : ''}
                />
              </FormControl>
              <FormMessage />
              {selectedVehicle && selectedVehicle.mileage > 0 && (
                <p className="text-xs text-muted-foreground">
                  Le kilométrage doit être supérieur ou égal à {selectedVehicle.mileage.toLocaleString('fr-FR')} km
                </p>
              )}
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="station_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Station service</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="Nom de la station..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer le plein
        </Button>
      </form>
    </Form>
  );
}
