'use client';

import { useState, useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { format, parseISO } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel as FormLabelText,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Calendar, Info, AlertCircle } from 'lucide-react';
import { 
  calculateRegulatoryDates, 
  recalculateCTExpiry,
  recalculateTachyExpiry,
  recalculateATPExpiry,
  requiresTachy,
  requiresATP,
  vehicleTypeConfig,
  type VehicleType,
} from '@/lib/vehicle/calculate-dates';

const formSchema = z.object({
  registration_number: z.string().min(1, "Immatriculation requise"),
  brand: z.string().min(1, "Marque requise"),
  model: z.string().min(1, "Modèle requis"),
  year: z.number().min(1990).max(new Date().getFullYear() + 1),
  type: z.enum(["VOITURE", "FOURGON", "POIDS_LOURD", "POIDS_LOURD_FRIGO"]),
  fuel_type: z.enum(["diesel", "gasoline", "electric", "hybrid", "lpg"]),
  color: z.string().min(1, "Couleur requise"),
  mileage: z.number().min(0),
  vin: z.string().optional(),
  status: z.enum(["active", "inactive", "maintenance", "retired"]).default("active"),
  
  // Échéances réglementaires
  technical_control_date: z.string().optional(),
  technical_control_expiry: z.string().optional(),
  tachy_control_date: z.string().optional(),
  tachy_control_expiry: z.string().optional(),
  atp_date: z.string().optional(),
  atp_expiry: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

interface VehicleFormProps {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

export function VehicleForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
}: VehicleFormProps) {
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>(defaultValues?.type || '');
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      registration_number: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      type: undefined,
      fuel_type: 'diesel',
      color: '',
      mileage: 0,
      vin: '',
      status: 'active',
      technical_control_date: '',
      technical_control_expiry: '',
      tachy_control_date: '',
      tachy_control_expiry: '',
      atp_date: '',
      atp_expiry: '',
      ...defaultValues,
    },
  });

  // Effet pour recalculer les dates quand le type ou la date CT change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name === 'type' && value.type) {
        setVehicleType(value.type as VehicleType);
        
        // Recalculer toutes les dates si on a une date CT
        const ctDate = form.getValues('technical_control_date');
        if (ctDate) {
          try {
            const dates = calculateRegulatoryDates(value.type as VehicleType, ctDate);
            form.setValue('technical_control_expiry', format(dates.technicalControlExpiry, 'yyyy-MM-dd'));
            if (dates.tachyControlExpiry) {
              form.setValue('tachy_control_date', format(dates.tachyControlDate!, 'yyyy-MM-dd'));
              form.setValue('tachy_control_expiry', format(dates.tachyControlExpiry, 'yyyy-MM-dd'));
            } else {
              form.setValue('tachy_control_date', '');
              form.setValue('tachy_control_expiry', '');
            }
            if (dates.atpExpiry) {
              form.setValue('atp_date', format(dates.atpDate!, 'yyyy-MM-dd'));
              form.setValue('atp_expiry', format(dates.atpExpiry, 'yyyy-MM-dd'));
            } else {
              form.setValue('atp_date', '');
              form.setValue('atp_expiry', '');
            }
          } catch (e) {
            console.warn('Erreur calcul dates:', e);
          }
        }
      }
      
      // Recalculer l'expiration CT quand la date CT change
      if (name === 'technical_control_date' && value.technical_control_date && vehicleType) {
        try {
          const expiry = recalculateCTExpiry(vehicleType, value.technical_control_date);
          form.setValue('technical_control_expiry', format(expiry, 'yyyy-MM-dd'));
        } catch (e) {
          console.warn('Erreur recalcul CT:', e);
        }
      }
      
      // Recalculer l'expiration tachy quand la date tachy change
      if (name === 'tachy_control_date' && value.tachy_control_date) {
        try {
          const expiry = recalculateTachyExpiry(value.tachy_control_date);
          form.setValue('tachy_control_expiry', format(expiry, 'yyyy-MM-dd'));
        } catch (e) {
          console.warn('Erreur recalcul tachy:', e);
        }
      }
      
      // Recalculer l'expiration ATP quand la date ATP change
      if (name === 'atp_date' && value.atp_date) {
        try {
          const expiry = recalculateATPExpiry(value.atp_date);
          form.setValue('atp_expiry', format(expiry, 'yyyy-MM-dd'));
        } catch (e) {
          console.warn('Erreur recalcul ATP:', e);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, vehicleType]);

  const typeConfig = vehicleType ? vehicleTypeConfig[vehicleType] : null;
  const showTachy = vehicleType && requiresTachy(vehicleType as VehicleType);
  const showATP = vehicleType && requiresATP(vehicleType as VehicleType);

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {/* Informations générales */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Informations générales</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Immatriculation */}
            <FormField
              control={form.control}
              name="registration_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Immatriculation *</FormLabelText>
                  <FormControl>
                    <Input {...field} placeholder="AB-123-CD" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Marque */}
            <FormField
              control={form.control}
              name="brand"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Marque *</FormLabelText>
                  <FormControl>
                    <Input {...field} placeholder="Renault" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Modèle */}
            <FormField
              control={form.control}
              name="model"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Modèle *</FormLabelText>
                  <FormControl>
                    <Input {...field} placeholder="Master" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Année */}
            <FormField
              control={form.control}
              name="year"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Année *</FormLabelText>
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

            {/* Type de véhicule - CRITIQUE pour les échéances */}
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Type de véhicule *</FormLabelText>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      setVehicleType(value as VehicleType);
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="VOITURE">🚗 Voiture</SelectItem>
                      <SelectItem value="FOURGON">🚐 Fourgon</SelectItem>
                      <SelectItem value="POIDS_LOURD">🚛 Poids Lourd</SelectItem>
                      <SelectItem value="POIDS_LOURD_FRIGO">🚛❄️ PL Frigorifique</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Détermine automatiquement les échéances réglementaires
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Carburant */}
            <FormField
              control={form.control}
              name="fuel_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Carburant *</FormLabelText>
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

            {/* Couleur */}
            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Couleur *</FormLabelText>
                  <FormControl>
                    <Input {...field} placeholder="Blanc" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Kilométrage */}
            <FormField
              control={form.control}
              name="mileage"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Kilométrage *</FormLabelText>
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

            {/* VIN */}
            <FormField
              control={form.control}
              name="vin"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>N° de série (VIN)</FormLabelText>
                  <FormControl>
                    <Input {...field} value={field.value || ''} placeholder="VF1R9800H12345678" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Statut */}
            <FormField
              control={form.control}
              name="status"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Statut</FormLabelText>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="active">Actif</SelectItem>
                      <SelectItem value="inactive">Inactif</SelectItem>
                      <SelectItem value="maintenance">En maintenance</SelectItem>
                      <SelectItem value="retired">Retiré</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Échéances réglementaires */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Échéances réglementaires
              {typeConfig && (
                <span className="text-sm font-normal text-muted-foreground">
                  ({typeConfig.emoji} {typeConfig.label})
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Info sur le type sélectionné */}
            {typeConfig && (
              <Alert className="bg-blue-50 border-blue-200">
                <Info className="h-4 w-4 text-blue-600" />
                <AlertTitle className="text-blue-800">
                  {typeConfig.emoji} {typeConfig.label}
                </AlertTitle>
                <AlertDescription className="text-blue-700">
                  <ul className="mt-2 space-y-1 text-sm">
                    <li>• Contrôle Technique : {typeConfig.ctPeriodicity}</li>
                    {typeConfig.requiresTachy && <li>• Tachygraphe : 2 ans</li>}
                    {typeConfig.requiresATP && <li>• ATP Frigorifique : 5 ans</li>}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Date du dernier CT */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <FormField
                control={form.control}
                name="technical_control_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelText>Date du dernier CT *</FormLabelText>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormDescription>
                      {typeConfig ? `Prochain CT calculé : +${typeConfig.ctPeriodicity}` : 'Sélectionnez d\'abord le type de véhicule'}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Expiration CT (calculée auto) */}
              <FormField
                control={form.control}
                name="technical_control_expiry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabelText>Prochain CT (calculé auto)</FormLabelText>
                    <FormControl>
                      <Input 
                        type="date" 
                        {...field} 
                        value={field.value || ''}
                        disabled
                        className="bg-green-50 text-green-700 font-medium"
                      />
                    </FormControl>
                    <FormDescription className="text-green-600">
                      Calculé automatiquement selon le type
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Section Tachygraphe (PL et PL Frigo uniquement) */}
            {showTachy && (
              <div className="border-l-4 border-blue-500 pl-4 space-y-4 pt-4">
                <h4 className="font-semibold text-blue-700 flex items-center gap-2">
                  📊 Tachygraphe (Poids Lourd)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="tachy_control_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabelText>Date dernier contrôle tachygraphe</FormLabelText>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="tachy_control_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabelText>Prochain contrôle tachy (calculé auto)</FormLabelText>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                            disabled
                            className="bg-blue-50 text-blue-700 font-medium"
                          />
                        </FormControl>
                        <FormDescription className="text-blue-600">
                          + 2 ans depuis la date de contrôle
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Section ATP (PL Frigo uniquement) */}
            {showATP && (
              <div className="border-l-4 border-cyan-500 pl-4 space-y-4 pt-4">
                <h4 className="font-semibold text-cyan-700 flex items-center gap-2">
                  ❄️ ATP - Attestation Transport de Produits (Frigorifique)
                </h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="atp_date"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabelText>Date de l'attestation ATP</FormLabelText>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="atp_expiry"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabelText>Expiration ATP (calculée auto)</FormLabelText>
                        <FormControl>
                          <Input 
                            type="date" 
                            {...field} 
                            value={field.value || ''}
                            disabled
                            className="bg-cyan-50 text-cyan-700 font-medium"
                          />
                        </FormControl>
                        <FormDescription className="text-cyan-600">
                          + 5 ans depuis la date d'attestation
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </div>
            )}

            {/* Message si aucun type sélectionné */}
            {!vehicleType && (
              <Alert variant="destructive" className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertTitle className="text-amber-800">Type de véhicule requis</AlertTitle>
                <AlertDescription className="text-amber-700">
                  Veuillez d'abord sélectionner le type de véhicule pour voir les échéances réglementaires applicables.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-4">
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
