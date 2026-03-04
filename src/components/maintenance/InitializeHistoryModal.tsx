'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { createClient } from '@/lib/supabase/client'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Loader2, ClipboardList, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { initializeAllPredictions } from '@/actions/maintenance-predictions'
import type { MaintenancePrediction } from '@/lib/maintenance-predictor'

interface Props {
  open: boolean
  onOpenChange: (open: boolean) => void
  vehicleId: string
  vehicleCurrentKm: number
  /** Prédictions à initialiser ou mettre à jour */
  predictions: MaintenancePrediction[]
  onInitialized: () => void
}

const CATEGORY_LABELS: Record<string, string> = {
  moteur: 'Moteur', filtration: 'Filtration', freinage: 'Freinage',
  transmission: 'Transmission', suspension: 'Suspension', electricite: 'Électricité',
  carrosserie: 'Carrosserie', refrigeration: 'Réfrigération', attelage: 'Attelage',
  pneumatique: 'Pneumatiques', reglementaire: 'Réglementaire', autre: 'Autre',
}

function intervalLabel(pred: MaintenancePrediction): string {
  if (pred.intervalKm && pred.intervalMonths) {
    return `/${pred.intervalKm.toLocaleString('fr-FR')} km ou ${pred.intervalMonths} mois`
  }
  if (pred.intervalKm) return `/${pred.intervalKm.toLocaleString('fr-FR')} km`
  if (pred.intervalMonths) return `/${pred.intervalMonths} mois`
  return ''
}

interface RowState {
  lastKm: string
  lastDate: string
  skip: boolean
}

interface ValidationErrors {
  [key: string]: string
}

export function InitializeHistoryModal({
  open, onOpenChange, vehicleId, vehicleCurrentKm, predictions, onInitialized,
}: Props) {
  const today = new Date().toISOString().split('T')[0]
  const [vehicleDates, setVehicleDates] = useState<{technicalControlDate?: string, tachyControlDate?: string, atpDate?: string}>({})
  const [loadingVehicle, setLoadingVehicle] = useState(false)

  // Récupérer les dates réglementaires du véhicule pour pré-remplissage fallback
  useEffect(() => {
    if (!open || !vehicleId) return
    
    async function fetchVehicleDates() {
      setLoadingVehicle(true)
      try {
        const supabase = createClient()
        const { data } = await supabase
          .from('vehicles')
          .select('technical_control_date, tachy_control_date, atp_date')
          .eq('id', vehicleId)
          .single()
        
        if (data) {
          setVehicleDates({
            technicalControlDate: data.technical_control_date ?? undefined,
            tachyControlDate: data.tachy_control_date ?? undefined,
            atpDate: data.atp_date ?? undefined
          })
        }
      } catch (e) {
        console.error('Erreur récupération dates véhicule:', e)
      } finally {
        setLoadingVehicle(false)
      }
    }
    
    fetchVehicleDates()
  }, [open, vehicleId])

  // Fonction pour obtenir la date de fallback pour une prédiction réglementaire
  const getFallbackDate = (pred: MaintenancePrediction): string => {
    // Si la prédiction a déjà une date, on l'utilise
    if (pred.lastMaintenanceDate) {
      return new Date(pred.lastMaintenanceDate).toISOString().split('T')[0]
    }
    
    // Sinon, on utilise les dates du véhicule selon le type de règle
    const ruleNameLower = pred.ruleName.toLowerCase()
    if (ruleNameLower.includes('contrôle technique') || ruleNameLower.includes('controle technique')) {
      return vehicleDates.technicalControlDate || ''
    }
    if (ruleNameLower.includes('tachygraphe') || ruleNameLower.includes('tachy')) {
      return vehicleDates.tachyControlDate || ''
    }
    if (ruleNameLower.includes('atp') || ruleNameLower.includes('attestation transporteur')) {
      return vehicleDates.atpDate || ''
    }
    
    return ''
  }

  // État par prédiction (indexé par ruleId)
  // Initialisation avec les données des prédictions uniquement (dates véhicule chargées ensuite)
  const [rows, setRows] = useState<Record<string, RowState>>(() =>
    Object.fromEntries(predictions.map(p => [
      p.ruleId, 
      { 
        lastKm: p.lastMaintenanceKm?.toString() ?? '', 
        lastDate: p.lastMaintenanceDate 
          ? new Date(p.lastMaintenanceDate).toISOString().split('T')[0]
          : '',
        skip: false 
      }
    ]))
  )
  
  // Mettre à jour les rows quand les dates du véhicule sont chargées (fallback pour CT/Tachy/ATP)
  useEffect(() => {
    if (!vehicleDates.technicalControlDate && !vehicleDates.tachyControlDate && !vehicleDates.atpDate) return
    
    setRows(prev => {
      const updated = { ...prev }
      predictions.forEach(p => {
        // Si le champ date est vide et qu'on a une date de fallback véhicule
        if (!updated[p.ruleId]?.lastDate) {
          const ruleNameLower = p.ruleName.toLowerCase()
          let fallbackDate = ''
          
          if (ruleNameLower.includes('contrôle technique') || ruleNameLower.includes('controle technique')) {
            fallbackDate = vehicleDates.technicalControlDate || ''
          } else if (ruleNameLower.includes('tachygraphe') || ruleNameLower.includes('tachy')) {
            fallbackDate = vehicleDates.tachyControlDate || ''
          } else if (ruleNameLower.includes('atp') || ruleNameLower.includes('attestation transporteur')) {
            fallbackDate = vehicleDates.atpDate || ''
          }
          
          if (fallbackDate) {
            updated[p.ruleId] = { ...updated[p.ruleId], lastDate: fallbackDate }
          }
        }
      })
      return updated
    })
  }, [vehicleDates, predictions])
  
  // Mettre à jour les erreurs quand les rows changent
  const [errors, setErrors] = useState<ValidationErrors>({})
  
  useEffect(() => {
    const now = new Date()
    now.setHours(23, 59, 59, 999)
    const newErrors: ValidationErrors = {}
    
    predictions.forEach((p) => {
      const row = rows[p.ruleId]
      if (row?.lastDate) {
        const date = new Date(row.lastDate)
        if (date > now) {
          newErrors[`${p.ruleId}_date`] = '⚠️ Date dans le futur - à corriger'
        }
      }
    })
    
    setErrors(newErrors)
  }, [rows, predictions])
  
  const [loading, setLoading] = useState(false)

  const getRow = (ruleId: string): RowState =>
    rows[ruleId] ?? { lastKm: '', lastDate: '', skip: false }

  const updateRow = (ruleId: string, patch: Partial<RowState>) => {
    setRows(prev => ({ ...prev, [ruleId]: { ...getRow(ruleId), ...patch } }))
  }

  const activeCount = predictions.filter(p => !getRow(p.ruleId).skip).length

  const handleResetToday = () => {
    const updated: Record<string, RowState> = {}
    for (const p of predictions) {
      updated[p.ruleId] = {
        lastKm: p.triggerType !== 'time' ? vehicleCurrentKm.toString() : '',
        lastDate: p.triggerType !== 'km' ? today : '',
        skip: false,
      }
    }
    setRows(updated)
  }

  const validateEntries = (): boolean => {
    const newErrors: ValidationErrors = {}
    const today = new Date()
    today.setHours(23, 59, 59, 999)

    predictions.forEach((p, index) => {
      const row = getRow(p.ruleId)
      if (row.skip) return

      const keyPrefix = p.ruleId

      // Validation km
      if (row.lastKm) {
        const kmValue = parseInt(row.lastKm)
        if (isNaN(kmValue) || kmValue < 0) {
          newErrors[`${keyPrefix}_km`] = 'Kilométrage invalide'
        } else if (kmValue > vehicleCurrentKm) {
          newErrors[`${keyPrefix}_km`] = `Max: ${vehicleCurrentKm.toLocaleString('fr-FR')} km`
        }
      }

      // Validation date
      if (row.lastDate) {
        const entryDate = new Date(row.lastDate)
        if (isNaN(entryDate.getTime())) {
          newErrors[`${keyPrefix}_date`] = 'Date invalide'
        } else if (entryDate > today) {
          newErrors[`${keyPrefix}_date`] = 'Date future interdite'
        }
      }
    })

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async () => {
    // CORRECTION P1: Validation avant soumission
    if (!validateEntries()) {
      toast.error('Veuillez corriger les erreurs de saisie')
      return
    }

    setLoading(true)
    try {
      const entries = predictions.map(p => {
        const row = getRow(p.ruleId)
        const lastDoneKm = row.lastKm ? parseInt(row.lastKm) : undefined
        const lastDoneDate = row.lastDate || undefined
        return {
          ruleId: p.ruleId,
          lastDoneKm,
          lastDoneDate,
          approximateOnly: !lastDoneKm && !lastDoneDate,
          skip: row.skip,
        }
      })

      const result = await initializeAllPredictions({ vehicleId, entries })

      if (result.failed > 0) {
        toast.warning(`${result.succeeded} initialisées, ${result.failed} erreur(s)`)
      } else {
        toast.success(
          `${result.succeeded} maintenance${result.succeeded > 1 ? 's' : ''} initialisée${result.succeeded > 1 ? 's' : ''} — prochaines échéances recalculées`
        )
      }

      onInitialized()
      onOpenChange(false)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#0d1526] border-white/10 text-white max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-2 text-white">
            <ClipboardList className="h-4 w-4 text-cyan-400" />
            Initialiser l&apos;historique de maintenance
          </DialogTitle>
        </DialogHeader>

        {/* Info */}
        <div className="shrink-0 flex items-start gap-2 rounded-lg border border-blue-500/20 bg-blue-500/10 p-3 text-xs text-blue-300">
          <Info className="h-4 w-4 shrink-0 mt-0.5 text-blue-400" />
          <p>
            Ce véhicule n&apos;a pas d&apos;historique pour {predictions.length} maintenance{predictions.length > 1 ? 's' : ''}.
            Renseignez les dernières interventions connues pour que le système calcule les vraies prochaines échéances.
            <strong className="block mt-0.5 text-blue-200">Les lignes non renseignées resteront en alerte.</strong>
          </p>
        </div>

        <div className="shrink-0 flex items-center gap-2 text-xs text-slate-400 px-1">
          <span>Kilométrage actuel :</span>
          <span className="font-mono font-medium text-white">
            {vehicleCurrentKm.toLocaleString('fr-FR')} km
          </span>
        </div>

        {/* Tableau scrollable */}
        <div className="flex-1 overflow-y-auto min-h-0 rounded-lg border border-white/10">
          <table className="w-full text-sm">
            <thead className="sticky top-0 bg-[#0d1526] z-10">
              <tr className="border-b border-white/10 text-slate-400 text-xs uppercase tracking-wider">
                <th className="text-left px-3 py-2.5 font-medium">#</th>
                <th className="text-left px-3 py-2.5 font-medium">Maintenance</th>
                <th className="text-left px-3 py-2.5 font-medium">Dernier km</th>
                <th className="text-left px-3 py-2.5 font-medium">Date</th>
                <th className="text-center px-3 py-2.5 font-medium">Skip</th>
              </tr>
            </thead>
            <tbody>
              {predictions.map((pred, i) => {
                const row = getRow(pred.ruleId)
                const isSkipped = row.skip
                return (
                  <tr
                    key={pred.ruleId}
                    className={cn(
                      'border-b border-white/5',
                      isSkipped ? 'opacity-40' : '',
                      i % 2 === 0 ? '' : 'bg-white/[0.02]'
                    )}
                  >
                    <td className="px-3 py-2.5 text-slate-500 text-xs">{i + 1}</td>
                    <td className="px-3 py-2.5">
                      <div className="font-medium text-white text-sm leading-tight">{pred.ruleName}</div>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {CATEGORY_LABELS[pred.category] ?? pred.category} · {intervalLabel(pred)}
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      {pred.triggerType !== 'time' ? (
                        <div className="space-y-1">
                          <Input
                            type="number"
                            placeholder="190 000"
                            value={row.lastKm}
                            onChange={e => updateRow(pred.ruleId, { lastKm: e.target.value })}
                            disabled={isSkipped}
                            className={`h-7 w-28 text-xs bg-[#0f172a] border-white/10 text-white placeholder:text-slate-700 ${errors[`${pred.ruleId}_km`] ? 'border-red-500' : ''}`}
                          />
                          {errors[`${pred.ruleId}_km`] && (
                            <p className="text-[10px] text-red-400">{errors[`${pred.ruleId}_km`]}</p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {pred.triggerType !== 'km' ? (
                        <div className="space-y-1">
                          <Input
                            type="date"
                            value={row.lastDate}
                            onChange={e => updateRow(pred.ruleId, { lastDate: e.target.value })}
                            disabled={isSkipped}
                            className={`h-7 w-32 text-xs bg-[#0f172a] border-white/10 text-white ${errors[`${pred.ruleId}_date`]?.includes('⚠️') ? 'border-orange-500' : errors[`${pred.ruleId}_date`] ? 'border-red-500' : ''}`}
                          />
                          {errors[`${pred.ruleId}_date`] && (
                            <p className={`text-[10px] ${errors[`${pred.ruleId}_date`]?.includes('⚠️') ? 'text-orange-400' : 'text-red-400'}`}>
                              {errors[`${pred.ruleId}_date`]}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-600 italic">N/A</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <Checkbox
                        checked={isSkipped}
                        onCheckedChange={v => updateRow(pred.ruleId, { skip: !!v })}
                        className="border-slate-600 data-[state=checked]:bg-slate-600 data-[state=checked]:border-slate-500"
                      />
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* Astuce */}
        <p className="shrink-0 text-xs text-slate-500 italic px-1">
          💡 Laissez km et date vides pour remettre le compteur à partir d&apos;aujourd&apos;hui (km actuel).
        </p>

        {/* Boutons */}
        <div className="shrink-0 flex items-center justify-between gap-3 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleResetToday}
            className="text-xs border-slate-600 text-slate-300 hover:bg-slate-700"
          >
            Tout remettre à aujourd&apos;hui
          </Button>

          <div className="flex gap-2">
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
              disabled={loading || activeCount === 0}
              className="bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/30"
            >
              {loading && <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />}
              Enregistrer ({activeCount})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
