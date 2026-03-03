# 🔪 Rapport d'Intervention Chirurgicale - Suppression Modules

**Date:** 2026-02-26  
**Mission:** Suppression des modules Tournées, IA (legacy) et Géolocalisation sans casser le core  
**Statut:** ✅ ANALYSE COMPLÈTE - PRÊT POUR SUPPRESSION

---

## 📊 MATRICE DES DÉPENDANCES

### Module Tournées (ROUTES) - À SUPPRIMER

| Fichier | Dépendances internes | Utilisé par | Risque | Action |
|---------|---------------------|-------------|--------|--------|
| `src/app/(dashboard)/routes/page.tsx` | useRoutes, useDeleteRoute | sidebar.tsx (lien) | 🔴 Haut | Supprimer |
| `src/app/(dashboard)/routes/new/page.tsx` | useCreateRoute, route-planner | - | 🔴 Haut | Supprimer |
| `src/app/(dashboard)/routes/[id]/page.tsx` | useRoute, calculateDistance | - | 🔴 Haut | Supprimer |
| `src/app/(dashboard)/routes/[id]/edit/page.tsx` | useRoute, useUpdateRoute | - | 🔴 Haut | Supprimer |
| `src/actions/routes.ts` | routeSchema | use-routes.ts | 🔴 Haut | Supprimer |
| `src/hooks/use-routes.ts` | createRoute, updateRoute... | pages routes | 🔴 Haut | Supprimer |
| `src/lib/routing/route-optimizer.ts` | haversine, vehicle-speeds | route-planner, new/page | 🔴 Haut | Supprimer |
| `src/lib/routing/vehicle-speeds.ts` | - | route-optimizer | 🔴 Haut | Supprimer |
| `src/lib/routing/rse-regulations.ts` | - | route-optimizer | 🔴 Haut | Supprimer |
| `src/lib/routing/constraints.ts` | - | route-optimizer | 🔴 Haut | Supprimer |
| `src/components/routes/route-planner.tsx` | mapbox-map, geocoding | new/page | 🔴 Haut | Supprimer |
| `src/components/routes/sortable-stop.tsx` | - | route-planner | 🔴 Haut | Supprimer |
| `src/components/routes/assignment-suggestions.tsx` | route-optimizer | - | 🔴 Haut | Supprimer |
| `src/components/routes/depot-config.tsx` | - | - | 🔴 Haut | Supprimer |
| `src/components/routes/route-constraints-form.tsx` | - | - | 🔴 Haut | Supprimer |
| `src/components/routes/rse-timeline.tsx` | - | - | 🔴 Haut | Supprimer |
| `src/lib/schemas/routes.ts` | - | actions/routes | 🟡 Moyen | Supprimer |

**⚠️ ALERTE CRITIQUE:** Le SOS Garage utilise SA PROPRE fonction `calculateDistance` (Haversine) dans :
- `src/app/api/sos/analyze/route.ts` (ligne 200)
- `src/app/api/sos/smart-search/route.ts` (ligne 589)

✅ **Conclusion:** Le SOS ne dépend PAS de `src/lib/routing/` - suppression safe.

---

### Faux Modules IA (LEGACY) - À SUPPRIMER

| Fichier | Dépendances | Utilisé par | Risque | Action |
|---------|-------------|-------------|--------|--------|
| `src/app/api/predict/vehicles/route.ts` | ai_predictions table | use-ai-predictions.ts (legacy) | 🟡 Moyen | Supprimer |
| `src/app/api/predict/maintenance/detail/route.ts` | ai_predictions table | useVehiclePrediction | 🟡 Moyen | Supprimer |
| `src/app/api/predict/maintenance/[vehicleId]/route.ts.bak` | - | - | 🟢 Faible | Supprimer |
| `src/lib/apify/client.ts` | - | api/geocode, sos/analyze | 🟢 Faible | Supprimer (désactivé) |
| `src/lib/openai/garage-analyzer.ts` | openai | - | 🟢 Faible | Supprimer (non utilisé) |

**⚠️ IMPORTANT:** Le composant `PredictionCard` utilise le NOUVEAU système `predictive_alerts` (basé sur les inspections réelles), PAS l'ancien `ai_predictions`. Il fait des requêtes Supabase directement, pas via les API `/api/predict/*`.

**✅ Les fichiers à GARDER car utilisés par le nouveau système:**
- `src/components/ai-predict/prediction-card.tsx` → Utilise `useVehiclePredictiveAlert`
- `src/hooks/use-ai-predictions.ts` → Contient `useVehiclePredictiveAlert` (nouveau système)
- `src/hooks/use-predictive-alerts.ts` → Hooks pour `predictive_alerts`

---

### Composants Mapbox - À SUPPRIMER (si uniquement tournées)

| Fichier | Dépendances | Utilisé par | Risque | Action |
|---------|-------------|-------------|--------|--------|
| `src/components/dashboard/FleetMap.tsx` | mapbox-gl | dashboard/index.ts | 🟡 Moyen | Supprimer |
| `src/components/dashboard/FleetMapSimple.tsx` | - | - | 🟢 Faible | Supprimer |
| `src/components/map/mapbox-map.tsx` | mapbox-gl | route-planner | 🟢 Faible | Supprimer |
| `src/lib/mapbox/geocoding.ts` | mapbox token | mapbox-map, route-planner | 🟢 Faible | Supprimer |
| `src/components/maps/vehicle-map.tsx` | - | - | 🟢 Faible | Vérifier puis supprimer |

**⚠️ NOTE:** `src/components/vehicles/detail/vehicle-map.tsx` est UN PLACEHOLDER sans Mapbox - on le garde.

---

### API Routes à Nettoyer

| Fichier | Usage | Risque | Action |
|---------|-------|--------|--------|
| `src/app/api/geocode/route.ts` | Apify + Nominatim | 🟡 Moyen | Supprimer (Apify indisponible) |
| `src/app/api/cron/predictive/route.ts` | Cron IA legacy | 🟢 Faible | Supprimer |

---

## 🔒 CHECKLIST DE SÉCURITÉ

Éléments à NE JAMAIS TOUCHER:

- [ ] ❌ `src/types/index.ts` - Types utilisés par Vehicle/Driver/Inspection
- [ ] ❌ `src/lib/supabase/` - Core DB
- [ ] ❌ `src/middleware.ts` - Auth
- [ ] ❌ `src/app/(auth)/` - Authentification
- [ ] ❌ `src/app/api/stripe/` - Paiements
- [ ] ❌ `src/app/api/sos/` - SOS Garage (sauf si explicitement demandé)
- [ ] ❌ `src/lib/email/` - Notifications
- [ ] ❌ Tables SQL - Ne pas supprimer de migrations

---

## 📦 PACKAGES À DÉSINSTALLER

```bash
npm uninstall mapbox-gl @types/mapbox-gl react-map-gl apify-client openai
```

---

## ✅ VALIDATION POST-SUPPRESSION

Tests à effectuer:
1. [ ] `npm run build` passe sans erreur
2. [ ] `npm run lint` pas d'erreurs d'import
3. [ ] Page `/login` fonctionne
4. [ ] Page `/dashboard` fonctionne
5. [ ] QR Code scan fonctionne
6. [ ] Création maintenance fonctionne
7. [ ] SOS Garage fonctionne
8. [ ] Fiche véhicule avec PredictionCard fonctionne

---

## 📝 FICHIERS À SUPPRIMER (LISTE FINALE)

### Dossiers complets:
```
src/app/(dashboard)/routes/          → Toutes les pages tournées
src/app/api/predict/                 → API legacy IA
src/components/routes/               → Composants tournées
src/lib/routing/                     → Algorithme routing
src/lib/mapbox/                      → Géocodage Mapbox
src/lib/apify/                       → Client Apify
src/lib/openai/                      → Analyseur IA garages
```

### Fichiers isolés:
```
src/components/dashboard/FleetMap.tsx
src/components/dashboard/FleetMapSimple.tsx
src/components/map/mapbox-map.tsx
src/components/maps/vehicle-map.tsx
src/app/api/geocode/route.ts
src/app/api/cron/predictive/route.ts
src/actions/routes.ts
src/hooks/use-routes.ts
src/lib/schemas/routes.ts
```

---

## 🎯 PROCHAINES ÉTAPES

1. Créer dossier `deprecated/` pour sauvegarde
2. Déplacer fichiers critiques en backup
3. Supprimer fichiers listés ci-dessus
4. Mettre à jour `sidebar.tsx` (retirer lien Tournées)
5. Mettre à jour `package.json`
6. Mettre à jour `.env.example`
7. Lancer les tests de validation

---

**Signature:** Agent Legacy Refactoring  
**Statut:** ✅ PRÊT POUR EXÉCUTION
