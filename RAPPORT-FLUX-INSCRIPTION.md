# RAPPORT FORENSIC — FLUX D'INSCRIPTION FLEETMASTER PRO

> **Date d'audit** : 21 février 2026
> **Auditeur** : Analyse automatisée du code source (lecture seule)
> **Périmètre** : Flux complet inscription → paiement → accès dashboard

---

## 1. SYNTHÈSE EXÉCUTIVE

Le flux est **fragile et bloqué sur deux points critiques**. Les nouveaux inscrits **ne pourront pas accéder à leur compte** après paiement car aucun email ne leur est envoyé et leur mot de passe leur est inconnu. De plus, le système de redirection post-Stripe échoue systématiquement sur les plans avec période d'essai (14 jours), ce qui concerne **100% des inscriptions actuelles**. Le risque principal est la **perte de clients** : ils paient, voient une page d'erreur ou tournent en rond, et ne peuvent pas se connecter.

**Conclusion directe** : N'envoyez pas le lien d'inscription à 10 prospects demain matin sans corriger au minimum les bugs #1 et #2 ci-dessous.

---

## 2. ARCHITECTURE ACTUELLE (Schéma)

```
[/register - 3 étapes Zod]
         │
         ▼ (onSubmit - étape 3 seulement)
[POST /api/stripe/create-checkout-session]
    - Crée un Customer Stripe
    - Met first_name/last_name/siret/phone dans subscription_data.metadata
    - Met SEULEMENT plan_type/company_name/email dans session.metadata
    - Redirige vers Stripe Checkout (14 jours d'essai)
         │
         ▼ (paiement accepté sur Stripe)
┌────────────────────────────────────────────────────────┐
│  DEUX CHEMINS EN PARALLÈLE (race condition)            │
│                                                        │
│  A) Stripe → /api/stripe/checkout-success?session_id   │
│     - Vérifie payment_status === 'paid'                │
│     - ÉCHOUE si trial (payment_status = 'no_payment_  │
│       required') → renvoie vers /register?error=...   │
│                                                        │
│  B) Stripe → Webhook /api/stripe/webhook               │
│     - Vérifie idempotence (stripe_customer_id)         │
│     - Vérifie registration_pending metadata            │
│     - auth.admin.createUser (mot de passe ALÉATOIRE)   │
│     - INSERT companies (company_id = gen_random_uuid)  │
│     - INSERT profiles (role = 'ADMIN')                 │
│     - INSERT subscriptions                             │
│     - AUCUN email envoyé ← COMMENTAIRE SEULEMENT      │
└────────────────────────────────────────────────────────┘
         │ (si webhook traité avant redirect A)
         ▼
[/dashboard?welcome=true]
    - Middleware vérifie auth → USER PAS CONNECTÉ
    - Redirect vers /login
         │
         ▼
[UTILISATEUR BLOQUÉ - ne connaît pas son mot de passe]
```

---

## 3. TABLEAU DES RISQUES

| # | Étape | Risque | Probabilité | Impact | Mitigation actuelle |
|---|-------|--------|-------------|--------|---------------------|
| R1 | Redirect post-Stripe | `payment_status !== 'paid'` avec trial → page d'erreur | **100%** (trial = 14j) | Critique | Aucune |
| R2 | Création compte | Mot de passe aléatoire, utilisateur jamais informé | **100%** | Critique | "Mot de passe oublié" (non guidé) |
| R3 | Métadonnées Stripe | `session.metadata` ne contient pas first_name/last_name/siret/phone | **100%** | Élevé | Fallback `''` (empty string) |
| R4 | Plan type | 'essential' vs 'ESSENTIAL' → PLAN_LIMITS lookup échoue | **100%** | Moyen | Fallback sur défaut Essential |
| R5 | `webhook_errors` table | Table inexistante → INSERT échoue silencieusement | **100%** si erreur | Faible | catch block silencieux |
| R6 | Race condition | checkout-success attend 5s max, webhook peut prendre plus | Moyenne | Élevé | Page /register/confirm (polling infini) |
| R7 | RLS profils | Politiques recréées 4 fois → risque de conflits si mauvais ordre migrations | Faible | Élevé | IF EXISTS dans drops |
| R8 | Rollback partiel | Si INSERT profile échoue → user Stripe créé mais rollback auth+company | Très faible | Faible | Rollback manuel dans webhook |
| R9 | Fuite données | Données d'une entreprise visibles par une autre | **Très faible** | Critique | RLS + get_current_user_company_id() |

---

## 4. BUGS IDENTIFIÉS

### 🔴 BUG BLOQUANT #1 — Utilisateur ne peut pas se connecter après paiement

**Fichier** : [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L173)

**Description** :
Le webhook génère un mot de passe **aléatoire** (48 caractères hexadécimaux) pour créer l'utilisateur :
```typescript
const tempPassword = randomBytes(24).toString('hex');
```
Le mot de passe saisi par l'utilisateur dans le formulaire (étape 2) est collecté, envoyé à l'API de création de session, puis **complètement ignoré** — il n'est jamais transmis à Stripe ni au webhook.

L'étape 5 du webhook est un **commentaire vide** :
```typescript
// 5. ENVOYER EMAIL DE BIENVENUE AVEC LIEN DE CONFIGURATION MOT DE PASSE
// Pour l'instant, il peut utiliser "Mot de passe oublié" ou on envoie un lien magique
```
Aucun email n'est envoyé. L'utilisateur est bloqué.

**Solution** : Dans le webhook, après création du user, appeler :
```typescript
await supabase.auth.admin.generateLink({
  type: 'magiclink',
  email: email,
  options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/dashboard?welcome=true` }
});
// Puis envoyer cet email via Supabase ou Resend/SendGrid
```

---

### 🔴 BUG BLOQUANT #2 — Page d'erreur systématique pour les plans avec trial

**Fichier** : [src/app/api/stripe/checkout-success/route.ts](src/app/api/stripe/checkout-success/route.ts#L27)

**Description** :
La route vérifie `session.payment_status !== 'paid'`. Or, avec `trial_period_days: 14` (configuré dans create-checkout-session), Stripe retourne `payment_status = 'no_payment_required'` pour les abonnements avec période d'essai. La condition échoue donc **à chaque inscription** et l'utilisateur est redirigé vers `/register?error=payment_not_completed`.

**Solution** : Modifier la condition pour accepter les trials :
```typescript
const validStatuses = ['paid', 'no_payment_required'];
if (!validStatuses.includes(session.payment_status)) { ... }
```

---

### 🟠 BUG IMPORTANT #3 — Profil créé avec prénom/nom/SIRET vides

**Fichier** : [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L145)

**Description** :
Le webhook lit les métadonnées depuis `session.metadata` :
```typescript
const metadata = (session as any).metadata || (session as any).subscription?.metadata || {};
const firstName = metadata.first_name || '';  // → TOUJOURS ''
```
Mais `first_name`, `last_name`, `siret`, `phone` ne sont **pas** dans `session.metadata` — ils sont dans `subscription_data.metadata` (accessible via l'objet subscription).

`session.metadata` contient seulement : `registration_pending`, `plan_type`, `company_name`, `email`.

Résultat : profil créé avec `first_name=''`, `last_name=''`, siret non stocké.

**Solution** : Récupérer la subscription pour lire ses métadonnées :
```typescript
const stripeSubscriptionId = session.subscription as string;
const subscription = await stripe.subscriptions.retrieve(stripeSubscriptionId);
const metadata = subscription.metadata || {};
```

---

### 🟠 BUG IMPORTANT #4 — Plan type en minuscule, PLAN_LIMITS en majuscule

**Fichier** : [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L146)

**Description** :
Les métadonnées Stripe stockent `plan_type: 'essential'` (minuscule, valeur retournée par le formulaire). Mais `PLAN_LIMITS` est indexé par `'ESSENTIAL' | 'PRO' | 'UNLIMITED'`. Donc `PLAN_LIMITS['essential']` = `undefined` → les limites de véhicules/conducteurs tombent sur les valeurs par défaut :
```typescript
max_vehicles: PLAN_LIMITS[plan]?.maxVehicles || 3,  // → toujours 3
max_drivers: PLAN_LIMITS[plan]?.maxDrivers || 2,    // → toujours 2
```
Un client ayant payé "Unlimited" (illimité) se retrouvera avec 3 véhicules max. Par accident, le plan Essential a les mêmes defaults, donc seul Essential n'est pas impacté.

**Solution** : Normaliser au moment de la lecture :
```typescript
const plan = ((metadata.plan_type as string)?.toUpperCase() as PlanType) || 'ESSENTIAL';
```

---

### 🟡 BUG MOYEN #5 — Table `webhook_errors` inexistante

**Fichier** : [src/app/api/stripe/webhook/route.ts](src/app/api/stripe/webhook/route.ts#L272)

**Description** :
En cas d'erreur lors de la création d'utilisateur, le webhook tente d'insérer dans `webhook_errors`. Cette table n'existe dans aucune migration. L'INSERT échouera silencieusement (dans un catch block), masquant les erreurs critiques.

**Solution** : Créer la table ou logger via console.error uniquement.

---

### 🟡 BUG MOYEN #6 — Race condition + polling infini sur /register/confirm

**Fichier** : [src/app/(auth)/register/confirm/ConfirmContent.tsx](src/app/(auth)/register/confirm/ConfirmContent.tsx#L26)

**Description** :
Si le webhook n'a pas traité la création en moins de 5 secondes, l'utilisateur est redirigé vers `/register/confirm?pending=true`. La page tourne en boucle en appelant `supabase.auth.getUser()`. Mais comme l'utilisateur n'est **jamais connecté** (aucune session créée), ce polling retournera toujours `null`. L'utilisateur voit un spinner infini.

---

## 5. RÉPONSES AUX QUESTIONS SPÉCIFIQUES

**Q1 : Les données sont-elles cohérentes entre auth.users, profiles et companies ?**

> En théorie oui, si le webhook réussit. La séquence est atomique au niveau de la logique applicative (avec rollback manuel). En pratique, le profil sera créé avec prénom/nom vides (Bug #3).

**Q2 : Un nouvel inscrit aura-t-il son propre company_id isolé des autres ?**

> **OUI.** Le webhook fait `INSERT INTO companies` qui génère un `UUID` unique par `gen_random_uuid()`. Le profil est lié à ce UUID via `company_id`. Chaque entreprise a son propre espace isolé.

**Q3 : Y a-t-il un risque qu'un client voie les données d'une autre entreprise ?**

> **NON, le risque est très faible.** Les RLS sont correctement configurés avec la fonction `get_current_user_company_id()` (SECURITY DEFINER) qui isole les données par company_id. La double vérification est présente dans les APIs aussi (ex: vehicles route vérifie `company_id !== profile.company_id`). C'est le point le mieux sécurisé du flux.

**Q4 : Le mot de passe est-il stocké sécurisé ?**

> **OUI.** Supabase Auth hache les mots de passe avec bcrypt. Le mot de passe n'est jamais stocké en clair nulle part. Le mot de passe saisi dans le formulaire n'est même jamais utilisé (Bug #1), donc aucun risque de fuite.

---

## 6. SIMULATION SCÉNARIOS

### SCÉNARIO A — Inscription normale de Jean Dupont

| Étape | Ce qui se passe | Résultat |
|-------|----------------|----------|
| 1 | Jean remplit le formulaire (étape 1-3, validation Zod) | ✅ OK |
| 2 | Clic "Payer 29€/mois" → POST create-checkout-session | ✅ OK |
| 3 | Redirection Stripe Checkout (14j trial) | ✅ OK |
| 4 | Jean accepte sur Stripe → Stripe envoie event checkout.session.completed | ✅ OK (webhook) |
| 5 | Jean redirigé vers /api/stripe/checkout-success | ❌ `payment_status = 'no_payment_required'` → redirect `/register?error=payment_not_completed` |
| 6 | Webhook crée le user (async, 1-3 secondes) | ✅ OK mais prénom/nom vides |
| 7 | Jean essaie de se connecter avec son mot de passe | ❌ Mot de passe inconnu (random) |
| 8 | Jean clique "Mot de passe oublié" → email reset | ✅ Possible mais non guidé |
| 9 | Jean définit un nouveau mot de passe → /login | ✅ OK |
| 10 | Connexion → middleware vérifie subscription | ✅ status 'trialing' |
| 11 | Middleware vérifie onboarding_completed → FALSE | → redirect /onboarding |
| 12 | Jean complète l'onboarding | ✅ OK |
| 13 | Accès dashboard | ✅ OK |
| 14 | Jean peut créer un véhicule | ✅ OK (validation Zod + double company_id check) |

**Verdict** : Jean peut S'EN SORTIR mais l'expérience est très mauvaise. Il voit une page d'erreur après paiement, ne peut pas se connecter directement, et doit passer par "Mot de passe oublié" sans indication.

---

### SCÉNARIO B — Email existant

| Étape | Ce qui se passe |
|-------|----------------|
| Tentative d'inscription avec email existant | Le webhook vérifie `profiles.eq('email', email)` → trouve le profil → `return;` (sans créer) |
| Conséquence | Customer Stripe créé mais sans user Supabase → orphelin Stripe |
| Message visible | Aucun (le checkout Stripe accepte, puis l'erreur est silencieuse) |

**Risque** : Leak d'information ? NON — le formulaire front ne dit pas si l'email existe. Mais il y a une perte d'argent si la carte est débitée (fin du trial) et que l'accès n'est pas créé.

---

### SCÉNARIO C — Crash test (trigger échoue)

Dans ce flux, il n'y a pas de trigger PostgreSQL — tout passe par le webhook. Si le webhook plante :
- `webhook_errors` INSERT échoue (table inexistante)
- L'utilisateur voit la page d'erreur checkout-success (Bug #2)
- Un Customer Stripe orphelin est créé
- Aucune notification aux admins
- L'utilisateur doit contacter le support

---

## 7. VÉRIFICATION PRÉ-PRODUCTION (Checklist)

Avant d'ouvrir les inscriptions :

- [ ] **CRITIQUE** : Corriger Bug #2 (payment_status trial) → sinon 100% des inscriptions échouent
- [ ] **CRITIQUE** : Corriger Bug #1 (email de bienvenue / magic link) → sinon 100% des users bloqués
- [ ] **IMPORTANT** : Corriger Bug #3 (lire subscription.metadata pour first_name/last_name/siret)
- [ ] **IMPORTANT** : Corriger Bug #4 (`.toUpperCase()` sur plan_type)
- [ ] **MOYEN** : Créer la table `webhook_errors` ou supprimer ce code
- [ ] Tester avec un compte Stripe TEST : vérifier que `checkout.session.completed` déclenche le webhook
- [ ] Vérifier que `STRIPE_WEBHOOK_SECRET` est configuré en production (sinon 503)
- [ ] Vérifier que `NEXT_PUBLIC_APP_URL` est configuré (sinon les redirects Stripe pointent vers `undefined`)
- [ ] Vérifier que `STRIPE_PRICE_ID_ESSENTIAL`, `STRIPE_PRICE_ID_PRO`, `STRIPE_PRICE_ID_UNLIMITED` sont définis
- [ ] Tester la fonctionnalité "Mot de passe oublié" (seul accès possible actuellement)
- [ ] Vérifier que l'onboarding `/onboarding` est fonctionnel et marque `onboarding_completed = true`
- [ ] Vérifier en console Supabase que les RLS sont actives sur `companies`, `profiles`, `vehicles`, `drivers`

---

## 8. RECOMMANDATIONS

### Corrections immédiates (avant d'accepter des inscrits)

**#1 — Envoyer un magic link après création du compte** (webhook, step 5)
C'est la correction la plus urgente. Avec Supabase, c'est 5 lignes de code.

**#2 — Corriger la vérification payment_status**
Accepter `'no_payment_required'` en plus de `'paid'`.

**#3 — Lire les métadonnées depuis la subscription Stripe** (pas depuis session)
La session Stripe ne contient pas les détails étendus (first_name, etc.) — ils sont sur la subscription.

### Surveillance (monitoring)

- **Alertes** sur les erreurs webhook Stripe (console Vercel + Stripe Dashboard → Webhooks → Events failed)
- **Vérification quotidienne** : chercher dans `auth.users` les users sans profil correspondant (potentiels orphelins)
- **Vérifier** que chaque Customer Stripe a un profil Supabase associé

### Vérification manuelle des inscriptions (recommandée à court terme)

Oui, recommandée. Avant que les bugs soient corrigés et testés, s'abonner aux événements Stripe (`checkout.session.completed`) et vérifier manuellement dans Supabase que le profil + company ont bien été créés. Si non, créer manuellement et envoyer un magic link.

---

## 9. CE QUI FONCTIONNE BIEN (pour rassurer)

| Point | Détail |
|-------|--------|
| ✅ Isolation des données | RLS + `get_current_user_company_id()` SECURITY DEFINER → zéro risque de fuite inter-entreprises |
| ✅ Mots de passe | Jamais en clair, bcrypt via Supabase Auth |
| ✅ Sécurité webhook | Signature HMAC Stripe vérifiée à chaque appel |
| ✅ Idempotence | Le webhook vérifie si le client Stripe existe déjà → pas de doublons |
| ✅ Rollback | Si création company échoue → user supprimé ; si création profil échoue → user + company supprimés |
| ✅ Validation données | Zod côté frontend (SIRET 14 chiffres, email, téléphone 10 chiffres) |
| ✅ API Vehicles | Double vérification company_id (profil + where clause) |
| ✅ Middleware | Bloque l'accès aux routes protégées selon subscription_status |
| ✅ Onboarding | Nouveau user obligé de passer l'onboarding avant le dashboard |
| ✅ priceId validé | `priceId.startsWith('price_')` → protection contre injection de faux price IDs |

---

*Rapport généré le 21 février 2026 — Analyse statique du code source sans exécution ni modification.*
