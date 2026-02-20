# Analyse du Workaround RLS - Infinite Recursion

**Date:** 18 Février 2026  
**Fichier concerné:** `src/hooks/use-vehicles.ts` (lignes 121-141)  
**Severity:** Haute - Impact sur la sécurité des données

---

## 🚨 Problème Identifié

### Code problématique
```typescript
// use-vehicles.ts lignes 121-141
if (error.message?.includes('infinite recursion') || error.code === '42P17') {
  logger.warn('RLS recursion detected, trying fallback...');
  
  const { data: allData, error: allError } = await supabase
    .from('vehicles')
    .select('*')
    .order('created_at', { ascending: false });
  
  if (!allError && allData) {
    const filtered = allData.filter(v => v.company_id === companyId);
    logger.info('Fallback: Found vehicles', { count: filtered.length });
    return filtered as Vehicle[];
  }
}
```

### Problème de sécurité
Quand une erreur de récursion RLS est détectée, le code fait une requête **sans filtre RLS** (`select('*')`) puis filtre côté client. Cela signifie que **tous les véhicules de tous les utilisateurs** sont récupérés, puis filtrés côté client.

**Risque:** Si le filtrage côté client échoue ou est contourné, des données d'autres entreprises pourraient être exposées.

---

## 🔍 Cause Racine

### Erreur PostgreSQL
- **Code:** `42P17`
- **Message:** `infinite recursion detected in policy`
- **Cause:** Les policies RLS sur la table `vehicles` créent une boucle infinie

### Scénario typique de récursion RLS

```sql
-- Policy problématique (exemple)
CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM profiles 
      WHERE id = auth.uid()
      -- RÉCURSION: Si profiles a aussi une policy RLS qui vérifie vehicles!
    )
  );
```

### Policies qui causent généralement cette erreur

1. **Policy sur `vehicles` qui vérifie `profiles`**
2. **Policy sur `profiles` qui vérifie `vehicles`**
3. **Policy qui fait référence à elle-même indirectement**

---

## 🛠️ Solution Proposée (Correction SQL)

### Étape 1: Identifier les policies problématiques

```sql
-- Lister toutes les policies sur la table vehicles
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'vehicles';
```

### Étape 2: Vérifier les policies sur profiles

```sql
-- Lister les policies sur profiles
SELECT 
  schemaname,
  tablename,
  policyname,
  qual
FROM pg_policies
WHERE tablename = 'profiles';
```

### Étape 3: Correction recommandée

```sql
-- ============================================
-- CORRECTION RLS - Éliminer la récursion
-- ============================================

-- Supprimer les policies problématiques
DROP POLICY IF EXISTS "vehicles_select_recursive" ON vehicles;
DROP POLICY IF EXISTS "profiles_select_recursive" ON profiles;

-- Créer une policy corrigée sur vehicles
-- SANS sous-requête vers profiles
CREATE POLICY "vehicles_select" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    -- Vérification directe sans récursion
    auth.uid() = created_by 
    OR 
    company_id IN (
      SELECT p.company_id 
      FROM profiles p 
      WHERE p.id = auth.uid()
      -- NOTE: profiles ne doit PAS avoir de RLS sur cette sous-requête
    )
  );

-- Alternative: Désactiver temporairement RLS pour le debug
-- (PAS EN PRODUCTION!)
-- ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Ou créer une policy "bypass" pour les superadmins
CREATE POLICY "vehicles_admin_bypass" ON vehicles
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid()
      AND role = 'SUPERADMIN'
    )
  );
```

### Étape 4: Solution alternative avec Security Definer

```sql
-- Créer une fonction qui contourne RLS pour la vérification
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER  -- Exécute avec les droits du créateur
STABLE
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid();
$$;

-- Utiliser la fonction dans la policy
CREATE POLICY "vehicles_select_fixed" ON vehicles
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company_id()
    OR created_by = auth.uid()
  );
```

---

## ⚡ Quick Fix Immédiat (Code)

### Option 1: Améliorer le fallback (SÉCURISÉ)

```typescript
// REMPLACER le fallback actuel par une requête RPC sécurisée
if (error.message?.includes('infinite recursion') || error.code === '42P17') {
  logger.warn('RLS recursion detected, using RPC fallback...');
  
  // Appeler une fonction PostgreSQL qui contourne RLS de façon contrôlée
  const { data: vehicles, error: rpcError } = await supabase
    .rpc('get_vehicles_for_company', { 
      p_company_id: companyId 
    });
  
  if (rpcError) {
    logger.error('RPC fallback failed', rpcError);
    throw new Error('Impossible de récupérer les véhicules');
  }
  
  return vehicles || [];
}
```

### Fonction PostgreSQL correspondante

```sql
-- Créer une fonction RPC sécurisée
CREATE OR REPLACE FUNCTION get_vehicles_for_company(p_company_id uuid)
RETURNS SETOF vehicles
LANGUAGE plpgsql
SECURITY DEFINER  -- Exécute avec les droits du créateur
AS $$
BEGIN
  -- Vérifier que l'utilisateur a accès à cette company
  IF NOT EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() 
    AND company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'Accès non autorisé';
  END IF;
  
  -- Retourner les véhicules (contourne RLS car SECURITY DEFINER)
  RETURN QUERY
  SELECT * FROM vehicles 
  WHERE company_id = p_company_id
  ORDER BY created_at DESC;
END;
$$;

-- Sécuriser la fonction
REVOKE ALL ON FUNCTION get_vehicles_for_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_vehicles_for_company(uuid) TO authenticated;
```

### Option 2: Désactiver le fallback (PLUS SÛR mais casse la fonctionnalité)

```typescript
// Si récursion RLS, ne pas faire de fallback
if (error.message?.includes('infinite recursion') || error.code === '42P17') {
  logger.error('RLS recursion error - contact admin');
  throw new Error(
    'Erreur de configuration de sécurité. Veuillez contacter l\'administrateur.'
  );
}
```

---

## 📋 TODOs pour correction définitive

### Priorité: CRITIQUE
- [ ] Exécuter la requête SQL pour identifier les policies problématiques
- [ ] Créer la fonction `get_vehicles_for_company` avec SECURITY DEFINER
- [ ] Mettre à jour le code pour utiliser l'RPC au lieu du fallback
- [ ] Tester sur environnement de staging

### Priorité: HAUTE
- [ ] Réviser toutes les policies RLS du projet
- [ ] Documenter les bonnes pratiques RLS
- [ ] Ajouter des tests automatisés pour vérifier l'isolation des données

### Priorité: MOYENNE
- [ ] Mettre en place un monitoring des erreurs 42P17
- [ ] Créer une alerte si le workaround est utilisé fréquemment

---

## 🔒 Impact Sécurité

| Scénario | Risque | Mitigation actuelle |
|----------|--------|---------------------|
| Fallback activé | Haut - Exposition potentielle de données | Filtrage côté client |
| Erreur RLS ignorée | Critique - Pas d'accès aux données | Message d'erreur |
| Policy mal configurée | Critique - Accès non autorisé | Nécessite correction SQL |

### Recommandation immédiate
**NE PAS SUPPRIMER LE WORKAROUND** sans avoir:
1. Corrigé les policies RLS en base
2. Testé sur environnement de staging
3. Préparé un plan de rollback

---

## 📚 Références

- [PostgreSQL Error 42P17](https://www.postgresql.org/docs/current/errcodes-appendix.html)
- [Supabase RLS Best Practices](https://supabase.com/docs/guides/auth/row-level-security)
- [Row Level Security Recursion](https://github.com/orgs/supabase/discussions/)

---

*Document créé lors de l'audit Quick Wins - FleetMaster Pro*
