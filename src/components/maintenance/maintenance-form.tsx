'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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

const formSchema = z.object({
  type: z.enum(['routine', 'repair', 'inspection', 'tire_change', 'oil_change']),
  description: z.string().min(1, 'Description requise'),
  cost: z.number().min(0).optional(),
  mileage_at_service: z.number().min(0).optional(),
  performed_by: z.string().optional(),
  service_date: z.string(),
  next_service_date: z.string().optional(),
  next_service_mileage: z.number().min(0).optional(),
  status: z.enum(['scheduled', 'in_progress', 'completed', 'cancelled']),
});

type FormData = z.infer<typeof formSchema>;

interface MaintenanceFormProps {
  vehicleId: string;
  vehicleMileage: number;
  onSubmit: (data: FormData) => void;
  isSubmitting?: boolean;
}

const typeLabels: Record<string, string> = {
  routine: 'Entretien régulier',
  repair: 'Réparation',
  inspection: 'Inspection',
  tire_change: 'Changement pneus',
  oil_change: 'Vidange',
};

export function MaintenanceForm({
  vehicleId,
  vehicleMileage,
  onSubmit,
  isSubmitting = false,
}: MaintenanceFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      type: 'routine',
      description: '',
      cost: 0,
      mileage_at_service: vehicleMileage,
      performed_by: '',
      service_date: new Date().toISOString().split('T')[0],
      next_service_date: '',
      next_service_mileage: vehicleMileage + 15000,
      status: 'completed',
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="type"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.entries(typeLabels).map(([value, label]) => (
                      <SelectItem key={value} value={value}>{label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Statut</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    <SelectItem value="scheduled">Planifié</SelectItem>
                    <SelectItem value="in_progress">En cours</SelectItem>
                    <SelectItem value="completed">Terminé</SelectItem>
                    <SelectItem value="cancelled">Annulé</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea {...field} placeholder="Détails de l'intervention..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="cost"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Coût (€)</FormLabel>
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
            name="mileage_at_service"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Kilométrage</FormLabel>
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
        </div>

        <FormField
          control={form.control}
          name="performed_by"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Effectué par</FormLabel>
              <FormControl>
                <Input {...field} value={field.value || ''} placeholder="Garage, mécanicien..." />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="service_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Date d'intervention</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="next_service_date"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Prochaine date</FormLabel>
                <FormControl>
                  <Input type="date" {...field} value={field.value || ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="next_service_mileage"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Prochain kilométrage</FormLabel>
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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Enregistrer
        </Button>
      </form>
    </Form>
  );
}
