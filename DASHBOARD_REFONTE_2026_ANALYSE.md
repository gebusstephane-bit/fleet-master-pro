# 📊 RAPPORT D'ANALYSE - Refonte Dashboard FleetMaster Pro v2026

**Date**: 2026-03-04  
**Mission**: Transformation SaaS Enterprise Grade  
**Auteur**: Tech Lead Frontend + Data Engineer

---

## 1.1 ANALYSE SCHÉMA SQL - DONNÉES DISPONIBLES

### Tables identifiées et mapping

| Table | Champs clés | Utilisation Dashboard | État |
|-------|-------------|----------------------|------|
| **vehicles** | id, status, mileage, next_maintenance_date, company_id | KPI Véhicules, Fiabilité | ✅ Réel |
| **drivers** | id, license_status, status, company_id | KPI Chauffeurs | ✅ Réel |
| **maintenance_predictions** | status (overdue/due/upcoming/ok), vehicle_id, company_id | Maintenance Fleet Overview | ✅ Réel |
| **maintenance_records** | cost, scheduled_date, completed_date, status | Analytics coûts | ✅ Réel |
| **fuel_records** | volume, total_cost, date, vehicle_id | Analytics carburant | ✅ Réel |
| **incidents** | date, cost, status, gravity, vehicle_id | Widget Sinistralité | ✅ Réel |
| **inspections** | control_type, validity_date, result, vehicle_id | KPI Inspections | ✅ Réel |
| **activity_logs** | action_type, entity_name, created_at | Activity Feed | ✅ Réel |
| **alerts** | type, severity, read_status, created_at, company_id | Alerts Panel | ✅ Réel |

### Conclusion données
✅ **AUCUNE DONNÉE MOCKÉE DÉTECTÉE** - Le dashboard utilise déjà des données 100% réelles via:
- `actions/dashboard.ts` → `getDashboardStats()`
- `actions/dashboard-analytics.ts` → `getDashboardAnalytics()`
- Hooks React Query avec refetch 10s (stats) et staleTime 5min (analytics)

---

## 1.2 AUDIT COMPOSANTS EXISTANTS

### Architecture actuelle
```
app/(dashboard)/dashboard/page.tsx
├── Hooks: useDashboardStats, useDashboardAnalytics, useVehicles, useUser
├── Composants:
│   ├── MetricCard (glassmorphism ✅)
│   ├── GlassCard (glassmorphism ✅)
│   ├── MaintenanceFleetOverview (glassmorphism ✅)
│   ├── MaintenanceUrgenciesWidget
│   ├── IncidentStatsWidget (glassmorphism ✅)
│   ├── CriticalVehiclesWidget
│   ├── AnalyticsSection (avec charts Recharts)
│   └── Quick Actions (glassmorphism ✅)
```

### Problèmes identifiés

| Composant | Problème | Sévérité |
|-----------|----------|----------|
| `stats-cards.tsx` | Utilise `bg-blue-50`, `bg-green-50`, `text-gray-600` | 🔴 Haute |
| `kpi-cards.tsx` | Utilise `bg-blue-50`, `bg-red-50`, `text-gray-400` | 🔴 Haute |
| `AlertsPanel.tsx` | Utilise `bg-red-50`, `bg-amber-50`, `border-red-200` | 🔴 Haute |
| `activity-feed.tsx` | Utilise `bg-blue-50`, `bg-slate-50`, `text-gray-300` | 🔴 Haute |
| `page.tsx` | Carte "Tournées" = 0 (données inexistantes) | 🟡 Moyenne |

---

## 1.3 MAPPING DONNÉES vs AFFICHAGE

### KPIs Header (déjà réels)
```typescript
// Source: actions/dashboard.ts
{
  vehicles: { total, active, maintenance, inactive },
  drivers: { total, active },
  maintenances: { urgent, upcoming, inProgress },
  inspections: { pending, completedThisMonth },
  routes: { today, ongoing }, // ← TOUJOURS 0 (table routes inexistante)
  costs: { fuel, maintenance, total }
}
```

### Widget Maintenance Fleet Overview
```typescript
// Source: maintenance_predictions table
{
  overdue: number,  // Critique
  due: number,      // À faire
  upcoming: number, // À prévoir
  ok: number        // OK
}
```

### Widget Sinistralité
```typescript
// Source: incidents table (12 derniers mois)
{
  total: number,
  totalCost: number,
  byMonth: Record<string, number>,
  topVehicle?: { label, count },
  topDriver?: { label, count }
}
```

---

## 2. PLAN DE CORRECTION

### 2.1 Suppressions (conforme mission)
- ❌ **Carte "Tournées"** du grid principal (données inexistantes)
- ❌ **Référence aux routes** dans les KPIs

### 2.2 Corrections Glassmorphism
Remplacer tous les `bg-{color}-50` par:
```
bg-red-50 → bg-red-500/10 border-red-500/30
bg-blue-50 → bg-blue-500/10 border-blue-500/30  
bg-amber-50 → bg-amber-500/10 border-amber-500/30
bg-green-50 → bg-emerald-500/10 border-emerald-500/30
bg-slate-50 → bg-[#0f172a]/40 border-cyan-500/20
```

### 2.3 Corrections Typographie
```
text-gray-600 → text-muted-foreground
text-gray-400 → text-slate-400
text-gray-300 → text-slate-400
text-gray-500 → text-slate-500
```

---

## 3. REQUÊTES SQL EXISTANTES (VALIDÉES)

### getDashboardStats (actions/dashboard.ts)
```sql
-- Véhicules
SELECT COUNT(*) FROM vehicles 
WHERE company_id = [auth_user_company] AND status = 'active'

-- Chauffeurs  
SELECT COUNT(*) FROM drivers
WHERE company_id = [auth_user_company] AND status = 'available'

-- Maintenances urgentes
SELECT COUNT(*) FROM maintenance_predictions
WHERE company_id = [auth_user_company] AND status = 'overdue'

-- Inspections en attente
SELECT COUNT(*) FROM inspections
WHERE company_id = [auth_user_company] AND status = 'pending'
```

### getDashboardAnalytics (actions/dashboard-analytics.ts)
```sql
-- Coûts carburant (mois en cours)
SELECT COALESCE(SUM(total_cost), 0) FROM fuel_records
WHERE company_id = [auth_user_company] 
AND date >= DATE_TRUNC('month', NOW())

-- Coûts maintenance (mois en cours)
SELECT COALESCE(SUM(cost), 0) FROM maintenance_records
WHERE company_id = [auth_user_company]
AND completed_date >= DATE_TRUNC('month', NOW())
AND status = 'completed'
```

---

## 4. CONCLUSION

### État actuel vs Cible

| Critère | Actuel | Cible | Action |
|---------|--------|-------|--------|
| Données réelles | ✅ 100% | 100% | Aucune |
| Glassmorphism | ⚠️ Partiel | Complet | Correction CSS |
| Zero mocks | ✅ Oui | Oui | Aucune |
| RLS sécurité | ✅ OK | OK | Aucune |
| Carte Tournées | ❌ 0 | Supprimer | Supprimer code |

### Breaking changes
**AUCUN** - Seules des corrections visuelles et une suppression de fonctionnalité fantôme.

---

## 5. FICHIERS À MODIFIER

1. `src/app/(dashboard)/dashboard/page.tsx` - Suppression Tournées
2. `src/components/dashboard/kpi-cards.tsx` - Glassmorphism
3. `src/components/dashboard/stats-cards.tsx` - Glassmorphism  
4. `src/components/dashboard/AlertsPanel.tsx` - Glassmorphism
5. `src/components/dashboard/activity-feed.tsx` - Glassmorphism

**Total**: 5 fichiers
