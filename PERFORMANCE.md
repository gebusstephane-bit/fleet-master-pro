# FleetMaster Pro - Optimisations Performance

Ce document décrit les optimisations de performance pour supporter 1000+ véhicules.

## 🎯 Objectifs atteints

- ✅ Pagination cursor-based (plus efficace que offset)
- ✅ Virtualisation des listes (1000+ items sans lag)
- ✅ Optimisation N+1 (requêtes en une seule fois)
- ✅ Cache strategy (staleTime, prefetching)
- ✅ Indexes DB (temps de réponse <200ms)
- ✅ Tests de charge (k6)

---

## 📦 Nouveaux fichiers créés

### Configuration
- `src/lib/query-config.ts` - Configuration React Query globale
- `src/types/pagination.ts` - Types pour pagination cursor-based
- `src/app/providers.tsx` - Providers avec QueryClient optimisé

### Hooks optimisés
- `src/hooks/use-vehicles-paginated.ts` - Hook avec infinite scroll + optimistic updates
- `src/lib/supabase/server-optimized.ts` - Fonctions N+1 optimisées

### Composants
- `src/components/vehicles/vehicle-list-virtual.tsx` - Liste virtualisée avec @tanstack/react-virtual

### Database
- `supabase/migrations/20250209000009_performance_indexes.sql` - Indexes de performance

### Tests
- `tests/performance/load-test.ts` - Tests de charge k6

---

## 🚀 Utilisation

### 1. Pagination Infinite Scroll

```tsx
import { useVehiclesInfinite } from '@/hooks/use-vehicles-paginated';

function VehicleList() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useVehiclesInfinite({
    pageSize: 50,
    status: 'active', // filtre optionnel
  });

  const vehicles = data?.pages.flatMap(page => page.data) || [];
  
  return (
    <div>
      {vehicles.map(vehicle => (
        <VehicleCard key={vehicle.id} vehicle={vehicle} />
      ))}
      {hasNextPage && (
        <button onClick={() => fetchNextPage()}>
          {isFetchingNextPage ? 'Chargement...' : 'Charger plus'}
        </button>
      )}
    </div>
  );
}
```

### 2. Liste Virtualisée (pour très grandes listes)

```tsx
import { VehicleListVirtual } from '@/components/vehicles/vehicle-list-virtual';

function Page() {
  return <VehicleListVirtual statusFilter="active" />;
}
```

### 3. Optimistic Updates

```tsx
import { useCreateVehicleOptimistic } from '@/hooks/use-vehicles-paginated';

function CreateForm() {
  const mutation = useCreateVehicleOptimistic();
  
  const onSubmit = (data) => {
    mutation.mutate(data); // La liste se met à jour instantanément
  };
}
```

### 4. Prefetching (navigation rapide)

```tsx
import { useVehicleDetail } from '@/hooks/use-vehicles-paginated';

function VehiclePage({ params }) {
  const { data, prefetchNext } = useVehicleDetail(params.id);
  
  // Prefetch le véhicule suivant
  const onMouseEnterNext = (nextId) => {
    prefetchNext(nextId);
  };
}
```

---

## 📊 Cache Strategy

| Type de donnée | staleTime | gcTime | Usage |
|----------------|-----------|--------|-------|
| Véhicules | 5 min | 10 min | Liste paginée |
| Chauffeurs | 5 min | 10 min | Liste |
| Entreprise | 15 min | 30 min | Données statiques |
| Maintenance | 2 min | 5 min | Données dynamiques |
| Inspections | 2 min | 5 min | Données dynamiques |
| Dashboard | 30 sec | 2 min | Temps réel |

---

## 🗄️ Indexes créés

### Véhicules
```sql
idx_vehicles_company_created (company_id, created_at DESC)
idx_vehicles_company_status (company_id, status)
idx_vehicles_registration (registration_number)
idx_vehicles_driver (assigned_driver_id)
```

### Maintenances
```sql
idx_maintenance_company_date (company_id, service_date DESC)
idx_maintenance_vehicle_date (vehicle_id, service_date DESC)
idx_maintenance_status_date (status, service_date)
```

### Inspections
```sql
idx_inspections_company_status (company_id, status, created_at DESC)
idx_inspections_vehicle (vehicle_id, created_at DESC)
idx_inspections_date (created_at DESC)
```

---

## 🧪 Tests de charge

### Installation k6
```bash
# Windows (avec chocolatey)
choco install k6

# Mac
brew install k6

# Linux
sudo gpg -k
sudo gpg --no-default-keyring --keyring /usr/share/keyrings/k6-archive-keyring.gpg --keyserver hkp://keyserver.ubuntu.com:80 --recv-keys C5AD17C747E3415A3642D57D77C6C491D6AC1D69
echo "deb [signed-by=/usr/share/keyrings/k6-archive-keyring.gpg] https://dl.k6.io/deb stable main" | sudo tee /etc/apt/sources.list.d/k6.list
sudo apt-get update
sudo apt-get install k6
```

### Exécution
```bash
# Lancer les tests
k6 run tests/performance/load-test.ts

# Avec URL personnalisée
k6 run -e BASE_URL=https://fleetmaster.pro tests/performance/load-test.ts
```

### Scénario de test
- **Montée**: 1min → 10 users
- **Charge**: 3min → 50 users
- **Pic**: 2min → 100 users
- **Descente**: 1min → 0 users

### Seuils
- P95 liste véhicules: < 200ms
- P95 détail véhicule: < 150ms
- Taux d'erreur: < 1%

---

## ⚡ Optimisations N+1

### Avant (N+1 problem)
```typescript
// 1 requête pour les véhicules
const vehicles = await supabase.from('vehicles').select('*');

// N requêtes pour les chauffeurs (N = nombre de véhicules)
for (const v of vehicles) {
  const driver = await supabase.from('drivers').select('*').eq('id', v.driver_id);
}
// Total: N+1 requêtes ❌
```

### Après (une seule requête)
```typescript
// 1 requête avec jointure
const vehicles = await supabase
  .from('vehicles')
  .select('*, drivers:assigned_driver_id(*)')
  .eq('company_id', companyId);
// Total: 1 requête ✅
```

---

## 📈 Migration

### Étape 1: Installer la dépendance
```bash
npm install @tanstack/react-virtual
```

### Étape 2: Créer les indexes
Exécuter dans Supabase SQL Editor:
```sql
-- Copier le contenu de:
-- supabase/migrations/20250209000009_performance_indexes.sql
```

### Étape 3: Mettre à jour les composants
Remplacer les anciens hooks par les nouveaux:
- `useVehicles()` → `useVehiclesInfinite()` ou `useVehiclesInfinite()`
- `useCreateVehicle()` → `useCreateVehicleOptimistic()`

### Étape 4: Tester
```bash
npm run build
npm run dev
```

---

## 🔍 Monitoring

### React Query DevTools
- Disponible en développement
- Affiche le cache, les requêtes en cours, les stale times

### Métriques à surveiller
- Nombre de requêtes par page
- Temps de réponse moyen
- Taux de cache hit
- Erreurs

---

## 🎓 Bonnes pratiques

1. **Toujours utiliser la pagination** pour les listes > 20 items
2. **Utiliser la virtualisation** pour les listes > 100 items
3. **Optimistic updates** pour une UX fluide
4. **Prefetching** pour la navigation rapide
5. **StaleTime approprié** selon la volatilité des données

---

## 📞 Support

En cas de problème de performance:
1. Vérifier les indexes avec `EXPLAIN ANALYZE`
2. Vérifier le cache React Query
3. Lancer les tests k6
4. Consulter les logs Supabase

---

**Date**: Février 2026
**Version**: 1.0
**Auteur**: Équipe FleetMaster Pro
