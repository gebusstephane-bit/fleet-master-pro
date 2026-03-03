'use client';

/**
 * Wizard de déclaration de sinistre — 3 étapes
 * Étape 1 : L'incident (date, lieu, type, gravité, description)
 * Étape 2 : Les acteurs (véhicule, conducteur, tiers)
 * Étape 3 : Assurance (compagnie, numéros, montants)
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { GlassCard } from '@/components/ui/glass-card';
import { Button } from '@/components/ui/button';
import {
  ChevronRight,
  ChevronLeft,
  AlertTriangle,
  Users,
  Shield,
  Check,
} from 'lucide-react';
import { useCreateIncident } from '@/hooks/use-incidents';
import { useVehicles } from '@/hooks/use-vehicles';
import { useDrivers } from '@/hooks/use-drivers';
import {
  INCIDENT_TYPE_LABELS,
  SEVERITY_LABELS,
  CLAIM_STATUS_LABELS,
} from './incident-status-badge';
import type { CreateIncidentData } from '@/lib/schemas';

// ============================================================
// Types état du wizard
// ============================================================

interface FormState {
  // Étape 1 — L'incident
  incident_date: string;
  location_description: string;
  incident_type: string;
  severity: string;
  circumstances: string;
  injuries_description: string;
  // Étape 2 — Les acteurs
  vehicle_id: string;
  driver_id: string;
  third_party_involved: boolean;
  third_party_name: string;
  third_party_plate: string;
  third_party_insurance: string;
  witnesses_raw: string;
  // Étape 3 — Assurance
  insurance_company: string;
  insurance_policy_number: string;
  claim_number: string;
  claim_date: string;
  claim_status: string;
  estimated_damage: string;
}

const INITIAL_STATE: FormState = {
  incident_date: new Date().toISOString().slice(0, 16),
  location_description: '',
  incident_type: '',
  severity: '',
  circumstances: '',
  injuries_description: '',
  vehicle_id: '',
  driver_id: '',
  third_party_involved: false,
  third_party_name: '',
  third_party_plate: '',
  third_party_insurance: '',
  witnesses_raw: '',
  insurance_company: '',
  insurance_policy_number: '',
  claim_number: '',
  claim_date: '',
  claim_status: 'non_declaré',
  estimated_damage: '',
};

// ============================================================
// Styles champs de formulaire (glass dark)
// ============================================================

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all';
const labelClass = 'block text-sm font-medium text-slate-300 mb-1.5';
const selectClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-4 py-3 text-sm text-white focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all appearance-none';
const textareaClass =
  'w-full rounded-xl border border-white/[0.08] bg-[#0f172a]/60 px-4 py-3 text-sm text-white placeholder-slate-500 focus:border-cyan-500/40 focus:outline-none focus:ring-1 focus:ring-cyan-500/30 transition-all resize-none';

// ============================================================
// Étapes
// ============================================================

const STEPS = [
  { label: "L'incident", icon: AlertTriangle },
  { label: 'Les acteurs', icon: Users },
  { label: 'Assurance', icon: Shield },
];

// ============================================================
// Composant principal
// ============================================================

export function IncidentForm() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(INITIAL_STATE);
  const [insurancePrefilled, setInsurancePrefilled] = useState(false);
  const createIncident = useCreateIncident();

  const { data: vehicles = [] } = useVehicles();
  const { data: drivers = [] } = useDrivers();

  const set = (key: keyof FormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  /**
   * Sélection d'un véhicule : pré-remplit automatiquement les champs assurance
   * de l'étape 3 si le véhicule a ses données d'assurance renseignées.
   */
  const handleVehicleChange = (vehicleId: string) => {
    const vehicle = (vehicles as any[]).find((v) => v.id === vehicleId);
    const company = vehicle?.insurance_company ?? '';
    const policyNumber = vehicle?.insurance_policy_number ?? '';
    const hasPrefill = !!(company || policyNumber);

    setForm((prev) => ({
      ...prev,
      vehicle_id: vehicleId,
      // Pré-remplir depuis le véhicule — l'utilisateur peut modifier en étape 3
      insurance_company: company || prev.insurance_company,
      insurance_policy_number: policyNumber || prev.insurance_policy_number,
    }));
    setInsurancePrefilled(hasPrefill);
  };

  // ---- Soumission ----
  const handleSubmit = async () => {
    const witnesses = form.witnesses_raw
      ? form.witnesses_raw.split('\n').filter(Boolean).map((w) => ({ description: w.trim() }))
      : [];

    const third_party_info =
      form.third_party_involved
        ? {
            name: form.third_party_name,
            plate: form.third_party_plate,
            insurance: form.third_party_insurance,
          }
        : null;

    const payload: CreateIncidentData = {
      vehicle_id: form.vehicle_id,
      driver_id: form.driver_id || null,
      incident_date: new Date(form.incident_date).toISOString(),
      location_description: form.location_description || null,
      incident_type: form.incident_type as CreateIncidentData['incident_type'],
      severity: (form.severity || null) as CreateIncidentData['severity'],
      circumstances: form.circumstances || null,
      injuries_description: form.injuries_description || null,
      third_party_involved: form.third_party_involved,
      third_party_info,
      witnesses: witnesses.length > 0 ? witnesses : null,
      insurance_company: form.insurance_company || null,
      insurance_policy_number: form.insurance_policy_number || null,
      claim_number: form.claim_number || null,
      claim_date: form.claim_date || null,
      claim_status: (form.claim_status || 'non_declaré') as CreateIncidentData['claim_status'],
      estimated_damage: form.estimated_damage ? parseFloat(form.estimated_damage) : null,
      status: 'ouvert',
    };

    const incident = await createIncident.mutateAsync(payload);
    router.push(`/incidents/${incident.id}`);
  };

  // ---- Validation par étape ----
  const canGoNext = () => {
    if (step === 0) return !!(form.incident_date && form.incident_type);
    if (step === 1) return !!form.vehicle_id;
    return true;
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Indicateur d'étapes */}
      <div className="flex items-center gap-2">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const isActive = i === step;
          const isDone = i < step;
          return (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div
                className={cn(
                  'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all',
                  isDone && 'bg-emerald-500 text-white',
                  isActive && 'bg-gradient-to-br from-cyan-500 to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.4)]',
                  !isActive && !isDone && 'bg-white/5 text-slate-500'
                )}
              >
                {isDone ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
              </div>
              <span
                className={cn(
                  'text-sm font-medium hidden sm:block',
                  isActive ? 'text-white' : 'text-slate-500'
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 && (
                <div
                  className={cn(
                    'flex-1 h-px',
                    isDone ? 'bg-emerald-500/50' : 'bg-white/[0.06]'
                  )}
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Contenu de l'étape */}
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          transition={{ duration: 0.25 }}
        >
          <GlassCard className="p-6 space-y-5">
            {step === 0 && <Step1 form={form} set={set} />}
            {step === 1 && <Step2 form={form} set={set} vehicles={vehicles} drivers={drivers} onVehicleChange={handleVehicleChange} />}
            {step === 2 && <Step3 form={form} set={set} prefilled={insurancePrefilled} />}
          </GlassCard>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={() => (step === 0 ? router.push('/incidents') : setStep((s) => s - 1))}
          disabled={createIncident.isPending}
          className="text-slate-400 hover:text-white"
        >
          <ChevronLeft className="mr-1 h-4 w-4" />
          {step === 0 ? 'Annuler' : 'Retour'}
        </Button>

        {step < STEPS.length - 1 ? (
          <Button
            onClick={() => setStep((s) => s + 1)}
            disabled={!canGoNext()}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white"
          >
            Suivant
            <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={createIncident.isPending}
            className="bg-gradient-to-r from-cyan-500 to-blue-500 hover:shadow-[0_0_20px_rgba(6,182,212,0.4)] text-white"
          >
            {createIncident.isPending ? 'Enregistrement...' : 'Déclarer le sinistre'}
          </Button>
        )}
      </div>
    </div>
  );
}

// ============================================================
// Étape 1 : L'incident
// ============================================================

function Step1({ form, set }: { form: FormState; set: (k: keyof FormState, v: string | boolean) => void }) {
  return (
    <>
      <h2 className="text-lg font-semibold text-white">L&apos;incident</h2>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Date et heure *</label>
          <input
            type="datetime-local"
            className={inputClass}
            value={form.incident_date}
            onChange={(e) => set('incident_date', e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelClass}>Gravité</label>
          <select
            className={selectClass}
            value={form.severity}
            onChange={(e) => set('severity', e.target.value)}
          >
            <option value="">— Sélectionner —</option>
            {Object.entries(SEVERITY_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className={labelClass}>Lieu *</label>
        <input
          type="text"
          className={inputClass}
          value={form.location_description}
          onChange={(e) => set('location_description', e.target.value)}
          placeholder="Ex : A7 sortie 23, commune de Valence"
        />
      </div>

      <div>
        <label className={labelClass}>Type de sinistre *</label>
        <select
          className={selectClass}
          value={form.incident_type}
          onChange={(e) => set('incident_type', e.target.value)}
          required
        >
          <option value="">— Sélectionner —</option>
          {Object.entries(INCIDENT_TYPE_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Circonstances</label>
        <textarea
          className={textareaClass}
          rows={4}
          value={form.circumstances}
          onChange={(e) => set('circumstances', e.target.value)}
          placeholder="Décrivez les circonstances de l'incident..."
        />
      </div>

      <div>
        <label className={labelClass}>Blessures</label>
        <textarea
          className={textareaClass}
          rows={2}
          value={form.injuries_description}
          onChange={(e) => set('injuries_description', e.target.value)}
          placeholder="Description des blessures éventuelles..."
        />
      </div>
    </>
  );
}

// ============================================================
// Étape 2 : Les acteurs
// ============================================================

function Step2({
  form,
  set,
  vehicles,
  drivers,
  onVehicleChange,
}: {
  form: FormState;
  set: (k: keyof FormState, v: string | boolean) => void;
  vehicles: any[];
  drivers: any[];
  onVehicleChange: (vehicleId: string) => void;
}) {
  return (
    <>
      <h2 className="text-lg font-semibold text-white">Les acteurs</h2>

      <div>
        <label className={labelClass}>Véhicule concerné *</label>
        <select
          className={selectClass}
          value={form.vehicle_id}
          onChange={(e) => onVehicleChange(e.target.value)}
          required
        >
          <option value="">— Sélectionner un véhicule —</option>
          {vehicles.map((v: any) => (
            <option key={v.id} value={v.id}>
              {v.registration_number} — {v.brand} {v.model}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className={labelClass}>Conducteur au moment du sinistre</label>
        <select
          className={selectClass}
          value={form.driver_id}
          onChange={(e) => set('driver_id', e.target.value)}
        >
          <option value="">— Aucun / Inconnu —</option>
          {drivers.map((d: any) => (
            <option key={d.id} value={d.id}>
              {d.first_name} {d.last_name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="third_party"
          className="h-4 w-4 rounded border-white/20 bg-white/5 text-cyan-500 focus:ring-cyan-500/30"
          checked={form.third_party_involved}
          onChange={(e) => set('third_party_involved', e.target.checked)}
        />
        <label htmlFor="third_party" className="text-sm text-slate-300 cursor-pointer">
          Tiers impliqué (autre véhicule, piéton…)
        </label>
      </div>

      {form.third_party_involved && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          className="space-y-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4"
        >
          <p className="text-xs font-medium text-amber-400 uppercase tracking-wide">Informations tiers</p>
          <input
            type="text"
            className={inputClass}
            placeholder="Nom du tiers"
            value={form.third_party_name}
            onChange={(e) => set('third_party_name', e.target.value)}
          />
          <input
            type="text"
            className={inputClass}
            placeholder="Immatriculation tiers"
            value={form.third_party_plate}
            onChange={(e) => set('third_party_plate', e.target.value)}
          />
          <input
            type="text"
            className={inputClass}
            placeholder="Assurance du tiers"
            value={form.third_party_insurance}
            onChange={(e) => set('third_party_insurance', e.target.value)}
          />
        </motion.div>
      )}

      <div>
        <label className={labelClass}>Témoins (un par ligne)</label>
        <textarea
          className={textareaClass}
          rows={3}
          value={form.witnesses_raw}
          onChange={(e) => set('witnesses_raw', e.target.value)}
          placeholder="Jean Dupont, 06 12 34 56 78&#10;Marie Martin, passage à pied"
        />
      </div>
    </>
  );
}

// ============================================================
// Étape 3 : Assurance
// ============================================================

function Step3({ form, set, prefilled }: {
  form: FormState;
  set: (k: keyof FormState, v: string | boolean) => void;
  prefilled?: boolean;
}) {
  return (
    <>
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold text-white">Assurance</h2>
        {prefilled && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-400">
            <svg className="h-3 w-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Pré-rempli depuis le véhicule
          </span>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Compagnie d&apos;assurance</label>
          <input
            type="text"
            className={inputClass}
            value={form.insurance_company}
            onChange={(e) => set('insurance_company', e.target.value)}
            placeholder="Axa, Groupama, Allianz…"
          />
        </div>
        <div>
          <label className={labelClass}>N° de police</label>
          <input
            type="text"
            className={inputClass}
            value={form.insurance_policy_number}
            onChange={(e) => set('insurance_policy_number', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>N° de sinistre assurance</label>
          <input
            type="text"
            className={inputClass}
            value={form.claim_number}
            onChange={(e) => set('claim_number', e.target.value)}
          />
        </div>
        <div>
          <label className={labelClass}>Date de déclaration</label>
          <input
            type="date"
            className={inputClass}
            value={form.claim_date}
            onChange={(e) => set('claim_date', e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className={labelClass}>Statut assurance</label>
          <select
            className={selectClass}
            value={form.claim_status}
            onChange={(e) => set('claim_status', e.target.value)}
          >
            {Object.entries(CLAIM_STATUS_LABELS).map(([v, l]) => (
              <option key={v} value={v}>{l}</option>
            ))}
          </select>
        </div>
        <div>
          <label className={labelClass}>Dommages estimés (€)</label>
          <input
            type="number"
            min="0"
            step="0.01"
            className={inputClass}
            value={form.estimated_damage}
            onChange={(e) => set('estimated_damage', e.target.value)}
            placeholder="0.00"
          />
        </div>
      </div>

      {/* Résumé visuel */}
      <div className="rounded-xl border border-cyan-500/10 bg-[#0f172a]/40 p-4 space-y-1 text-sm text-slate-400">
        <p className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-2">Résumé</p>
        <p>
          <span className="text-slate-300">Type :</span>{' '}
          {INCIDENT_TYPE_LABELS[form.incident_type] ?? '—'}
        </p>
        <p>
          <span className="text-slate-300">Gravité :</span>{' '}
          {SEVERITY_LABELS[form.severity] ?? '—'}
        </p>
        <p>
          <span className="text-slate-300">Date :</span>{' '}
          {form.incident_date ? new Date(form.incident_date).toLocaleString('fr-FR') : '—'}
        </p>
        {form.estimated_damage && (
          <p>
            <span className="text-slate-300">Coût estimé :</span>{' '}
            {parseFloat(form.estimated_damage).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })}
          </p>
        )}
      </div>
    </>
  );
}
