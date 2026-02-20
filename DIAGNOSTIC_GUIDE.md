# 🔍 Guide de Diagnostic - Problème Vehicles/Drivers

## État actuel
- ✅ **Tournées** : Fonctionne
- ❌ **Véhicules** : Vide (0 records)
- ❌ **Chauffeurs** : Vide (0 records)

## 🔧 Diagnostic pas à pas

### Étape 1 : Vérifier les logs navigateur

Ouvrez la console (F12) et regardez les logs :

```
[useVehicles] Fetching with companyId: 2a8f8fa8...
[useVehicles] Direct query SUCCESS: 6 records   ← Si vous voyez ça, ça marche !
[useVehicles] Direct query failed: 42P17 ...    ← Si vous voyez ça, problème RLS
```

### Étape 2 : Tester en SQL

Dans Supabase SQL Editor, exécutez :

```sql
-- Vérifier votre company_id
SELECT id, email, company_id FROM profiles WHERE email = 'votre-email@exemple.com';

-- Vérifier les véhicules avec ce company_id
SELECT id, registration_number, company_id 
FROM vehicles 
WHERE company_id = '2a8f8fa8-b04b-4a82-84a4-97bd97ef8e90';  -- Remplacez par votre ID

-- Vérifier les chauffeurs
SELECT id, first_name, company_id 
FROM drivers 
WHERE company_id = '2a8f8fa8-b04b-4a82-84a4-97bd97ef8e90';
```

### Étape 3 : Tester la fonction RPC

```sql
-- Tester la fonction
SELECT get_current_user_company_id();

-- Vérifier les politiques RLS actuelles
SELECT tablename, policyname 
FROM pg_policies 
WHERE tablename IN ('vehicles', 'drivers', 'routes')
ORDER BY tablename;
```

### Étape 4 : Test avec curl (si besoin)

```bash
# Récupérer votre token depuis Application > Local Storage > sb-...-auth-token
TOKEN="votre-jwt-token"

# Test API véhicules
curl -X GET "https://xncpyxvklstfjrcxvdhtx.supabase.co/rest/v1/vehicles?select=*&company_id=eq.2a8f8fa8-b04b-4a82-84a4-97bd97ef8e90" \
  -H "Authorization: Bearer $TOKEN" \
  -H "apikey: eyJhbGciOiJIUzI1NiIs..."
```

## 🔴 Si les logs montrent "Direct query SUCCESS: 0 records"

Cela signifie que :
1. **RLS fonctionne** (pas d'erreur 42P17)
2. **Mais aucune donnée ne correspond** au company_id de l'utilisateur

**Vérifier :**
```sql
-- Les véhicules existent-ils ?
SELECT COUNT(*) FROM vehicles;

-- Avec quel company_id ?
SELECT DISTINCT company_id FROM vehicles;

-- L'utilisateur a-t-il le bon company_id ?
SELECT company_id FROM profiles WHERE id = auth.uid();
```

## 🟡 Si les logs montrent "Direct query failed: 42P17"

Cela signifie que **RLS est toujours cassé** pour vehicles/drivers.

**Solution :**
```sql
-- Supprimer TOUTES les politiques sur vehicles
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies WHERE tablename = 'vehicles'
  LOOP EXECUTE format('DROP POLICY IF EXISTS %I ON vehicles', pol.policyname);
  END LOOP;
END $$;

-- Recréer avec la fonction
CREATE POLICY "vehicles_read" ON vehicles FOR SELECT 
  USING (company_id = get_current_user_company_id());
```

## 🟢 Si Tournées fonctionne mais pas Vehicles

Comparaison des politiques :
```sql
-- Politiques routes (qui marchent)
SELECT * FROM pg_policies WHERE tablename = 'routes';

-- Politiques vehicles (qui ne marchent pas)
SELECT * FROM pg_policies WHERE tablename = 'vehicles';

-- Différence ?
```

## 🔧 Fix rapide SQL

Si vous voulez tout réinitialiser proprement :

```sql
-- 1. Supprimer toutes les politiques
DO $$
DECLARE pol RECORD;
BEGIN
  FOR pol IN SELECT policyname, tablename FROM pg_policies 
    WHERE tablename IN ('vehicles', 'drivers', 'routes')
  LOOP 
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', pol.policyname, pol.tablename);
  END LOOP;
END $$;

-- 2. Recréer la fonction
DROP FUNCTION IF EXISTS get_current_user_company_id();
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER
AS $$ SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1; $$;

-- 3. Recréer les politiques simples
CREATE POLICY "vehicles_read" ON vehicles FOR SELECT 
  USING (company_id = get_current_user_company_id());

CREATE POLICY "drivers_read" ON drivers FOR SELECT 
  USING (company_id = get_current_user_company_id());

CREATE POLICY "routes_read" ON routes FOR SELECT 
  USING (company_id = get_current_user_company_id());

-- 4. Vérifier
SELECT tablename, policyname FROM pg_policies 
WHERE tablename IN ('vehicles', 'drivers', 'routes');
```

## 🆘 Mode urgence (si rien ne marche)

Désactivez temporairement RLS pour tester :

```sql
-- ⚠️ DANGER : Donne accès à toutes les données
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;

-- Testez l'application
-- Puis réactivez :
-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
```

## 📊 Fichiers modifiés

- `src/hooks/use-vehicles.ts` - Ajout logs diagnostic
- `src/hooks/use-drivers.ts` - Ajout logs diagnostic
- `src/lib/supabase/client-safe.ts` - Logs dans safeQuery

## ⚡ Commandes utiles

```bash
# Redémarrer l'app
rm -rf .next && npm run dev

# Vider le cache navigateur
# Ctrl+Shift+R (Windows/Linux)
# Cmd+Shift+R (Mac)
```
