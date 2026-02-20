'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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

const formSchema = z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().optional(),
  date: z.string(),
  quantity_liters: z.number().min(0.1, 'Quantité requise'),
  price_total: z.number().min(0.1, 'Prix requis'),
  mileage_at_fill: z.number().min(0, 'Kilométrage requis'),
  fuel_type: z.enum(['diesel', 'gasoline', 'electric', 'hybrid', 'lpg']),
  station_name: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface FuelFormProps {
  onSubmit: (data: FormData) => void;
  isSubmitting?: boolean;
}

export function FuelForm({ onSubmit, isSubmitting = false }: FuelFormProps) {
  const { data: vehicles } = useVehicles();
  const { data: drivers } = useDrivers();
  
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
              <FormLabel>Kilométrage compteur *</FormLabel>
              <FormControl>
                <Input
                  type="number"
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
