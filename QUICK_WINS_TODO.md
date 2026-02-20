# Quick Wins TODO - FleetMaster Pro

**Date:** 18 Février 2026  
**Status:** ✅ Phase 1 Complétée | 🚧 Phase 2 En cours

---

## ✅ COMPLÉTÉ (18 Février 2026)

### 1. Configuration next.config.mjs
- [x] Headers sécurité (X-Frame-Options, CSP basique)
- [x] RemotePatterns pour Supabase/Stripe/avatars
- [x] Redirects www → non-www
- [x] Cache control pour assets statiques

**Fichier:** `next.config.mjs` (lignes 1-157)

### 2. Open Redirect Protection
- [x] Whitelist des URLs de redirection autorisées
- [x] Rejet des URLs externes (:// ou //)
- [x] Validation des chemins avec patterns
- [x] Fallback sécurisé vers /dashboard

**Fichier:** `src/app/auth/callback/page.tsx` (lignes 1-189)

### 3. Validation API avec Zod
- [x] Schémas de validation créés (vehicles, SOS providers, users)
- [x] Validation POST /api/vehicles avec error handling
- [x] Validation POST /api/sos/providers avec error handling
- [x] Types TypeScript exportés

**Fichiers:**
- `src/lib/validation/schemas.ts` (lignes 1-344)
- `src/app/api/vehicles/route.ts` (lignes 1-212)
- `src/app/api/sos/providers/route.ts` (lignes 1-254)

### 4. Rate Limiter - Préparation Redis
- [x] Documentation complète de la migration
- [x] Architecture adapter pattern définie
- [x] Fallback Map en mémoire documenté
- [x] TODOs ajoutés pour la migration

**Fichier:** `src/lib/security/rate-limiter.ts` (lignes 1-267)

### 5. RLS Workaround Documentation
- [x] Analyse du problème de récursion
- [x] Code SQL de correction proposé
- [x] Fonction RPC alternative documentée
- [x] Impact sécurité évalué

**Fichier:** `RLS_RECURSION_ANALYSIS.md`

### 6. Nettoyage fichiers morts
- [x] `design-system.ts` - Non trouvé (déjà supprimé)
- [x] Données mock dans dashboard/page.tsx - Déjà nettoyé
- [x] `kpi-card.tsx` - Déjà supprimé lors de l'audit UI

---

## 🚧 TODO - PHASE 2 (À Implémenter)

### Priorité: CRITIQUE 🔴

#### TOD-001: Corriger les policies RLS (Infinite Recursion)
**Contexte:** RLS_RECURSION_ANALYSIS.md  
**Action:**
```sql
-- Exécuter sur Supabase
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER
AS $$ SELECT company_id FROM profiles WHERE id = auth.uid(); $$;

CREATE POLICY "vehicles_select_fixed" ON vehicles
  FOR SELECT TO authenticated
  USING (company_id = get_user_company_id() OR created_by = auth.uid());
```
**Assigné à:** DBA / Admin Supabase  
**Deadline:** ASAP

#### TOD-002: Implémenter Rate Limiter Redis
**Contexte:** src/lib/security/rate-limiter.ts (lignes 9-75)  
**Action:**
1. Créer compte Upstash Redis
2. Ajouter env vars: `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`
3. Créer `src/lib/security/rate-limiter-redis.ts`
4. Modifier `rate-limiter.ts` pour utiliser Redis en priorité

**Code à implémenter:**
```typescript
// src/lib/security/rate-limiter-redis.ts
import { Redis } from '@upstash/redis';

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});

export async function checkRateLimitRedis(key: string, config: RateLimitConfig) {
  // Implémentation sliding window avec Redis
}
```

**Assigné à:** Backend Developer  
**Deadline:** 1 semaine

---

### Priorité: HAUTE 🟠

#### TOD-003: Ajouter validation Zod sur autres API routes
**Routes à couvrir:**
- [ ] `/api/drivers/route.ts` - POST, PATCH, DELETE
- [ ] `/api/routes/route.ts` - POST, PATCH, DELETE
- [ ] `/api/maintenance/route.ts` - POST, PATCH
- [ ] `/api/sos/contracts/route.ts` - POST, PATCH
- [ ] `/api/admin/*` - Toutes les routes admin

**Schémas à créer:**
- `createDriverSchema`
- `createRouteSchema`
- `createMaintenanceSchema`
- `createSosContractSchema`

**Assigné à:** Backend Developer  
**Deadline:** 2 semaines

#### TOD-004: Sécuriser les Server Actions avec validation
**Fichiers concernés:**
- [ ] `src/actions/vehicles.ts` - Valider inputs
- [ ] `src/actions/drivers.ts` - Valider inputs
- [ ] `src/actions/maintenance.ts` - Valider inputs

**Exemple:**
```typescript
export async function createVehicle(data: unknown) {
  const validation = validateSchema(createVehicleSchema, data);
  if (!validation.success) {
    return { success: false, errors: validation.errors };
  }
  // ... suite
}
```

**Assigné à:** Full Stack Developer  
**Deadline:** 2 semaines

#### TOD-005: Renforcer le CSP (Content Security Policy)
**Contexte:** next.config.mjs (lignes 62-77)  
**Action:**
```javascript
// Remplacer CSP basique par CSP strict
{
  key: 'Content-Security-Policy',
  value: [
    "default-src 'self'",
    "script-src 'self' 'nonce-{random}' 'strict-dynamic'",
    "style-src 'self' 'nonce-{random}'",
    "img-src 'self' blob: data: https://*.supabase.co",
    "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
    "font-src 'self'",
    "frame-ancestors 'none'",
    "base-uri 'none'",
    "form-action 'self'",
  ].join('; '),
}
```

**Assigné à:** DevOps / Security  
**Deadline:** 2 semaines

---

### Priorité: MOYENNE 🟡

#### TOD-006: Monitoring des erreurs 42P17 (RLS)
**Action:**
- [ ] Ajouter alerte Sentry/DataDog sur erreur `42P17`
- [ ] Créer dashboard de monitoring des fallback RLS
- [ ] Alerte si > 10 fallback/jour

**Code:**
```typescript
// Dans use-vehicles.ts
if (error.code === '42P17') {
  Sentry.captureMessage('RLS Recursion Fallback Used', {
    level: 'warning',
    extra: { companyId, userId: user?.id }
  });
  // ... fallback
}
```

**Assigné à:** DevOps  
**Deadline:** 3 semaines

#### TOD-007: Ajouter rate limiting sur API routes
**Routes à protéger:**
- [ ] `/api/auth/*` - Limite stricte (5 req/min)
- [ ] `/api/vehicles` - Limite standard
- [ ] `/api/sos/*` - Limite standard

**Implémentation:**
```typescript
// Dans chaque route API
import { checkAuthenticatedRateLimit, getRateLimitHeaders } from '@/lib/security/rate-limiter';

export async function POST(request: NextRequest) {
  const rateLimit = await checkAuthenticatedRateLimit(userId);
  if (!rateLimit.success) {
    return NextResponse.json(
      { error: 'Rate limit exceeded' },
      { status: 429, headers: getRateLimitHeaders(rateLimit) }
    );
  }
  // ... suite
}
```

**Assigné à:** Backend Developer  
**Deadline:** 3 semaines

#### TOD-008: Supprimer TODOs résolus
**Fichiers à nettoyer:**
- [ ] `src/app/(dashboard)/settings/security/page.tsx:26` - TODO: Change password
- [ ] `src/app/(dashboard)/settings/profile/page.tsx:28` - TODO: Save profile
- [ ] `src/lib/notifications/role-based.ts:100` - TODO: Envoyer email
- [ ] `src/lib/logger.ts:52` - TODO: Envoyer vers Sentry

**Assigné à:** Full Stack Developer  
**Deadline:** 1 semaine

---

### Priorité: BASSE 🟢

#### TOD-009: Tests automatisés pour la validation Zod
**Action:**
- [ ] Créer tests unitaires pour chaque schéma
- [ ] Tester cas limites (empty strings, XSS, SQL injection)
- [ ] Intégrer dans CI/CD

**Assigné à:** QA Engineer  
**Deadline:** 1 mois

#### TOD-010: Documentation API avec OpenAPI/Swagger
**Action:**
- [ ] Générer spec OpenAPI depuis les schémas Zod
- [ ] Documenter tous les endpoints API
- [ ] Héberger sur /api/docs

**Outils:** `zod-to-openapi`, `swagger-ui-react`

**Assigné à:** Technical Writer / Backend  
**Deadline:** 1 mois

---

## 📊 Métriques de Qualité

| Métrique | Avant | Après Quick Wins | Objectif |
|----------|-------|------------------|----------|
| Headers sécurité | 2/10 | 8/10 | 10/10 |
| Validation API | 0% | 20% | 100% |
| Rate limiting | Mémoire | Mémoire | Redis |
| Open Redirect | Vulnérable | Sécurisé | Sécurisé |
| TODOs critiques | 5 | 2 | 0 |

---

## 🔗 Liens Rapides

- **Analyse RLS:** `RLS_RECURSION_ANALYSIS.md`
- **Audit UI:** `UI_UNIFICATION_AUDIT.md`
- **Schémas Validation:** `src/lib/validation/schemas.ts`
- **Rate Limiter:** `src/lib/security/rate-limiter.ts`
- **Auth Callback:** `src/app/auth/callback/page.tsx`

---

## 📝 Notes

### Rappels Importants
1. **NE PAS SUPPRIMER** le workaround RLS avant d'avoir corrigé les policies SQL
2. **TESTER** la configuration next.config.mjs sur staging avant prod
3. **VÉRIFIER** les env vars Redis avant merge de TOD-002
4. **DOCUMENTER** les changements de schémas Zod pour le frontend

### Contacts
- **Security Issues:** security@fleetmaster.pro
- **DBA / RLS:** dba@fleetmaster.pro
- **DevOps / Redis:** devops@fleetmaster.pro

---

*Dernier update: 18 Février 2026*  
*Prochaine review: 25 Février 2026*
