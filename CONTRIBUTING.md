# Contributing to FleetMaster Pro

## Table des matières

1. [Prérequis](#prérequis)
2. [Installation locale](#installation-locale)
3. [Tests](#tests)
4. [Pipeline CI/CD](#pipeline-cicd)
5. [GitHub Secrets requis](#github-secrets-requis)
6. [Branch Protection Rules](#branch-protection-rules)
7. [Roadmap qualité](#roadmap-qualité)

---

## Prérequis

| Outil | Version |
|---|---|
| Node.js | 20 LTS |
| npm | 10+ |
| Git | 2.40+ |

---

## Installation locale

```bash
git clone <repo>
cd fleetmaster-pro
npm ci
cp .env.example .env.local   # puis remplir les vraies valeurs
```

---

## Tests

### Tests unitaires (Jest)

```bash
npm test                    # une passe
npm run test:watch          # mode watch
npm run test:coverage       # avec rapport HTML dans coverage/
```

Le seuil minimum de couverture est **30%** (branches, fonctions, lignes, statements).
Configuré dans [jest.config.js](jest.config.js). Le build CI échoue en-dessous.

### Tests E2E (Playwright)

```bash
# Lancer le serveur de dev d'abord
npm run dev

# Autre terminal
npm run test:e2e                     # tous les specs (tous navigateurs)
npm run test:e2e:critical            # critical-flows.spec.ts sur Chromium uniquement
npm run test:e2e:headed              # avec navigateur visible
npm run test:e2e:ui                  # UI Playwright interactive
```

Les 3 specs E2E se trouvent dans [`e2e/`](e2e/) :

| Fichier | Rôle |
|---|---|
| `login.spec.ts` | Authentification (connexion, déconnexion, erreurs) |
| `dashboard.spec.ts` | Navigation et chargement du tableau de bord |
| `critical-flows.spec.ts` | Parcours critiques (créer véhicule, créer chauffeur…) |

---

## Pipeline CI/CD

### Vue d'ensemble

```
PR ouverte / push dans une PR
        │
        ▼
┌────────────────────────────────────────────────────────┐
│                     ci.yml                              │
│                                                         │
│  ┌─────────┐  ┌─────────────┐  ┌───────┐  ┌────────┐  │
│  │  lint   │  │ type-check  │  │ tests │  │ build  │  │
│  │ ESLint  │  │ tsc --noEmit│  │ Jest  │  │  next  │  │
│  │  ~2 min │  │   ~3 min    │  │~5 min │  │~8 min  │  │
│  └────┬────┘  └──────┬──────┘  └───┬───┘  └───┬────┘  │
└───────┼──────────────┼─────────────┼───────────┼───────┘
        │  (parallèles — pas de needs:)           │
        └──────────── MERGE BLOQUÉ si échec ──────┘

Merge → main
        │
        ▼
┌────────────────────────────────────────────────────────┐
│                     e2e.yml                             │
│                                                         │
│  1. Attendre le déploiement Vercel (poll API, 5 min max)│
│  2. login.spec.ts + dashboard.spec.ts + critical-flows  │
│  3. Upload screenshots/vidéos si échec                  │
└────────────────────────────────────────────────────────┘

Chaque dimanche 03h00 UTC
        │
        ▼
┌────────────────────────────────────────────────────────┐
│                   security.yml                          │
│                                                         │
│  npm audit --audit-level=high                           │
│  → Notification Slack si HIGH/CRITICAL trouvés          │
│  → Artifact JSON conservé 30 jours                      │
└────────────────────────────────────────────────────────┘
```

### Fichiers des workflows

| Fichier | Trigger | Durée estimée |
|---|---|---|
| [`.github/workflows/ci.yml`](.github/workflows/ci.yml) | PR + push main | ~8 min (parallèle) |
| [`.github/workflows/e2e.yml`](.github/workflows/e2e.yml) | push main | ~10 min |
| [`.github/workflows/security.yml`](.github/workflows/security.yml) | Dimanche 03h00 UTC | ~5 min |

### Stratégie de cache

Chaque job utilise `actions/cache@v4` avec la clé :

```
${{ runner.os }}-node-20-${{ hashFiles('package-lock.json') }}
```

`npm ci` est ignoré en cas de cache hit → **gain ~2 min/job**.
Le job `build` dispose d'un cache `.next/cache` supplémentaire.

---

## GitHub Secrets requis

À configurer dans **Settings → Secrets and variables → Actions**.

### CI (`ci.yml`)

Aucun secret requis — le job `build` utilise des valeurs mockées inoffensives.

### E2E (`e2e.yml`)

| Secret | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase de test |
| `VERCEL_TOKEN` | Token Vercel (Settings → Tokens) |
| `VERCEL_PROJECT_ID` | ID du projet Vercel (Settings → General) |
| `VERCEL_TEAM_ID` | ID de l'équipe Vercel (laisser vide si compte perso) |
| `VERCEL_PRODUCTION_URL` | URL de fallback, ex: `https://fleetmaster.vercel.app` |
| `E2E_USER_EMAIL` | Email d'un compte de test dédié E2E |
| `E2E_USER_PASSWORD` | Mot de passe du compte de test E2E |

> **Important** : créer un compte Supabase dédié aux tests E2E, distinct de la
> production. Ce compte ne doit jamais contenir de données réelles.

### Security (`security.yml`)

| Secret | Description | Obligatoire |
|---|---|---|
| `SLACK_WEBHOOK_URL` | URL d'un Incoming Webhook Slack | Non (email GitHub si absent) |

Pour créer un Incoming Webhook Slack :
1. `api.slack.com/apps` → votre app → **Incoming Webhooks**
2. Activer → **Add New Webhook to Workspace**
3. Choisir le canal `#security` (ou équivalent)

---

## Branch Protection Rules

Configurer dans **Settings → Branches → Add rule → `main`** :

```
✅ Require a pull request before merging
  ✅ Require approvals: 1
  ✅ Dismiss stale pull request approvals when new commits are pushed

✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging

  Status checks requis :
  ┌─────────────────────────────────────────────┐
  │  ✅  Lint (ESLint)                          │  ← bloquant
  │  ⚠️  Type Check (TypeScript)               │  ← informatif (continue-on-error)
  │  ✅  Tests (Jest + Coverage ≥ 30%)         │  ← bloquant
  │  ✅  Build (Next.js)                        │  ← bloquant
  └─────────────────────────────────────────────┘

✅ Require linear history
✅ Do not allow bypassing the above settings
```

> **Note :** "Type Check" est actuellement en `continue-on-error: true` dans le
> workflow, donc il n'apparaîtra pas comme bloquant même s'il est listé comme
> required check. Il deviendra bloquant une fois les erreurs TS résolues
> (voir §Roadmap).

---

## Roadmap qualité

### Court terme

- [ ] Activer `type-check` comme bloquant : corriger les ~538 erreurs TS
  résiduelles dans `src/actions/` et `src/hooks/` (suite au refactoring RLS).
  Changer `continue-on-error: true` → `false` dans `ci.yml`.

- [ ] Augmenter le seuil de couverture : Jest → 50%, puis 70%.
  Modifier `coverageThreshold` dans [jest.config.js](jest.config.js).

### Moyen terme

- [ ] Ajouter `dependency-review` sur les PRs (détection de nouvelles dépendances
  vulnérables avant merge) :
  ```yaml
  - uses: actions/dependency-review-action@v4
  ```

- [ ] Activer Dependabot pour les mises à jour automatiques de dépendances :
  créer `.github/dependabot.yml`.

- [ ] E2E multi-navigateurs en nightly (Firefox + WebKit) via un job séparé
  déclenché sur `schedule`.
