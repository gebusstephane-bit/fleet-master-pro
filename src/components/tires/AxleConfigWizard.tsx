'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  AXLE_CONFIGURATIONS,
  STANDARD_DIMENSIONS,
  getConfigurationsForVehicleType,
  type AxleConfiguration,
} from '@/lib/axle-configurations';
import { saveAxleConfig } from '@/actions/tires';

// ----------------------------------------------------------------

interface AxleConfigWizardProps {
  vehicleId: string;
  vehicleType: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved: () => void;
}

// ----------------------------------------------------------------

export function AxleConfigWizard({
  vehicleId, vehicleType, open, onOpenChange, onConfigSaved,
}: AxleConfigWizardProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedConfig, setSelectedConfig] = useState<AxleConfiguration | null>(null);
  const [dimensions, setDimensions] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  // Configs compatibles avec ce type de véhicule
  const compatible = getConfigurationsForVehicleType(vehicleType);
  const configs = compatible.length > 0 ? compatible : AXLE_CONFIGURATIONS;
  const noMatch = compatible.length === 0;

  // Extraire les essieux uniques de la config sélectionnée
  const uniqueAxles = selectedConfig
    ? Array.from(new Set(selectedConfig.positions.map(p => p.axle)))
    : [];

  function getStandardDimsForAxle(axle: string, config: AxleConfiguration): string[] {
    const firstPos = config.positions.find(p => p.axle === axle);
    if (!firstPos) return [];
    if (axle.startsWith('AV')) return STANDARD_DIMENSIONS.essieu_av_pl;
    if (axle.startsWith('AR') && firstPos.mount_type !== 'simple') return STANDARD_DIMENSIONS.essieu_ar_jumele;
    if (axle.startsWith('AR')) return STANDARD_DIMENSIONS.essieu_ar_simple;
    if (axle.startsWith('R') && firstPos.mount_type !== 'simple') return STANDARD_DIMENSIONS.remorque_jumele;
    if (axle.startsWith('R')) return STANDARD_DIMENSIONS.remorque_simple;
    return [];
  }

  function handleSelectConfig(config: AxleConfiguration) {
    setSelectedConfig(config);
    setDimensions({});
    setStep(2);
  }

  async function handleSave() {
    if (!selectedConfig) return;
    setLoading(true);

    const result = await saveAxleConfig(
      vehicleId,
      selectedConfig.formula,
      selectedConfig.positions as unknown as unknown[],
      dimensions
    );

    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? 'Erreur lors de la sauvegarde');
      return;
    }

    toast.success('Configuration des essieux enregistrée');
    onOpenChange(false);
    setStep(1);
    setSelectedConfig(null);
    onConfigSaved();
  }

  function handleClose() {
    onOpenChange(false);
    setStep(1);
    setSelectedConfig(null);
    setDimensions({});
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">
            Configuration des essieux
            <span className="ml-3 text-sm font-normal text-slate-400">Étape {step}/3</span>
          </DialogTitle>
          {/* Steps indicator */}
          <div className="flex gap-2 mt-2">
            {([1, 2, 3] as const).map(s => (
              <div
                key={s}
                className={`h-1 flex-1 rounded-full transition-colors ${step >= s ? 'bg-cyan-500' : 'bg-slate-700'}`}
              />
            ))}
          </div>
        </DialogHeader>

        {/* STEP 1 — Sélection de la formule */}
        {step === 1 && (
          <div className="space-y-4">
            {noMatch && (
              <div className="text-xs text-amber-400 bg-amber-400/10 border border-amber-400/20 rounded p-3">
                Aucune configuration spécifique pour le type &quot;{vehicleType}&quot;. Toutes les configurations sont affichées.
              </div>
            )}
            <p className="text-sm text-slate-400">
              Sélectionnez la formule d&apos;essieux correspondant à ce véhicule.
            </p>
            <div className="grid grid-cols-1 gap-3">
              {configs.map(config => (
                <button
                  key={config.formula}
                  onClick={() => handleSelectConfig(config)}
                  className="text-left p-4 rounded-lg border border-slate-700 hover:border-cyan-500 hover:bg-cyan-500/5 transition-all group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="font-mono text-xs border-slate-600 text-slate-300">
                        {config.formula}
                      </Badge>
                      <span className="font-medium text-white group-hover:text-cyan-400 transition-colors">
                        {config.label}
                      </span>
                    </div>
                    <Badge className="bg-slate-800 text-slate-300 border-slate-600 text-xs">
                      {config.total_tire_count} pneus
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-500 mt-2 line-clamp-2">{config.notes}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* STEP 2 — Dimensions de référence */}
        {step === 2 && selectedConfig && (
          <div className="space-y-4">
            <p className="text-sm text-slate-400">
              Renseignez les dimensions de référence par type d&apos;essieu (optionnel).
            </p>
            <div className="space-y-4">
              {uniqueAxles.map(axle => {
                const suggestions = getStandardDimsForAxle(axle, selectedConfig);
                return (
                  <div key={axle} className="space-y-1.5">
                    <Label className="text-slate-300 text-sm">Essieu {axle}</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="ex: 315/70 R22.5"
                        value={dimensions[axle] ?? ''}
                        onChange={e => setDimensions(prev => ({ ...prev, [axle]: e.target.value }))}
                        className="bg-slate-800 border-slate-700 text-white flex-1"
                        list={`dims-${axle}`}
                      />
                      <datalist id={`dims-${axle}`}>
                        {suggestions.map(d => <option key={d} value={d} />)}
                      </datalist>
                    </div>
                    {suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {suggestions.map(d => (
                          <button
                            key={d}
                            type="button"
                            onClick={() => setDimensions(prev => ({ ...prev, [axle]: d }))}
                            className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-cyan-400 border border-slate-700 hover:border-cyan-600 transition-colors"
                          >
                            {d}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="flex gap-2 justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep(1)} className="text-slate-400">
                Retour
              </Button>
              <Button onClick={() => setStep(3)} className="bg-cyan-600 hover:bg-cyan-700">
                Continuer
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3 — Confirmation */}
        {step === 3 && selectedConfig && (
          <div className="space-y-4">
            <div className="bg-slate-800 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="font-mono text-xs border-cyan-600 text-cyan-400">
                  {selectedConfig.formula}
                </Badge>
                <span className="font-semibold text-white">{selectedConfig.label}</span>
              </div>
              <p className="text-sm text-slate-400">{selectedConfig.notes}</p>
              <p className="text-sm text-cyan-400 font-medium">
                {selectedConfig.total_tire_count} emplacements de pneus à gérer
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {selectedConfig.positions.map(pos => (
                <div key={pos.id} className="flex items-center justify-between text-xs bg-slate-800/60 rounded px-3 py-2">
                  <span className="text-slate-300">{pos.label}</span>
                  {pos.is_drive && <Badge className="text-[10px] bg-blue-900/50 text-blue-300 border-blue-700">Moteur</Badge>}
                  {pos.is_steering && <Badge className="text-[10px] bg-purple-900/50 text-purple-300 border-purple-700">Dir.</Badge>}
                  {pos.is_liftable && <Badge className="text-[10px] bg-amber-900/50 text-amber-300 border-amber-700">Relev.</Badge>}
                </div>
              ))}
            </div>

            <p className="text-xs text-slate-500">
              Vous pourrez monter les pneus un par un depuis la page du véhicule.
            </p>

            <DialogFooter className="gap-2">
              <Button variant="ghost" onClick={() => setStep(2)} className="text-slate-400">
                Retour
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
                className="bg-cyan-600 hover:bg-cyan-700"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer la configuration'}
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
