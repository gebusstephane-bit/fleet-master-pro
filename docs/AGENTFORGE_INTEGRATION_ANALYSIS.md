# AgentForge Integration Analysis — FleetMaster Pro

## 1. Stack Technique

| Technologie | Version | Rôle |
|-------------|---------|------|
| Next.js | 14.2.35 | Framework React SSR/SSG |
| React | 18.2.0 | UI Library |
| TypeScript | 5.x | Typage strict (`strict: true`) |
| Supabase | 2.94.0 | BDD PostgreSQL + Auth + RLS |
| Tailwind CSS | 3.4.1 | Styling utility-first |
| shadcn/ui (Radix) | 45 composants | Composants UI |
| React Query | 5.90.20 | Cache & data fetching client |
| next-safe-action | 8.0.11 | Server actions typées |
| Stripe | 20.3.0 | Paiements / abonnements |
| Resend | 6.9.1 | Emails transactionnels |
| Sentry | 10.39.0 | Error tracking |
| PostHog | 1.351.3 | Analytics (EU) |
| OpenAI | 6.25.0 | Scoring IA véhicules/conducteurs |
| Anthropic SDK | 0.78.0 | Assistant réglementaire (Claude) |
| Framer Motion | 12.33.0 | Animations |
| Recharts | 3.7.0 | Graphiques |
| Lucide React | 0.563.0 | Icônes |
| pdf-lib | 1.17.1 | Génération PDF |
| Zod | 4.3.6 | Validation schemas |

## 2. Structure du Projet

```
src/
├── app/
│   ├── (auth)/           → Login, Register, Forgot password
│   ├── (dashboard)/      → Toutes les pages protégées (65+ pages)
│   │   ├── dashboard/    → Page principale KPIs
│   │   ├── vehicles/     → CRUD véhicules + détail [id]
│   │   ├── drivers/      → CRUD conducteurs
│   │   ├── maintenance/  → Gestion maintenance
│   │   ├── fuel/         → Carburant
│   │   ├── inspections/  → Inspections véhicules
│   │   ├── compliance/   → Conformité réglementaire
│   │   ├── incidents/    → Sinistres
│   │   ├── fleet-costs/  → TCO / Coûts flotte
│   │   ├── agenda/       → Calendrier
│   │   ├── alerts/       → Alertes
│   │   ├── sos/          → SOS Garage (assistance routière)
│   │   ├── settings/     → 15+ sous-pages paramètres
│   │   └── support/      → Support tickets
│   ├── (driver-app)/     → App conducteur (mobile-first)
│   ├── (marketing)/      → Pricing, Contact
│   ├── (legal)/          → CGV, Mentions légales, RGPD
│   ├── api/              → 60+ API routes
│   ├── superadmin/       → Interface superadmin
│   └── scan/             → QR code public
├── components/
│   ├── ai/               → RegulatoryAssistant, DailyBriefing
│   ├── dashboard/        → 28 widgets dashboard
│   ├── layout/           → Sidebar, Header, MainContent
│   ├── ui/               → 45 composants shadcn
│   └── [domaine]/        → Composants par domaine métier
├── hooks/                → 30+ hooks React Query
├── lib/
│   ├── ai/               → openai-client, budget-guard, vehicle-scoring
│   ├── supabase/         → server.ts, client.ts, admin.ts, middleware.ts
│   ├── stripe/           → Intégration paiement
│   ├── email/            → Templates email Resend
│   └── plans.ts          → Plans & features (ESSENTIAL/PRO/UNLIMITED)
├── actions/              → Server actions (next-safe-action)
└── types/                → supabase.ts (types générés)
```

## 3. Authentification & Session

### Architecture Auth
- **Provider** : Supabase Auth (cookies, PostgreSQL RLS)
- **Middleware** : `src/middleware.ts` (657 lignes) — rate limiting Upstash, role checks, subscription gates
- **Server-side** : `getUserWithCompany()` dans `src/lib/supabase/server.ts`
- **Client-side** : `UserProvider` context → hook `useUserContext()`

### Objet User Disponible
```typescript
{
  id: string;           // UUID Supabase
  email: string;
  first_name: string;
  last_name: string;
  role: 'ADMIN' | 'DIRECTEUR' | 'AGENT_DE_PARC' | 'EXPLOITANT' | 'CHAUFFEUR';
  company_id: string;
  companies: {
    id: string;
    name: string;
    subscription_plan: 'ESSENTIAL' | 'PRO' | 'UNLIMITED';
    subscription_status: string;
    max_vehicles: number;
    max_drivers: number;
    logo_url: string | null;
    trial_ends_at: string | null;
  };
}
```

### Comment accéder au user
- **Layout serveur** : `const user = await getUserWithCompany();`
- **Composant client** : `const { user } = useUserContext();`
- **Hook dédié** : `const { data: user } = useUser();`

## 4. Base de Données

### ORM : Aucun (Supabase Client direct, PostgreSQL via PostgREST)

### Tables Principales

| Table | Colonnes clés | Rôle |
|-------|--------------|------|
| `companies` | id, name, subscription_plan, max_vehicles | Tenant multi-entreprise |
| `profiles` | id, email, role, company_id, is_active | Utilisateurs (lié à auth.users) |
| `vehicles` | id, company_id, registration_number, status, type, mileage | Parc véhicules |
| `drivers` | id, company_id, license_*, status, safety_score | Conducteurs |
| `maintenance_records` | id, vehicle_id, type, status, priority, cost | Historique maintenance |
| `inspections` | id, vehicle_id, score, items (JSONB) | Contrôles véhicules |
| `fuel_records` | id, vehicle_id, quantity, cost, mileage | Consommation carburant |
| `alerts` | id, company_id, vehicle_id, type, severity | Alertes système |
| `incidents` | id, vehicle_id, driver_id, severity, status | Sinistres |
| `subscriptions` | id, company_id, plan, status, stripe_* | Abonnements Stripe |
| `ai_conversations` | id, company_id, question, answer, tokens_used | Historique IA (RGPD) |
| `ai_predictions` | id, vehicle_id, failure_probability, urgency_level | Prédictions IA |

### Sécurité : Row-Level Security (RLS) activé sur toutes les tables, isolation par `company_id`

## 5. Design System

### Thème "Cosmic 2030"
- **Background** : `#020617` (cosmic-bg), `#0f172a` (cosmic-bg-light)
- **Primary** : `#00d4ff` (cyan) avec glow `rgba(0, 212, 255, 0.3)`
- **Accent** : `#8b5cf6` (violet) avec glow
- **Typography** : Inter (sans), JetBrains Mono (mono)
- **Dark mode** : activé par défaut (class-based)

### Ombres & Effets
```css
cosmic-glow: 0 0 30px rgba(0, 212, 255, 0.3)
glass: 0 4px 30px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.05)
```

### Pattern UI Récurrent
- Cartes : `bg-[#0f172a]/60 border border-cyan-500/10 rounded-2xl`
- Boutons primaires : `bg-gradient-to-r from-cyan-600 to-blue-600`
- Texte principal : `text-white` / `text-slate-200`
- Texte secondaire : `text-slate-400` / `text-slate-500`
- Inputs : `bg-[#0f172a]/60 border border-cyan-500/20 focus:border-cyan-500/50`

## 6. Composants IA Existants (Pattern de Référence)

### RegulatoryAssistant (src/components/ai/RegulatoryAssistant.tsx)
- **Position** : `fixed bottom-6 right-6 z-50` (bouton flottant)
- **Panneau** : Sheet Radix (côté droit, 480px)
- **API** : `/api/ai/regulatory-assistant` (GET usage + POST streaming)
- **Limites par plan** : ESSENTIAL 20/mois, PRO 100/mois, UNLIMITED illimité
- **Pattern** : fetch → ReadableStream → décodage incrémental

### DailyBriefing (src/components/ai/DailyBriefing.tsx)
- **Position** : En haut du dashboard
- **API** : Server action `getDailyBriefing()`
- **Cache** : 4h TTL
- **Plan** : PRO+ uniquement

## 7. Points d'Intégration pour AgentForge

### 7.1 Position du Widget Chat

**Recommandation** : Remplacer ou compléter le `RegulatoryAssistant` existant.

**Emplacement actuel** : Dans `src/app/(dashboard)/layout.tsx` ligne 57 :
```tsx
<RegulatoryAssistant plan={...} />
```

**Option A — Remplacement direct** :
Remplacer `<RegulatoryAssistant>` par `<AgentForgeWidget>` au même emplacement.
Avantage : zéro conflit, même position z-50 bottom-right.

**Option B — Cohabitation** :
Garder le RegulatoryAssistant et ajouter AgentForge.
Risque : conflit de positionnement (2 boutons fixed bottom-right).
Solution : déplacer le RA en `bottom-20 right-6`.

### 7.2 Données Contextuelles Disponibles par Page

| Page | Données disponibles | Comment les obtenir |
|------|-------------------|---------------------|
| **Dashboard** | KPIs flotte, alertes critiques, scores IA | `useDashboardStats()`, `getCriticalVehicles()` |
| **Véhicule [id]** | vehicleId, registration, type, mileage, status, ai_global_score, maintenance history | `useVehicle(id)`, URL params |
| **Conducteur [id]** | driverId, name, license, safety_score, ai_score | `useDriver(id)`, URL params |
| **Maintenance** | Liste maintenances, statuts, coûts | `useMaintenance()` |
| **Carburant** | Consommation, tendances, anomalies | `useFuelRecords()` |
| **Conformité** | Documents expirants, règles compliance | `useCompliance()` |
| **SOS** | Diagnostic véhicule, providers | URL state, actions |
| **Toutes pages** | user.id, user.role, user.company_id, plan | `useUserContext()` |

### 7.3 Données à Passer à l'API AgentForge

```typescript
interface AgentForgeContext {
  // Toujours disponible (layout)
  userId: string;
  companyId: string;
  userRole: string;
  plan: 'ESSENTIAL' | 'PRO' | 'UNLIMITED';
  userName: string;

  // Contextuel (selon la page)
  currentPage: string;        // pathname
  vehicleId?: string;         // si sur /vehicles/[id]
  driverId?: string;          // si sur /drivers/[id]

  // Données enrichies (optionnel, si le composant les fetch)
  vehicleData?: {
    registration: string;
    type: string;
    mileage: number;
    status: string;
    ai_score?: number;
  };
}
```

## 8. Variables d'Environnement à Ajouter

```env
# === AGENTFORGE ===
NEXT_PUBLIC_AGENTFORGE_AGENT_ID=votre-agent-id
AGENTFORGE_API_KEY=af_...
NEXT_PUBLIC_AGENTFORGE_API_URL=https://api.agentforge.dev
```

## 9. Risques et Mitigations

| Risque | Impact | Mitigation |
|--------|--------|------------|
| Conflit z-index avec RegulatoryAssistant | Boutons superposés | Option A : remplacement. Option B : repositionner RA |
| Conflit z-index avec SupportWidget | Même zone | Vérifier positionnement SupportWidget |
| RLS Supabase bloque les données | Widget ne peut pas fetch | Utiliser `getUserWithCompany()` côté serveur, passer les données au client |
| Bundle size (SDK AgentForge) | Performance | Import dynamique `next/dynamic` avec `ssr: false` |
| CSP headers bloquent API externe | Requêtes échouent | Ajouter domaine AgentForge dans `connect-src` (next.config.js) |
| Rate limiting middleware | Requêtes bloquées | Route `/api/agentforge/*` avec son propre rate limit |
| Plan ESSENTIAL sans accès IA | UX trompeuse | Gater via `planHasFeature(plan, 'ai_assistant')` ou nouveau flag |

## 10. Etapes d'Intégration (Ordre Exact)

### Phase 1 — Setup (sans modifier l'existant)
1. Installer le SDK AgentForge : `npm install @agentforge/sdk` (ou embed script)
2. Ajouter les 3 variables d'env dans `.env.local` et `.env.example`
3. Ajouter le domaine AgentForge dans CSP `connect-src` (`next.config.js`)

### Phase 2 — Composant Widget
4. Créer `src/components/ai/AgentForgeWidget.tsx` (voir fichier joint)
5. Style adapté au thème Cosmic 2030 (mêmes couleurs, mêmes radius, mêmes ombres)

### Phase 3 — Intégration Layout
6. Importer le widget dans `src/app/(dashboard)/layout.tsx`
7. Choisir Option A (remplacement) ou Option B (cohabitation)
8. Passer les props : `user`, `plan`, contextuel via `usePathname()`

### Phase 4 — API Route Proxy (recommandé)
9. Créer `src/app/api/agentforge/chat/route.ts` — proxy sécurisé
   - Authentification Supabase côté serveur
   - Injection du contexte company/user
   - Clé API AgentForge jamais exposée côté client
   - Rate limiting dédié

### Phase 5 — Enrichissement Contextuel
10. Détection automatique de la page courante (`usePathname()`)
11. Si `/vehicles/[id]` → fetch vehicle data → passer au contexte AgentForge
12. Si `/drivers/[id]` → fetch driver data → passer au contexte
13. Dashboard → passer les KPIs et alertes critiques

### Phase 6 — Feature Gating
14. Utiliser `planHasFeature(plan, 'ai_assistant')` pour les plans
15. ESSENTIAL : widget masqué ou limité (ex: 5 questions/mois)
16. PRO : accès complet, 100 questions/mois
17. UNLIMITED : illimité

### Phase 7 — Test & Deploy
18. Tester en local avec les 3 plans
19. Vérifier CSP headers en production
20. Monitorer via Sentry les erreurs AgentForge
21. Ajouter analytics PostHog pour mesurer l'usage
