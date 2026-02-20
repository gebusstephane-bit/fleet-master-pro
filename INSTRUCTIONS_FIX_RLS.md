# 🔧 Instructions pour corriger l'erreur RLS

## Erreur : "policy already exists"

Cela signifie que les politiques existent déjà. Voici la solution :

## Option 1 : SQL Simple (RECOMMANDÉ)

Copiez ce SQL dans Supabase SQL Editor :

```sql
-- 1. Supprimer les politiques existantes
DROP POLICY IF EXISTS "profiles_select" ON profiles;
DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "drivers_select" ON drivers;
DROP POLICY IF EXISTS "routes_select" ON routes;
DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;

-- 2. Supprimer et recréer la fonction
DROP FUNCTION IF EXISTS get_current_user_company_id();

CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- 3. Créer les politiques avec des noms uniques
CREATE POLICY "profiles_select_v2" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = get_current_user_company_id());

CREATE POLICY "vehicles_select_v2" ON vehicles FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_select_v2" ON drivers FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_select_v2" ON routes FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_select_v2" ON maintenance_records FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

-- Vérifier
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes', 'maintenance_records')
ORDER BY tablename;
```

Cliquez **Run**.

## Option 2 : Désactiver RLS temporairement (TEST ONLY)

Si l'option 1 ne marche pas, désactivez RLS temporairement pour tester :

```sql
-- Désactiver RLS (DANGEREUX - uniquement pour test)
ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records DISABLE ROW LEVEL SECURITY;

-- Vérifier que les données s'affichent dans l'app
-- Puis réactiver :
-- ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
-- etc.
```

## Option 3 : Réinitialisation complète

Si rien ne marche, supprimez TOUTES les politiques :

```sql
-- Lister toutes les politiques
SELECT tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- Supprimer une par une (remplacez par les noms trouvés ci-dessus)
-- DROP POLICY IF EXISTS "nom_exact" ON nom_table;
```

## Après avoir exécuté le SQL

1. **Redémarrer l'application** :
```bash
rm -rf .next
npm run dev
```

2. **Vider le cache navigateur** : Ctrl+Shift+R

3. **Vérifier dans la console** :
```javascript
// Doit afficher des données sans erreur 42P17
fetch('/api/vehicles').then(r => r.json()).then(console.log)
```

## Si ça ne marche toujours pas

Utilisez le **Mode d'urgence** que j'ai créé :

Modifiez temporairement `src/app/(dashboard)/vehicles/page.tsx` :

```tsx
// Remplacez :
import { useVehicles } from '@/hooks/use-vehicles';
const { data: vehicles } = useVehicles();

// Par :
import { useEmergencyVehicles } from '@/hooks/use-emergency-fetch';
const { data: vehicles } = useEmergencyVehicles();
```

Cela contourne complètement RLS via l'API REST.
