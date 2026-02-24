'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { X, Wrench, CheckCircle2, AlertTriangle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  PredictiveAlert,
  ControlResult,
  useSubmitControl,
  URGENCY_CONFIG,
} from '@/hooks/use-predictive-alerts';
import { cn } from '@/lib/utils';

interface TargetedControlFormProps {
  alert: PredictiveAlert;
  onClose: () => void;
}

// Checklists par composant
const CHECKLISTS: Record<string, string[]> = {
  Pneumatiques: [
    'Vérifier la pression avant gauche (bar)',
    'Vérifier la pression avant droit (bar)',
    'Vérifier la pression arrière gauche (bar)',
    'Vérifier la pression arrière droit (bar)',
    'Inspecter l\'usure visuelle — présence de bandes témoins',
    'Contrôler la présence de hernies, coupures ou corps étrangers',
    'Vérifier la roue de secours si applicable',
  ],
  Freinage: [
    'Mesurer l\'épaisseur des plaquettes avant (mm)',
    'Mesurer l\'épaisseur des plaquettes arrière (mm)',
    'Vérifier le niveau de liquide de frein (Min/Normal/Max)',
    'Contrôler la fermeté de la pédale au toucher',
    'Inspecter les disques — traces de rayures anormales',
    'Vérifier l\'absence de fuite sur les flexibles',
  ],
  Moteur: [
    'Contrôler le niveau d\'huile moteur',
    'Contrôler le niveau de liquide de refroidissement',
    'Vérifier l\'absence de fuite visible (huile, liquide)',
    'Inspecter les courroies (fissures, usure)',
    'Contrôler le filtre à air (encrassement)',
    'Vérifier l\'absence de codes défaut OBD',
  ],
  Carrosserie: [
    'Inspecter les chocs et impacts non déclarés',
    'Vérifier l\'état des rétroviseurs',
    'Contrôler les joints de portières et hayon',
    'Vérifier l\'état du pare-chocs avant et arrière',
    'Contrôler les feux : clignotants, stop, recul',
  ],
  Éclairage: [
    'Tester les phares avant (code + route)',
    'Tester les feux de position',
    'Tester les feux stop (assistance d\'une personne extérieure)',
    'Tester les clignotants avant et arrière',
    'Tester les feux de recul',
    'Vérifier les feux de gabarit si poids lourd',
  ],
  Général: [
    'État général moteur : OK / Anomalie',
    'Niveaux fluides (huile, eau, LV) : OK / À compléter',
    'Fuite visible sous le véhicule : Oui / Non',
    'Fonctionnement des essuie-glaces',
    'Klaxon fonctionnel',
    'Vérifier la propreté générale de la cabine',
  ],
};

export function TargetedControlForm({ alert, onClose }: TargetedControlFormProps) {
  const [newScore, setNewScore] = useState<number>(alert.current_score);
  const [result, setResult] = useState<ControlResult>('no_anomaly');
  const [maintenanceNeeded, setMaintenanceNeeded] = useState(false);
  const [details, setDetails] = useState('');
  const [checklistDone, setChecklistDone] = useState<Record<number, boolean>>({});

  const submitControl = useSubmitControl();
  const urgency = URGENCY_CONFIG[alert.urgency_level];
  const checklist = CHECKLISTS[alert.component_concerned] ?? CHECKLISTS['Général'];

  const vehicleLabel = alert.vehicle
    ? `${alert.vehicle.registration_number} — ${alert.vehicle.brand} ${alert.vehicle.model}`
    : 'Véhicule inconnu';

  const checkedCount = Object.values(checklistDone).filter(Boolean).length;
  const allChecked = checkedCount === checklist.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (result === 'anomaly_confirmed' && !details.trim()) {
      toast.error('Veuillez décrire l\'anomalie constatée.');
      return;
    }

    try {
      const submitResult = await submitControl.mutateAsync({
        alertId: alert.id,
        newScore,
        controlResult: result,
        anomalyDetails: details.trim() || undefined,
        maintenanceNeeded: maintenanceNeeded && result === 'anomaly_confirmed',
      });

      if (submitResult.maintenance_created) {
        toast.success('Contrôle validé — Fiche maintenance créée automatiquement.');
      } else {
        toast.success('Contrôle enregistré avec succès.');
      }
      onClose();
    } catch (err) {
      toast.error((err as Error).message || 'Erreur lors de la soumission.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-700">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Wrench className="h-5 w-5 text-cyan-400" />
              Contrôle ciblé — {alert.component_concerned}
            </h2>
            <p className="text-sm text-slate-400 mt-0.5">{vehicleLabel}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-200 hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Contexte de l'alerte */}
          <div className={cn('rounded-xl p-4 border', urgency.badgeClass, 'border-opacity-50')}>
            <p className="text-sm font-medium mb-1">{urgency.label}</p>
            <p className="text-sm opacity-90">{alert.reasoning}</p>
            <div className="flex gap-4 mt-2 text-xs opacity-80">
              <span>Score actuel : <strong>{alert.current_score}/100</strong></span>
              <span>Dégradation : <strong>−{alert.degradation_speed.toFixed(1)} pts/jour</strong></span>
            </div>
          </div>

          {/* Checklist */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-slate-200">
                Checklist — {alert.component_concerned}
              </h3>
              <span className="text-xs text-slate-500">
                {checkedCount}/{checklist.length} points vérifiés
              </span>
            </div>
            <div className="space-y-2 bg-slate-800 rounded-xl p-4 border border-slate-700">
              {checklist.map((item, idx) => (
                <label
                  key={idx}
                  className="flex items-start gap-3 cursor-pointer group"
                >
                  <input
                    type="checkbox"
                    checked={!!checklistDone[idx]}
                    onChange={(e) =>
                      setChecklistDone((prev) => ({ ...prev, [idx]: e.target.checked }))
                    }
                    className="mt-0.5 rounded border-slate-600 bg-slate-700 accent-cyan-500 cursor-pointer"
                  />
                  <span
                    className={cn(
                      'text-sm transition-colors',
                      checklistDone[idx] ? 'text-slate-500 line-through' : 'text-slate-300',
                    )}
                  >
                    {item}
                  </span>
                </label>
              ))}
            </div>
            {!allChecked && (
              <p className="text-xs text-amber-400 mt-2">
                ⚠️ Complétez tous les points avant de valider.
              </p>
            )}
          </div>

          {/* Formulaire résultat */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Nouveau score */}
            <div className="space-y-2">
              <Label className="text-slate-200">
                Nouveau score après contrôle (0–100)
              </Label>
              <Input
                type="number"
                min={0}
                max={100}
                value={newScore}
                onChange={(e) => setNewScore(parseInt(e.target.value) || 0)}
                className="bg-slate-800 border-slate-600 text-slate-200"
                required
              />
              <p className="text-xs text-slate-500">
                Score précédent : {alert.current_score}/100
              </p>
            </div>

            {/* Résultat */}
            <div className="space-y-2">
              <Label className="text-slate-200">Résultat du contrôle</Label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                    result === 'no_anomaly'
                      ? 'border-emerald-500/60 bg-emerald-950/30'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600',
                  )}
                >
                  <input
                    type="radio"
                    value="no_anomaly"
                    checked={result === 'no_anomaly'}
                    onChange={() => {
                      setResult('no_anomaly');
                      setMaintenanceNeeded(false);
                    }}
                    className="accent-emerald-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4" />
                      Véhicule OK
                    </p>
                    <p className="text-xs text-slate-500">Faux positif — aucune anomalie</p>
                  </div>
                </label>

                <label
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all',
                    result === 'anomaly_confirmed'
                      ? 'border-red-500/60 bg-red-950/30'
                      : 'border-slate-700 bg-slate-800 hover:border-slate-600',
                  )}
                >
                  <input
                    type="radio"
                    value="anomaly_confirmed"
                    checked={result === 'anomaly_confirmed'}
                    onChange={() => setResult('anomaly_confirmed')}
                    className="accent-red-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="h-4 w-4" />
                      Anomalie confirmée
                    </p>
                    <p className="text-xs text-slate-500">Problème réel détecté</p>
                  </div>
                </label>
              </div>
            </div>

            {/* Champs conditionnels si anomalie */}
            {result === 'anomaly_confirmed' && (
              <div className="space-y-4 rounded-xl border border-red-700/30 bg-red-950/20 p-4">
                <div className="space-y-2">
                  <Label className="text-slate-200">Description de l'anomalie *</Label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    placeholder="Décrivez précisément ce qui a été observé..."
                    className="w-full bg-slate-800 border border-slate-600 rounded-lg p-3 text-sm text-slate-200 placeholder:text-slate-500 resize-none focus:outline-none focus:ring-1 focus:ring-red-500/50"
                    required
                  />
                </div>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    id="maintenance"
                    checked={maintenanceNeeded}
                    onChange={(e) => setMaintenanceNeeded(e.target.checked)}
                    className="rounded border-slate-600 accent-cyan-500"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-200">
                      Créer une fiche maintenance immédiatement
                    </p>
                    <p className="text-xs text-slate-500">
                      Une demande de type CORRECTIVE / HAUTE priorité sera générée automatiquement
                    </p>
                  </div>
                </label>
              </div>
            )}

            {/* Avertissement checklist incomplète */}
            {!allChecked && (
              <Alert className="bg-amber-950/30 border-amber-700/50">
                <AlertTriangle className="h-4 w-4 text-amber-400" />
                <AlertDescription className="text-amber-300 text-sm">
                  La checklist n'est pas entièrement complétée. Vous pouvez quand même soumettre, mais nous recommandons de tout vérifier.
                </AlertDescription>
              </Alert>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2 border-t border-slate-700">
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                className="border-slate-600 text-slate-300 hover:bg-slate-800"
                disabled={submitControl.isPending}
              >
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={submitControl.isPending}
                className="bg-cyan-600 hover:bg-cyan-500 text-white"
              >
                {submitControl.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Valider le contrôle
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
