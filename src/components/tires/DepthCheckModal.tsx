'use client';

import { useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { recordDepthCheck } from '@/actions/tires';
import { TREAD_DEPTH_THRESHOLDS } from '@/lib/axle-configurations';

// ----------------------------------------------------------------

export interface DepthCheckRow {
  mountingId: string;
  tireId: string;
  positionLabel: string;
  brand: string;
  dimensions: string;
  currentTreadDepth: number | null;
}

interface DepthCheckModalProps {
  vehicleId: string;
  vehicleCurrentKm: number;
  rows: DepthCheckRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
}

interface RowState {
  treadDepth: string;
  pressure: string;
  depthInner: string;
  depthCenter: string;
  depthOuter: string;
}

const TODAY = new Date().toISOString().split('T')[0];

function depthColor(val: number | null): string {
  if (val == null) return 'text-slate-400';
  if (val <= TREAD_DEPTH_THRESHOLDS.legal_minimum) return 'text-red-400 font-bold';
  if (val <= TREAD_DEPTH_THRESHOLDS.critical) return 'text-red-400';
  if (val <= TREAD_DEPTH_THRESHOLDS.warning) return 'text-orange-400';
  return 'text-green-400';
}

function depthBadge(val: number | null) {
  if (val == null) return null;
  if (val <= TREAD_DEPTH_THRESHOLDS.legal_minimum)
    return <Badge className="bg-red-900 text-red-200 text-[10px] px-1 py-0">LÉGAL</Badge>;
  if (val <= TREAD_DEPTH_THRESHOLDS.critical)
    return <Badge className="bg-red-900 text-red-200 text-[10px] px-1 py-0">CRITIQUE</Badge>;
  if (val <= TREAD_DEPTH_THRESHOLDS.warning)
    return <Badge className="bg-orange-900 text-orange-200 text-[10px] px-1 py-0">SURVEILLER</Badge>;
  return null;
}

// ----------------------------------------------------------------

export function DepthCheckModal({
  vehicleId, vehicleCurrentKm, rows,
  open, onOpenChange, onSaved,
}: DepthCheckModalProps) {
  const [checkDate, setCheckDate] = useState(TODAY);
  const [checkKm, setCheckKm]     = useState(vehicleCurrentKm);
  const [checkedBy, setCheckedBy] = useState('');
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [loading, setLoading]     = useState(false);

  const [rowStates, setRowStates] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(rows.map(r => [r.mountingId, {
      treadDepth: r.currentTreadDepth != null ? String(r.currentTreadDepth) : '',
      pressure: '',
      depthInner: '',
      depthCenter: '',
      depthOuter: '',
    }]))
  );

  function setField(mountingId: string, field: keyof RowState, value: string) {
    setRowStates(prev => ({
      ...prev,
      [mountingId]: { ...prev[mountingId], [field]: value },
    }));
  }

  // Summary counters
  const summary = rows.reduce(
    (acc, r) => {
      const val = parseFloat(rowStates[r.mountingId]?.treadDepth ?? '');
      if (!isNaN(val)) {
        if (val <= TREAD_DEPTH_THRESHOLDS.critical) acc.critical++;
        else if (val <= TREAD_DEPTH_THRESHOLDS.warning) acc.warning++;
      }
      return acc;
    },
    { critical: 0, warning: 0 }
  );

  async function handleSave() {
    const toSave = rows.filter(r => {
      const val = rowStates[r.mountingId]?.treadDepth;
      return val !== '' && !isNaN(parseFloat(val));
    });

    if (toSave.length === 0) {
      toast.error('Saisissez au moins une profondeur');
      return;
    }

    setLoading(true);
    let errors = 0;

    for (const row of toSave) {
      const rs = rowStates[row.mountingId];
      const result = await recordDepthCheck({
        mountingId:  row.mountingId,
        tireId:      row.tireId,
        vehicleId,
        checkDate,
        checkKm,
        treadDepth:  parseFloat(rs.treadDepth),
        depthInner:  rs.depthInner  ? parseFloat(rs.depthInner)  : undefined,
        depthCenter: rs.depthCenter ? parseFloat(rs.depthCenter) : undefined,
        depthOuter:  rs.depthOuter  ? parseFloat(rs.depthOuter)  : undefined,
        pressureBar: rs.pressure    ? parseFloat(rs.pressure)    : undefined,
        checkedBy:   checkedBy || undefined,
      });
      if (!result.success) errors++;
    }

    setLoading(false);

    if (errors > 0) {
      toast.error(`${errors} enregistrement(s) échoué(s)`);
    } else {
      toast.success(`${toSave.length} mesure(s) enregistrée(s)`);
      onOpenChange(false);
      onSaved();
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-slate-900 border-slate-700 text-white max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-white">Relevé de profondeurs</DialogTitle>
          <p className="text-sm text-slate-400">
            Saisissez les profondeurs mesurées pour chaque position. Laissez vide pour ignorer.
          </p>
        </DialogHeader>

        {/* Header fields */}
        <div className="grid grid-cols-3 gap-3 pb-3 border-b border-slate-700">
          <div>
            <Label className="text-slate-300 text-xs">Date *</Label>
            <Input
              type="date"
              value={checkDate}
              onChange={e => setCheckDate(e.target.value)}
              className="bg-slate-800 border-slate-700 text-white mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Kilométrage *</Label>
            <Input
              type="number"
              value={checkKm}
              onChange={e => setCheckKm(parseInt(e.target.value, 10))}
              className="bg-slate-800 border-slate-700 text-white mt-1 h-8 text-sm"
            />
          </div>
          <div>
            <Label className="text-slate-300 text-xs">Contrôlé par</Label>
            <Input
              value={checkedBy}
              onChange={e => setCheckedBy(e.target.value)}
              placeholder="Nom technicien"
              className="bg-slate-800 border-slate-700 text-white mt-1 h-8 text-sm"
            />
          </div>
        </div>

        {/* Summary banners */}
        {(summary.critical > 0 || summary.warning > 0) && (
          <div className="flex gap-2">
            {summary.critical > 0 && (
              <div className="flex-1 bg-red-950/50 border border-red-800 rounded-lg px-3 py-1.5 text-xs text-red-300">
                <span className="font-bold">{summary.critical}</span> pneu(s) critique(s) — remplacement immédiat
              </div>
            )}
            {summary.warning > 0 && (
              <div className="flex-1 bg-orange-950/50 border border-orange-800 rounded-lg px-3 py-1.5 text-xs text-orange-300">
                <span className="font-bold">{summary.warning}</span> pneu(s) à surveiller
              </div>
            )}
          </div>
        )}

        {/* Rows — scrollable */}
        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {rows.map(row => {
            const rs = rowStates[row.mountingId] ?? { treadDepth: '', pressure: '', depthInner: '', depthCenter: '', depthOuter: '' };
            const depthVal = rs.treadDepth ? parseFloat(rs.treadDepth) : null;
            const isExp = expanded === row.mountingId;

            return (
              <div
                key={row.mountingId}
                className="bg-slate-800 rounded-lg border border-slate-700"
              >
                {/* Main row */}
                <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-3 px-3 py-2">
                  {/* Position + tire info */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-cyan-400 font-mono text-sm font-semibold">{row.positionLabel}</span>
                      {depthBadge(depthVal)}
                    </div>
                    <div className="text-xs text-slate-400 truncate">
                      {row.brand} — <span className="font-mono">{row.dimensions}</span>
                    </div>
                    {row.currentTreadDepth != null && (
                      <div className="text-[10px] text-slate-500">
                        Dernière mesure : <span className={depthColor(row.currentTreadDepth)}>{row.currentTreadDepth} mm</span>
                      </div>
                    )}
                  </div>

                  {/* Depth input */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="30"
                      value={rs.treadDepth}
                      onChange={e => setField(row.mountingId, 'treadDepth', e.target.value)}
                      placeholder="—"
                      className={`w-20 h-8 text-sm text-center bg-slate-900 border-slate-600 text-white ${
                        depthVal != null && depthVal <= TREAD_DEPTH_THRESHOLDS.critical ? 'border-red-500' :
                        depthVal != null && depthVal <= TREAD_DEPTH_THRESHOLDS.warning ? 'border-orange-500' : ''
                      }`}
                    />
                    <span className="text-slate-500 text-xs">mm</span>
                  </div>

                  {/* Pressure input */}
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="12"
                      value={rs.pressure}
                      onChange={e => setField(row.mountingId, 'pressure', e.target.value)}
                      placeholder="—"
                      className="w-16 h-8 text-sm text-center bg-slate-900 border-slate-600 text-white"
                    />
                    <span className="text-slate-500 text-xs">bar</span>
                  </div>

                  {/* Expand button (zone measures) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-slate-400 hover:text-white"
                    onClick={() => setExpanded(isExp ? null : row.mountingId)}
                    title="Mesures par zone (int/ctr/ext)"
                  >
                    {isExp ? '▲' : '▼'}
                  </Button>
                </div>

                {/* Zone measurements (expanded) */}
                {isExp && (
                  <div className="px-3 pb-2 pt-0 grid grid-cols-3 gap-2 border-t border-slate-700">
                    {(['depthInner', 'depthCenter', 'depthOuter'] as const).map((field, idx) => (
                      <div key={field}>
                        <Label className="text-slate-500 text-[10px]">
                          {idx === 0 ? 'Intérieur' : idx === 1 ? 'Centre' : 'Extérieur'} (mm)
                        </Label>
                        <Input
                          type="number"
                          step="0.1"
                          min="0"
                          max="30"
                          value={rs[field]}
                          onChange={e => setField(row.mountingId, field, e.target.value)}
                          placeholder="—"
                          className="h-7 text-xs text-center bg-slate-900 border-slate-600 text-white mt-0.5"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <DialogFooter className="pt-2 border-t border-slate-700">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-slate-400">
            Annuler
          </Button>
          <Button
            onClick={handleSave}
            disabled={loading}
            className="bg-cyan-700 hover:bg-cyan-800"
          >
            {loading ? 'Enregistrement...' : 'Enregistrer les mesures'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
