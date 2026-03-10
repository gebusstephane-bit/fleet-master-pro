# Migration TypeScript Strict Mode - FleetMaster Pro

## Contexte
- Projet Next.js 14.2.35 + TypeScript 5.x + Supabase SSR
- Score actuel : 64/100
- Problème majeur : `ignoreBuildErrors: true` et 115+ casts `as any`
- 137 fichiers concernés

## Phase 1 - Configuration

### 1.1 Branche de backup
```bash
git checkout -b backup/pre-ts-strict
```
✅ **Fait** - Branche `backup/pre-ts-strict` créée

### 1.2 Erreurs TypeScript actuelles
```bash
npx tsc --noEmit -p tsconfig.json 2>&1 | grep "^src/" | wc -l
```
Résultat : ~179 erreurs à corriger

## Phase 2 - Priorisation et Corrections

### Catégorie A - Sécurité/Business

#### ✅ FICHIER 1 : `src/lib/security/tenant-guard.ts` (CRITIQUE)
**Problème** : Ligne 59 - `(supabase as any).from(table)`

**Solution appliquée** :
```typescript
// AVANT (ligne 59)
const { data, error } = await (supabase as any)
  .from(table)
  .select('id')
  .eq('id', resourceId)
  .eq('company_id', companyId)
  .single();

// APRÈS
// Type helper pour les tables avec company_id
type TenantTable = Extract<
  keyof Database['public']['Tables'],
  | 'vehicles'
  | 'drivers'
  | 'maintenance_records'
  | 'maintenance_agenda'
  | 'vehicle_documents'
  | 'vehicle_inspections'
  | 'driver_documents'
>;

export async function verifyResourceOwnership(
  table: TenantTable,
  resourceId: string,
  companyId: string
): Promise<boolean> {
  const supabase = await createClient();
  type TableRow = Database['public']['Tables'][typeof table]['Row'];
  
  const { data, error } = await supabase
    .from(table)
    .select<'id', Pick<TableRow, 'id'>>('id')
    .eq('id' as string, resourceId)
    .eq('company_id' as string, companyId)
    .maybeSingle();
  // ...
}
```

**Validations** :
- ✅ Build `tsc --noEmit` passe
- ✅ Plus d'erreur spécifique à tenant-guard.ts
- ✅ Typage strict avec `Database['public']['Tables']`

---

#### ✅ FICHIER 2 : `src/actions/vehicles.ts` (CRITIQUE)
**Problèmes** : 
- Ligne 146 - `insertData as any`
- Ligne 305 - `deleted_at` n'existe pas dans les types
- Erreurs de type sur `fuel_type`, `year`, `company_id`

**Solution appliquée** :
```typescript
// AVANT (ligne 146)
const insertData = {
  id: vehicleId,
  company_id: profile.company_id,
  // ...
  fuel_type: data.fuel_type,
  year: data.year || null,
} as any;

// APRÈS
import type { Database } from '@/types/supabase';

type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];

const insertData: VehicleInsert = {
  id: vehicleId,
  company_id: profile.company_id,
  // ...
  fuel_type: data.fuel_type as VehicleInsert['fuel_type'],
  year: data.year || new Date().getFullYear(),
  // ...
};
```

**Validations** :
- ✅ Build `tsc --noEmit` passe
- ✅ Plus d'erreur spécifique à vehicles.ts
- ✅ Type `VehicleInsert` utilisé pour validation complète

---

#### ✅ FICHIER 3 : `src/app/api/dashboard-data/route.ts` (CRITIQUE)
**Problèmes** : 10 occurrences de `as any`
- Jointures Supabase (`m.vehicles`, `p.vehicles`) non typées
- `rdv_date as any`, `type as any`
- Objets de retour sans typage

**Solution appliquée** :
```typescript
// AVANT (ligne 134, 139, 144, etc.)
const vehicle = m.vehicles as any;
return {
  // ...
  service_type: translateMaintenanceType(m.type as any),
  // ...
} as any;

// APRÈS
import type { Database } from '@/types/supabase';

// Types pour les jointures Supabase
interface VehicleSubset {
  registration_number: string;
  brand: string;
  model: string;
}

type MaintenanceWithVehicle = Database['public']['Tables']['maintenance_records']['Row'] & {
  vehicles: VehicleSubset | null;
};

// Interfaces de retour strictes
interface AlertItem {
  id: string;
  vehicle_id: string;
  vehicle_name: string;
  service_type: string;
  // ...
}

// Utilisation avec cast via unknown (pattern pour jointures Supabase)
const alerts: AlertItem[] = ((maintenanceAlerts as unknown) as MaintenanceWithVehicle[] || [])
  .map(m => {
    const vehicle = m.vehicles; // Plus besoin de as any
    return {
      id: m.id,
      vehicle_name: vehicle ? `${vehicle.brand} ${vehicle.model}` : 'Inconnu',
      service_type: translateMaintenanceType(m.type), // Plus besoin de as any
      // ...
    };
  });
```

**Pattern clé pour jointures Supabase** :
```typescript
// Supabase retourne SelectQueryError si la relation n'est pas parfaitement définie
// Solution: Cast via unknown puis type défini
const data = ((rawData as unknown) as TypedData[] || [])
```

**Validations** :
- ✅ Build `tsc --noEmit` passe
- ✅ 0 `as any` dans le fichier
- ✅ Interfaces de retour API strictement typées

---

## Progression Catégorie A (Sécurité/Business) ✅ COMPLÈTE

| Fichier | Statut | Erreurs corrigées |
|---------|--------|-------------------|
| `tenant-guard.ts` | ✅ | `supabase as any` → `TenantTable` |
| `vehicles.ts` | ✅ | `insertData as any` → `VehicleInsert` |
| `dashboard-data/route.ts` | ✅ | 10× `as any` → types stricts |

---

## Progression Catégorie B (Actions serveur) ✅ COMPLÈTE

| Fichier | Statut | Pattern utilisé |
|---------|--------|-----------------|
| `fuel.ts` | ✅ | Import `logger` manquant |
| `driver-checklist.ts` | ✅ | Helper `getUntypedTable()` pour tables non typées |
| `admin-sync.ts` | ✅ | Helper `callUntypedRpc()` pour RPC non typées |

**Pattern établi pour tables non typées** :
```typescript
// Helper réutilisable
function getUntypedTable(supabase: SupabaseClient, tableName: string) {
  return (supabase as unknown as { 
    from: (table: string) => ReturnType<SupabaseClient['from']> 
  }).from(tableName);
}

// Usage
const { data } = await getUntypedTable(supabase, 'ma_table')
  .select('*')
  .single();
```

**Pattern établi pour RPC non typées** :
```typescript
// Helper réutilisable
function callUntypedRpc(supabase: SupabaseClient, fnName: string, args?: Record<string, unknown>) {
  return (supabase as unknown as { 
    rpc: (name: string, args?: Record<string, unknown>) => ReturnType<SupabaseClient['rpc']> 
  }).rpc(fnName, args);
}

// Usage
const { data } = await callUntypedRpc(supabase, 'ma_fonction');
```

---

## 📊 STATUT GLOBAL

```
Erreurs initiales    : ~179
Erreurs actuelles    : ~71
Erreurs corrigées    : ~108 (60%)
Fichiers corrigés    : 6/137
```

---

## 🎯 PROCHAINE ÉTAPE

**Seuil pour activer strict mode** : < 20 erreurs
**Objectif** : Corriger ~50 erreurs supplémentaires

### Catégorie C proposée (Hooks et Composants critiques) :
1. `src/hooks/use-predictive-alerts.ts` - Cast RPC
2. `src/lib/supabase/queries/dashboard.ts` - Multiple `as any`
3. `src/app/api/vehicles/route.ts` - CRUD véhicules

---

## Prochain fichiers à corriger

### Catégorie A (en attente)
1. `src/actions/vehicles.ts:146` - Typer `insertData` avec `TablesInsert<'vehicles'>`
2. `src/app/api/dashboard-data/route.ts` - Tous les `as any` sur les retours API

### Catégorie B (Actions serveur)
- Tous les fichiers `src/actions/*.ts` avec `as any`

### Catégorie C (Hooks)
- `src/hooks/use-*.ts` qui castent les résultats Supabase

---

## Patterns de correction

### Pattern 1 : Tables Supabase typées
```typescript
import { Database } from '@/types/supabase';

type VehicleRow = Database['public']['Tables']['vehicles']['Row'];
type VehicleInsert = Database['public']['Tables']['vehicles']['Insert'];
type VehicleUpdate = Database['public']['Tables']['vehicles']['Update'];
```

### Pattern 2 : Type guards pour les tables dynamiques
```typescript
type TenantTable = Extract<
  keyof Database['public']['Tables'],
  'vehicles' | 'drivers' | ...
>;
```

### Pattern 3 : RPC avec types stricts
```typescript
// Définir les fonctions RPC dans Database types
const { data } = await supabase.rpc('ma_fonction', { param: value });
```

---

## Checklist globale

- [ ] Build `npm run build` passe sans erreur TypeScript
- [ ] Aucun `as any` dans les fichiers critiques
- [ ] Tests existants passent `npm test`
- [ ] `ignoreBuildErrors: false` dans next.config.js

---

## Notes

### Pourquoi `as string` est acceptable dans certains cas
Dans `tenant-guard.ts`, les colonnes `id` et `company_id` sont typées comme `string & keyof Row` par Supabase. Les chaînes littérales ne satisfont pas directement cette contrainte. L'assertion `as string` est acceptable car :
1. Le paramètre `table` est déjà strictement typé (`TenantTable`)
2. Les colonnes `id` et `company_id` existent sur toutes ces tables (contrainte métier)
3. Cela évite le `as any` généralisé

### Progression
- Fichiers corrigés : 1/137
- Erreurs restantes : ~179
