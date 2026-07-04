# AUDIT DE PERFORMANCE COMPLET — Fleet Master Pro

> Date : 4 juillet 2026
> Périmètre : ensemble du code (middleware, layouts, pages, hooks, actions, base de données, bundle JS, assets, service worker)
> Méthode : analyse statique multi-agents + build de production réel (`next build`)
> **Aucun fichier de code n'a été modifié** — audit 100 % lecture seule.

---

## 1. RÉSUMÉ EXÉCUTIF

La lenteur ressentie ("comme un site des années 2000") n'a **pas une cause unique** : c'est l'empilement de **5 couches de latence** qui s'additionnent à chaque navigation :

| Couche | Latence estimée par navigation | Cause |
|---|---|---|
| 1. Middleware | 150–300 ms | 3 appels réseau Supabase **séquentiels** à chaque requête (y compris les prefetch) |
| 2. Layout serveur | 200–400 ms (chargement complet) | 4 appels Supabase séquentiels **en double** du middleware, `force-dynamic`, zéro cache |
| 3. Animation de transition | ~250 ms **incompressibles** | `AnimatePresence mode="wait"` : la page sortante doit finir son animation avant que la nouvelle ne monte |
| 4. Waterfall client | 300–800 ms | Toutes les pages sont des composants clients : squelette → fetch React Query → rendu |
| 5. Poids JS | 200–500 ms (parse/exec, pire sur mobile) | 201 kB partagés + pages jusqu'à 500 kB, framer-motion partout, recharts eager |

**Total : 1 à 2,2 secondes par navigation**, avant même d'afficher la moindre donnée. À cela s'ajoute une charge base de données massive (le dashboard relance 7 requêtes séquentielles **toutes les 10 secondes** par onglet ouvert), qui dégrade la latence Supabase pour tous les clients simultanément.

---

## 2. CAUSE N°1 — MIDDLEWARE : 3 APPELS RÉSEAU SÉQUENTIELS À CHAQUE REQUÊTE

Fichier : `src/middleware.ts` (bundle middleware : **164 kB**, très gros)

À chaque navigation vers une page protégée (`/dashboard`, `/vehicles`, …), le middleware exécute **en série** :

1. `auth.getUser()` (`src/middleware.ts:509-511`) — appel réseau vers Supabase Auth (validation JWT côté serveur, ce n'est PAS une lecture de cookie locale)
2. `SELECT role, company_id FROM profiles` (`src/middleware.ts:529-533`)
3. `SELECT ... FROM companies` (`src/middleware.ts:587-593`)

Chaque appel attend le précédent (`await` séquentiels, dépendances en chaîne). **Aucun cache** : ces 3 mêmes données sont re-téléchargées à chaque requête.

### Amplification par le matcher (`src/middleware.ts:680-689`)
Le matcher n'exclut **ni les requêtes RSC ni les prefetch**. Conséquences :
- Chaque navigation client (App Router) déclenche une requête RSC → les 3 appels refont un tour
- Chaque `<Link>` visible/survolé fait un **prefetch** → +3 appels Supabase par lien. Une sidebar de 12 liens peut déclencher ~36 appels d'auth spéculatifs.

### Code mort
`src/lib/supabase/middleware.ts` (`updateSession`, qui utilise le `getSession()` léger) n'est importé **nulle part** — le middleware actif utilise la version coûteuse.

Le rate-limiting Upstash ne concerne que `/api/*` (1 appel Redis/requête API, timeout jusqu'à 1–1,5 s si Redis inaccessible) — il ne ralentit **pas** la navigation des pages.

---

## 3. CAUSE N°2 — LAYOUT DASHBOARD : TRAVAIL DUPLIQUÉ + CACHE DÉSACTIVÉ

Fichier : `src/app/(dashboard)/layout.tsx`

```ts
export const dynamic = 'force-dynamic';   // ligne 1
export const revalidate = 0;              // ligne 2
```
→ **tout le segment dashboard est rendu dynamiquement à chaque requête**, aucun cache possible.

Ligne 32 : `getUserWithCompany()` (`src/lib/supabase/server.ts:57-149`) refait **4 appels séquentiels** :
4. `auth.getUser()` — **doublon exact** de l'appel middleware
5. `SELECT * FROM profiles` — doublon (en plus large : `select('*')`)
6. `SELECT ... FROM companies` — doublon
7. `SELECT ... FROM subscriptions` — nouveau (et séquentiel alors qu'il pourrait être en `Promise.all` avec le 6)

**Bilan : jusqu'à 7 allers-retours réseau en série avant le premier octet de page.** À 50–100 ms par aller-retour Supabase, c'est 350–700 ms de latence pure d'authentification, à chaque chargement complet.

Aucun `React.cache()`, aucun `unstable_cache()`, aucune mémoïsation nulle part sur ce chemin chaud.

Note : le middleware lit `companies.subscription_status` tandis que le layout lit `subscriptions.status` — deux sources de vérité différentes (problème de cohérence, pas de perf).

---

## 4. CAUSE N°3 — TRANSITION DE PAGE : ~250 ms DE DÉLAI ARTIFICIEL + REMONTAGE COMPLET

Fichier : `src/components/layout/page-transition.tsx:9-25`, monté dans `src/app/(dashboard)/ClientLayout.tsx:33`

```tsx
<AnimatePresence mode="wait">   // la page sortante DOIT finir son exit avant que la nouvelle monte
  <motion.div key={pathname} ... transition={{ duration: 0.25 }}>
```

- `mode="wait"` = **~250 ms de délai obligatoire** ajouté à chaque navigation
- `key={pathname}` = **démontage/remontage complet** de tout l'arbre de la page à chaque changement de route → perte d'état, re-fetch, re-render intégral

C'est la contribution la plus directement "sensible au doigt" à l'impression de lourdeur.

---

## 5. CAUSE N°4 — ARCHITECTURE 100 % CLIENT : LE WATERFALL "SQUELETTE → FETCH → RENDU"

- **349 fichiers sur 642** (54 %) portent `'use client'`
- **Les 8 pages principales vérifiées sont toutes des composants clients** qui fetchent après montage :

| Page | Fetches client au montage |
|---|---|
| `dashboard/page.tsx` | `useDashboardStats`, `useDashboardAnalytics`, `useVehicles`, `useMaintenanceAlerts` + 6 widgets autonomes |
| `vehicles/page.tsx` | `useVehicles`, `useFleetReliabilityScores`, `useSubscriptionLimits` |
| `fuel/page.tsx` | `useFuelRecords`, `useFuelStats`, `useFuelAnomalies`, `useVehicles` |
| `maintenance`, `drivers`, `alerts`, `agenda`, `compliance` | idem (hooks clients) |

Séquence vécue par l'utilisateur : serveur rend la coquille HTML → JS démarre → React Query lance les requêtes → **squelettes affichés** → données arrivent → rendu. Le serveur, qui vient de faire 7 appels d'auth, **ne pré-charge aucune donnée métier**.

### Aggravants côté client
- **Double `QueryClientProvider`** : un dans `src/app/providers.tsx:15-19` (racine) ET un dans `src/app/(dashboard)/ClientLayout.tsx:27-30` → **deux caches séparés** qui ne partagent rien, deux `ReactQueryDevtools` montés
- **Horloge du header** (`src/components/layout/header.tsx:24-30`) : `setInterval` de **1 seconde** → re-render du header chaque seconde, sur toutes les pages
- **Rechargements de page complets** : la cloche de notifications fait `window.location.href = '/alerts'` (`header.tsx:222`) et le logout idem (`header.tsx:282`) → rechargement full-document (HTML + JS + providers + les 7 appels d'auth), littéralement l'expérience "années 2000". Le badge de la cloche (ligne 225-227) est d'ailleurs un ping ambre codé en dur, pas un vrai compteur.
- Widgets flottants montés sur **toutes** les pages : `RegulatoryAssistant` (365 lignes, poids bundle) + `SupportWidget` qui **fetch au montage** (`use-support.ts:235-260`) sur chaque page

### Bonne nouvelle
`UserProvider` est correctement architecturé : contexte pur alimenté par le serveur, pas de fetch client, pas de spinner bloquant. La config React Query par défaut est saine (`staleTime` 5 min, `refetchOnWindowFocus: false`) — mais elle est court-circuitée par les intervalles ci-dessous.

---

## 6. CAUSE N°5 — DASHBOARD : TEMPÊTE DE REQUÊTES + POLLING 10 SECONDES

### 6.1 `useDashboardStats` : 7 requêtes séquentielles **toutes les 10 secondes**
`src/hooks/use-dashboard.ts:27` → `refetchInterval: 10 * 1000` → `getDashboardStats` (`src/actions/dashboard.ts:88`) enchaîne en série :
`auth.getUser` → `profiles` → `vehicles` (liste complète) → `drivers` (liste complète) → `routes` → `fuel_records` du mois (toutes les lignes) → `maintenance_records` du mois (toutes les lignes).

Les totaux/sommes sont calculés en JavaScript avec `reduce()` au lieu d'agrégats SQL. **Cette chaîne complète se répète toutes les 10 s, par onglet ouvert, indéfiniment.** C'est probablement le premier contributeur à la charge Supabase — et donc à la lenteur ressentie par TOUS les clients en même temps.

### 6.2 Fan-out : ~12 sources de requêtes indépendantes au chargement du dashboard
Chaque widget fait sa propre pile auth+profil+données :
- `IncidentStatsWidget` appelle **deux** actions (`useIncidents` liste complète avec jointures + `useIncidentStats` 12 mois avec jointures) pour afficher une simple carte résumé — la seconde est redondante
- `MaintenanceFleetOverview` (`MaintenanceFleetOverview.tsx:62-141`) : son propre `auth.getUser` + `profiles` + **toutes** les `maintenance_predictions` (sans limite, sans filtre statut) pour calculer 4 compteurs en JS
- `MaintenanceUrgenciesWidget` passe par une route API qui refait `auth.getUser` + `profiles`
- Au total : **~7 doublons `auth.getUser()` + `SELECT profiles`** par chargement de dashboard

### 6.3 Autres pollings actifs
| Source | Intervalle |
|---|---|
| `header.tsx:28` (horloge) | **1 s** — toutes les pages |
| `use-dashboard.ts:27` | **10 s** |
| `use-subscription.ts:65` | 30 s |
| `use-notifications.ts:146`, `use-fuel.ts:137`, `TrialBanner.tsx:47` | 60 s |
| `use-maintenance.ts:418` | 5 min |
| `use-predictive-alerts.ts:153` | 10 min |

+ 2 canaux realtime Supabase (notifications, prédictions par véhicule).

---

## 7. CAUSE N°6 — REQUÊTES BASE DE DONNÉES INEFFICACES

### 7.1 Patterns problématiques
- **`select('*')` : 124 occurrences dans 60 fichiers**, y compris sur les chemins chauds (`use-vehicles.ts:138`, `use-maintenance.ts:98`, `actions/fuel.ts:113/139`, `actions/incidents.ts:32/59`)
- **Pas de pagination** sur : `useVehicles`, `useMaintenances`, `useCompliance`, `getIncidents`, `getIncidentStats`, `getDashboardAnalytics` (requête 2 : **tout l'historique maintenance** de la société, sans limite ni filtre date, pour un top-5)
- **Agrégation JS au lieu de SQL** partout : sommes carburant/maintenance (`dashboard.ts:157-159`), buckets mensuels (`dashboard.ts:301`), moyennes par véhicule (`fuel.ts:275-303`), stats incidents (`incidents.ts:116+`), compteurs maintenance (4 requêtes `count` séquentielles dans `use-maintenance.ts:435-459` au lieu d'un `GROUP BY`)
- **Jointures manuelles côté client** (2ᵉ requête + Map JS) : `fuel.ts:154-169`, `fuel.ts:266-272`, `dashboard.ts:254-273`
- **⚠️ Fallback RLS dangereux** : sur erreur RLS, `use-maintenance.ts:114-126` télécharge **toute la table `maintenance_records` sans filtre** (cross-tenant !) et filtre en JS. Même pattern dans `use-compliance.ts:131` (limite 1000). Problème de perf ET de sécurité potentielle.

### 7.2 Index : morts, décalés ou manquants
- **Index morts** : `20250209000009_performance_indexes.sql:37-49` et `20250209000010_safe_indexes.sql:51-64` créent les index maintenance sur **`service_date`** — colonne que les requêtes n'utilisent pas. Les vrais tris sont sur `requested_at`, `rdv_date`, `created_at` → **aucun index composite sur les colonnes réellement triées**
- **Manquants** :
  - `maintenance_records (company_id, requested_at DESC)` et `(company_id, status)`
  - `fuel_records (company_id, date DESC)` (seuls les index mono-colonne existent)
  - `drivers (company_id, created_at DESC)` (tri réel de `use-compliance.ts:118`)
  - `ai_predictions (company_id)` — lectures scopées société non indexées
  - `routes (company_id, route_date)` — requête filtrée par date **toutes les 10 s** (§6.1), probablement en seq scan
- **Corrects** : vehicles, notifications, incidents, maintenance_predictions, vehicle_inspections, alerts sont bien couverts
- Churn de schéma : la table `fuel_records` et ses index sont (re)créés dans ~7 migrations — à consolider

### 7.3 `revalidatePath` : 123 occurrences dans 26 fichiers d'actions
Les lectures étant côté React Query (pas le Data Cache Next), ces appels n'apportent quasi rien aux vues mais invalident le router cache à chaque mutation. `createFuelRecord` recalcule aussi les prédictions **de façon synchrone** avant de répondre (`fuel.ts:92-93`) → écritures lentes.

---

## 8. CAUSE N°7 — POIDS DU BUNDLE JS (mesures réelles du build)

### 8.1 Résultats `next build` (production)
| Route | JS de la page | **First Load JS total** |
|---|---|---|
| Partagé par toutes les pages | — | **201 kB** |
| `/vehicles/[id]` | 54,7 kB | **520 kB** |
| `/notifications` | **187 kB** | **500 kB** |
| `/dashboard` | 23,2 kB | **496 kB** |
| `/vehicles` | 11,4 kB | 440 kB |
| `/drivers` | 4 kB | 432 kB |
| `/vehicles/new` | 2,3 kB | 426 kB |
| `/fuel` | 23,8 kB | 423 kB |
| `/maintenance` | 8,4 kB | 412 kB |
| `/inspection` | **121 kB** | 333 kB |
| **Middleware** | — | **164 kB** |

Repères : un First Load raisonnable est < 250 kB ; > 400 kB est lourd, surtout sur mobile/4G (parse + exécution JS = plusieurs centaines de ms sur téléphone milieu de gamme).

### 8.2 Causes identifiées
- **`/notifications` à 187 kB de page** : `import * as Icons from 'lucide-react'` dans `notification-list.tsx:31` et `notification-bell.tsx:28` → embarque **toute la bibliothèque d'icônes** (le tree-shaking est neutralisé ; `optimizePackageImports` ne protège pas les imports namespace)
- **framer-motion importé statiquement dans 68 fichiers** (dont 10 pages dashboard, la sidebar avec 26 usages `motion.`, le header, toute la landing) — **aucun `next/dynamic`** dans tout le code sauf swagger-ui
- **recharts chargé en eager sur le dashboard** (`analytics-section.tsx:12-15` : 3 graphiques statiques, rendus sous la ligne de flottaison) + `TCODashboard`, `FuelTrendChart`, `CostChart`
- `react-big-calendar` + son CSS entier dans le bundle `/agenda`
- `optimizePackageImports` limité à `['lucide-react', '@radix-ui/react-icons']` — et `@radix-ui/react-icons` n'est même pas une dépendance ; `recharts`, `date-fns` non couverts
- **`compress: false`** dans `next.config.js:14` — OK uniquement parce que Vercel compresse au CDN ; serait critique en auto-hébergement

### 8.3 Points corrects (vérifiés)
- Les SDK lourds (`pdf-lib`, `openai`, `@anthropic-ai/sdk`, `stripe`, `resend`, `web-push`, `xlsx`) sont bien **exclusivement côté serveur**
- `swagger-ui-react` correctement isolé en dynamic import ssr:false
- `xlsx` lazy-importé à la demande dans `ImportWizard.tsx:195`
- Images : optimiseur Next actif, landing en `next/image` et `.webp`

---

## 9. CAUSE N°8 — ASSETS

| Problème | Détail |
|---|---|
| **56 MB de PNG orphelins** | `public/images/landing/*.png` (7,6 à 9,7 MB chacun, 7 fichiers). **Aucune référence dans le code** — la landing utilise les `.webp`. Poids mort dans git et chaque déploiement |
| **`og-image.png` = 1,39 MB** | Une image OG devrait faire 100–300 kB |
| **Référence 404** | `src/app/layout.tsx:66,81` pointe vers `/og-image.jpg` qui **n'existe pas** (seul le `.png` existe) → OG cassé sur les partages sociaux |
| `ia-predictive.webp` = 559 kB | Seul webp > 200 kB, à recompresser |
| Polices OTF ~800 kB | `public/fonts/Inter-*.otf` — a priori usage PDF serveur uniquement (`src/lib/pdf/pdf-fonts.ts`), à confirmer ; sinon convertir en woff2 |
| Police Inter chargée 2× | Déclarée dans `app/layout.tsx` ET `(dashboard)/layout.tsx` (révélé par les erreurs de build next/font) |

Service worker (`public/sw.js`) : globalement sain. Risque de staleness (cache-first permanent sur `/images/` non versionnées) mais **pas de ralentissement** attribuable.

---

## 10. SCÉNARIO COMPLET D'UNE NAVIGATION (pourquoi ça "rame")

Clic sur "Véhicules" depuis le dashboard :

1. Requête RSC part → **middleware : 3 appels Supabase en série** (~150–300 ms)
2. Rendu serveur `force-dynamic` → si chargement complet, **+4 appels en série** (~200–400 ms)
3. La réponse arrive → **`AnimatePresence mode="wait"` : ~250 ms d'animation de sortie obligatoire** + démontage complet de l'ancienne page
4. La nouvelle page (composant client) monte → affiche des **squelettes**
5. React Query lance `useVehicles` (`select('*')` + jointure driver, sans limite), `useFleetReliabilityScores`, `useSubscriptionLimits` → ~300–800 ms
6. Pendant ce temps : l'horloge re-render le header chaque seconde, le dashboard (si un onglet est resté ouvert) rejoue ses 7 requêtes toutes les 10 s, les prefetch des liens de la sidebar déclenchent 3 appels middleware chacun
7. Les données arrivent → rendu final, avec animations d'entrée framer-motion en cascade

**Temps perçu : 1 à 2,2 s** — et chaque clic recommence le cycle car rien n'est mis en cache côté serveur et le remount `key={pathname}` jette l'état.

---

## 11. PLAN DE REMÉDIATION PRIORISÉ (à valider — rien n'a été modifié)

### 🔴 P0 — Quick wins, gains immédiats, risque faible
| # | Action | Gain estimé |
|---|---|---|
| 1 | Supprimer/passer à 60 s+ le `refetchInterval: 10s` de `useDashboardStats` + paralléliser ses 7 requêtes (`Promise.all`) + agrégats SQL | Charge DB ÷ 10, dashboard plus fluide pour tous |
| 2 | Supprimer `AnimatePresence mode="wait"` (ou passer en `mode="popLayout"` / durée 0,1 s sans wait) | −250 ms **par navigation** |
| 3 | Remplacer `window.location.href` par `router.push` dans le header (cloche + logout) | Suppression des rechargements complets |
| 4 | Supprimer le double `QueryClientProvider` (garder un seul) | Cache unifié, moins d'overhead |
| 5 | Remplacer `import * as Icons from 'lucide-react'` dans les 2 fichiers notifications | `/notifications` : ~−150 kB |
| 6 | Supprimer les 56 MB de PNG orphelins, recompresser `og-image.png`, corriger la référence `/og-image.jpg` | Déploiements allégés, OG fonctionnel |
| 7 | Isoler l'horloge du header dans un micro-composant (le `setInterval 1s` ne re-rend que lui) | Fin des re-renders globaux chaque seconde |

### 🟠 P1 — Structurels, gains majeurs
| # | Action | Gain estimé |
|---|---|---|
| 8 | Middleware : ne garder que `getUser()` + mettre en cache profil/company (claims JWT custom, ou cookie signé, ou cache court) ; exclure les prefetch (`purpose: prefetch` header) | −100 à −250 ms par requête, ÷3 appels Supabase |
| 9 | Layout dashboard : wrapper `getUserWithCompany` dans `React.cache()`, paralléliser companies+subscriptions, partager la donnée avec le middleware (une seule source) | −150 à −300 ms par chargement complet |
| 10 | `next/dynamic` sur : `AnalyticsSection` (recharts), `RegulatoryAssistant`, `SupportWidget`, FX de la landing | −100 à −200 kB sur les routes lourdes |
| 11 | Index DB : créer `maintenance_records(company_id, requested_at DESC)` + `(company_id, status)`, `fuel_records(company_id, date DESC)`, `drivers(company_id, created_at DESC)`, `routes(company_id, route_date)`, `ai_predictions(company_id)` ; supprimer les index morts sur `service_date` | Requêtes listes nettement plus rapides à mesure que les données croissent |
| 12 | **Supprimer les fallbacks RLS full-table** (`use-maintenance.ts:114`, `use-compliance.ts:131`) — perf ET sécurité | Critique |
| 13 | Agrégats SQL/RPC pour : stats dashboard, analytics, fuel stats, incident stats, compteurs maintenance | Transferts ÷ 10-100, calculs instantanés |

### 🟡 P2 — Refonte progressive (le vrai saut de fluidité)
| # | Action |
|---|---|
| 14 | Migrer les pages principales vers du **fetch serveur** (Server Components + streaming/Suspense, ou au minimum `initialData` React Query hydratée côté serveur) — supprime le cycle squelette→fetch |
| 15 | Consolider le dashboard : 1 RPC "dashboard_summary" au lieu de ~12 sources de requêtes ; supprimer le doublon `useIncidents` dans `IncidentStatsWidget` |
| 16 | Réduire framer-motion (68 fichiers) : garder les micro-interactions, retirer les animations de listes/pages en cascade |
| 17 | Ajouter `recharts`, `date-fns` à `optimizePackageImports` ; retirer `@radix-ui/react-icons` (non installé) |
| 18 | Nettoyer : code mort `src/lib/supabase/middleware.ts`, double chargement Inter, consolidation des migrations `fuel_records` |

---

## 12. CE QUI EST DÉJÀ BIEN (à ne pas casser)

- Config React Query par défaut saine (staleTime 5 min, pas de refetch au focus)
- `UserProvider` sans fetch client ni gate bloquante
- SDK lourds strictement côté serveur ; swagger-ui et xlsx correctement lazy
- Index corrects sur vehicles, notifications, incidents, predictions, inspections
- Images landing en webp + next/image ; optimiseur d'images actif
- Service worker sans interception pénalisante

---

*Rapport généré par audit statique multi-agents + build de production. Aucune modification de code effectuée.*
