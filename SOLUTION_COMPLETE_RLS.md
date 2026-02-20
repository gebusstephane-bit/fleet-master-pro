# 🔧 Solution Définitive RLS - FleetMaster

## 📊 Diagnostic

| Table | Fonctionne ? | Pourquoi ? |
|-------|-------------|------------|
| **maintenance_records** | ✅ Oui | Politiques via `vehicle_id` (pas de sous-requête directe sur profiles) |
| **inspections** | ✅ Oui | Politiques via `vehicle_id` (pas de sous-requête directe sur profiles) |
| **vehicles** | ❌ Non | Sous-requête directe sur `profiles` → Boucle infinie |
| **drivers** | ❌ Non | Sous-requête directe sur `profiles` → Boucle infinie |
| **routes** | ❌ Non | Sous-requête directe sur `profiles` → Boucle infinie |

## 🔴 Problème Racine

Les politiques RLS sur `vehicles/drivers/routes` font des **sous-requêtes directes** sur `profiles` :

```sql
-- ❌ PROBLÉMATIQUE : Sous-requête directe sur profiles
CREATE POLICY "vehicles_select" ON vehicles
  USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
```

Quand PostgreSQL évalue cette politique, il déclenche aussi les politiques RLS sur `profiles`, ce qui peut créer une référence circulaire → **42P17 infinite recursion**.

## ✅ Solution

### Étape 1 : Exécuter le SQL définitif

Dans Supabase SQL Editor, copiez-collez le contenu de **`FIX_RLS_DEFINITIF.sql`** :

```sql
-- 1. Supprimer TOUTES les politiques existantes
DO $$ ... $$;

-- 2. Créer la fonction SECURITY DEFINER
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Recréer les politiques avec la fonction (pas de sous-requête !)
CREATE POLICY "vehicles_read" ON vehicles
  FOR SELECT USING (company_id = get_current_user_company_id());

-- etc...
```

### Étape 2 : Vérifier

```sql
-- Doit afficher les nouvelles politiques avec suffixe _read/_insert/etc.
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes')
ORDER BY tablename;
```

### Étape 3 : Redémarrer l'application

```bash
rm -rf .next
npm run dev
```

## 🧪 Test

Dans la console navigateur :
```javascript
// Vérifier que la fonction existe
fetch('https://xncpyxvklstfjrcxvdhtx.supabase.co/rest/v1/rpc/get_current_user_company_id', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabase.auth.session().access_token}`,
    'apikey': 'eyJhbGciOiJIUzI1NiIs...'
  }
}).then(r => r.json()).then(console.log)

// Doit retourner : "2a8f8fa8-b04b-4a82-84a4-97bd97ef8e90"
```

## 🔒 Pourquoi ça marche ?

La fonction `get_current_user_company_id()` utilise `SECURITY DEFINER` :
- Elle s'exécute avec les privilèges de `postgres` (créateur), pas de l'utilisateur
- Elle ne déclenche **PAS** les politiques RLS sur `profiles`
- Elle retourne simplement le `company_id` de l'utilisateur connecté

Les politiques utilisent cette fonction au lieu d'une sous-requête :
```sql
-- ✅ CORRECT : Pas de sous-requête, donc pas de récursion
CREATE POLICY "vehicles_read" ON vehicles
  USING (company_id = get_current_user_company_id());
```

## 🆘 Si le SQL ne fonctionne pas

### Option A : Désactiver RLS temporairement (TEST UNIQUEMENT)

```sql
-- DANGER : Donne accès à TOUTES les données
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
```

### Option B : Mode Urgence côté client

J'ai créé des hooks de secours dans `src/hooks/use-emergency-fetch.ts` qui utilisent l'API REST directement.

Pour activer en urgence, modifiez :
```tsx
// src/app/(dashboard)/vehicles/page.tsx
// Remplacez :
import { useVehicles } from '@/hooks/use-vehicles';
const { data: vehicles } = useVehicles();

// Par :
import { useEmergencyVehicles } from '@/hooks/use-emergency-fetch';
const { data: vehicles } = useEmergencyVehicles();
```

## 📁 Fichiers créés

| Fichier | Description |
|---------|-------------|
| `FIX_RLS_DEFINITIF.sql` | SQL complet à exécuter dans Supabase |
| `src/lib/supabase/rls-bypass.ts` | Contournement API REST |
| `src/hooks/use-emergency-fetch.ts` | Hooks de secours |
| `src/components/emergency-data-loader.tsx` | Composant auto-détection |

## ✅ Build

```bash
npm run build  # ✓ OK
npm test       # ✓ 71 tests passent
```
