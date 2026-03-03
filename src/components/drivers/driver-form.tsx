'use client';

import { useState } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
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
import { ChevronDown, ChevronRight, Loader2 } from 'lucide-react';

// ─── Schéma local du formulaire ───────────────────────────────────────────────

const nullableDate = z.string().optional().nullable().transform((val) => val === '' ? null : val ?? null);

const formSchema = z.object({
  // Coordonnées
  first_name: z.string().min(1, "Prénom requis"),
  last_name: z.string().min(1, "Nom requis"),
  email: z.string().email("Email invalide"),
  phone: z.string().min(1, "Téléphone requis"),
  address: z.string().optional(),
  city: z.string().optional(),
  nationality: z.string().optional(),

  // Permis de conduire
  license_number: z.string().min(1, "N° permis requis"),
  license_expiry: z.string().min(1, "Date d'expiration requise"),
  license_type: z.string().default('B'),

  // CQC
  cqc_card_number: z.string().optional(),
  cqc_expiry: nullableDate,
  cqc_category: z.enum(["PASSENGER", "GOODS", "BOTH"]).optional(),

  // Documents réglementaires — Identité
  birth_date: nullableDate,
  social_security_number: z.string().optional(),

  // Carte conducteur numérique (tachographe)
  driver_card_number: z.string().optional(),
  driver_card_expiry: nullableDate,

  // Formations obligatoires
  fimo_date: nullableDate,
  fcos_expiry: nullableDate,
  qi_date: nullableDate,

  // Aptitude médicale
  medical_certificate_expiry: nullableDate,

  // ADR
  adr_certificate_expiry: nullableDate,
  adr_classes: z.array(z.string()).optional().default([]),

  // Contrat — status est l'unique champ actif/inactif
  hire_date: nullableDate,
  contract_type: z.enum(["CDI", "CDD", "Intérim", "Gérant", "Autre"]).optional(),
  status: z.enum(["active", "inactive", "on_leave", "terminated"]).default("active"),
});

type FormData = z.infer<typeof formSchema>;

// ─── Constantes ────────────────────────────────────────────────────────────────

const ADR_CLASSES = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

// ─── Badge validité ────────────────────────────────────────────────────────────

function ExpiryBadge({ dateStr }: { dateStr: string | null | undefined }) {
  if (!dateStr) return null;
  const daysLeft = Math.ceil(
    (new Date(dateStr).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  );
  if (daysLeft < 0)  return <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Expiré</span>;
  if (daysLeft < 30) return <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{daysLeft}j</span>;
  if (daysLeft < 60) return <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 font-medium">{daysLeft}j</span>;
  return <span className="ml-2 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">{daysLeft}j</span>;
}

// ─── Props ──────────────────────────────────────────────────────────────────────

interface DriverFormProps {
  defaultValues?: Partial<FormData>;
  onSubmit: (data: FormData) => void | Promise<void>;
  isSubmitting?: boolean;
  submitLabel?: string;
}

// ─── Composant principal ───────────────────────────────────────────────────────

export function DriverForm({
  defaultValues,
  onSubmit,
  isSubmitting = false,
  submitLabel = 'Enregistrer',
}: DriverFormProps) {
  const [docsOpen, setDocsOpen] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema) as Resolver<FormData>,
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
      nationality: '',
      cqc_card_number: '',
      cqc_expiry: null,
      cqc_category: 'GOODS',
      birth_date: null,
      social_security_number: '',
      driver_card_number: '',
      driver_card_expiry: null,
      fimo_date: null,
      fcos_expiry: null,
      qi_date: null,
      medical_certificate_expiry: null,
      adr_certificate_expiry: null,
      adr_classes: [],
      hire_date: null,
      contract_type: undefined,
      status: 'active',
      ...defaultValues,
    },
  });

  const watchedExpiries = form.watch([
    'license_expiry',        // [0]
    'driver_card_expiry',    // [1]
    'fcos_expiry',           // [2]
    'medical_certificate_expiry', // [3]
    'adr_certificate_expiry',     // [4]
    'cqc_expiry',            // [5]
  ]);

  const adrClasses = form.watch('adr_classes') ?? [];

  function toggleAdrClass(cls: string) {
    const current = form.getValues('adr_classes') ?? [];
    form.setValue(
      'adr_classes',
      current.includes(cls) ? current.filter((c) => c !== cls) : [...current, cls]
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

        {/* ── Coordonnées ── */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-slate-900">Informations personnelles</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField control={form.control} name="first_name" render={({ field }) => (
              <FormItem><FormLabel>Prénom *</FormLabel><FormControl><Input {...field} placeholder="Jean" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="last_name" render={({ field }) => (
              <FormItem><FormLabel>Nom *</FormLabel><FormControl><Input {...field} placeholder="Dupont" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="email" render={({ field }) => (
              <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} placeholder="jean.dupont@email.com" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="phone" render={({ field }) => (
              <FormItem><FormLabel>Téléphone *</FormLabel><FormControl><Input {...field} placeholder="06 12 34 56 78" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="address" render={({ field }) => (
              <FormItem className="md:col-span-2"><FormLabel>Adresse</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="123 rue Example" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="city" render={({ field }) => (
              <FormItem><FormLabel>Ville</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Paris" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="nationality" render={({ field }) => (
              <FormItem><FormLabel>Nationalité</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="Française" /></FormControl><FormMessage /></FormItem>
            )} />
          </div>
        </div>

        {/* ── Permis de conduire ── */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-slate-900">Permis de conduire</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="license_number" render={({ field }) => (
              <FormItem><FormLabel>N° Permis *</FormLabel><FormControl><Input {...field} placeholder="123456789012" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="license_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    {['B','C','C1','D','D1','CE'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="license_expiry" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">Date d'expiration *<ExpiryBadge dateStr={watchedExpiries[0]} /></FormLabel>
                <FormControl><Input type="date" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── Carte CQC ── */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-slate-900">Carte Qualification Conducteur (CQC)</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="cqc_card_number" render={({ field }) => (
              <FormItem><FormLabel>N° CQC</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="123456789" /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="cqc_category" render={({ field }) => (
              <FormItem>
                <FormLabel>Catégorie</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || 'GOODS'}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="PASSENGER">Voyageurs</SelectItem>
                    <SelectItem value="GOODS">Marchandises</SelectItem>
                    <SelectItem value="BOTH">Les deux</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="cqc_expiry" render={({ field }) => (
              <FormItem>
                <FormLabel className="flex items-center">Expiration CQC<ExpiryBadge dateStr={watchedExpiries[5]} /></FormLabel>
                <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── Contrat & statut ── */}
        <div className="space-y-4 pt-4 border-t">
          <h3 className="text-lg font-semibold text-slate-900">Contrat</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField control={form.control} name="hire_date" render={({ field }) => (
              <FormItem><FormLabel>Date d'embauche</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="contract_type" render={({ field }) => (
              <FormItem>
                <FormLabel>Type de contrat</FormLabel>
                <Select onValueChange={field.onChange} value={field.value || ''}>
                  <FormControl><SelectTrigger><SelectValue placeholder="Sélectionner..." /></SelectTrigger></FormControl>
                  <SelectContent>
                    {['CDI','CDD','Intérim','Gérant','Autre'].map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
            <FormField control={form.control} name="status" render={({ field }) => (
              <FormItem>
                <FormLabel>Statut</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl><SelectTrigger><SelectValue /></SelectTrigger></FormControl>
                  <SelectContent>
                    <SelectItem value="active">Actif</SelectItem>
                    <SelectItem value="inactive">Inactif</SelectItem>
                    <SelectItem value="on_leave">En congé</SelectItem>
                    <SelectItem value="terminated">Terminé</SelectItem>
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )} />
          </div>
        </div>

        {/* ── Documents réglementaires (collapsible) ── */}
        <div className="pt-4 border-t">
          <button
            type="button"
            onClick={() => setDocsOpen((v) => !v)}
            className="flex w-full items-center justify-between text-left"
          >
            <div>
              <h3 className="text-lg font-semibold text-slate-900">Documents réglementaires</h3>
              <p className="text-sm text-slate-500 mt-0.5">Carte conducteur, formations, aptitude médicale, ADR, identité</p>
            </div>
            {docsOpen ? <ChevronDown className="h-5 w-5 text-slate-500" /> : <ChevronRight className="h-5 w-5 text-slate-500" />}
          </button>

          {docsOpen && (
            <div className="mt-4 space-y-6">

              {/* Identité */}
              <div className="space-y-3">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Identité</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="birth_date" render={({ field }) => (
                    <FormItem><FormLabel>Date de naissance</FormLabel><FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="social_security_number" render={({ field }) => (
                    <FormItem>
                      <FormLabel>N° Sécurité sociale</FormLabel>
                      <FormControl><Input {...field} value={field.value || ''} placeholder="1 85 05 75 116 003 42" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Carte conducteur numérique */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Carte Conducteur Numérique (Tachographe)</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="driver_card_number" render={({ field }) => (
                    <FormItem><FormLabel>N° Carte conducteur</FormLabel><FormControl><Input {...field} value={field.value || ''} placeholder="FR123456789012" /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="driver_card_expiry" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">Date d'expiration<ExpiryBadge dateStr={watchedExpiries[1]} /></FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Formations obligatoires */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Formations Obligatoires</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <FormField control={form.control} name="fimo_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date FIMO</FormLabel>
                      <p className="text-xs text-slate-500 -mt-1">Formation Initiale Minimum Obligatoire</p>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="fcos_expiry" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">Expiration FCO<ExpiryBadge dateStr={watchedExpiries[2]} /></FormLabel>
                      <p className="text-xs text-slate-500 -mt-1">Formation Continue Obligatoire — 5 ans</p>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="qi_date" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date QI</FormLabel>
                      <p className="text-xs text-slate-500 -mt-1">Qualification Initiale conducteur</p>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* Aptitude médicale */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Aptitude Médicale</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="medical_certificate_expiry" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">Expiration visite médicale<ExpiryBadge dateStr={watchedExpiries[3]} /></FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </div>

              {/* ADR */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <h4 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">ADR — Matières Dangereuses</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <FormField control={form.control} name="adr_certificate_expiry" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center">Expiration certificat ADR<ExpiryBadge dateStr={watchedExpiries[4]} /></FormLabel>
                      <FormControl><Input type="date" {...field} value={field.value || ''} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-700 mb-2">Classes ADR habilitées</p>
                  <div className="flex flex-wrap gap-3">
                    {ADR_CLASSES.map((cls) => (
                      <label key={cls} className="flex items-center gap-1.5 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          className="h-4 w-4 rounded border-slate-300 accent-blue-600"
                          checked={adrClasses.includes(cls)}
                          onChange={() => toggleAdrClass(cls)}
                        />
                        <span className="text-sm text-slate-700">Classe {cls}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>

            </div>
          )}
        </div>

        {/* ── Boutons ── */}
        <div className="flex justify-end gap-4 pt-4">
          <Button type="button" variant="outline" onClick={() => history.back()}>Annuler</Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {submitLabel}
          </Button>
        </div>

      </form>
    </Form>
  );
}
