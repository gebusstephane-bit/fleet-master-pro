# RAPPORT D'AUDIT FLEETMASTER PRO
**Date** : 24 février 2026
**Auditeur** : CTO Senior Virtual (analyse automatisée + revue manuelle du code)
**Périmètre** : Intégralité du codebase — 188 composants, 55 API routes, 76 migrations SQL
**Verdict Global** : 🟠 ORANGE — **55/100 — NO-GO commercial immédiat**

---

## 1. EXECUTIVE SUMMARY

FleetMaster Pro est un projet **techniquement ambitieux** avec une architecture solide (Supabase RLS, Next.js 14 App Router, Stripe, Sentry). Cependant, **4 failles bloquantes** empêchent la mise en production commerciale : une récursion RLS non résolue malgré 5 tentatives de correction, un rate limiter en mémoire inefficace en serverless, l'absence totale de tests unitaires, et une non-conformité RGPD patente (pas de banner cookies, pas de suppression de compte). Le risque principal est **la fuite de données entre entreprises clientes** (isolation multi-tenant non garantie) et **une amende CNIL** dès le premier signalement.

---

## 2. SCORES DÉTAILLÉS

| Critère | Note | Statut | Commentaire synthétique |
|---------|------|--------|------------------------|
| Sécurité | **13/25** | 🟠 | RLS récursive, rate limit mémoire, idempotence Stripe insuffisante |
| Code | **13/25** | 🟠 | 0 test unitaire, 297 `any`, ESLint désactivé au build |
| Design | **13/20** | 🟠 | Bon design system, mais cookie banner absent, Lorem ipsum en prod |
| Production | **9/20** | 🔴 | 0 tests, rate limit serverless incompatible, RGPD non conforme |
| Business | **7/10** | 🟢 | Pricing compétitif, valeur claire, moat faible |
| **TOTAL** | **55/100** | 🟠 | NO-GO commercial — 3 à 4 semaines de corrections nécessaires |

---

## 3. FAILLES CRITIQUES (Bloquant mise en production)

### 🔴 Faille 1 : RLS Récursion — Isolation multi-tenant non garantie

**Gravité : BLOQUANTE**

Le projet a tenté de corriger ce problème dans 5 migrations successives (20250208, 20250209×3, 20250220) sans succès. La politique SELECT sur `profiles` se référence elle-même en boucle :

```sql
-- Migration 20250209000001 — ENCORE CASSÉ
CREATE POLICY "Profiles viewable by company"
ON profiles FOR SELECT
USING (
    company_id IN (
        SELECT company_id FROM profiles  -- ← RÉCURSION sur profiles!
        WHERE id = auth.uid()
    )
    OR EXISTS (
        SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'  -- ← Re-récursion!
    )
);
```

**Impact réel** : Selon l'ordre d'exécution des requêtes PostgreSQL, les policies peuvent soit bloquer tous les accès (0 données retournées), soit ne pas s'appliquer du tout (fuite cross-tenant). En multi-tenant SaaS, c'est la faille #1 critique : l'entreprise A peut lire les véhicules de l'entreprise B.

**Correction requise** : Refonte totale avec `SECURITY DEFINER` function (déjà partiellement présente dans certaines migrations mais pas appliquée uniformément) :

```sql
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT company_id FROM profiles WHERE id = auth.uid() LIMIT 1;
$$;

-- Toutes les tables doivent utiliser cette fonction, PAS de sous-requête sur profiles
CREATE POLICY "vehicles_company_isolation" ON vehicles
  FOR ALL USING (company_id = get_user_company_id());
```

---

### 🔴 Faille 2 : Rate Limiter serverless-incompatible

**Gravité : BLOQUANTE**

Le rate limiter est implémenté en mémoire Node.js (`Map<string, ...>`). Sur Vercel (serverless), chaque invocation de fonction peut tourner dans un process isolé. La fenêtre temporelle est réinitialisée à chaque cold start.

```typescript
// src/lib/security/rate-limiter.ts — 7 TODOs "migration Redis"
// Stockage en mémoire = INEFFICACE en production serverless
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
```

**Impact** : Brute-force sur `/api/auth` illimité en prod Vercel. Un attaquant peut faire 10 tentatives/min depuis plusieurs IPs (VPN/proxy) avec 0 ralentissement réel. Upstash Redis est **déjà installé** en dépendance mais jamais utilisé.

**Correction** : Basculer vers `@upstash/ratelimit` + `@upstash/redis` (env vars déjà présentes).

---

### 🔴 Faille 3 : RGPD non conforme — Exposition légale immédiate

**Gravité : BLOQUANTE (risque amende CNIL)**

Trois violations RGPD constatées :

**3a. Pas de banner de consentement cookies**
PostHog Analytics est chargé sans opt-in explicite de l'utilisateur. La CNIL considère cela comme une infraction dès le premier signalement. Amende maximale : 4% du CA mondial ou 20M€. Le projet est en mode opt-out implicite (désactivé en dev, actif en prod) sans mécanisme de consentement.

**3b. Pas de suppression de compte (droit à l'oubli — Article 17 RGPD)**
La page `/settings/profile` n'a qu'un `updateUser()`. Aucune action `deleteAccount()` n'existe. La politique de confidentialité mentionne explicitement le droit à l'effacement — contradiction légale directe.

**3c. Lorem ipsum dans la politique de confidentialité**
La page `politique-confidentialite` contient du contenu placeholder en production. Publier une politique de confidentialité incomplète avec du faux contenu est problématique légalement.

---

### 🔴 Faille 4 : Secrets de production potentiellement faibles

**Gravité : CRITIQUE si identiques en production**

Le `.env.local` de développement contient des valeurs très faibles pour des variables critiques. **Si ces mêmes valeurs sont utilisées dans les Vercel Environment Variables de production**, le risque est maximal :

- `CRON_SECRET` : valeur analysée comme triviale, < 20 caractères simples
- `SUPERADMIN_SETUP_SECRET` : 8 caractères, comparable à un mot de passe basique

L'endpoint `POST /api/admin/create-superadmin` est **accessible publiquement** (le middleware Next.js exclut tous les `/api/` de son matcher). Avec un secret faible en production, un attaquant peut créer un compte superadmin en quelques secondes.

**Vérification immédiate requise** : Comparer les secrets Vercel Dashboard avec `.env.local`. Si identiques → rotation obligatoire.

```bash
# Générer des secrets forts
openssl rand -hex 32  # Pour CRON_SECRET
openssl rand -hex 32  # Pour SUPERADMIN_SETUP_SECRET
```

---

### 🟠 Faille 5 : Idempotence Stripe Webhook insuffisante

**Gravité : MODÉRÉE**

Le webhook `checkout.session.completed` vérifie l'idempotence par `stripe_customer_id` uniquement, pas par `event.id`. Un rejoue du même webhook (retry Stripe automatique ou replay attaquant) peut créer deux abonnements pour un seul paiement.

```typescript
// webhook/route.ts — Idempotence insuffisante
const { data: existingSub } = await supabase
  .from('subscriptions')
  .select('id')
  .eq('stripe_customer_id', stripeCustomerId)  // ← Pas assez unique
  .maybeSingle();
```

**Correction** :
```typescript
// Utiliser stripe_event_id comme clé d'idempotence
const { data: existing } = await supabase
  .from('webhook_events')
  .select('id')
  .eq('stripe_event_id', event.id)  // ← Unique par événement Stripe
  .maybeSingle();
if (existing) return NextResponse.json({ received: true });
```

---

### 🟠 Faille 6 : Comparaison non constant-time sur secrets sensibles

**Gravité : BASSE-MODÉRÉE**

`/api/admin/reset-user-password` utilise `secret !== process.env.SUPERADMIN_SETUP_SECRET` — une comparaison string standard vulnérable aux timing attacks. L'endpoint permet de réinitialiser le mot de passe de n'importe quel utilisateur.

```typescript
// Correction
import crypto from 'crypto';
const isValid = secret && crypto.timingSafeEqual(
  Buffer.from(secret.padEnd(64)),
  Buffer.from((process.env.SUPERADMIN_SETUP_SECRET || '').padEnd(64))
);
```

---

### 🟠 Faille 7 : Tables sans RLS confirmée

D'après l'analyse des migrations, les tables suivantes présentent des problèmes de RLS :

- **`vehicles`** — RLS désactivée dans `emergency_rls_fix.sql` et non réactivée
- **`drivers`** — Aucune policy créée trouvée
- **`api_keys`** — Policy utilise `get_current_user_company_id()` (fonction inexistante → policy silencieusement ignorée)
- **`webhooks`** — Même problème (fonction inexistante)

**Impact** : Un utilisateur authentifié peut potentiellement lister tous les véhicules de toutes les entreprises via le client Supabase avec la clé anon.

---

## 4. AUDIT PAR PHASE

---

### PHASE 2 — SÉCURITÉ : 13/25

| Point | Statut | Détail |
|-------|--------|--------|
| Authentification JWT/Sessions | ✅ | Supabase SSR, refresh token, cookies HTTPOnly |
| Déconnexion propre | ✅ | `auth.signOut()` + suppression cookies |
| RLS multi-tenant | ❌ | Récursion profiles → isolation non garantie |
| Injection SQL | ✅ | 100% requêtes paramétrées via Supabase SDK |
| XSS côté email | ⚠️ | Templates HTML sans sanitization des données BDD (champs `estimated_hours` etc.) |
| CSP Headers | ✅ | Complet dans next.config.js |
| Rate limiting API | ❌ | Mémoire — inefficace en serverless |
| CSRF | ✅ | Non applicable (SameSite cookies Supabase) |
| Variables d'env | ⚠️ | Secrets faibles en dev, à vérifier en prod |
| Upload fichiers | ✅ | Supabase Storage + validation type MIME |
| Logs sans données sensibles | ⚠️ | 56 console.log dans les API routes (certains avec payload) |
| Webhook Stripe | ⚠️ | Signature OK, idempotence insuffisante |
| Endpoint superadmin | ⚠️ | Public (hors middleware), protégé uniquement par secret |

**Points positifs** : Architecture SSR propre, CSP headers robuste, zéro injection SQL possible, upload sécurisé, vérification signature Stripe en place.

---

### PHASE 3 — CODE & ARCHITECTURE : 13/25

| Point | Statut | Détail |
|-------|--------|--------|
| TypeScript strict | ✅ | `"strict": true` effectif |
| `any` non justifié | ❌ | 297 occurrences dans src/actions/ |
| ESLint au build | ❌ | `eslint.ignoreDuringBuilds: true` — dette cachée |
| Tests unitaires | ❌ | Jest configuré, threshold 30%, **0 fichier .test.ts existant** |
| Tests E2E | ⚠️ | 3 specs Playwright (login, dashboard, critical flows) — insuffisant |
| Architecture | ✅ | Clean separation hooks/actions/components |
| N+1 queries | ⚠️ | Pré-chargement crons ✅, quelques pages sans optimisation |
| Indexes BDD | ✅ | 234 CREATE INDEX — travail sérieux |
| Gestion erreurs | ⚠️ | Try/catch présents, mais logger ne remonte rien en prod |
| Dépendances résiduelles | ⚠️ | `pdfkit` encore dans deps (remplacé par pdf-lib) |
| Code smell | ⚠️ | 7 TODOs Redis non résolus, 56 console.log en API routes |
| Memoization | ✅ | React Query avec `staleTime` correctement utilisé |

**Code smells critiques** :
1. `eslint.ignoreDuringBuilds: true` → Erreurs ESLint s'accumulent silencieusement en CI
2. 297 `any` dans les actions — les server actions sont le cœur de la sécurité métier
3. `logger.ts:52` TODO "Envoyer vers Sentry/Datadog" non implémenté — erreurs prod disparaissent
4. `pending_registrations` non nettoyées automatiquement → accumulation de données mortes

---

### PHASE 4 — UX/UI & DESIGN : 13/20

| Point | Statut | Détail |
|-------|--------|--------|
| Design system cohérent | ✅ | Shadcn/ui + Tailwind — cohérence globale bonne |
| Responsive | ✅ | Mobile-first, breakpoints présents |
| Accessibilité ARIA | ⚠️ | Radix UI gère la base, audit WCAG non réalisé |
| Contraste couleurs | ⚠️ | Dark theme — à vérifier en WCAG AA |
| UX Writing | ⚠️ | Lorem ipsum en prod (politique confidentialité) |
| Onboarding | ✅ | Flux clair, étapes bien définies |
| Empty states | ✅ | Bien conçus sur toutes les sections |
| Skeleton loaders | ✅ | Présents sur toutes les listes |
| Transitions | ✅ | Framer Motion intégré |
| Cookie banner | ❌ | **Absent** — PostHog analytics sans consentement |
| Changement de mot de passe | ❌ | TODO non implémenté (settings/security/page.tsx:26) |
| Messages d'erreur | ✅ | Sonner toasts, messages français clairs |

**Problème principal** : L'absence de banner de consentement cookies est visible et constitue un signal de manque de sérieux pour un SaaS B2B ciblant des professionnels réglementés (transporteurs, gestionnaires de flotte soumis au RGPD).

---

### PHASE 5 — PRODUCTION-READINESS : 9/20

| Point | Statut | Détail |
|-------|--------|--------|
| Tests unitaires | ❌ | 0 fichiers, threshold 30% jamais vérifié |
| Tests E2E | ⚠️ | 3 specs basiques — workflow maintenance non couvert |
| Monitoring Sentry | ⚠️ | Configuré, `tracesSampleRate: 1.0` (100% — coûteux en prod) |
| Logs structurés → Sentry | ❌ | Logger.ts ne remonte pas vers Sentry (TODO L52) |
| Backup BDD | ❓ | Dépend config Supabase Dashboard — non vérifiable dans le code |
| Point-in-time recovery | ❓ | À activer (plan Supabase Pro requis) |
| Scalabilité | ⚠️ | Pagination présente sur certaines listes, pas toutes |
| RGPD — export données | ⚠️ | CSV/PDF export présent, pas de portabilité structurée (JSON) |
| RGPD — suppression compte | ❌ | Aucune action deleteAccount |
| Documentation | ❌ | README non à jour, aucune doc technique interne |
| CI/CD | ❌ | Pas de `.github/workflows/` détecté |
| Rate limiting prod | ❌ | Mémoire → réinitialisé sur chaque cold start serverless |
| Cron jobs | ✅ | 5 crons Vercel configurés, idempotents |

**Capacité à encaisser 1000 utilisateurs simultanés** : **Non, estimée à 50-100 max en l'état.**

Les problèmes bloquants pour la montée en charge sont : le rate limiter mémoire (réinitialisé à chaque cold start), l'absence de tests (aucun filet de sécurité lors des montées de version), et la RLS récursive (PostgreSQL doit résoudre des sous-requêtes récursives sur `profiles` à chaque requête → coût CPU croissant sous charge).

---

### PHASE 6 — BUSINESS : 7/10

#### Analyse marché fleet management France (TPE/PME, 5-50 véhicules)

| Concurrent | Prix | Positionnement |
|-----------|------|----------------|
| Fleetio | 50-200$/mois | Anglophone, UX complexe, bon mais cher |
| Quartix | ~15€/véhicule/mois | Focus GPS uniquement |
| Géolocalisation.com | 10-20€/véhicule/mois | Basique, peu de valeur ajoutée |
| **FleetMaster Pro** | **29-129€/mois** | **Français, tout-en-un, IA incluse** |

**Positionnement** : Le forfait (vs. facturation à l'unité) est un différenciateur fort pour les TPE qui ont une flotte stable. L'interface entièrement française pour des obligations réglementaires françaises (CT, TACHY, ATP) est un avantage concurrentiel réel.

**Différenciateurs uniques** :
- IA prédictive basée sur inspections réelles (unique à ce prix)
- SOS dépannage intégré (unique sur ce segment)
- Conformité réglementaire française native

**Moats** (protection contre la copie) :
- Données historiques d'inspection → valeur croissante avec le temps (lock-in doux)
- Intégration SOS garages → réseau propriétaire difficile à dupliquer
- **Moat actuel : FAIBLE** — un concurrent avec 3 développeurs peut reproduire en 3 mois

**Recommandation pricing** :
- Essential : 29€/mois ✅ (bon prix d'entrée, ne pas changer)
- Pro : **59€/mois** (49€ sous-valorise l'IA prédictive et l'API — +20% de marge)
- Unlimited : **149-179€/mois** (129€ trop bas pour un "Enterprise" avec SLA 99.9%)
- Annuel : Proposer 3 mois offerts (vs 2 actuellement) pour améliorer la rétention annuelle

---

## 5. RECOMMANDATIONS PAR PRIORITÉ

### P0 — Semaine 1 (Bloquant production commerciale)

- [ ] **Refonte RLS** : Créer `get_user_company_id() SECURITY DEFINER`, supprimer les sous-requêtes récursives sur `profiles`, activer RLS sur `vehicles` et `drivers`, vérifier `api_keys` et `webhooks`
- [ ] **Vérifier secrets production** : Comparer Vercel Dashboard vs `.env.local`. Si `CRON_SECRET` ou `SUPERADMIN_SETUP_SECRET` sont identiques → rotation immédiate (`openssl rand -hex 32`)
- [ ] **Banner consentement cookies** : Bloquer PostHog jusqu'à opt-in explicite (CNIL obligatoire)
- [ ] **Suppression de compte** : Implémenter `deleteAccount()` via Supabase Admin API + CASCADE DELETE sur les données liées
- [ ] **Corriger idempotence Stripe** : Vérifier par `event.id` dans une table `webhook_events`
- [ ] **Politique de confidentialité** : Supprimer le Lorem ipsum, rédiger le contenu légal réel

### P1 — Mois 1 (Conformité & stabilité)

- [ ] **Rate limiter Redis** : Migrer vers `@upstash/ratelimit` (installé, env vars présentes, 7 TODOs déjà écrits)
- [ ] **Tests unitaires** : Couvrir au minimum les actions critiques (checkout Stripe, createMaintenance, vehicle status change)
- [ ] **Logger → Sentry** : Connecter le logger (TODO `src/lib/logger.ts:52`)
- [ ] **`tracesSampleRate: 0.1`** : Réduire de 1.0 à 0.1 en prod (100% = coût Sentry ×10)
- [ ] **`eslint.ignoreDuringBuilds: false`** : Corriger les erreurs ESLint en amont
- [ ] **Comparaison constant-time** : `crypto.timingSafeEqual()` sur `reset-user-password`
- [ ] **Supprimer `pdfkit`** des dépendances (remplacé par pdf-lib)
- [ ] **Changement de mot de passe** : Implémenter la page (TODO settings/security)
- [ ] **Cleanup `pending_registrations`** : Ajouter dans un cron existant `DELETE WHERE expires_at < NOW()`

### P2 — Roadmap Q2 (Compétitivité commerciale)

- [ ] **CI/CD GitHub Actions** : Lint + tests + build + Playwright sur chaque PR
- [ ] **App mobile** : PWA est un début, mais une app React Native améliorerait la rétention
- [ ] **Tests E2E complets** : Workflow inspection, workflow maintenance complet, flux Stripe sandbox
- [ ] **Documentation API** : La route `/api/docs` existe — rédiger le Swagger/OpenAPI
- [ ] **Audit WCAG AA** : Vérification contrastes dark theme
- [ ] **API keys rotation** : Forcer rotation des clés après 90 jours (champ `rotation_required_at`)
- [ ] **Relever prix** : Pro → 59€, Unlimited → 149€

---

## 6. VERDICT COMMERCIAL

> "À ce stade, vendre cet outil à plus de **10 clients simultanés est risqué**. Le risque de fuite de données inter-entreprises (RLS récursive non résolue malgré 5 tentatives) pourrait causer une perte totale de confiance et une exposition légale grave. La non-conformité RGPD (absence de cookie banner + droit à l'oubli non implémenté) expose à une amende CNIL dès le premier signalement. La tarification est **sous-évaluée** sur les plans Pro et Unlimited — vous laissez de l'argent sur la table."

---

## 7. CHECKLIST GO / NO-GO

| Critère | Statut | Bloquant GO |
|---------|--------|-------------|
| RLS isolation multi-tenant validée | ❌ | **OUI** |
| Rate limiter efficace en production | ❌ | **OUI** |
| Secrets forts en production Vercel | ⚠️ À vérifier | **OUI** |
| RGPD : Cookie banner consentement | ❌ | **OUI** |
| RGPD : Suppression de compte | ❌ | **OUI** |
| RGPD : Politique confidentialité complète | ❌ | **OUI** |
| Idempotence Stripe webhook | ❌ | NON (risque business) |
| Tests : Couverture critique minimale | ❌ | NON (risque régressif) |
| Monitoring Sentry opérationnel (logs) | ⚠️ | NON |
| Lighthouse Performance > 90 | ❓ Non mesuré | NON |
| Backup BDD + PITR activé | ❓ Non vérifié | **OUI** |
| Documentation README à jour | ❌ | NON |

---

## 8. CE QUI EST BIEN FAIT (pour l'équité)

- ✅ **234 indexes BDD** — travail sérieux d'optimisation des requêtes
- ✅ **CSP Headers complets** — protection XSS/clickjacking solide
- ✅ **Stripe signature webhook vérifiée** — base de sécurité correcte
- ✅ **Sentry configuré** — infrastructure monitoring en place
- ✅ **Push notifications VAPID** — feature avancée correctement architecturée
- ✅ **Architecture hooks/actions/components** — séparation propre
- ✅ **188 composants** — design system mature
- ✅ **5 crons idempotents** — logique anti-doublon bien pensée
- ✅ **IA prédictive basée sur inspections réelles** — différenciateur métier fort
- ✅ **SOS dépannage** — feature unique sur ce segment de prix
- ✅ **TypeScript strict effectif** — `"strict": true` réellement en place
- ✅ **Zero injection SQL** — 100% requêtes paramétrées

---

## 9. DÉCISION FINALE

### 🟠 **NO-GO — Mise en production commerciale déconseillée en l'état**

**Délai réaliste pour GO** : **3 à 4 semaines** de travail focalisé sur les P0.

| Semaine | Priorité |
|---------|----------|
| S1 | Refonte RLS complète + vérification/rotation secrets production |
| S2 | Rate limiter Redis + cookie banner RGPD + suppression compte |
| S3 | Idempotence Stripe + tests E2E critiques + politique confidentialité |
| S4 | Audit RLS en staging avec PostgREST direct + Lighthouse + tests de pénétration basiques |

**Score estimé après corrections P0** : **72-75/100 → GO avec surveillance**

---

*Rapport généré par analyse statique du codebase et des migrations SQL. Un test de pénétration manuel et des tests de charge sont recommandés avant commercialisation à grande échelle.*
