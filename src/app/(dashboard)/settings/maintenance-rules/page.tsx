'use client'

import { useEffect, useState } from 'react'
import {
  Plus, Trash2, Shield, Building2, Loader2, Info, ChevronDown, ChevronUp
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

// ──────────────────────────────────────────────────────────────
// Types
// ──────────────────────────────────────────────────────────────
interface MaintenanceRule {
  id: string
  name: string
  description: string | null
  category: string
  trigger_type: string
  interval_km: number | null
  interval_months: number | null
  applicable_vehicle_types: string[] | null
  alert_km_before: number | null
  alert_days_before: number | null
  is_active: boolean
  is_system_rule: boolean
  priority: string
  company_id: string | null
}

// ──────────────────────────────────────────────────────────────
// Constantes
// ──────────────────────────────────────────────────────────────
const CATEGORIES = [
  { value: 'moteur',        label: 'Moteur' },
  { value: 'filtration',   label: 'Filtration' },
  { value: 'freinage',     label: 'Freinage' },
  { value: 'transmission', label: 'Transmission' },
  { value: 'suspension',   label: 'Suspension' },
  { value: 'electricite',  label: 'Électricité' },
  { value: 'carrosserie',  label: 'Carrosserie' },
  { value: 'refrigeration',label: 'Réfrigération' },
  { value: 'attelage',     label: 'Attelage' },
  { value: 'pneumatique',  label: 'Pneumatiques' },
  { value: 'reglementaire',label: 'Réglementaire' },
  { value: 'autre',        label: 'Autre' },
]

const VEHICLE_TYPES = [
  { value: 'VOITURE',           label: 'Voiture' },
  { value: 'FOURGON',           label: 'Fourgon / Utilitaire' },
  { value: 'POIDS_LOURD',       label: 'Poids Lourd' },
  { value: 'POIDS_LOURD_FRIGO', label: 'PL Frigorifique' },
]

const PRIORITY_CFG: Record<string, string> = {
  critical: 'bg-red-500/20 text-red-300 border-red-500/30',
  high:     'bg-orange-500/20 text-orange-300 border-orange-500/30',
  medium:   'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  low:      'bg-slate-500/20 text-slate-300 border-slate-500/30',
}

const PRIORITY_LABELS: Record<string, string> = {
  critical: 'Critique', high: 'Haute', medium: 'Moyenne', low: 'Basse',
}

const CATEGORY_LABELS: Record<string, string> = Object.fromEntries(
  CATEGORIES.map(c => [c.value, c.label])
)

// ──────────────────────────────────────────────────────────────
// Composant règle système (lecture seule)
// ──────────────────────────────────────────────────────────────
function SystemRuleRow({ rule }: { rule: MaintenanceRule }) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-white/10 rounded-xl overflow-hidden">
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <Badge variant="outline" className={cn('text-xs border shrink-0', PRIORITY_CFG[rule.priority])}>
          {PRIORITY_LABELS[rule.priority]}
        </Badge>
        <span className="font-medium text-white text-sm flex-1 min-w-0 truncate">{rule.name}</span>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs text-slate-500 hidden sm:block">
            {CATEGORY_LABELS[rule.category] ?? rule.category}
          </span>
          <span className="text-xs text-slate-600">
            {rule.interval_km ? `${rule.interval_km.toLocaleString('fr-FR')} km` : ''}
            {rule.interval_km && rule.interval_months ? ' · ' : ''}
            {rule.interval_months ? `${rule.interval_months} mois` : ''}
          </span>
          {expanded
            ? <ChevronUp className="h-4 w-4 text-slate-400" />
            : <ChevronDown className="h-4 w-4 text-slate-400" />
          }
        </div>
      </div>

      {expanded && rule.description && (
        <div className="px-4 pb-4 text-sm text-slate-400 bg-white/[0.02] border-t border-white/10">
          <p className="mt-3 leading-relaxed">{rule.description}</p>
          <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
            {rule.applicable_vehicle_types?.map(t => (
              <span key={t} className="px-2 py-0.5 rounded bg-white/5 border border-white/10">
                {VEHICLE_TYPES.find(v => v.value === t)?.label ?? t}
              </span>
            ))}
            {rule.alert_km_before && <span>Alerte à {rule.alert_km_before.toLocaleString('fr-FR')} km</span>}
            {rule.alert_days_before && <span>Alerte à {rule.alert_days_before} jours</span>}
          </div>
        </div>
      )}
    </div>
  )
}

// ──────────────────────────────────────────────────────────────
// Formulaire règle personnalisée
// ──────────────────────────────────────────────────────────────
interface RuleFormState {
  name: string
  description: string
  category: string
  trigger_type: string
  interval_km: string
  interval_months: string
  applicable_vehicle_types: string[]
  alert_km_before: string
  alert_days_before: string
  priority: string
}

const EMPTY_FORM: RuleFormState = {
  name: '', description: '', category: 'moteur',
  trigger_type: 'both', interval_km: '', interval_months: '',
  applicable_vehicle_types: [], alert_km_before: '2000', alert_days_before: '30',
  priority: 'medium',
}

function CompanyRuleForm({ onSaved, companyId }: { onSaved: () => void; companyId: string }) {
  const [form, setForm] = useState<RuleFormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  function toggleVehicleType(type: string) {
    setForm(f => ({
      ...f,
      applicable_vehicle_types: f.applicable_vehicle_types.includes(type)
        ? f.applicable_vehicle_types.filter(t => t !== type)
        : [...f.applicable_vehicle_types, type],
    }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!form.name.trim()) { setError('Le nom est obligatoire.'); return }
    setError(null)
    setSaving(true)

    try {
      const payload = {
        company_id: companyId,
        name: form.name.trim(),
        description: form.description.trim() || null,
        category: form.category,
        trigger_type: form.trigger_type,
        interval_km: form.interval_km ? parseInt(form.interval_km) : null,
        interval_months: form.interval_months ? parseInt(form.interval_months) : null,
        applicable_vehicle_types: form.applicable_vehicle_types.length
          ? form.applicable_vehicle_types
          : null,
        alert_km_before: form.alert_km_before ? parseInt(form.alert_km_before) : 2000,
        alert_days_before: form.alert_days_before ? parseInt(form.alert_days_before) : 30,
        priority: form.priority,
        is_system_rule: false,
        is_active: true,
      }

      const { error: dbErr } = await supabase.from('maintenance_rules').insert(payload)
      if (dbErr) throw dbErr

      setForm(EMPTY_FORM)
      onSaved()
    } catch (err: any) {
      setError(err.message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="sm:col-span-2">
          <Label className="text-slate-300">Nom de la règle *</Label>
          <Input
            value={form.name}
            onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
            placeholder="ex: Vidange moteur BOM"
            className="mt-1.5 bg-[#0d1526] border-white/10 text-white"
          />
        </div>

        <div>
          <Label className="text-slate-300">Catégorie</Label>
          <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
            <SelectTrigger className="mt-1.5 bg-[#0d1526] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1526] border-white/10">
              {CATEGORIES.map(c => (
                <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">Priorité</Label>
          <Select value={form.priority} onValueChange={v => setForm(f => ({ ...f, priority: v }))}>
            <SelectTrigger className="mt-1.5 bg-[#0d1526] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1526] border-white/10">
              <SelectItem value="critical">Critique</SelectItem>
              <SelectItem value="high">Haute</SelectItem>
              <SelectItem value="medium">Moyenne</SelectItem>
              <SelectItem value="low">Basse</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label className="text-slate-300">Déclencheur</Label>
          <Select value={form.trigger_type} onValueChange={v => setForm(f => ({ ...f, trigger_type: v }))}>
            <SelectTrigger className="mt-1.5 bg-[#0d1526] border-white/10 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-[#0d1526] border-white/10">
              <SelectItem value="km">Kilométrage seulement</SelectItem>
              <SelectItem value="time">Temps seulement</SelectItem>
              <SelectItem value="both">Kilométrage ET temps</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {(form.trigger_type === 'km' || form.trigger_type === 'both') && (
          <div>
            <Label className="text-slate-300">Intervalle (km)</Label>
            <Input
              type="number"
              value={form.interval_km}
              onChange={e => setForm(f => ({ ...f, interval_km: e.target.value }))}
              placeholder="ex: 20000"
              className="mt-1.5 bg-[#0d1526] border-white/10 text-white"
            />
          </div>
        )}

        {(form.trigger_type === 'time' || form.trigger_type === 'both') && (
          <div>
            <Label className="text-slate-300">Intervalle (mois)</Label>
            <Input
              type="number"
              value={form.interval_months}
              onChange={e => setForm(f => ({ ...f, interval_months: e.target.value }))}
              placeholder="ex: 12"
              className="mt-1.5 bg-[#0d1526] border-white/10 text-white"
            />
          </div>
        )}

        {(form.trigger_type === 'km' || form.trigger_type === 'both') && (
          <div>
            <Label className="text-slate-300">Alerter X km avant</Label>
            <Input
              type="number"
              value={form.alert_km_before}
              onChange={e => setForm(f => ({ ...f, alert_km_before: e.target.value }))}
              className="mt-1.5 bg-[#0d1526] border-white/10 text-white"
            />
          </div>
        )}

        {(form.trigger_type === 'time' || form.trigger_type === 'both') && (
          <div>
            <Label className="text-slate-300">Alerter X jours avant</Label>
            <Input
              type="number"
              value={form.alert_days_before}
              onChange={e => setForm(f => ({ ...f, alert_days_before: e.target.value }))}
              className="mt-1.5 bg-[#0d1526] border-white/10 text-white"
            />
          </div>
        )}
      </div>

      {/* Types de véhicules */}
      <div>
        <Label className="text-slate-300">Types de véhicules concernés (vide = tous)</Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {VEHICLE_TYPES.map(t => (
            <button
              key={t.value}
              type="button"
              onClick={() => toggleVehicleType(t.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-sm border transition-colors',
                form.applicable_vehicle_types.includes(t.value)
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                  : 'bg-white/5 text-slate-400 border-white/10 hover:border-white/20'
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Description */}
      <div>
        <Label className="text-slate-300">Description (optionnel)</Label>
        <textarea
          value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          rows={2}
          placeholder="Détails, référence constructeur..."
          className="mt-1.5 w-full rounded-md bg-[#0d1526] border border-white/10 text-white text-sm p-2.5 resize-none focus:outline-none focus:ring-1 focus:ring-cyan-500"
        />
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <Button
        type="submit"
        disabled={saving}
        className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
        Créer la règle
      </Button>
    </form>
  )
}

// ──────────────────────────────────────────────────────────────
// Page principale
// ──────────────────────────────────────────────────────────────
export default function MaintenanceRulesSettingsPage() {
  const [systemRules, setSystemRules] = useState<MaintenanceRule[]>([])
  const [companyRules, setCompanyRules] = useState<MaintenanceRule[]>([])
  const [loading, setLoading] = useState(true)
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  async function loadRules() {
    setLoading(true)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single()

      if (!profile?.company_id) return
      setCompanyId(profile.company_id)

      const { data: rules } = await supabase
        .from('maintenance_rules')
        .select('*')
        .order('category')
        .order('name')

      const sys = rules?.filter(r => r.is_system_rule) ?? []
      const comp = rules?.filter(r => !r.is_system_rule && r.company_id === profile.company_id) ?? []
      setSystemRules(sys as MaintenanceRule[])
      setCompanyRules(comp as MaintenanceRule[])
    } finally {
      setLoading(false)
    }
  }

  async function deleteRule(id: string) {
    setDeleting(id)
    try {
      await supabase.from('maintenance_rules').delete().eq('id', id)
      setCompanyRules(r => r.filter(x => x.id !== id))
    } finally {
      setDeleting(null)
    }
  }

  useEffect(() => { loadRules() }, [])

  const groupedSystem = systemRules.reduce((acc, r) => {
    const cat = r.category ?? 'autre'
    if (!acc[cat]) acc[cat] = []
    acc[cat].push(r)
    return acc
  }, {} as Record<string, MaintenanceRule[]>)

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-2xl font-bold text-white">Règles de maintenance</h1>
        <p className="text-slate-400 text-sm mt-1">
          Configurez les règles de maintenance préventive pour votre flotte.
        </p>
      </div>

      <Tabs defaultValue="system">
        <TabsList className="bg-[#0d1526]/80 border border-white/10">
          <TabsTrigger value="system" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <Shield className="h-4 w-4 mr-2" />
            Règles système ({systemRules.length})
          </TabsTrigger>
          <TabsTrigger value="custom" className="data-[state=active]:bg-cyan-500/20 data-[state=active]:text-cyan-300">
            <Building2 className="h-4 w-4 mr-2" />
            Mes règles ({companyRules.length})
          </TabsTrigger>
        </TabsList>

        {/* ─── Onglet règles système ─── */}
        <TabsContent value="system" className="mt-6">
          <div className="flex items-start gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 mb-6">
            <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-300">
              Ces règles sont fournies par FleetMaster Pro et basées sur les préconisations constructeurs.
              Elles s&apos;appliquent automatiquement à toute votre flotte et ne peuvent pas être modifiées ou supprimées.
            </p>
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12 text-slate-400">
              <Loader2 className="h-5 w-5 animate-spin mr-2" />
              Chargement...
            </div>
          )}

          {!loading && Object.entries(groupedSystem).map(([cat, rules]) => (
            <div key={cat} className="mb-6">
              <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-3">
                {CATEGORY_LABELS[cat] ?? cat}
              </h3>
              <div className="space-y-2">
                {rules.map(r => <SystemRuleRow key={r.id} rule={r} />)}
              </div>
            </div>
          ))}
        </TabsContent>

        {/* ─── Onglet règles personnalisées ─── */}
        <TabsContent value="custom" className="mt-6 space-y-6">
          {/* Formulaire création */}
          <Card className="bg-[#0d1526]/80 border border-white/10">
            <CardHeader>
              <CardTitle className="text-white text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-cyan-400" />
                Ajouter une règle personnalisée
              </CardTitle>
            </CardHeader>
            <CardContent>
              {companyId && (
                <CompanyRuleForm
                  companyId={companyId}
                  onSaved={() => loadRules()}
                />
              )}
            </CardContent>
          </Card>

          {/* Liste règles existantes */}
          {loading ? (
            <div className="flex items-center justify-center py-8 text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
              Chargement...
            </div>
          ) : companyRules.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              Aucune règle personnalisée. Créez votre première règle ci-dessus.
            </div>
          ) : (
            <div className="space-y-2">
              {companyRules.map(rule => (
                <div
                  key={rule.id}
                  className="flex items-center gap-3 p-4 rounded-xl border border-white/10 bg-[#0d1526]/40 hover:bg-white/5 transition-colors"
                >
                  <Badge variant="outline" className={cn('text-xs border shrink-0', PRIORITY_CFG[rule.priority])}>
                    {PRIORITY_LABELS[rule.priority]}
                  </Badge>
                  <span className="font-medium text-white text-sm flex-1 min-w-0 truncate">
                    {rule.name}
                  </span>
                  <span className="text-xs text-slate-500 hidden sm:block">
                    {CATEGORY_LABELS[rule.category] ?? rule.category}
                  </span>
                  <span className="text-xs text-slate-600">
                    {rule.interval_km ? `${rule.interval_km.toLocaleString('fr-FR')} km` : ''}
                    {rule.interval_km && rule.interval_months ? ' · ' : ''}
                    {rule.interval_months ? `${rule.interval_months} mois` : ''}
                  </span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-7 w-7 text-slate-500 hover:text-red-400 hover:bg-red-500/10 shrink-0"
                    onClick={() => deleteRule(rule.id)}
                    disabled={deleting === rule.id}
                  >
                    {deleting === rule.id
                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      : <Trash2 className="h-3.5 w-3.5" />
                    }
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
