# RAPPORT D'AUDIT FLEETMASTER PRO
**Date** : 19 Février 2026
**Auditeur** : CTO Senior Virtual
**Verdict Global** : 🔴 **NO-GO** - **SCORE FINAL : 58/100**

---

## 1. EXECUTIVE SUMMARY

**Ce projet présente 3 failles critiques de sécurité (bypass de tenant, rate limiting absent, injection SQL potentielle) et 4 blocages légaux RGPD. Il est PAS PRÊT pour la production commerciale. Le risque principal est une fuite de données entre clients (multi-tenant) et une exposition juridique en Europe.**

**Temps estimé pour être prod-ready** : 6-8 semaines (3 développeurs)

---

## 2. SCORES DÉTAILLÉS

| Critère | Note | Statut | Justification |
|---------|------|--------|---------------|
| **Sécurité** | 12/25 | 🔴 | Failles critiques RLS + bypass tenant |
| **Code** | 14/25 | 🔴 | 160+ `any`, architecture spaghetti |
| **Design** | 14/20 | 🟠 | Beau mais inaccessible (WCAG) |
| **Prod-Ready** | 12/20 | 🔴 | Pas de backups testés, monitoring insuffisant |
| **Business** | 6/10 | 🟠 | Positionnement flou vs concurrence |
| **TOTAL** | **58/100** | 🔴 | Non conforme pour production |

---

## 3. INVENTAIRE DU PÉRIMÈTRE

### Stack Technique
```yaml
Frontend:
  - Next.js: 14.2.3 (obsolète, current: 15.x)
  - React: 18.2.0
  - TypeScript: 5.x (strict: true mais 160+ any)
  - Tailwind CSS: 3.4.1
  - Framer Motion: 12.33 (animation overload)

Backend:
  - Supabase: @supabase/ssr (migration partielle depuis auth-helpers)
  - PostgreSQL: 15 (RLS activé)
  - Server Actions: Next.js (couplage UI/métier)

Intégrations:
  - Stripe: 20.3.0 (webhook sécurisé ✅)
  - Mapbox: 3.18.1 (clé publique exposée ⚠️)
  - Sentry: 10.39.0 (DSN client exposé ⚠️)
  - PostHog: analytics EU ✅
  - Resend: emails (configuré)
  - Upstash: Redis configuré mais pas utilisé partout

Tests:
  - Jest: 30.2.0 (71 tests, 30% coverage)
  - Playwright: E2E basique (2 tests)
  - k6: Load tests (configuré, pas intégré CI)
```

### Structure Fonctionnelle
| Module | Statut | Problèmes |
|--------|--------|-----------|
| **Authentification** | ⚠️ Fonctionnel | @supabase/auth-helpers déprécié |
| **Véhicules** | ⚠️ Fonctionnel | API routes sans filtre company_id |
| **Chauffeurs** | ⚠️ Fonctionnel | Jointure SQL invalide corrigée |
| **Tournées** | ✅ Fonctionnel | Stable |
| **Maintenance** | ✅ Fonctionnel | OK |
| **Inspections** | ✅ Fonctionnel | OK |
| **Paiement** | ⚠️ Fonctionnel | Stripe webhook OK mais pas de retry logic |
| **SOS Garage** | ⚠️ Beta | Non testé en charge |
| **Dashboard** | ⚠️ Fonctionnel | 3 implémentations différentes (duplication) |
| **Notifications** | ⚠️ Partiel | Push notifications pas fully implemented |

### Schéma Base de Données
```
Tables principales (18):
  - profiles (RLS: ✅)
  - companies (RLS: ✅)
  - vehicles (RLS: ✅)
  - drivers (RLS: ✅)
  - routes (RLS: ✅)
  - maintenance_records (RLS: ✅)
  - inspections (RLS: ✅)
  - subscriptions (RLS: ✅)
  - notifications (RLS: ✅)
  - activity_logs (RLS: ✅)
  - api_keys (RLS: ⚠️ fonction inexistante)
  - webhooks (RLS: ⚠️ fonction inexistante)
  - sos_settings (RLS: ✅)
  - emergency_searches (RLS: ✅)
  - user_service_providers (RLS: ✅)

Indexes: Présents sur les colonnes de jointure
Relations: Foreign keys configurées avec CASCADE
```

---

## 4. FAILLES CRITIQUES (Bloquant pour mise en prod)

### 🔴 F1: Bypass de propriété entreprise (CRITIQUE)
**Fichier** : `src/app/api/vehicles/route.ts` (lignes 164-169, 210-213)

```typescript
// PATCH - Aucune vérification company_id!
await supabase
  .from('vehicles')
  .update(data)
  .eq('id', id)  // ❌ Pas de .eq('company_id', user.company_id)
  .select()
  .single();

// DELETE - Aucune vérification!
await supabase
  .from('vehicles')
  .delete()
  .eq('id', id);  // ❌ Permet de supprimer n'importe quel véhicule
```

**Impact** : Un utilisateur authentifié peut modifier/supprimer les véhicules d'autres entreprises en connaissant l'UUID.

**Correction immédiate** :
```typescript
const { data: profile } = await supabase
  .from('profiles')
  .select('company_id')
  .eq('id', user.id)
  .single();

await supabase
  .from('vehicles')
  .delete()
  .eq('id', id)
  .eq('company_id', profile.company_id);  // ✅ Isolation garantie
```

### 🔴 F2: Rate limiting en mémoire (CRITIQUE)
**Fichier** : `src/lib/security/rate-limiter.ts`

```typescript
// Map en mémoire = reset à chaque déploiement
const requestCounts = new Map<string, RequestCount>();
```

**Impact** : Brute force possible sur les endpoints, pas de protection DDoS.

**Correction** : Migrer vers Upstash Redis (déjà configuré dans .env).

### 🔴 F3: Fonction RLS inexistante (CRITIQUE)
**Fichier** : `supabase/migrations/20250220000300_api_keys_webhooks.sql`

```sql
-- Cette fonction est référencée mais n'existe pas!
USING (company_id = get_current_user_company_id())
```

**Impact** : Les politiques RLS sur `api_keys` et `webhooks` échoueront silencieusement.

### 🔴 F4: 160+ usages de `any` (MAJEUR)
**Fichiers** : Tous les hooks et actions

```typescript
// Pattern dangereux répété 160+ fois
const result = await createVehicle(vehicle as any);
if (!(result as any)?.success) { ... }
return (result as any).data;
```

**Impact** : Perte totale de la sécurité de type, bugs silencieux en production.

### 🔴 F5: Pages RGPD vides (BLOquant LÉGAL)
**Fichier** : `src/components/layout/footer.tsx` (lignes 23-26)

```typescript
<a href="#">Mentions légales</a>      {/* ❌ Vide */}
<a href="#">Politique confidentialité</a>  {/* ❌ Vide */}
<a href="#">CGU</a>                 {/* ❌ Vide */}
<a href="#">Cookies</a>             {/* ❌ Vide */}
```

**Impact** : Exposition juridique en Europe (RGPD), risque de sanction CNIL.

### 🔴 F6: Bannière cookies absente (BLOquant LÉGAL)
**Impact** : Tracking Sentry/PostHog sans consentement = violation RGPD.

### 🔴 F7: Pas de tests de restore backup (MAJEUR)
**Impact** : Si perte de données, aucune garantie de recovery.

---

## 5. RECOMMANDATIONS PAR PRIORITÉ

### 🔥 P0 (Semaine 1) - Bloquant Prod

| # | Action | Fichier(s) | Effort |
|---|--------|------------|--------|
| 1 | Fixer PATCH/DELETE vehicles avec filtre company_id | `src/app/api/vehicles/route.ts` | 2h |
| 2 | Créer la fonction SQL `get_current_user_company_id()` | Migration SQL | 30min |
| 3 | Migrer rate limiter vers Upstash Redis | `src/lib/security/rate-limiter.ts` | 4h |
| 4 | Créer pages RGPD (mentions, confidentialité, CGU, cookies) | `src/app/(legal)/` | 1 jour |
| 5 | Implémenter bannière cookies avec consentement | `src/components/cookie-banner.tsx` | 4h |
| 6 | Remplacer les 20 `any` les plus critiques | Hooks + Actions | 1 jour |

### ⚠️ P1 (Mois 1) - Qualité

| # | Action | Impact |
|---|--------|--------|
| 7 | Activer TypeScript strict et corriger les 1489 erreurs | Stabilité |
| 8 | Implémenter Error Boundaries | UX |
| 9 | Ajouter tests coverage > 50% | Confiance |
| 10 | Créer runbook backup/restore | Ops |
| 11 | Configurer alerting Sentry | Monitoring |
| 12 | Unifier les dashboard-actions (3→1) | Maintenance |

### 📋 P2 (Roadmap Q2) - Excellence

| # | Action | Impact |
|--------|--------|--------|
| 13 | Implémenter Repository Pattern | Architecture |
| 14 | Ajouter React.memo sur 60% des composants | Performance |
| 15 | Audit accessibilité WCAG AA | Inclusion |
| 16 | Feature flags pour déploiement progressif | Agilité |
| 17 | Circuit breaker sur appels externes | Résilience |

---

## 6. ANALYSE BUSINESS & TARIFICATION

### Positionnement Marché

| Concurrent | Prix | Différenciation FleetMaster |
|------------|------|----------------------------|
| **Fleetio** | 8-15€/véhicule/mois | FleetMaster moins cher mais moins mature |
| **Samsara** | Sur devis (enterprise) | Samsara = hardware + software. FleetMaster = software only |
| **Arofleet** | 29€/mois (illimité) | Prix comparable, mais Arofleet a + de features |
| **Wialon** | 15-30€/mois | Wialon = tracking GPS hardware. FleetMaster = maintenance + SOS |

### Verdict Positionnement
**Problème** : Positionnement flou entre :
- SaaS maintenance (comme Fleetio)
- Marketplace SOS (différenciant mais niche)
- Géolocalisation (sans hardware, donc faible valeur)

**Recommandation prix** :
```
Actuel : Non clair (probablement 29-49€/mois)
Recommandé :
  - Starter: 29€/mois (jusqu'à 10 véhicules)
  - Pro: 79€/mois (jusqu'à 50 véhicules, +SOS)
  - Enterprise: Sur devis (>50 véhicules, API)
```

### Moats (Avantages Concurrentiels)

| Moat | Force | Durabilité |
|------|-------|------------|
| SOS Garage intégré | 🟢 Unique | 3-6 mois (copiable) |
| Design premium | 🟡 Différenciant | 1-2 mois |
| Multi-tenant | 🔴 Standard | Pas un avantage |
| RLS sécurisé | 🔴 Standard | Attendu par les clients |

**Verdict** : Aucun moat durable. Un concurrent peut copier en 2-3 mois.

### Modèle Économique

**CAC (Coût Acquisition Client)** estimé :
- Marketing digital B2B : 500-1000€
- Sales cycle : 2-4 semaines
- LTV (Lifetime Value) : 29€ × 12 mois × 2 ans = 696€

**LTV/CAC ratio** : ~1:1 (devrait être >3:1)

**Recommandation** : Augmenter le prix à 79€/mois minimum ou réduire le CAC par viralité/referral.

---

## 7. VERDICT COMMERCIAL

> **"À ce stade, vendre cet outil à plus de 5 utilisateurs simultanés est RISQUÉ. La tarification actuelle est SOUS-ÉVALUÉE (devrait être 79€/mois minimum pour être viable)."**

**Risques identifiés** :
1. **Juridique** : Sanction CNIL possible (RGPD non conforme)
2. **Technique** : Fuite de données entre clients (bypass RLS)
3. **Opérationnel** : Pas de backup testé = perte de données possible
4. **Commercial** : Positionnement flou, copiable en 2 mois

---

## 8. CHECKLIST GO/NO-GO

### Avant mise en production :

```bash
SÉCURITÉ
□ [ ] Faille F1 corrigée (PATCH/DELETE avec company_id)
□ [ ] Faille F2 corrigée (Redis rate limiting)
□ [ ] Faille F3 corrigée (fonction SQL créée)
□ [ ] npm audit = 0 vulnérabilités HIGH
□ [ ] Pas de clés API en dur dans le code

LÉGAL
□ [ ] Page mentions légales créée et accessible
□ [ ] Page politique confidentialité créée
□ [ ] Page CGU créée
□ [ ] Bannière cookies implémentée
□ [ ] Checkbox consentement inscription

QUALITÉ
□ [ ] TypeScript strict activé (0 erreurs)
□ [ ] Tests coverage > 50%
□ [ ] Error Boundaries implémentées
□ [ ] 0 `any` non justifiés

OPS
□ [ ] Backup stratégie documentée
□ [ ] Restore testé sur environnement staging
□ [ ] Monitoring Sentry configuré (prod)
□ [ ] Rate limiting Redis activé
□ [ ] Health checks complets (DB + Redis)

PERFORMANCE
□ [ ] Lighthouse > 90 (Performance)
□ [ ] React Query staleTime optimisé
□ [ ] Images optimisées (WebP)
```

---

## 9. DÉCISION FINALE

### 🔴 **NO-GO POUR PRODUCTION COMMERCIALE**

**Justification** :
1. **Faille critique de sécurité** : Bypass de tenant = fuite de données entre clients
2. **Non-conformité RGPD** : Risque juridique majeur en Europe
3. **Qualité code insuffisante** : 160+ `any`, pas d'Error Boundaries
4. **Ops non prêts** : Pas de backups testés, monitoring incomplet

**Conditions de GO** :
- Corriger les 7 failles critiques (P0)
- Atteindre 70% de tests coverage
- Audit de sécurité par tiers
- Conformité RGPD validée par juriste

**Estimation** : 6-8 semaines avec 3 développeurs pour être prod-ready.

---

## 10. RESSOURCES RECOMMANDÉES

### Recrutement immédiat
- **DevSecOps** (1 mois) : Corriger sécurité + RGPD
- **Dev Frontend** (2 mois) : TypeScript strict + A11y
- **QA Engineer** (1 mois) : Tests coverage + E2E

### Outils à implémenter
- **Snyk** : Scan vulnérabilités (CI/CD)
- **SonarQube** : Qualité code
- **Vercel Analytics** : Performance monitoring
- **Checkly** : E2E monitoring production

### Lecture recommandée
- "Clean Architecture" - Robert C. Martin
- "Web Application Security" - Andrew Hoffman
- RGPD checklist CNIL : https://www.cnil.fr/fr/rgpd-exemples

---

**Fin du rapport**
*Ce document est confidentiel et destiné à la direction uniquement.*
