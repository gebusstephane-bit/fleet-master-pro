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

const formSchema = z.object({
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  license_number: z.string().min(1, "N° permis requis"),
  license_expiry: z.string().min(1, "Date d'expiration requise"),
  license_type: z.string().default('B'),
  address: z.string().optional(),
  city: z.string().optional(),
  hire_date: z.string().optional(),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).default("active"),
  cqc_card_number: z.string().optional(),
  cqc_expiry_date: z.string().optional(),
  cqc_category: z.enum(["PASSENGER", "GOODS", "BOTH"]).optional(),
});

type FormData = z.infer<typeof formSchema>;

interface DriverFormProps {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function DriverForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
}: DriverFormProps) {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      first_name: '',
      last_name: '',
      email: '',
      phone: '',
      license_number: '',
      license_expiry: '',
      license_type: 'B',
      address: '',
      city: '',
      hire_date: '',
      status: 'active',
      cqc_card_number: '',
      cqc_expiry_date: '',
      cqc_category: 'GOODS',
      ...defaultValues,
    },
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations personnelles */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Informations personnelles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Prénom *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Jean" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nom *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Dupont" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Email *</FormLabel>
                  <FormControl>
                    <Input type="email" {...field} placeholder="jean.dupont@email.com" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="phone"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Téléphone *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="06 12 34 56 78" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Permis de conduire */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-slate-900">Permis de conduire</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="license_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° Permis *</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="123456789012" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_type"
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
                      <SelectItem value="B">B</SelectItem>
                      <SelectItem value="C">C</SelectItem>
                      <SelectItem value="C1">C1</SelectItem>
                      <SelectItem value="D">D</SelectItem>
                      <SelectItem value="D1">D1</SelectItem>
                      <SelectItem value="CE">CE</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="license_expiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'expiration *</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Carte CQC */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-slate-900">Carte Qualification Conducteur (CQC)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField
              control={form.control}
              name="cqc_card_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>N° CQC</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="123456789" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cqc_category"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catégorie</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value || 'GOODS'}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="PASSENGER">Voyageurs</SelectItem>
                      <SelectItem value="GOODS">Marchandises</SelectItem>
                      <SelectItem value="BOTH">Les deux</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="cqc_expiry_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'expiration CQC</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ''} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        {/* Adresse et embauche */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-slate-900">Informations complémentaires</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="address"
              render={({ field }) => (
                <FormItem className="md:col-span-2">
                  <FormLabel>Adresse</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="123 rue Example" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="city"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ville</FormLabel>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="Paris" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="hire_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date d'embauche</FormLabel>
                  <FormControl>
                    <Input type="date" {...field} value={field.value || ''} />
                  </FormControl>
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
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="on_leave">En congé</SelectItem>
                      <SelectItem value="terminated">Terminé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
        </div>

        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => history.back()}>
            Annuler
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>
      </form>
    </Form>
  );
}
