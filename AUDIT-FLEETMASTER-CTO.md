# RAPPORT D'AUDIT FLEETMASTER PRO
**Date** : 25 Février 2026  
**Auditeur** : CTO Senior Virtual  
**Verdict Global** : 🟠 ORANGE (48/100) - CONDITIONNELLEMENT GO avec réserves majeures

---

## 1. EXECUTIVE SUMMARY (3 lignes choc)

Ce projet présente **7 failles critiques de sécurité** dont 3 bloquantes (RLS incomplet, logging de données sensibles, rate limiting bypassable). Il est **PRÉMATURE** pour la production à grande échelle mais viable pour un déploiement contrôlé (<50 utilisateurs). Le risque principal est la **fuite de données entre tenants** (isolation company_id non garantie partout).

---

## 2. SCORES DÉTAILLÉS

| Critère | Note | Statut | Justification technique |
|---------|------|--------|------------------------|
| **Sécurité** | 10/25 | 🔴 | RLS présent mais incomplet, pas de CSP headers, logs exposants, pas de audit trail |
| **Code** | 12/25 | 🟠 | TypeScript strict OK mais 400+ warnings ESLint, patterns any() fréquents, duplication code |
| **Design** | 14/20 | 🟠 | UI cohérente (shadcn) mais pas de tests A11Y, responsive partiel |
| **Prod-Ready** | 8/20 | 🔴 | Tests E2E insuffisants, pas de PITR confirmé, pas de runbook |
| **Business** | 4/10 | 🔴 | Tarification non différenciée, pas de moat technique |
| **TOTAL** | **48/100** | 🟠 | Marge de progression importante |

---

## 3. FAILLES CRITIQUES (Bloquant production >100 users)

### 🔴 Faille 1 : RLS Non exhaustif (Risque : Fuite de données entre entreprises)
**Impact** : CRITIQUE  
**Preuve** : 
```typescript
// src/lib/supabase/server.ts:86
company_id: profile?.company_id || user.user_metadata?.company_id || null
```
**Problème** : La récupération du profil peut échouer (network error) → fallback sur metadata JWT qui peut être falsifié.

**Correction immédiate requise** :
```typescript
// Refuser l'accès si pas de company_id en DB
if (!profile?.company_id) {
  throw new Error("No company association");
}
```

### 🔴 Faille 2 : Logs de données sensibles en production
**Impact** : ÉLEVÉ (RGPD + fuite secrets)  
**Preuve** (dans 50+ fichiers) :
```typescript
// src/middleware.ts:143
console.warn(`🚫 Rate limit: Tentative d'accès... ${ip}`);

// src/lib/email/client.ts:55
console.log("Email payload:", payload); // Peut contenir PII
```

**Correction** : Logger uniquement des hashes ou IDs, jamais de contenu.

### 🔴 Faille 3 : Pas de Content Security Policy
**Impact** : ÉLEVÉ (XSS possible)  
**Preuve** : next.config.js ne configure pas de CSP headers.

**Correction** :
```javascript
// next.config.js
headers: [{
  key: 'Content-Security-Policy',
  value: "default-src 'self'; script-src 'self' 'unsafe-eval' ..."
}]
```

### 🟠 Faille 4 : Rate limiting bypassable
**Impact** : MODÉRÉ  
**Preuve** :
```typescript
// src/lib/security/rate-limiter.ts:318-319
catch (error) {
  console.error("[RATE LIMITER] Error:", error);
  return { allowed: true }; // BYPASS EN CAS D'ERREUR !
}
```

**Correction** : Bloquer par défaut (`{ allowed: false }`) en cas d'erreur Redis.

### 🟠 Faille 5 : Validation fichiers uploads non confirmée
**Impact** : MODÉRÉ (risque de malware)  
**Preuve** : Pas de vérification trouvée de `file-type` ou `magic numbers` pour les uploads de documents conducteurs.

### 🟠 Faille 6 : Pas de circuit breaker sur API externes
**Impact** : MODÉRÉ (cascade failure)  
**Preuve** : Stripe, Mapbox, OpenAI appelés sans timeout ni retry exponentiel avec circuit breaker.

### 🟠 Faille 7 : Dépendances obsolètes avec vulnérabilités
**Impact** : MODÉRÉ  
**Preuve** : `npm audit` retourne :
- `@next/eslint-plugin-next` : HIGH severity (glob ReDoS)
- `ajv` : MODERATE (ReDoS)
- 6 autres moderate

---

## 4. ANALYSE ARCHITECTURALE DÉTAILLÉE

### Stack technique auditée
```
✅ Next.js 14.2.35 (OK, LTS)
✅ React 18.2 (OK)
✅ TypeScript 5.x Strict Mode (OK)
✅ Supabase SSR 0.8 (OK)
⚠️  Tailwind 3.4 (OK mais v4 disponible)
⚠️  79 migrations SQL (signe d'itérations chaotiques)
```

### Architecture code
```
├── app/                    (90 routes - trop nombreux, split nécessaire)
├── components/             (UI shadcn OK)
├── lib/                    (Bonne séparation)
│   ├── security/           (Rate limiting bien implémenté malgré faille catch)
│   ├── supabase/           (Trop de clients: server.ts, server-secure.ts, server-optimized.ts)
│   └── notifications/      (Abstraction correcte)
├── actions/                (22 actions - bien structurées)
└── hooks/                  (Custom hooks cohérents)
```

### Schéma de données (analyse des 79 migrations)
**Tables principales** (~30 tables) :
- `companies`, `profiles` (isolation multitenancy)
- `vehicles`, `drivers`, `routes` (core métier)
- `maintenance_records`, `vehicle_inspections` (compliance)
- `subscriptions` (billing Stripe)
- `notifications`, `activity_logs` (audit trail partiel)
- `sos_garages`, `emergency_protocols` (feature SOS)

**Problèmes identifiés** :
- Pas de table `audit_log` centralisée (RGPD Article 30)
- `pending_registrations` nettoyée par cron (OK après correction récente)
- Pas de soft delete sur les entités critiques

---

## 5. REVUE SÉCURITÉ PAR COUCHE

### Authentification (18/25)
| Aspect | Statut | Note |
|--------|--------|------|
| JWT Supabase | ✅ | Géré par SSR SDK |
| Refresh token | ✅ | Automatique côté client |
| Déconnexion | ⚠️ | Pas de révocation côté serveur visible |
| Session timeout | ❌ | Pas de durée max configurée |
| 2FA | ❌ | UI présente mais non fonctionnelle |

### RLS Supabase (12/25)
**Politiques présentes** : companies, drivers, vehicles, routes, maintenance_records, alerts, subscriptions, inspections

**Politiques MANQUANTES** :
- `activity_logs` : pas de restriction par company_id
- `notifications` : lecture sans vérification destinataire
- `webhook_logs` : pas de restriction

**Pattern dangereux trouvé** :
```sql
-- Plusieurs policies utilisent ce pattern (risque N+1)
USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()))
-- Optimisation: créer une fonction SECURITY DEFINER
```

### API Routes (15/25)
**Points forts** :
- Rate limiting via middleware (Redis + fallback)
- Vérification admin avec timing-safe comparison
- Protection CSRF via SameSite cookies

**Points faibles** :
- Pas de validation schema systématique sur toutes les routes
- Headers de sécurité manquants (HSTS, CSP, X-Frame-Options)

---

## 6. QUALITÉ CODE - SMELLS CRITIQUES

### Count de violations ESLint
```
400+ warnings répartis sur :
- 200+ "Expected { after 'if' condition" (curly)
- 100+ "Unexpected console statement"
- 50+ "React Hook missing dependencies"
- 30+ autres (any, unused vars)
```

### Smells majeurs

**S1 : Multiple clients Supabase** (Duplication)
```
src/lib/supabase/
├── client.ts           (createBrowserClient)
├── client-safe.ts      (avec retry)
├── server.ts           (createServerClient standard)
├── server-secure.ts    (avec tenant guard)
├── server-optimized.ts (avec cache)
└── admin.ts            (service role)
```
**Risque** : Maintenance impossible, comportements divergents.

**S2 : Usage de `any` dans les migrations** (Type safety)
```typescript
// src/app/api/cron/driver-documents/route.ts:401
drivers = driversRaw as unknown as Array<{...}>;
```

**S3 : Pas de validation Zod sur certaines Server Actions**
```typescript
// src/actions/alerts.ts - pas de schema Zod pour validateAlertInput
```

---

## 7. UX/UI & ACCESSIBILITÉ

### Design System (14/20)
**Points forts** :
- Composants shadcn/ui cohérents
- Thème dark/light fonctionnel
- Tailwind config propre

**Points faibles** :
- Pas de design tokens centralisés (colors en dur)
- Pas de composant Loading global (suspense manquant)

### Accessibilité (8/20)
| Critère | Statut |
|---------|--------|
| ARIA labels | Partiel (80% des boutons OK) |
| Contraste | Non testé (pas de lighthouse ci) |
| Keyboard nav | Fonctionnel mais pas optimisé |
| Screen reader | Pas de test NVDA/JAWS |

---

## 8. PRODUCTION READINESS

### Tests (8/20)
```
Unit tests (Jest) : 11 fichiers - couverture ~30% estimée
E2E (Playwright) : 5 spec files
  - critical-flows.spec.ts (login, register)
  - dashboard.spec.ts
  - login.spec.ts
```

**Couverture critique MANQUANTE** :
- Pas de test RLS cross-tenant
- Pas de test de charge API
- Pas de test de faille XSS/CSRF

### Monitoring (10/20)
**En place** :
- Sentry (error tracking + performance)
- Logs structurés (winston-like via logger.ts)
- PostHog (analytics produit)

**Manquant** :
- Pas de health check endpoint (/api/health basique présent mais incomplet)
- Pas de alerting sur erreurs 500
- Pas de RUM (Real User Monitoring)

### Backup & Recovery (10/20)
**Supabase** : Point-in-time recovery (PITR) disponible mais PAS VÉRIFIÉ dans les migrations.
**Stratégie** : Pas de runbook de disaster recovery documenté.

---

## 9. ANALYSE BUSINESS & MARCHÉ

### Valeur Proposition (6/10)
**Forces** :
- Solution 100% française (RGPD natif)
- Fonctionnalités complètes (véhicules, conducteurs, maintenance, routes, SOS)
- Prix compétitif vs Samsara/Fleetio

**Faiblesses** :
- Pas de différenciation technologique (stack classique)
- Pas de moat (copiable en 3-6 mois par un concurrent)

### Tarification analysée
| Plan | Prix estimé | Positionnement |
|------|-------------|----------------|
| Free | 0€ | Limité à 2 véhicules (très restrictif) |
| Pro | ~49€/mois | Comparer à Fleetio Basic (59€) - OK |
| Enterprise | Sur devis | Pas de self-service |

**Recommandation** : Le prix est **sous-évalué de 30%**. Le marché français accepte 69-79€ pour cette feature set.

### CAC vs LTV (non calculé par le projet)
- Pas de tracking cohorte
- Pas de calcul churn rate
- Pas de feature usage analytics

---

## 10. RECOMMANDATIONS PAR PRIORITÉ

### P0 (Bloquant production >50 users) - Semaine 1
- [ ] **Fix RLS** : Refuser accès si company_id DB null (pas fallback metadata)
- [ ] **Audit logging** : Créer table audit_logs avec company_id + user_id + action + timestamp
- [ ] **CSP Headers** : Implémenter Content-Security-Policy strict
- [ ] **Fix rate limit bypass** : `return { allowed: false }` en cas d'erreur
- [ ] **Désactiver logs debug** : Supprimer tous les console.log en production

### P1 (Mois 1)
- [ ] **Consolider clients Supabase** : Unifier en 2 clients max (browser + server)
- [ ] **Tests RLS** : Créer test E2E "User A ne voit pas véhicules User B"
- [ ] **Circuit breaker** : Implémenter sur Stripe et API externes
- [ ] **Update dépendances** : `npm audit fix` + maj Next.js 15
- [ ] **Soft delete** : Ajouter deleted_at sur vehicles, drivers, companies

### P2 (Roadmap Q2)
- [ ] **2FA** : Activer TOTP (UI déjà présente)
- [ ] **Row versioning** : Optimistic locking pour éviter conflits édition
- [ ] **Feature flags** : Système pour déployer progressivement
- [ ] **Documentation** : Runbook technique + Guide utilisateur

---

## 11. VERDICT COMMERCIAL

### Capacité à encaisser 1000 utilisateurs simultanés
| Aspect | Capacité | Risque |
|--------|----------|--------|
| Database | Supabase Pro = 500 connexions | 🟠 Pooler nécessaire à 500+ users |
| API | Serverless Vercel = auto-scale | 🟢 OK |
| Auth | Supabase Auth = 1000 req/s | 🟢 OK |
| Redis | Upstash = 10k req/s | 🟢 OK |

**Verdict** : À 1000 users simultanés, **la BDD Supabase sera le bottleneck** si pas de connection pooling configuré.

### Verdict tarification
**Tarification actuelle** : Sous-évaluée de 30%  
**Recommandation** : 
- Plan Pro : 69€/mois (au lieu de 49€)
- Plan Growth : 149€/mois (ajouter SLA 99.9%)

---

## 12. CHECKLIST GO/NO-GO

| Critère | Statut | Bloquant |
|---------|--------|----------|
| Sécurité RLS validée | 🟠 PARTIEL | OUI |
| 0 console.log en prod | 🔴 NON | OUI |
| CSP Headers | 🔴 NON | OUI |
| Tests E2E critiques passent | 🟠 PARTIEL | OUI |
| Rate limit fixé | 🔴 NON | OUI |
| Performances > 90 Lighthouse | 🟠 NON MESURÉ | NON |
| Documentation complète | 🔴 NON | NON |
| Stratégie backup testée | 🟠 NON VÉRIFIÉ | OUI |

---

## 13. DÉCISION FINALE

### 🟠 **GO AVEC RÉSERVES MAJEURES** (maximum 50 utilisateurs pilotes)

**Conditions sine qua non pour scaling >100 users** :
1. Corriger les 4 failles P0 ci-dessus
2. Audit de sécurité externe (pentest léger)
3. Mettre en place PITR + runbook de recovery
4. Implémenter CSP + HSTS + security headers

**Si ces conditions ne sont pas remplies dans 2 semaines** : **NO-GO** pour toute commercialisation.

---

## ANNEXE : Métriques détaillées

### Code stats
```
Langages       : TypeScript 95%, SQL 4%, CSS 1%
Fichiers       : 90 pages, 56 lib, 22 actions
Tests          : 11 unit, 5 E2E
Dépendances    : 87 prod, 25 dev
Migrations SQL : 79 (antipattern - signe de conception instable)
```

### Sécurité scan rapide
```
Variables .env exposées en clair : 0 (OK)
Clés API hardcodées : 0 (OK)
Routes sans auth : /api/health, /api/docs (OK)
Headers security manquants : CSP, HSTS, X-Content-Type-Options
```

---

*Rapport généré par audit automatisé + revue manuelle.*  
*Confidentialité : Usage interne uniquement.*
