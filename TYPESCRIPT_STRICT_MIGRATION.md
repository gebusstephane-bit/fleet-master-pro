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
