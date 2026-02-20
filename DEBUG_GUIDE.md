# Guide de Diagnostic - Fleet Master

## Problèmes corrigés

### 1. Boucle infinie RLS sur Véhicules et Chauffeurs
**Cause** : Les hooks `useDrivers` et `useRoutes` utilisaient les Server Actions qui échouaient avec des erreurs RLS 500.

**Solution** : 
- Réécriture de `useDrivers` pour utiliser le client Supabase côté client avec fallback RLS
- Réécriture de `useRoutes` avec la même approche
- Réécriture de `use-maintenance` avec la même approche

### 2. Hooks corrigés
- `src/hooks/use-drivers.ts` - Utilise maintenant `getSupabaseClient()` avec fallback
- `src/hooks/use-routes.ts` - Utilise maintenant `getSupabaseClient()` avec fallback
- `src/hooks/use-maintenance.ts` - Utilise maintenant `getSupabaseClient()` avec fallback

## Vérification rapide

### Étape 1 : Vérifier le company_id de l'utilisateur
Dans la console du navigateur, exécutez :
```javascript
// Vérifier que le company_id est bien défini
const user = JSON.parse(localStorage.getItem('user') || '{}');
console.log('Company ID:', user.company_id);
```

### Étape 2 : Tester les requêtes Supabase directement
Dans la console du navigateur :
```javascript
// Test véhicules
const supabase = window.supabase;
supabase.from('vehicles').select('*').then(({data, error}) => {
  console.log('Vehicles:', data, 'Error:', error);
});

// Test chauffeurs
supabase.from('drivers').select('*').then(({data, error}) => {
  console.log('Drivers:', data, 'Error:', error);
});
```

### Étape 3 : Vérifier les politiques RLS
Si vous voyez des erreurs "infinite recursion", exécutez ceci dans Supabase SQL Editor :

```sql
-- Désactiver temporairement RLS pour tester
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;
ALTER TABLE drivers DISABLE ROW LEVEL SECURITY;
ALTER TABLE routes DISABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records DISABLE ROW LEVEL SECURITY;

-- Réactiver après test
-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE drivers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE routes ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;
```

## Si les données ne s'affichent toujours pas

### Vérifier que l'utilisateur a un company_id
1. Connectez-vous à Supabase Dashboard
2. Allez dans Table Editor > profiles
3. Vérifiez que votre utilisateur a bien un `company_id` défini

### Vérifier que les véhicules ont le bon company_id
```sql
SELECT id, registration_number, company_id FROM vehicles LIMIT 10;
```

### Vérifier les politiques RLS
```sql
-- Lister toutes les politiques RLS
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies 
WHERE tablename IN ('vehicles', 'drivers', 'routes', 'maintenance_records', 'profiles')
ORDER BY tablename, policyname;
```

## Commandes de redémarrage

```bash
# Arrêter le serveur et vider le cache
rm -rf .next
npm run dev
```

## Build et tests

```bash
# Build
npm run build

# Tests
npm test
```
