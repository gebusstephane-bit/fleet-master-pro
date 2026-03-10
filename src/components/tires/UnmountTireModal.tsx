'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { unmountTire } from '@/actions/tires';
import { TREAD_DEPTH_THRESHOLDS } from '@/lib/axle-configurations';

// ----------------------------------------------------------------

interface UnmountTireModalProps {
  mountingId: string;
  vehicleId: string;
  vehicleCurrentKm: number;
  position: string;
  positionLabel: string;
  tireBrand: string;
  tireDimensions: string;
  currentTreadDepth: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUnmounted: () => void;
}

const TODAY = new Date().toISOString().split('T')[0];

const REASONS = [
  { value: 'worn',        label: 'Usure normale (profil épuisé)' },
  { value: 'puncture',    label: 'Crevaison / Dommage irréparable' },
  { value: 'rotation',    label: 'Permutation préventive' },
  { value: 'seasonal',    label: 'Changement saisonnier' },
  { value: 'inspection',  label: 'Inspection (remontage prévu)' },
  { value: 'retreading',  label: 'Envoi en rechapage' },
  { value: 'vehicle_sold',label: 'Véhicule cédé' },
  { value: 'other',       label: 'Autre' },
];

const DESTINATIONS = [
  { value: 'stock',      label: 'Retour en stock (encore utilisable)' },
  { value: 'retreading', label: 'Envoyé en rechapage' },
  { value: 'scrap',      label: 'Mis au rebut' },
  { value: 'sold',       label: 'Vendu / Échangé' },
];

// ----------------------------------------------------------------

export function UnmountTireModal({
  mountingId, vehicleId: _vehicleId, vehicleCurrentKm,
  positionLabel, tireBrand, tireDimensions, currentTreadDepth,
  open, onOpenChange, onUnmounted,
}: UnmountTireModalProps) {
  const [unmountedKm, setUnmountedKm] = useState(vehicleCurrentKm);
  const [unmountedDate, setUnmountedDate] = useState(TODAY);
  const [treadDepth, setTreadDepth] = useState(
    currentTreadDepth != null ? String(currentTreadDepth) : ''
  );
  const [reason, setReason] = useState('');
  const [destination, setDestination] = useState('');
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  const depthVal = treadDepth ? parseFloat(treadDepth) : null;
  const isLegal = depthVal == null || depthVal > TREAD_DEPTH_THRESHOLDS.legal_minimum;
  const isCritical = depthVal != null && depthVal <= TREAD_DEPTH_THRESHOLDS.critical;
  const isWarning = depthVal != null && depthVal <= TREAD_DEPTH_THRESHOLDS.warning && !isCritical;

  async function handleSubmit() {
    if (!reason) { toast.error('Sélectionnez la raison du démontage'); return; }
    if (!destination) { toast.error('Sélectionnez la destination'); return; }

    setLoading(true);
    const result = await unmountTire({
      mountingId,
      unmountedKm,
      unmountedDate,
      treadDepthAtUnmount: depthVal ?? undefined,
      reasonUnmounted: reason,
      destination,
      notes: notes || undefined,
    });
    setLoading(false);

    if (!result.success) {
      toast.error(result.error ?? 'Erreur lors du démontage');
      return;
    }

    toast.success(`Pneu démonté de la position ${positionLabel}`);
    onOpenChange(false);
    onUnmounted();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Démonter le pneu</DialogTitle>
          <p className="text-sm text-slate-400">
            <span className="text-white font-medium">{tireBrand}</span>
            {' '}{tireDimensions}
            {' '}— Position : <span className="text-cyan-400">{positionLabel}</span>
          </p>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-slate-300 text-sm">Kilométrage actuel *</Label>
              <Input
                type="number"
                value={unmountedKm}
                onChange={e => setUnmountedKm(parseInt(e.target.value, 10))}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
            <div>
              <Label className="text-slate-300 text-sm">Date de démontage *</Label>
              <Input
                type="date"
                value={unmountedDate}
                onChange={e => setUnmountedDate(e.target.value)}
                className="bg-slate-800 border-slate-700 text-white mt-1"
              />
            </div>
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Profondeur mesurée à la dépose (mm)</Label>
            <Input
              type="number"
              step="0.1"
              min="0"
              max="30"
              value={treadDepth}
              onChange={e => setTreadDepth(e.target.value)}
              placeholder="ex: 3.5"
              className={`bg-slate-800 border-slate-700 text-white mt-1 ${
                !isLegal ? 'border-red-500' : isCritical ? 'border-red-500' : isWarning ? 'border-orange-500' : ''
              }`}
            />
            {!isLegal && (
              <p className="text-xs text-red-400 mt-1 font-semibold">
                LIMITE LÉGALE ATTEINTE — Remplacement obligatoire
              </p>
            )}
            {isLegal && isCritical && (
              <p className="text-xs text-red-400 mt-1">Pneu critique — Remplacement immédiat</p>
            )}
            {isWarning && (
              <p className="text-xs text-orange-400 mt-1">Pneu à surveiller</p>
            )}
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Raison du démontage *</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {REASONS.map(r => (
                  <SelectItem key={r.value} value={r.value} className="text-white hover:bg-slate-700">
                    {r.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Destination *</Label>
            <Select value={destination} onValueChange={setDestination}>
              <SelectTrigger className="bg-slate-800 border-slate-700 text-white mt-1">
                <SelectValue placeholder="Sélectionner..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700">
                {DESTINATIONS.map(d => (
                  <SelectItem key={d.value} value={d.value} className="text-white hover:bg-slate-700">
                    {d.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label className="text-slate-300 text-sm">Notes</Label>
            <Input
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder="optionnel"
              className="bg-slate-800 border-slate-700 text-white mt-1"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
            Annuler
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={loading}
            className="bg-red-700 hover:bg-red-800"
          >
            {loading ? 'Démontage...' : 'Démonter le pneu'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
