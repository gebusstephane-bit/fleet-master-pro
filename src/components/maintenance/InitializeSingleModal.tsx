'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initializePrediction } from '@/actions/maintenance-predictions'
import type { MaintenancePrediction } from '@/lib/maintenance-predictor'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  prediction: MaintenancePrediction
  vehicleCurrentKm: number
  onInitialized: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  moteur: 'Moteur', filtration: 'Filtration', freinage: 'Freinage',
  transmission: 'Transmission', suspension: 'Suspension', electricite: 'Électricité',
  carrosserie: 'Carrosserie', refrigeration: 'Réfrigération', attelage: 'Attelage',
  pneumatique: 'Pneumatiques', reglementaire: 'Réglementaire', autre: 'Autre',
}

export function InitializeSingleModal({ open, onOpenChange, prediction, vehicleCurrentKm, onInitialized }: Props) {
  const [mode, setMode] = useState<'exact' | 'approximate'>('approximate')
  const [lastDoneKm, setLastDoneKm] = useState('')
  const [lastDoneDate, setLastDoneDate] = useState('')
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(false)

  const intervalLabel = prediction.intervalKm
    ? `${prediction.intervalKm.toLocaleString('fr-FR')} km`
    : prediction.intervalMonths
    ? `${prediction.intervalMonths} mois`
    : '—'

  const nextKmPreview = mode === 'exact' && lastDoneKm
    ? (parseInt(lastDoneKm) + (prediction.intervalKm ?? 0)).toLocaleString('fr-FR') + ' km'
    : mode === 'approximate' && prediction.intervalKm
    ? (vehicleCurrentKm + prediction.intervalKm).toLocaleString('fr-FR') + ' km'
    : null

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const result = await initializePrediction({
        vehicleId: prediction.vehicleId,
        ruleId: prediction.ruleId,
        lastDoneKm: mode === 'exact' && lastDoneKm ? parseInt(lastDoneKm) : undefined,
        lastDoneDate: mode === 'exact' && lastDoneDate ? lastDoneDate : undefined,
        approximateOnly: mode === 'approximate',
        notes: notes || undefined,
      })

      if (result?.error) {
        toast.error(result.error)
        return
      }

      toast.success(
        `${prediction.ruleName} initialisée${result?.next_due_km ? ` — prochain rappel à ${result.next_due_km.toLocaleString('fr-FR')} km` : ''}`
      )
      onInitialized()
      onOpenChange(false)
      // Réinitialiser le formulaire
      setMode('approximate')
      setLastDoneKm('')
      setLastDoneDate('')
      setNotes('')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Wrench className="h-4 w-4 text-cyan-400" />
            Initialiser : {prediction.ruleName}
          </DialogTitle>
          <p className="text-xs text-slate-400">
            {CATEGORY_LABELS[prediction.category] ?? prediction.category} · Intervalle : {intervalLabel}
          </p>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Choix du mode */}
          <div className="space-y-2">
            {/* Option 1 */}
            <button
              type="button"
              onClick={() => setMode('exact')}
              className={cn(
                'w-full text-left rounded-lg border p-3 transition-colors',
                mode === 'exact'
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  'h-3.5 w-3.5 rounded-full border-2 shrink-0',
                  mode === 'exact' ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'
                )} />
                <span className="text-sm font-medium text-white">Je connais le km exact</span>
              </div>
              <p className="text-xs text-slate-400 pl-5.5">
                Ex : freins refaits à 190 000 km le 15/01/2025
              </p>
            </button>

            {/* Option 2 */}
            <button
              type="button"
              onClick={() => setMode('approximate')}
              className={cn(
                'w-full text-left rounded-lg border p-3 transition-colors',
                mode === 'approximate'
                  ? 'border-cyan-500/50 bg-cyan-500/10'
                  : 'border-white/10 bg-white/5 hover:bg-white/10'
              )}
            >
              <div className="flex items-center gap-2 mb-1">
                <div className={cn(
                  'h-3.5 w-3.5 rounded-full border-2 shrink-0',
                  mode === 'approximate' ? 'border-cyan-400 bg-cyan-400' : 'border-slate-500'
                )} />
                <span className="text-sm font-medium text-white">Fait récemment (sans km précis)</span>
              </div>
              {nextKmPreview && (
                <p className="text-xs text-cyan-400/80 pl-5.5 mt-0.5">
                  → Prochain rappel à {nextKmPreview} ({vehicleCurrentKm.toLocaleString('fr-FR')} + {prediction.intervalKm?.toLocaleString('fr-FR')} km)
                </p>
              )}
            </button>
          </div>

          {/* Champs km exact */}
          {mode === 'exact' && (
            <div className="grid grid-cols-2 gap-3">
              {prediction.triggerType !== 'time' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Dernier km</Label>
                  <Input
                    type="number"
                    placeholder={vehicleCurrentKm.toLocaleString('fr-FR')}
                    value={lastDoneKm}
                    onChange={e => setLastDoneKm(e.target.value)}
                    className="bg-[#0f172a] border-white/10 text-white placeholder:text-slate-600 text-sm h-8"
                  />
                </div>
              )}
              {prediction.triggerType !== 'km' && (
                <div className="space-y-1.5">
                  <Label className="text-xs text-slate-300">Date</Label>
                  <Input
                    type="date"
                    value={lastDoneDate}
                    onChange={e => setLastDoneDate(e.target.value)}
                    className="bg-[#0f172a] border-white/10 text-white text-sm h-8"
                  />
                </div>
              )}
            </div>
          )}

          {/* Notes */}
          <div className="space-y-1.5">
            <Label className="text-xs text-slate-300">Notes (optionnel)</Label>
            <Input
              placeholder="Ex : Initialisé à la reprise du véhicule"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              className="bg-[#0f172a] border-white/10 text-white placeholder:text-slate-600 text-sm h-8"
            />
          </div>

          {/* Boutons */}
          <div className="flex justify-end gap-2 pt-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white"
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading}
              className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Initialiser
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
