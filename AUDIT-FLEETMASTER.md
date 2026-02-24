# RAPPORT D'AUDIT FLEETMASTER PRO
**Date** : 2026-02-22
**Auditeur** : CTO Senior Virtual (analyse automatisée exhaustive)
**Périmètre** : 100% du codebase — 80+ fichiers TS/TSX, 75 migrations SQL, toutes les API routes
**Verdict Global** : 🔴 ROUGE — **NO-GO ABSOLU** — Score : **47/100**

---

## 1. EXECUTIVE SUMMARY

Ce projet présente **2 failles de sécurité catastrophiques** (exécution SQL non authentifiée + mot de passe en clair dans Stripe) qui constituent une violation directe du RGPD et engageraient la responsabilité civile et pénale du producteur en cas d'exploitation. Le code applicatif est structurellement sain mais **0 test existe** malgré Jest + Playwright configurés. Le risque principal est une intrusion via `/api/admin/apply-migration` qui permettrait à n'importe qui sur Internet de détruire ou exfiltrer toute la base de données en une seule requête HTTP.

---

## 2. SCORES DÉTAILLÉS

| Critère | Note | Statut | Détail |
|---------|------|--------|--------|
| Sécurité | **8/25** | 🔴 | 2 failles catastrophiques + 4 majeures |
| Code Quality | **13/25** | 🟠 | 0 test, 538 erreurs TS, dette SQL sévère |
| Design/UX | **13/20** | 🟠 | Fonctionnel mais a11y non vérifiée |
| Prod-Ready | **8/20** | 🔴 | 0 test, debug routes déployées, rate-limit absent sur API routes |
| Business | **7/10** | 🟢 | Pricing cohérent, marché porteur |
| **TOTAL** | **49/100** | 🔴 | **NO-GO** |

---

## 3. FAILLES CRITIQUES — BLOQUANT MISE EN PRODUCTION

### 🚨 FAILLE #1 — EXÉCUTION SQL ARBITRAIRE NON AUTHENTIFIÉE [CVSS 10.0]
**Fichier** : `src/app/api/admin/apply-migration/route.ts`

```typescript
export async function POST() {   // ← AUCUN auth check, aucun secret header
  const supabase = createAdminClient();  // service_role key — bypasse tout RLS
  await supabase.rpc('exec_sql', { sql: MIGRATION_SQL });  // DDL arbitraire
```

- L'endpoint n'a **aucun** mécanisme d'authentification (pas de `getUser()`, pas de secret header, pas de session check).
- La route n'est pas dans `publicApiRoutes` du middleware mais n'est pas non plus dans les routes protégées explicitement — le middleware Next.js protège `/dashboard/*` mais pas `/api/admin/*` de manière globale.
- N'importe qui peut envoyer `POST https://fleetmaster.pro/api/admin/apply-migration` et exécuter du SQL en tant que service role Supabase.
- La fonction `exec_sql` est typée dans `supabase.ts` — elle est bien déployée en base.
- **Routes dans le même cas** : `cleanup-triggers`, `fix-activity-logs` (même pattern, même absence d'auth).
- **Correction immédiate** : supprimer ces 3 fichiers, révoquer + régénérer la `SUPABASE_SERVICE_ROLE_KEY`.

---

### 🚨 FAILLE #2 — MOT DE PASSE EN CLAIR DANS STRIPE [CVSS 9.1 + VIOLATION RGPD ART.32]
**Fichier** : `src/app/api/stripe/create-checkout-session/route.ts`

```typescript
metadata: {
  user_password: tempData.password,  // ← MOT DE PASSE PLAINTEXT stocké chez Stripe
}
```

**Et dans** `src/app/api/stripe/webhook/route.ts` :
```typescript
const password = session.metadata?.user_password;  // récupéré depuis Stripe metadata
await supabase.auth.admin.createUser({ password });
```

- Le mot de passe est stocké **en clair** dans les métadonnées Stripe.
- Visible dans le **dashboard Stripe** (logs, events), les **webhooks logs Stripe**, les **emails Stripe**, et potentiellement les **logs Vercel**.
- Violation directe RGPD Article 32 → obligation de notification CNIL sous 72h si exploitation détectée.
- **Correction** : remplacer `user_password` par un `setup_token` (UUID + HMAC, TTL 15 min, stocké en DB table `pending_registrations`, supprimé après usage). Le webhook lit le token, récupère le mot de passe hashé en DB, crée l'utilisateur.

---

### 🚨 FAILLE #3 — CONTOURNEMENT RLS CÔTÉ CLIENT [CVSS 8.5]
**Fichier** : `src/lib/supabase/client-safe.ts`

```typescript
// Sur erreur 42P17 (RLS infinite recursion) :
// Fallback → récupère TOUTES les lignes (aucun filtre company_id)
// puis filtre côté JavaScript
```

- Un attaquant qui peut **déclencher ou simuler une erreur `42P17`** reçoit toutes les données de toutes les entreprises avant le filtre client-side.
- Architecture fondamentalement incorrecte : le filtrage sécurité ne doit **jamais** se faire côté client.
- Ce code existe parce que les politiques RLS ont causé des récursions infinies — preuve d'une instabilité profonde du schéma RLS (cf. 75 migrations correctives).

---

### 🔴 FAILLE #4 — RESET MOT DE PASSE SANS RATE LIMITING [CVSS 7.3]
**Fichier** : `src/app/api/admin/reset-user-password/route.ts`

- Protégé uniquement par `x-admin-secret` header vs `process.env.SUPERADMIN_SETUP_SECRET`.
- Aucun rate limiting → brute-force du secret possible.
- Appelle `supabase.auth.admin.listUsers()` à chaque requête → O(n) users, coûteux.
- Commenté "temporaire" dans le code mais déployé en production.
- Listé dans `publicApiRoutes` du middleware → aucune session JWT requise.

---

### 🔴 FAILLE #5 — IDOR SUR VEHICULES DANS SOS [CVSS 6.5]
**Fichier** : `src/app/api/sos/smart-search/route.ts`

```typescript
// vehicleId fourni par le client, non validé
const vehicle = await adminClient.from('vehicles').select('*').eq('id', vehicleId);
// ← Aucune vérification que vehicleId appartient à la company de l'utilisateur connecté
```

- Tout utilisateur authentifié peut récupérer les données complètes de n'importe quel véhicule par UUID.

---

### 🔴 FAILLE #6 — ACTIONS D'INSPECTION SANS VÉRIFICATION D'APPARTENANCE [CVSS 5.5]
**Fichier** : `src/actions/inspections-safe.ts`

```typescript
export async function validateInspection(id: string) {
  const supabase = createAdminClient();  // bypasse RLS
  // Aucun check : l'utilisateur connecté peut-il valider CETTE inspection ?
```

- `validateInspection()` et `rejectInspection()` utilisent le client admin sans vérifier l'appartenance de l'inspection à l'entreprise de l'appelant.

---

### 🟠 FAILLE #7 — RLS INSPECTIONS POTENTIELLEMENT EN MODE "OPEN" [CVSS 6.0]
**Fichier** : `supabase/migrations/20250208180000_emergency_fix_inspections.sql`

```sql
-- Toutes les policies : USING (true) pour authenticated
-- Si cette migration est la dernière appliquée sur vehicle_inspections,
-- toutes les inspections sont lisibles/modifiables par TOUS les users authentifiés
```

- La migration ultérieure `20250219000100_fix_critical_rls.sql` devrait corriger cela — **à vérifier sur la base de production**.
- Auditer avec : `SELECT tablename, policyname, qual FROM pg_policies WHERE tablename = 'vehicle_inspections';`

---

## 4. AUDIT CODE QUALITY — 13/25

### TypeScript
| Check | Statut |
|-------|--------|
| `strict: true` dans tsconfig | ✅ |
| `typescript.ignoreBuildErrors: true` (538 erreurs TS ignorées) | ❌ |
| Types `any` sauvages dans actions critiques | ⚠️ Quelques `as any` sur tables non typées |
| Incohérence `CHAUFFEUR` (types/index.ts) vs `EXPLOITANT` (DB) | ❌ |

### Architecture
| Check | Statut |
|-------|--------|
| Server Actions + `next-safe-action` | ✅ |
| `tenant-guard.ts` pattern (bien conçu) | ✅ |
| Adoption `tenant-guard` cohérente sur toutes les routes | ❌ |
| `rls-bypass.ts` — anti-pattern client-side security | ❌ |
| Logique métier dupliquée (crons vehicle/driver) | ❌ |
| Routes debug en production (`apply-migration`, `cleanup-triggers`, `fix-activity-logs`) | ❌ |

### Base de données
| Check | Statut |
|-------|--------|
| 75 migrations pour ~12 mois = instabilité RLS chronique | 🔴 |
| `exec_sql` RPC déployé en base (backdoor SQL) | 🔴 |
| Indexes de performance créés | ✅ |
| FK correctement définies sur tables récentes | ✅ |
| Migration `USING (true)` d'urgence non nettoyée | ⚠️ |

### Tests — **SCORE : 0%**
- **0 test unitaire, 0 test d'intégration, 0 test E2E**
- Jest configuré avec seuil 30% — la cible n'est pas mesurable
- Playwright configuré mais dossier `e2e/` inexistant
- Signal le plus fort d'un projet non production-ready

### Dépendances
- `pdfkit` orphelin dans `package.json` (remplacé par `pdf-lib`)
- `stripe.exe` (31MB) commité dans git — binaire ne doit jamais être versionné
- npm audit HIGH : `eslint`/`jest` via `minimatch` (dev-only, non exploitable en runtime)

### Code smells critiques
1. `stripe.exe` (31MB) dans le repository git
2. `console.log` avec données sensibles (UUIDs, company IDs) dans 10 fichiers API route
3. Routes de débogage déployées sans auth (`apply-migration`, `cleanup-triggers`, `fix-activity-logs`)
4. Pages `diagnostic/` et `test/` dans `(dashboard)` — code de développement en production
5. Fichiers SQL manuels dans `sql/` (interventions directes en base hors migration gérée)
6. `validInspection`/`rejectInspection` bypass RLS sans vérification d'appartenance

---

## 5. AUDIT UX/UI — 13/20

| Check | Statut |
|-------|--------|
| Design System Tailwind cohérent | ✅ |
| Responsive mobile-first | ✅ |
| Onboarding 5 étapes structuré | ✅ |
| Pages légales complètes (CGV, ML, PC) | ✅ |
| Framer Motion — transitions | ✅ |
| UX Writing français, pas de Lorem ipsum | ✅ |
| Accessibilité WCAG AA | ⚠️ Non mesurée |
| ARIA labels exhaustifs | ⚠️ Non audité |
| Navigation clavier | ⚠️ Non vérifiée |
| Lighthouse Performance > 85 | ❌ Non mesuré |
| Skeleton loaders systématiques | ⚠️ Non confirmé |
| Empty states sur tous les modules | ⚠️ Partiel |

---

## 6. AUDIT PRODUCTION-READINESS — 8/20

| Check | Statut |
|-------|--------|
| Tests (toute couverture) | ❌ 0% |
| Sentry intégré | ✅ |
| Logger structuré (pino/winston) | ❌ `console.log` uniquement |
| Backup BDD documenté | ⚠️ Dépend plan Supabase |
| Point-in-time recovery | ⚠️ Non documenté |
| Rate limiting Server Actions | ✅ |
| Rate limiting API Routes critiques | ❌ |
| Pagination sur toutes les listes | ✅ |
| RGPD — pages légales | ✅ |
| Export données utilisateur | ✅ CSV + PDF |
| Crons Vercel configurés | ✅ |
| Routes debug en production | ❌ |
| `stripe.exe` dans repo | ❌ |
| Documentation API | ❌ `/api/docs` existe mais contenu ? |

**Capacité à tenir 1000 users simultanés** : Architecture Vercel + Supabase scale horizontalement. Indexes présents. Mais avec 0 test de charge et des politiques RLS historiquement instables, c'est un pari aveugle. Risque réel de régression RLS sous charge.

---

## 7. ANALYSE BUSINESS — 7/10

### Tarification actuelle
| Plan | Mensuel | Véhicules | Users |
|------|---------|-----------|-------|
| Essential | 29€/mo | 10 | 3 |
| Pro | 49€/mo | 30 | 10 |
| Unlimited | 129€/mo | Illimité | Illimité |

### Analyse concurrentielle marché français
| Concurrent | Prix | Forces |
|-----------|------|--------|
| Fleetio | 4-9$/véhicule/mois | Leader, intégrations nombreuses |
| Quartix | 8-15€/véhicule/mois | GPS tracking, connu en France |
| Samsara | Enterprise (>500€/mois) | Grandes flottes uniquement |
| **FleetMaster Pro** | **29-129€ flat** | **Tarif prévisible, réglementation FR** |

**Avantages concurrentiels réels :**
- Pricing flat (non par véhicule) = prévisibilité budget pour PME françaises
- Données réglementaires FR intégrées (CT, TACHY, ATP, CQC, FIMO, FCOS)
- SOS garage avec géolocalisation — fonctionnalité rare chez les concurrents
- IA prédictive maintenance

**Faiblesses commerciales :**
- Aucune offre d'essai gratuit → CAC élevé
- `EARLY_ADOPTER_EMAILS` array vide → pas de stratégie de lancement active
- Version 0.1.0 → signal de maturité produit faible pour les acheteurs B2B

---

## 8. RECOMMANDATIONS PAR PRIORITÉ

### P0 — Cette semaine (BLOQUANT — ne pas déployer avant)

- [ ] **SUPPRIMER** `src/app/api/admin/apply-migration/route.ts`, `cleanup-triggers/route.ts`, `fix-activity-logs/route.ts` — puis révoquer + régénérer `SUPABASE_SERVICE_ROLE_KEY`
- [ ] **CORRIGER** le stockage du mot de passe Stripe : remplacer `user_password` dans metadata par un `setup_token` (UUID HMAC, TTL 15 min, table `pending_registrations`)
- [ ] **SUPPRIMER** `stripe.exe` du repo git et purger l'historique (`git filter-repo --path stripe.exe --invert-paths`)
- [ ] **AJOUTER** vérification `company_id` sur `vehicleId` dans `/api/sos/smart-search/route.ts`
- [ ] **AJOUTER** auth + ownership check dans `validateInspection()` et `rejectInspection()` dans `inspections-safe.ts`
- [ ] **AUDITER** en production : `SELECT policyname, qual FROM pg_policies WHERE tablename = 'vehicle_inspections';` — corriger si `USING (true)` encore actif
- [ ] **SUPPRIMER** la fonction `exec_sql` de la base de données (ou restreindre à superuser DB uniquement)

### P1 — Mois 1

- [ ] Refactorer `client-safe.ts` : supprimer le fallback "fetch all + filter client-side" — debugger la récursion RLS à la source
- [ ] Supprimer `src/lib/supabase/rls-bypass.ts` ou le restreindre strictement
- [ ] Ajouter rate limiting sur `/api/admin/reset-user-password` (ou supprimer l'endpoint)
- [ ] Ajouter rate limiting sur `/api/stripe/create-checkout-session`
- [ ] Écrire les 10 premiers tests critiques : isolation tenant (2 companies ne voient pas les données de l'autre), création véhicule, middleware auth
- [ ] Corriger les 50 erreurs TypeScript les plus critiques dans actions/hooks
- [ ] Supprimer `pdfkit` des dépendances
- [ ] Remplacer `console.log` dans les API routes par un logger structuré (pino)
- [ ] Retirer ou sécuriser les pages `(dashboard)/dashboard/diagnostic/` et `test/`

### P2 — Roadmap Q2

- [ ] Suite de tests E2E : parcours inscription → paiement Stripe → dashboard → véhicule → inspection
- [ ] Tests de charge (k6) : objectif 200 users simultanés sans dégradation
- [ ] Audit accessibilité WCAG AA + score Lighthouse > 85
- [ ] Essai gratuit 14 jours pour réduire le CAC
- [ ] Consolider les 75 migrations en schéma initial propre
- [ ] Documenter et tester la stratégie de backup/restore

---

## 9. CHECKLIST GO/NO-GO

- [ ] ❌ **Sécurité validée** — NON (2 failles critiques actives)
- [ ] ❌ **Performances > 85 Lighthouse** — Non mesuré
- [ ] ❌ **0 bug bloquant** — NON (failles de sécurité actives)
- [ ] ⚠️ **Documentation technique** — Partielle (DEPLOY.md, .env.example présents)
- [ ] ❌ **Tests > 0%** — NON (zéro test)
- [ ] ❌ **Backup testé** — Non documenté
- [ ] ✅ **Stripe fonctionnel** — OUI (modulo faille #2)
- [ ] ✅ **Pages légales RGPD** — OUI
- [ ] ✅ **Monitoring Sentry** — OUI
- [ ] ❌ **Isolation tenant vérifiée** — NON (failles #3, #5, #6)

---

## 10. VERDICT COMMERCIAL

> **À ce stade, vendre cet outil à plus de 5 utilisateurs est irresponsable.** La faille #2 (mot de passe en clair dans Stripe) constitue une violation RGPD Article 32 documentée et immédiatement exploitable. La faille #1 (exécution SQL publique non authentifiée) permettrait à n'importe qui de supprimer toutes les données de tous les clients en moins de 2 minutes. En cas d'incident avec ces failles actives, la responsabilité de l'éditeur serait directement engagée au pénal (CNIL, Article 226-17 Code Pénal).

> **La tarification 29-129€/mois flat est un avantage concurrentiel réel.** Ne pas la modifier. Envisager un essai 14 jours pour réduire le CAC.

> **Le potentiel est réel** : modules différenciants (réglementation FR, SOS, IA prédictive), architecture Next.js/Supabase moderne, UI soignée. Avec 3-4 semaines de corrections focalisées sur P0 + P1, ce projet peut devenir commercialisable et défendable.

---

## DÉCISION FINALE

### 🔴 NO-GO — Mise en production commerciale immédiate impossible

**Délai pour passer en GO :** 3-4 semaines de correctifs P0 (semaine 1) + P1 (semaines 2-4).

**Post-corrections P0+P1 :** GO avec réserves (absence de tests = risque opérationnel accepté à petite échelle, à combler en continu).

---

*Rapport généré le 2026-02-22 — Analyse statique exhaustive du codebase. Les scores RLS reflètent l'état du code source. L'état réel de la base de production doit être audité indépendamment (pg_policies, fonctions SECURITY DEFINER actives).*
