# Fleet Master Pro — CLAUDE.md

> Document de référence pour Claude Code. Lu automatiquement à chaque session.
> SaaS de gestion de flotte pour transport routier — fleet-master.fr

> Dernière mise à jour : 19 avril 2026
> Maintenu par : Claude Code (à mettre à jour à chaque session importante)

## RÈGLES D'OR (non négociables)

1. **`'use client'` DOIT être en ligne 1** d'un fichier `.ts` / `.tsx`. Avant tout JSDoc, commentaire, ou code. Si placé après un commentaire, Next.js peut ignorer la directive → composants `undefined` au runtime → "Element type is invalid".

2. **next-safe-action v8 retourne `{ data, serverError, validationErrors }`** — PAS `{ success, data }`. Tout hook qui consomme une safe-action doit gérer **les trois** :
   ```ts
   if (result?.serverError) throw new Error(result.serverError);
   if (result?.validationErrors) {
     // throw avec message de validation lisible
   }
   return result?.data?.data;  // ou result?.data selon l'action
   ```

3. **Les Server Actions qui font INSERT doivent inclure `company_id`** depuis `ctx.user.company_id` (RLS bloque sinon). Vérifier explicitement avant l'INSERT :
   ```ts
   if (!ctx.user.company_id) throw new Error('Company manquante');
   await supabase.from('table').insert({ ...parsedInput, company_id: ctx.user.company_id });
   ```

4. **Les crons utilisent `createAdminClient()` (service role)** pour bypasser RLS. Propager le client admin via paramètre `supabaseClient?: SupabaseClient<Database>` dans toutes les fonctions appelées en cron — sinon RLS rejette les writes silencieusement.

5. **`.maybeSingle()` au lieu de `.single()`** quand 0 row est possible. `.single()` lance une erreur PGRST116 sur 0 ligne.

6. **Tester `npx tsc --noEmit` avant chaque push.** Les erreurs pré-existantes dans `__tests__/actions/drivers.test.ts` et `__tests__/actions/maintenance.test.ts` (TS2367) sont OK à ignorer.

7. **Ne jamais faire de rollback git destructif** (`git reset --hard`, `git push --force`) sans demander explicitement.

## ANTI-PATTERNS (à ne JAMAIS faire)

- Ne jamais créer un composant client sans `'use client'` ligne 1
- Ne jamais utiliser `.single()` si 0 row possible — préférer `.maybeSingle()`
- Ne jamais oublier `company_id` dans un INSERT sur table à RLS strict
- Ne jamais utiliser `createClient()` dans un cron — utiliser `createAdminClient()`
- Ne jamais `return null` pour court-circuiter middleware — utiliser `NextResponse.next()`
- Ne jamais checker uniquement `result.serverError` — toujours aussi `result.validationErrors`
- Ne jamais `git reset --hard` ou `git push --force` sans demander explicitement
- Ne jamais commit `.env.local` ou des secrets
- Ne jamais utiliser `pdfkit` (ESM cassé) — utiliser `pdf-lib`
- Ne jamais activer `output: 'standalone'` (cassé avec route groups parenthésés)

---

## Stack technique

| Couche | Outil | Version |
|---|---|---|
| Framework | Next.js (App Router) | ^14.2.35 |
| React | react / react-dom | 18.2.0 |
| TypeScript | typescript | ^5 |
| Styling | tailwindcss + shadcn/ui (Radix) | ^3.4.1 |
| Forms | react-hook-form + Zod | ^7.71 + ^4.3 |
| State | @tanstack/react-query | ^5.90 |
| Server Actions | next-safe-action | ^8.0.11 |
| Database | @supabase/ssr + supabase-js | ^0.8 + ^2.94 |
| Animations | framer-motion | ^12.33 |
| Charts | recharts | ^3.7 |
| Icons | lucide-react | ^0.563 |
| Toasts | sonner | ^2.0 |
| Emails | resend | ^6.9 |
| Paiements | stripe + @stripe/react-stripe-js | ^20.3 |
| AI | openai (gpt-4o-mini) + @anthropic-ai/sdk | ^6.25 + ^0.78 |
| Monitoring | @sentry/nextjs | ^10.39 |
| Rate limit | @upstash/ratelimit + @upstash/redis | ^2.0 + ^1.36 |
| PDF | pdf-lib (PAS pdfkit) | ^1.17 |
| Push | web-push (VAPID) | ^3.6.7 |

### Scripts npm
- `npm run dev` — dev server
- `npm run build` — build prod (lance aussi `scripts/fix-manifests.js`)
- `npm run start` — start prod local
- `npm run lint` — eslint
- `npm test` / `test:watch` / `test:coverage` — Jest unit
- `npm run test:e2e` / `test:e2e:critical` — Playwright

### Variables d'environnement requises (`.env.example`)
```
# App
NEXT_PUBLIC_APP_URL

# Supabase
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
SUPABASE_SERVICE_ROLE_KEY

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
STRIPE_SECRET_KEY
STRIPE_WEBHOOK_SECRET
STRIPE_PRICE_ID_{ESSENTIAL,PRO,UNLIMITED}[_YEARLY]

# Email
RESEND_API_KEY
RESEND_FROM_EMAIL

# Push notifications
NEXT_PUBLIC_VAPID_PUBLIC_KEY
VAPID_PRIVATE_KEY
VAPID_SUBJECT

# Sécurité / Crons
CRON_SECRET                 # 32+ chars hex
SUPERADMIN_EMAIL
SUPERADMIN_SETUP_SECRET

# Monitoring
SENTRY_DSN / NEXT_PUBLIC_SENTRY_DSN
SENTRY_ORG / SENTRY_PROJECT / SENTRY_AUTH_TOKEN

# Rate limiting
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN

# AI
OPENAI_API_KEY              # gpt-4o-mini pour scoring + briefing
ANTHROPIC_API_KEY           # claude-haiku-4-5 pour assistant réglementaire

# Analytics
NEXT_PUBLIC_POSTHOG_KEY
NEXT_PUBLIC_POSTHOG_HOST    # https://eu.posthog.com
```

---

## Architecture

```
src/
├── app/
│   ├── (auth)/               # login, register, forgot-password
│   ├── (dashboard)/          # interface ADMIN/GESTIONNAIRE
│   │   ├── dashboard/
│   │   ├── vehicles/         + [id], new, edit
│   │   ├── drivers/
│   │   ├── fuel/
│   │   ├── maintenance/      + [id], new
│   │   ├── inspections/, inspection/[vehicleId]/, inspection/manual/
│   │   ├── alerts/, agenda/, compliance/, fleet-costs/
│   │   ├── incidents/, maintenance-planning/
│   │   ├── notifications/, sos/, support/, settings/
│   │   ├── ClientLayout.tsx  # Providers React Query + UserContext
│   │   └── layout.tsx        # Server layout : auth + Sidebar/Header
│   ├── (driver-app)/driver-app/   # interface CHAUFFEUR (mobile)
│   │   ├── alerts/, checklist/, fuel/, incident/, inspection/, sos/
│   │   └── page.tsx
│   ├── (legal)/, (marketing)/, (onboarding)/
│   ├── api/
│   │   ├── cron/             # 12 routes planifiées Vercel
│   │   ├── stripe/, auth/, admin/, driver/, sos/
│   │   └── v1/               # API publique versionnée (Bearer key)
│   ├── superadmin/
│   ├── layout.tsx            # Root : Providers + ServiceWorker + CookieBanner
│   └── providers.tsx
├── components/
│   ├── ai/                   # DailyBriefing, RegulatoryAssistant
│   ├── billing/              # TrialBanner
│   ├── dashboard/            # Widgets KPI, charts
│   ├── drivers/, fuel/, incidents/, inspection/, maintenance/
│   ├── layout/               # Sidebar, Header, MainContent
│   ├── providers/            # UserProvider
│   ├── ui/                   # shadcn/ui + glass-card, skeletons/
│   ├── vehicles/, sos/, support/, scan/
│   └── pwa/                  # ServiceWorkerRegister
├── hooks/                    # use-vehicles, use-fuel, use-maintenance, ...
├── actions/                  # Server Actions (next-safe-action ou plain)
│   └── ai/                   # get-daily-briefing, get-critical-vehicles, ...
├── lib/
│   ├── supabase/             # server.ts, client.ts, middleware.ts
│   ├── safe-action.ts        # actionClient + authActionClient
│   ├── ai/                   # openai-client, vehicle-scoring, budget-guard
│   ├── plans.ts              # PLAN_TYPES, PLAN_FEATURES, planHasFeature()
│   ├── maintenance-predictor.ts
│   ├── reliability-score.ts
│   └── ...
├── types/
│   ├── index.ts              # Vehicle, Driver, Route, ...
│   ├── supabase.ts           # Database type généré
│   ├── fuel.ts, support.ts, ...
├── middleware.ts             # auth + rôles + rate limit + crons
└── constants/enums.ts        # USER_ROLE, VEHICLE_STATUS, ...

supabase/migrations/          # ~137 migrations SQL versionnées
```

### Conventions de routing
- **Route groups parenthésés** (`(auth)`, `(dashboard)`, `(driver-app)`, `(legal)`, `(marketing)`, `(onboarding)`) — n'apparaissent PAS dans l'URL, servent à grouper layouts.
- **Server Components par défaut**. Ajouter `'use client'` **ligne 1** uniquement si nécessaire (hooks React, event handlers, browser APIs).
- **Layouts imbriqués** : `app/layout.tsx` (root, server) → `app/(dashboard)/layout.tsx` (server, auth) → `app/(dashboard)/ClientLayout.tsx` (Providers React Query, UserProvider).

### Rôles utilisateur (`USER_ROLE` enum)
- `ADMIN` — propriétaire de la company, accès total
- `DIRECTEUR` — direction, lecture/écriture
- `AGENT_DE_PARC` — gestionnaire flotte
- `EXPLOITANT` — exploitant
- `CHAUFFEUR` — accès uniquement à `/driver-app`, `/inspection`, `/scan`, `/api/driver`, `/api/sos`

---

## Patterns de code critiques

### 1. Server Action avec next-safe-action

```ts
// src/actions/example.ts
'use server';
import { authActionClient } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';
import { z } from 'zod';

export const createThing = authActionClient
  .schema(z.object({ name: z.string() }))
  .action(async ({ parsedInput, ctx }) => {
    const supabase = await createClient();
    if (!ctx.user.company_id) throw new Error('Company manquante');

    const { data, error } = await supabase
      .from('things')
      .insert({ ...parsedInput, company_id: ctx.user.company_id })
      .select().single();

    if (error) throw new Error(error.message);
    return { success: true, data };
  });
```

### 2. Hook React Query consommant une safe-action

```ts
// src/hooks/use-things.ts
'use client';   // ← LIGNE 1, AVANT tout JSDoc/comment

import { useMutation } from '@tanstack/react-query';
import { createThing } from '@/actions/things';

export function useCreateThing() {
  return useMutation({
    mutationFn: async (data: Parameters<typeof createThing>[0]) => {
      const result = await createThing(data);
      if (result?.serverError) throw new Error(result.serverError);
      if (result?.validationErrors) {
        const errors = Object.entries(result.validationErrors)
          .map(([f, m]) => `${f}: ${(m as any)?._errors?.join(', ') || m}`)
          .join(' | ');
        throw new Error(`Validation: ${errors}`);
      }
      return result?.data?.data;
    },
  });
}
```

### 3. Cron Vercel

```ts
// src/app/api/cron/example/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

export async function GET(request: NextRequest) {
  // Auth — 4 sources (Vercel utilise Authorization: Bearer)
  const authHeader = request.headers.get('authorization');
  const bearerSecret = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
  const secret = bearerSecret
    || request.headers.get('x-vercel-cron-secret')
    || request.headers.get('x-cron-secret')
    || request.nextUrl.searchParams.get('secret');

  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();   // service_role, bypass RLS
  // ... logic, propager `admin` aux fonctions appelées
  return NextResponse.json({ success: true });
}
```

### 4. Composant client

```tsx
'use client';   // ← LIGNE 1

/**
 * JSDoc OK ici, après la directive
 */

import { useState } from 'react';
// ...
```

---

## Crons Vercel (12 jobs)

Tous protégés par `CRON_SECRET`. Vercel envoie `Authorization: Bearer ${CRON_SECRET}`.

| Cron | Schedule | Rôle |
|---|---|---|
| `check-trials` | `0 6 * * *` | Détecte trials expirés |
| `cleanup` | `0 2 * * *` | Purge données obsolètes |
| `driver-documents` | `0 7 * * *` | Alertes docs conducteurs |
| `vehicle-documents-check` | `0 8 * * *` | Alertes docs véhicules |
| `maintenance-status` | `0 8 * * *` | Met à jour statuts maintenance |
| `maintenance-reminders` | `0 11 * * *` | Emails rappels maintenance |
| `tire-alerts` | `0 6 * * *` | Alertes pneus |
| `driver-scoring` | `0 2 * * *` | Score IA conducteurs (quotidien) |
| `vehicle-scoring` | `0 2 * * 0` | Score IA véhicules (dimanche) |
| `maintenance-predictions` | `0 3 * * 0` | Recalcul prédictions (dimanche) |
| `weekly-fleet-report` | `0 8 * * 1` | Rapport hebdo (lundi) |
| `monthly-report` | `0 8 1 * *` | Rapport mensuel (1er du mois) |

**Pattern obligatoire** dans `src/middleware.ts:193` : la branche `/api/cron` retourne `NextResponse.next()` (pas `null`) pour court-circuiter le bloc auth cookie.

---

## Tables Supabase principales

Toutes ont **RLS strict par `company_id`** sauf mention contraire.

| Table | Rôle |
|---|---|
| `companies` | Entreprises clientes |
| `profiles` | Profils utilisateurs (lié à `auth.users`) |
| `subscriptions` | Plans Stripe (TRIALING/ACTIVE/CANCELED/...) |
| `vehicles` | Flotte (mileage, plaques, dates régl.) — colonnes IA : `ai_global_score`, `ai_score_summary`, `ai_score_detail`, `ai_score_updated_at` |
| `drivers` | Chauffeurs (permis, FCO/FCOS, carte tachy) — `ai_score` JSONB |
| `maintenance_records` | Interventions (workflow : `DEMANDE_CREEE → VALIDEE_DIRECTEUR → RDV_PRIS → EN_COURS → TERMINEE`) |
| `maintenance_rules` | Règles de maintenance préventive (système + perso) |
| `maintenance_predictions` | Cache prédictions calculées (`status: ok/upcoming/due/overdue`, `priority: low/medium/high/critical`) |
| `vehicle_inspections` | Inspections avant départ |
| `incidents` + `incident_documents` | Sinistres |
| `fuel_records` | Pleins carburant (`mileage_at_fill`, `consumption_l_per_100km`) |
| `tires` + `tire_mountings` | Gestion pneumatiques |
| `alerts` | Alertes système |
| `notifications` | Notifications in-app (user_id, type, read) |
| `push_subscriptions` | Web Push (VAPID) |
| `ai_conversations` | Cache briefing IA + Q/A regulatory assistant (PAS de user_id — RGPD) |
| `ai_usage_budget` | Quota mensuel IA par company |
| `api_keys` | Clés API publiques v1 |

### RPC importantes
- `create_inspection_safe(...)` — INSERT inspection + UPDATE `vehicles.mileage = GREATEST(...)`
- `create_public_fuel_record(...)`, `create_public_inspection(...)`, `create_fuel_session(...)` — flow scan QR public
- `verify_qr_token(...)` — auth QR
- `search_vehicle_by_plate(...)` — **POSSIBLEMENT ABSENTE EN PROD** (PGRST202 connu, fallback existe dans `findVehicleByPlate`)
- `check_subscription_sync()` — admin
- `get_user_company_id()` — utilisée par RLS policies

### Triggers actifs notables
- `tr_create_prediction_on_vehicle` — sur INSERT `vehicles` → init prédictions
- `trigger_update_predictions` — sur UPDATE `maintenance_records.status='TERMINEE'` → flag `needs_recalculation` (flag posé mais jamais consommé — recalcul fait par `recalculatePredictionsForVehicle` côté JS + cron hebdo)
- `check_fuel_anomaly` — sur INSERT `fuel_records` → notification anomalie >20% écart moyenne

---

## Middleware (`src/middleware.ts`)

### Routes publiques (égalité stricte ligne 425)
`/`, `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/unauthorized`, `/pricing`, `/mentions-legales`, `/politique-confidentialite`, `/cgv`, `/driver-app`, `/sitemap.xml`, `/robots.txt`

### Matcher (ligne 684)
```js
"/((?!_next/static|_next/image|favicon.ico|images/|icons/|sw\\.js|manifest\\.json).*)"
```

### Routes accessibles aux CHAUFFEURS
- `/driver-app/*`
- `/api/driver/*`, `/api/sos/*`
- `/auth/*`, `/login`, `/unauthorized`
- `/inspection/*` (search par plaque)
- `/scan/*` (QR codes)

Tout autre chemin → redirect `/driver-app`.

### Routes API publiques (rate-limit mais pas d'auth)
`/api/auth`, `/api/stripe/{webhook,create-checkout-session,checkout-success}`, `/api/cron`, `/api/e2e`

### Statuts subscription bloquants
- `pending_payment` → redirect `/payment-pending`
- `unpaid` / `past_due` → redirect `/settings/billing?status=payment_required`
- `canceled` → redirect `/pricing?status=reactivate_required`
- `trialing` expiré → redirect `/settings/billing?trial_ended=true`
- `onboarding_completed === false` → redirect `/onboarding`

---

## Flows métier principaux

### Inscription (trial 14 jours)
`POST /api/auth/register-with-trial` → crée `auth.users` + `profiles` + `companies` + `subscriptions(status='TRIALING', trial_ends_at=+14d)` → email confirmation Resend → redirect `/onboarding`.

### Création véhicule
`actions/vehicles.ts:createVehicle` (plain) → INSERT vehicles avec `company_id` profile-based → trigger DB crée prédictions initiales.

### Saisie carburant (dashboard)
`actions/fuel.ts:createFuelRecord` (safe-action) :
1. Garde-fou `ctx.user.company_id` obligatoire
2. INSERT fuel_records avec `company_id`, `consumption_l_per_100km` calculé
3. UPDATE `vehicles.mileage` SI `nouveau > ancien` ET `delta ≤ 15000 km`
4. Recalcul prédictions non-bloquant (try/catch + dynamic import)
5. `revalidatePath('/fuel')`

### Inspection avant départ (driver-app + dashboard)
`actions/inspections.ts:createInspection` → RPC `create_inspection_safe` → INSERT inspection + GREATEST(vehicle.mileage). Défauts CRITIQUE → INSERT auto dans `maintenance_records` (status `DEMANDE_CREEE`).

### Briefing IA quotidien
`actions/ai/get-daily-briefing.ts` (safe-action, cache 4h via SHA256(companyId:date)) :
- Queries : alertes critiques, maintenances en cours, **véhicules score IA<60**, **maintenances overdue**, **docs véhicules ≤30j**, **docs conducteurs ≤30j**, anomalies carburant 24h
- gpt-4o-mini, MAX_OUTPUT_TOKENS=800, prompt durci (FR, 6-8 points, pas de markdown)
- Stockage cache : `ai_conversations.question = 'daily_briefing:${hash}'`

### Vehicle scoring (cron hebdo dimanche 2h)
- BATCH_SIZE=50, MAX_BATCHES_PER_RUN=20
- Score algorithmique : maintenance 40% + inspection 35% + consommation 25%
- Lot IA narratif gpt-4o-mini, max_tokens=3500, parser JSON tolérant
- UPDATE `vehicles.ai_global_score`, `ai_score_summary`, `ai_score_detail`, `ai_score_updated_at`

---

## Intégrations externes

| Service | Utilisation |
|---|---|
| **Stripe** | Subscriptions checkout/webhook, plans ESSENTIAL/PRO/UNLIMITED (mensuel + annuel) |
| **Resend** | Tous emails transactionnels (welcome, alertes, rapports) |
| **OpenAI** | gpt-4o-mini : scoring véhicules, scoring conducteurs, briefing quotidien |
| **Anthropic** | claude-haiku-4-5 : assistant IA réglementaire (Q/A streaming, limites par plan) |
| **PostHog** | Analytics (region EU) |
| **Sentry** | Error tracking + source maps |
| **Upstash Redis** | Rate limiting distribué (fallback mémoire) |
| **Web Push (VAPID)** | Notifications push PWA |
| **Mapbox** | Tournées (module désactivé, variable conservée) |

---

## Bugs historiques résolus (à connaître)

| Bug | Symptôme | Résolution |
|---|---|---|
| `'use client'` après JSDoc | "Element type is invalid" en prod | Toujours ligne 1, dans `.tsx` ET `.ts` |
| `validationErrors` non géré | Toast "succès" sans INSERT | Hooks vérifient `serverError` ET `validationErrors` |
| INSERT `fuel_records` sans `company_id` | RLS rejette silencieusement | `company_id: ctx.user.company_id` ajouté |
| Crons redirigés vers /login | 307 sur /api/cron/* | Middleware ligne 193 retourne `NextResponse.next()` + handlers acceptent Bearer |
| Cron predictions n'écrit rien | success:N mais 0 row | Propager `admin` SupabaseClient à `recalculatePredictionsForVehicle` + `predictMaintenanceForVehicle` |
| Recul kilométrage driver-app | Chauffeur saisit km < actuel | Garde-fou `if (newMileage > current)` + anti-saut >15000 km |
| `/sw.js` requiert auth | Refresh token errors en logs | Matcher exclut `sw\\.js` et `manifest\\.json` |
| Chauffeur bloqué sur /inspection | Redirect /driver-app | `isAllowedRoute` inclut `/inspection` |
| pdfkit ESM interop | Build standalone échoue | Remplacé par `pdf-lib` (utiliser `normalizeText()` pour caractères WinAnsi) |
| `output: 'standalone'` | ENOENT sur `(onboarding)` route group | Désactivé dans next.config.js |

---

## Conventions de commits

```
type(scope): description

Types : fix, feat, refactor, chore, perf, docs, security
Scopes courants : middleware, cron, hooks, fuel, dashboard, vehicle-scoring,
                  daily-briefing, vehicles, drivers, maintenance, ai, sos
```

---

## Déploiement

- **Branche prod** : `main` — auto-deploy Vercel sur push
- **Plateforme** : Vercel Pro
- **Domaine** : fleet-master.fr
- **Régions** : auto (cdg1 Paris recommandé pour middleware)
- **Build** : `npm run build` (Next.js + `scripts/fix-manifests.js` post-build)
- **Service Worker** : `public/sw.js` (cache versioning, push handlers)

### Configuration `next.config.js` (CJS, pas .mjs)
- `eslint.ignoreDuringBuilds: true`
- `typescript.ignoreBuildErrors: false` (strict)
- CSP avec Supabase + Stripe + Sentry + PostHog
- `serverComponentsExternalPackages: ['@supabase/supabase-js']`
- Sentry wrapper via `withSentryConfig`

---

## Checklist avant push

- [ ] `npx tsc --noEmit` (ignorer 6 erreurs préexistantes dans `__tests__/`)
- [ ] `'use client'` en ligne 1 dans tous les fichiers nouveaux/modifiés
- [ ] Server Actions avec INSERT incluent `company_id`
- [ ] Hooks gèrent `serverError` ET `validationErrors`
- [ ] `git status` ne montre que les fichiers attendus
- [ ] Pas de `.env.local` ni de fichier secret commité
- [ ] Si modif middleware/cron : tester qu'un cron tourne en prod après deploy

---

## EN CAS DE BUG SUSPECT

1. **AUDIT D'ABORD (LECTURE SEULE), fix après** — toujours
2. Vérifier les logs Vercel récents avant de coder
3. Chercher si le bug existe déjà dans "Bugs historiques résolus"
4. **SAFE_ACTION_ERROR** → checker `validationErrors` + `company_id` + RLS
5. **"Element type is invalid"** → checker `'use client'` position dans `.ts` ET `.tsx`
6. **Cron silencieux** → vérifier admin client propagé en cascade
7. **Toast "succès" sans INSERT** → checker hook gère `validationErrors`

---

## Notes diverses

- **`idSchema`** vient de `@/lib/safe-action`, PAS de `@/lib/validation/schemas.ts`
- **Set spread** = TS2802 → utiliser `Array.from(new Set(...))`
- **PostgREST** : `.maybeSingle()` pour 0..1 résultats, `.single()` ne tolère que exactement 1
- **PWA** : SW versionné `v2`, register dans root layout, push handlers dans `public/sw.js`
- **API publique v1** : auth `x-api-key` (header) ou `Authorization: Bearer`, rate limit par plan, spec OpenAPI à `/api/docs`, UI à `/api-docs`
