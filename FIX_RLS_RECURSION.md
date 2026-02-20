# 🔧 FIX RLS Recursion - Instructions

## ⚠️ PROBLÈME
Les politiques RLS sur `profiles` créent une boucle infinie (code 42P17).

## ✅ SOLUTION
Exécuter la migration SQL qui crée une fonction `SECURITY DEFINER` pour contourner RLS.

## 📋 ÉTAPES

### 1. Ouvrir Supabase SQL Editor
Aller sur : https://app.supabase.com/project/_/sql/new

### 2. Copier-coller ce SQL

```sql
-- Créer une fonction qui récupère le company_id SANS déclencher RLS
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid()
  LIMIT 1;
$$;

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS "profiles_select_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_update_simple" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_simple" ON profiles;
DROP POLICY IF EXISTS "vehicles_select" ON vehicles;
DROP POLICY IF EXISTS "drivers_select" ON drivers;
DROP POLICY IF EXISTS "routes_select" ON routes;
DROP POLICY IF EXISTS "maintenance_select" ON maintenance_records;

-- Recréer avec la fonction
CREATE POLICY "profiles_select" ON profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR company_id = get_current_user_company_id());

CREATE POLICY "vehicles_select" ON vehicles FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_select" ON drivers FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_select" ON routes FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());

CREATE POLICY "maintenance_select" ON maintenance_records FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());
```

### 3. Cliquer "Run"

### 4. Rafraîchir l'application
```bash
# Dans votre terminal
rm -rf .next
npm run dev
```

## 🧪 TEST

Dans la console du navigateur, tester :
```javascript
// Vérifier que la fonction existe
fetch('https://xncpyxvklstfjrcxvdhtx.supabase.co/rest/v1/rpc/get_current_user_company_id', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${supabase.auth.session().access_token}`,
    'apikey': 'votre-anon-key'
  }
})
```

## 🔍 Vérifier les politiques

```sql
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'routes', 'maintenance_records')
ORDER BY tablename;
```

## 📝 Explication technique

La fonction `get_current_user_company_id()` utilise `SECURITY DEFINER`, ce qui signifie :
- Elle s'exécute avec les privilèges de postgres (le créateur)
- Elle ne déclenche PAS les politiques RLS sur `profiles`
- Elle retourne simplement le `company_id` de l'utilisateur connecté

Les politiques RLS utilisent ensuite cette fonction au lieu de faire une sous-requête sur `profiles`, évitant ainsi la récursion infinie.
