'use client';

import { useState, useEffect, useMemo } from 'react';
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
import { Loader2, Calendar, Info, AlertCircle, Shield } from 'lucide-react';
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
import { 
  getVehicleTypesForActivity,
  getDbTypeFromDetailedType,
  requiresFieldForActivity,
  getVehicleTypeDescription,
  type VehicleTypeOption,
} from '@/lib/vehicle/vehicle-types-config';
import { useCompanyActivities } from '@/hooks/use-company-activities';
import { VEHICLE_STATUS } from '@/constants/enums';

const formSchema = z.object({
  registration_number: z.string().min(1, "Immatriculation requise"),
  brand: z.string().min(1, "Marque requise"),
  model: z.string().min(1, "Modèle requis"),
  year: z.number().min(1990).max(new Date().getFullYear() + 1),
  // Type détaillé (pour l'affichage dans le formulaire)
  detailed_type: z.string().min(1, "Type de véhicule requis"),
  // Type DB (pour la base de données) - calculé automatiquement
  type: z.enum(["VOITURE", "FOURGON", "POIDS_LOURD", "POIDS_LOURD_FRIGO", "TRACTEUR_ROUTIER", "REMORQUE", "REMORQUE_FRIGO"]),
  fuel_type: z.enum(["diesel", "gasoline", "electric", "hybrid", "lpg"]),
  color: z.string().min(1, "Couleur requise"),
  mileage: z.number().min(0),
  vin: z.string().optional(),
  status: z.enum(["ACTIF", "INACTIF", "EN_MAINTENANCE", "ARCHIVE"]).default("ACTIF"),
  
  // Assurance
  insurance_company: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  insurance_policy_number: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  insurance_expiry: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  // Échéances réglementaires — "" → null pour éviter l'erreur PostgreSQL 22007
  technical_control_date: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  technical_control_expiry: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  tachy_control_date: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  tachy_control_expiry: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  atp_date: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  atp_expiry: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  // Champs spécifiques par activité
  adr_certificate_date: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  adr_certificate_expiry: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  adr_equipment_check_date: z.string().optional().transform((v) => v === '' ? null : v ?? null),
  adr_equipment_expiry: z.string().optional().transform((v) => v === '' ? null : v ?? null),
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
  // Récupérer l'activité de l'entreprise pour adapter les types de véhicules
  const { data: companyActivities } = useCompanyActivities();
  const primaryActivity = useMemo(() => {
    return companyActivities?.find(a => a.is_primary)?.activity || null;
  }, [companyActivities]);
  
  // Liste des types de véhicules disponibles selon l'activité
  const availableVehicleTypes = useMemo(() => {
    return getVehicleTypesForActivity(primaryActivity);
  }, [primaryActivity]);
  
  const [vehicleType, setVehicleType] = useState<VehicleType | ''>(defaultValues?.type || '');
  const [detailedType, setDetailedType] = useState<string>(defaultValues?.detailed_type || '');
  
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
    defaultValues: {
      registration_number: '',
      brand: '',
      model: '',
      year: new Date().getFullYear(),
      detailed_type: '',
      type: undefined,
      fuel_type: 'diesel',
      color: '',
      mileage: 0,
      vin: '',
      status: VEHICLE_STATUS.ACTIF,
      insurance_company: '',
      insurance_policy_number: '',
      insurance_expiry: '',
      technical_control_date: '',
      technical_control_expiry: '',
      tachy_control_date: '',
      tachy_control_expiry: '',
      atp_date: '',
      atp_expiry: '',
      adr_certificate_date: '',
      adr_certificate_expiry: '',
      adr_equipment_check_date: '',
      adr_equipment_expiry: '',
      ...defaultValues,
    },
  });

  // Effet pour recalculer les dates quand le type ou la date CT change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      // Quand le detailed_type change, mettre à jour le type DB
      if (name === 'detailed_type' && value.detailed_type) {
        const dbType = getDbTypeFromDetailedType(value.detailed_type);
        setDetailedType(value.detailed_type);
        setVehicleType(dbType);
        form.setValue('type', dbType, { shouldValidate: false });
        
        // Recalculer toutes les dates si on a une date CT
        const ctDate = form.getValues('technical_control_date');
        if (ctDate) {
          try {
            const dates = calculateRegulatoryDates(dbType, ctDate);
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
      
      // Fallback: si le type change directement (compatibilité legacy)
      if (name === 'type' && value.type && !value.detailed_type) {
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
      
      // Recalculer l'expiration ADR quand la date ADR change (+1 an)
      if (name === 'adr_certificate_date' && value.adr_certificate_date) {
        try {
          const date = new Date(value.adr_certificate_date);
          const expiry = new Date(date.setFullYear(date.getFullYear() + 1));
          form.setValue('adr_certificate_expiry', format(expiry, 'yyyy-MM-dd'));
        } catch (e) {
          console.warn('Erreur recalcul ADR cert:', e);
        }
      }
      
      // Recalculer l'expiration équipement ADR quand la date change (+1 an)
      if (name === 'adr_equipment_check_date' && value.adr_equipment_check_date) {
        try {
          const date = new Date(value.adr_equipment_check_date);
          const expiry = new Date(date.setFullYear(date.getFullYear() + 1));
          form.setValue('adr_equipment_expiry', format(expiry, 'yyyy-MM-dd'));
        } catch (e) {
          console.warn('Erreur recalcul ADR équipement:', e);
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form, vehicleType]);

  const typeConfig = vehicleType ? vehicleTypeConfig[vehicleType] : null;
  const showTachy = vehicleType && requiresTachy(vehicleType as VehicleType);
  const showATP = vehicleType && requiresATP(vehicleType as VehicleType);
  
  // Affichage des champs spécifiques selon l'activité de l'entreprise
  const showADRCert = requiresFieldForActivity('ADR_CERT', primaryActivity);
  const showADREquipment = requiresFieldForActivity('ADR_EQUIPEMENT', primaryActivity);

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

            {/* Type de véhicule détaillé - basé sur l'activité de l'entreprise */}
            <FormField
              control={form.control}
              name="detailed_type"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Type de véhicule *</FormLabelText>
                  <Select 
                    onValueChange={(value) => {
                      field.onChange(value);
                      const dbType = getDbTypeFromDetailedType(value);
                      setDetailedType(value);
                      setVehicleType(dbType);
                      // Mettre à jour aussi le type DB pour la compatibilité
                      form.setValue('type', dbType, { shouldValidate: false });
                    }} 
                    value={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sélectionnez le type de véhicule" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent className="max-h-[400px]">
                      {availableVehicleTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          <div className="flex flex-col">
                            <span>{type.label}</span>
                            {type.description && (
                              <span className="text-xs text-slate-400">{type.description}</span>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    {primaryActivity 
                      ? `Types adaptés à votre activité: ${primaryActivity.replace(/_/g, ' ')}`
                      : 'Détermine automatiquement les échéances réglementaires'}
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            {/* Champ caché pour le type DB (legacy compatibility) */}
            <input type="hidden" {...form.register('type')} />

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
                      <SelectItem value="ACTIF">Actif</SelectItem>
                      <SelectItem value="INACTIF">Inactif</SelectItem>
                      <SelectItem value="EN_MAINTENANCE">En maintenance</SelectItem>
                      <SelectItem value="ARCHIVE">Archivé</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Assurance */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Shield className="h-5 w-5 text-cyan-600" />
              Assurance
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Compagnie */}
            <FormField
              control={form.control}
              name="insurance_company"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Compagnie d&apos;assurance</FormLabelText>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Axa, Allianz, Groupama…"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* N° de police */}
            <FormField
              control={form.control}
              name="insurance_policy_number"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>N° de police</FormLabelText>
                  <FormControl>
                    <Input
                      {...field}
                      value={field.value ?? ''}
                      placeholder="Ex : POL-2024-00123"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Date d'expiration */}
            <FormField
              control={form.control}
              name="insurance_expiry"
              render={({ field }) => (
                <FormItem>
                  <FormLabelText>Date d&apos;expiration</FormLabelText>
                  <FormControl>
                    <Input
                      type="date"
                      {...field}
                      value={field.value ?? ''}
                    />
                  </FormControl>
                  <FormDescription>
                    Apparaît dans les alertes conformité
                  </FormDescription>
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

            {/* Section ADR (activité ADR uniquement) */}
            {(showADRCert || showADREquipment) && (
              <div className="border-l-4 border-orange-500 pl-4 space-y-4 pt-4">
                <h4 className="font-semibold text-orange-700 flex items-center gap-2">
                  ⚠️ ADR - Matières Dangereuses
                </h4>
                
                {showADRCert && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="adr_certificate_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabelText>Date dernier agrément ADR</FormLabelText>
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
                      name="adr_certificate_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabelText>Expiration agrément ADR</FormLabelText>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''}
                              className="bg-orange-50 text-orange-700 font-medium"
                            />
                          </FormControl>
                          <FormDescription className="text-orange-600">
                            + 1 an depuis la date d'agrément
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}

                {showADREquipment && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <FormField
                      control={form.control}
                      name="adr_equipment_check_date"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabelText>Date dernier contrôle équipement ADR</FormLabelText>
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
                      name="adr_equipment_expiry"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabelText>Expiration contrôle équipement</FormLabelText>
                          <FormControl>
                            <Input 
                              type="date" 
                              {...field} 
                              value={field.value || ''}
                              className="bg-orange-50 text-orange-700 font-medium"
                            />
                          </FormControl>
                          <FormDescription className="text-orange-600">
                            + 1 an depuis le contrôle
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                )}
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
