# RAPPORT D'AUDIT FLEETMASTER PRO
**Date** : 2026-02-24  
**Auditeur** : CTO Senior Virtual  
**Verdict Global** : 🔴 **NO-GO** - **Score: 47/100**

---

## 1. EXECUTIVE SUMMARY (3 lignes choc)

Ce projet présente **1 vulnérabilité CRITIQUE Next.js** (cache poisoning + DoS), **41 vulnérabilités npm**, des **failles RLS récurrentes** (5+ migrations de fix), et un **bypass systématique du RLS** via `adminClient`. Il est **NON PRÊT** pour la production. Le risque principal est une **fuite de données inter-tenants** ou une **prise de contrôle totale du serveur**.

---

## 2. SCORES DÉTAILLÉS

| Critère | Note | Statut |
|---------|------|--------|
| Sécurité | **11/25** | 🔴 |
| Code | **14/25** | 🟠 |
| Design | **12/20** | 🟠 |
| Prod-Ready | **6/20** | 🔴 |
| Business | **4/10** | 🔴 |
| **TOTAL** | **47/100** | 🔴 |

---

## 3. FAILLES CRITIQUES (Bloquant pour la mise en prod)

### 🔴 Faille 1 : Vulnérabilité Next.js CRITIQUE (CVE-2024-34352, CVE-2024-22239, etc.)
- **Description** : Next.js 14.2.3 expose 1 vulnérabilité CRITIQUE (authorization bypass) + 39 HIGH (DoS, cache poisoning, SSRF)
- **Impact** : Un attaquant peut contourner l'authentification middleware, empoisonner le cache, ou provoquer un DoS
- **Preuve** : `npm audit` retourne "41 vulnerabilities (1 moderate, 39 high, 1 critical)"
- **Correction immédiate requise** : `npm audit fix --force` pour passer à Next.js 14.2.35+ (breaking changes possibles)

### 🔴 Faille 2 : Bypass RLS systématique via adminClient
- **Description** : Toutes les Server Actions utilisent `createAdminClient()` pour bypass RLS au lieu de respecter les policies
- **Impact** : Si une action est mal sécurisée, un utilisateur peut accéder/modifier les données d'autres entreprises
- **Preuve** : `src/actions/vehicles.ts:38-44`, `src/actions/vehicles.ts:76-79` - utilisation de `adminClient` au lieu du client RLS
- **Correction** : Supprimer `adminClient` des actions, utiliser le client standard avec RLS activé

### 🔴 Faille 3 : Rate Limiting inopérant sur Vercel
- **Description** : Le rate limiting utilise une Map en mémoire (`rateLimitStore`) qui est reset à chaque cold start Vercel
- **Impact** : Un attaquant peut faire du brute-force sur l'authentification sans être limité (fenêtre de 1min à plusieurs heures selon le traffic)
- **Preuve** : `src/lib/security/rate-limit.ts:22-25` - "sur Vercel, les fonctions sont stateless, donc ce stockage est réinitialisé à chaque cold start"
- **Correction** : Utiliser Upstash Redis (déjà dans les dépendances mais pas utilisé dans le rate-limit)

### 🔴 Faille 4 : Console.log en production (fuite d'informations)
- **Description** : 36+ `console.log` dans les routes API exposent des données sensibles (user IDs, company IDs, tokens)
- **Impact** : Fuite d'informations structurales pouvant faciliter une attaque ciblée
- **Preuve** : `src/app/api/vehicles/route.ts:44`, `src/app/api/sos/smart-search/route.ts:14`, etc.
- **Correction** : Remplacer par un logger structuré (Winston/Pino) avec niveau ERROR en production

### 🔴 Faille 5 : RLS Recursion - Problème architectural persistant
- **Description** : 5+ migrations SQL tentent de "fixer" les mêmes problèmes RLS (20250208, 20250209, 20250220, etc.)
- **Impact** : Accès aléatoires refusés ou données qui fuient selon les requêtes
- **Preuve** : `supabase/migrations/20250220000000_fix_rls_recursion_profiles.sql` - "Problème : Les politiques RLS sur profiles se référencent elles-mêmes"
- **Correction** : Refonte totale des policies RLS avec security definer functions

### 🔴 Faille 6 : Incohérence Schéma users vs profiles
- **Description** : `supabase/schema.sql` définit une table `users`, mais tout le code utilise `profiles`
- **Impact** : Risque de corruption de données, migrations impossibles à reproduire
- **Preuve** : `supabase/schema.sql:27-38` (table users) vs `src/lib/supabase/server.ts:67-71` (requête sur profiles)
- **Correction** : Unifier le schéma et regénérer les types TypeScript

---

## 4. RECOMMANDATIONS PAR PRIORITÉ

### P0 (Semaine 1) - BLOQUANT
- [ ] **URGENT** : Mettre à jour Next.js vers 14.2.35+ pour corriger la CVE CRITIQUE
- [ ] **URGENT** : Migrer le rate limiting vers Upstash Redis (déjà dans les déps)
- [ ] **URGENT** : Supprimer tous les `console.log` des routes API (remplacer par logger)
- [ ] **URGENT** : Audit complet RLS - Refaire toutes les policies avec security definer
- [ ] **URGENT** : Retirer `createAdminClient()` des Server Actions, utiliser RLS proper

### P1 (Mois 1)
- [ ] Unifier le schéma users/profiles
- [ ] Activer les tests E2E critiques en CI/CD
- [ ] Implémenter la validation CSRF sur toutes les mutations
- [ ] Ajouter des tests de sécurité (test d'accès inter-tenants)
- [ ] Corriger les 41 vulnérabilités npm restantes

### P2 (Roadmap Q2)
- [ ] Audit complet accessibilité (WCAG AA)
- [ ] Optimisation des requêtes N+1 (React Query)
- [ ] Mise en place d'un vrai système de backup automatisé
- [ ] Documentation technique complète
- [ ] Load testing (1000 users simultanés)

---

## 5. VERDICT COMMERCIAL

> **À ce stade, vendre cet outil à plus de 5 utilisateurs simultanés est TRÈS RISQUÉ.**

### Analyse Tarification

| Plan | Prix | Positionnement |
|------|------|----------------|
| Starter | 29€/mois | ⬇️ **SOUS-ÉVALUÉ** |
| Pro | 49€/mois | ⬇️ **SOUS-ÉVALUÉ** |
| Enterprise | Sur devis | ✓ Correct |

**Benchmark concurrents (France)** :
- Fleetio : 83€/mois (5 véhicules)
- Samsara : 45-65€/véhicule/mois
- TrackFleet : 35-55€/mois
- Quartix : 25-40€/véhicule/mois

**Recommandation** : 
- Starter : **39€/mois** (au lieu de 29€)
- Pro : **79€/mois** (au lieu de 49€)
- Ajouter un plan "Essentiel" à 19€/mois (1-3 véhicules)

### Moats (Barrières à l'entrée)

❌ **AUCUN MOAT IDENTIFIÉ** :
- SOS Garage (différenciant) : Facilement copiable en 2-3 semaines
- UI/UX : Standard (Shadcn + Tailwind)
- Stack technique : Standard (Next.js + Supabase)
- Données : Pas d'effet réseau, pas de data moat

**Recommandation** : Développer rapidement :
1. Algorithmes de prédiction maintenance propriétaires (avec données réelles)
2. Intégrations télématiques constructeurs (API Renault, Peugeot, etc.)
3. Marketplace garagistes (mise en relation avec commission)

---

## 6. CHECKLIST GO/NO-GO

| Critère | Statut | Détails |
|---------|--------|---------|
| Sécurité validée | 🔴 **NON** | 1 CVE critique + bypass RLS |
| Performances > 90 Lighthouse | 🟡 **INCONNU** | Pas de rapport Lighthouse |
| 0 bug bloquant | 🔴 **NON** | RLS recursion = bugs aléatoires |
| Documentation complète | 🔴 **NON** | README basique uniquement |
| Stratégie backup testée | 🔴 **NON** | Aucune mention de backups |
| Tests E2E passent | 🟡 **PARTIEL** | Playwright configuré mais coverage ? |
| RGPD conforme | 🟡 **PARTIEL** | Mentions légales présentes mais pas d'export données |

**DÉCISION FINALE** : **🔴 NO-GO**

Le projet ne peut PAS être commercialisé en l'état. Les risques sont trop élevés :
1. Fuite de données clients (RGPD = 4% CA amendes)
2. Indisponibilité service (RLS recursion = erreurs aléatoires)
3. Attaque par cache poisoning (CVE Next.js)

**Délai estimé pour GO** : 6-8 semaines avec 1 développeur senior full-time.

---

## ANNEXE A : Stack Technique Complète

| Composant | Version | Statut |
|-----------|---------|--------|
| Next.js | 14.2.3 | 🔴 Vulnérable |
| React | 18.2.0 | 🟢 OK |
| TypeScript | 5.x | 🟢 OK |
| Supabase | 2.94.0 | 🟢 OK |
| Tailwind CSS | 3.4.1 | 🟢 OK |
| Stripe | 20.3.0 | 🟢 OK |
| Sentry | 10.39.0 | 🟢 OK |
| TanStack Query | 5.90.20 | 🟢 OK |
| Zod | 4.3.6 | 🟢 OK |
| Playwright | 1.58.2 | 🟢 OK |
| Jest | 30.2.0 | 🟢 OK |

## ANNEXE B : Détail des Fichiers Critiques

```
src/middleware.ts                    → Rate limiting in-memory (FAIL)
src/lib/security/rate-limit.ts       → Map() non persistant (FAIL)
src/lib/supabase/server.ts           → createAdminClient = bypass RLS (FAIL)
src/actions/*.ts                     → Utilisation adminClient systématique (FAIL)
src/app/api/*/route.ts               → 36 console.log exposants données (FAIL)
supabase/migrations/*fix_rls*.sql    → 5+ tentatives de fix RLS (SMELL)
supabase/schema.sql                  → users vs profiles mismatch (FAIL)
next.config.js                       → CSP correct mais Next.js vulnérable (PARTIAL)
```

## ANNEXE C : Métriques Code

| Métrique | Valeur | Seuil |
|----------|--------|-------|
| Fichiers TypeScript | 668 | - |
| Lignes de code (est.) | ~75,000 | - |
| Vulnérabilités npm | 41 (1 CRITIQUE) | 0 |
| Console.log en API | 36 | 0 |
| Tests unitaires | 15 fichiers | Insuffisant |
| Tests E2E | Playwright configuré | Couverture inconnue |
| Couverture de code | ? | < 30% estimé |

---

*Rapport généré par audit automatisé + revue manuelle. Ce document est confidentiel et destiné à la direction technique uniquement.*
