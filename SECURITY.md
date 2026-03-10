# FleetMaster Pro - Security Documentation

Ce document décrit les mesures de sécurité implémentées et les bonnes pratiques pour FleetMaster Pro.

📋 **Documentation complète**: [docs/security-posture.md](./docs/security-posture.md)  
📊 **Score ISO 27001**: 23/25 (Mars 2026)

## 🔒 Résumé des Corrections de Sécurité (Mars 2026)

### 5. ✅ Sanitization des Logs (ISO 27001)
**Problème**: Console logs exposant des données sensibles (emails, IPs, UUIDs complets).

**Impact**: Fuite potentielle de PII dans les logs système.

**Solution**:
- Création de `src/lib/security/sanitize-logs.ts`
- Logger structuré dans `src/lib/logger.ts`
- Masquage automatique des emails, UUIDs, JWT tokens, IPs
- Remplacement des `console.error` par `logger.error()`

**Fichiers modifiés**:
- `src/lib/logger.ts` (refonte complète)
- `src/lib/supabase/server.ts` (logs sécurisés)
- `src/middleware.ts` (logs sécurisés)

**Utilisation**:
```typescript
// ❌ AVANT (dangereux)
console.error('Auth error:', error, user.email);

// ✅ APRÈS (sécurisé)
logger.errorWithError('Auth operation failed', error, {
  userId: user.id, // UUID tronqué automatiquement
  email: user.email, // Email masqué (a***@domain.com)
});
```

### 6. ✅ NPM Audit Fix (Mars 2026)
**Problème**: 14 vulnérabilités NPM détectées (11 High).

**Solution**:
- `npm audit fix` appliqué (9 vulnérabilités corrigées)
- 5 vulnérabilités résiduelles documentées avec justifications métier

**Vulnérabilités résiduelles acceptées**:
| Package | Severity | Justification |
|---------|----------|---------------|
| `next` | High | Breaking change majeur (v14→16). Migration planifiée Q2 2026. |
| `glob` | High | Dev-only dependency (eslint), pas d'exposition production. |
| `immutable` | High | Dépendance swagger-ui, usage interne admin only. |
| `xlsx` | High | Pas de fix disponible. Traitement sandbox côté serveur. |
| `dompurify` | Moderate | XSS edge cases. Reste la meilleure lib de sanitization. |

---

## 🔒 Résumé des Corrections de Sécurité (Février 2026)

### Vulnérabilités Corrigées

#### 1. ✅ Cast `as any` sur client Supabase (CRITIQUE)
**Problème**: Le fichier `client.ts` exportait un singleton avec un cast dangereux `as any`.

**Impact**: Possibilité d'accès au client Supabase côté serveur, fuite de données.

**Solution**:
- Suppression du cast `as any`
- Implémentation d'un pattern singleton sécurisé avec `getSupabaseClient()`
- Vérification stricte de `typeof window !== 'undefined'`
- Ajout d'un message d'erreur explicite si appelé côté serveur

**Fichier modifié**: `src/lib/supabase/client.ts`

```typescript
// ❌ AVANT
export const supabase = typeof window !== 'undefined' 
  ? createClient() 
  : null as any;

// ✅ APRÈS
export function getSupabaseClient() {
  if (typeof window === 'undefined') {
    throw new Error('getSupabaseClient() must only be called in the browser');
  }
  // Singleton sécurisé...
}
```

---

#### 2. ✅ Rate Limiting sur Server Actions (CRITIQUE)
**Problème**: Aucune protection contre les attaques DoS ou brute force.

**Impact**: Crash serveur, consommation abusive de ressources.

**Solution**:
- Création de `src/lib/security/rate-limiter.ts`
- Limites configurables :
  - IP anonyme: 10 req/min
  - Utilisateur authentifié: 100 req/min
  - Actions sensibles: 5 req/min
  - Burst limit: 5 req/10s
- Intégration avec `next-safe-action`

**Fichiers modifiés**:
- `src/lib/security/rate-limiter.ts` (nouveau)
- `src/lib/safe-action.ts` (mise à jour)

**Utilisation**:
```typescript
// Action publique (rate limit par IP)
export const myAction = publicActionClient
  .schema(mySchema)
  .action(async ({ parsedInput }) => {
    // Protégé automatiquement
  });

// Action authentifiée (rate limit par user)
export const mySecureAction = authActionClient
  .schema(mySchema)
  .action(async ({ parsedInput, ctx }) => {
    // Protégé automatiquement
  });
```

---

#### 3. ✅ Migration users → profiles (CRITIQUE)
**Problème**: Double système de tables créant confusion et failles RLS.

**Impact**: Fuites de données entre entreprises, authentification compromise.

**Solution**:
- Création de la table `profiles` si inexistante
- Migration automatique des données `users` → `profiles`
- RLS complètes sur `profiles`
- Mise à jour de toutes les Server Actions pour utiliser `profiles`

**Fichier de migration**: `supabase/migrations/20250209000001_fix_rls_policies.sql`

**Rôles définis**:
- `ADMIN`: Tous les droits
- `DIRECTEUR`: Gestion utilisateurs et paramètres
- `AGENT_DE_PARC`: Opérations quotidiennes
- `EXPLOITANT`: Lecture seule

---

#### 4. ✅ RLS sur maintenance_records et inspections (CRITIQUE)
**Problème**: Tables sans isolation `company_id` correcte.

**Impact**: Accès aux données d'autres entreprises.

**Solution**:
- Ajout de `company_id` sur `maintenance_records`
- Création des RLS complètes :
  - `maintenance_records`: SELECT/INSERT/UPDATE/DELETE par company_id
  - `inspections`: SELECT/INSERT/UPDATE/DELETE par company_id
- Index sur `company_id` pour performance

**Fichier de migration**: `supabase/migrations/20250209000001_fix_rls_policies.sql`

---

## 📋 Checklist de Sécurité

### Avant chaque déploiement

- [ ] Aucun `console.log` exposant des données sensibles
- [ ] Variables d'environnement correctement définies
- [ ] RLS testées sur toutes les nouvelles tables
- [ ] Server Actions protégées par `authActionClient`
- [ ] Validation Zod stricte sur toutes les entrées
- [ ] Pas de requêtes SQL dynamiques (injection SQL)

### Variables d'environnement requises

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Server-side only

# Rate Limiting (optionnel mais recommandé)
UPSTASH_REDIS_REST_URL=     # Pour production scale
UPSTASH_REDIS_REST_TOKEN=
```

---

## 🛡️ Bonnes Pratiques

### 1. Authentification
- Toujours utiliser `getUserWithCompany()` côté serveur
- Ne jamais faire confiance au `user` côté client
- Vérifier les rôles avant chaque action sensible

### 2. Server Actions
```typescript
// ✅ Bon
import { authActionClient } from '@/lib/safe-action';

export const createVehicle = authActionClient
  .schema(vehicleSchema)
  .action(async ({ parsedInput, ctx }) => {
    // ctx.user est garanti authentifié
    const { user } = ctx;
    // Vérifier les permissions
    if (!['ADMIN', 'DIRECTEUR'].includes(user.role)) {
      throw new Error('Permissions insuffisantes');
    }
    // Action sécurisée...
  });
```

### 3. Requêtes Supabase
```typescript
// ✅ Toujours filtrer par company_id
const { data } = await supabase
  .from('vehicles')
  .select('*')
  .eq('company_id', user.company_id);  // Jamais oublier ceci
```

### 4. Uploads de fichiers
```typescript
// ✅ Valider type et taille
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
const maxSize = 2 * 1024 * 1024; // 2Mo

if (!allowedTypes.includes(file.type)) {
  throw new Error('Type de fichier non supporté');
}
if (file.size > maxSize) {
  throw new Error('Fichier trop volumineux');
}
```

---

## 🚨 Procédure en cas d'incident

1. **Désactiver immédiatement** les accès suspects via Supabase Dashboard
2. **Révoquer** les tokens concernés
3. **Auditer** les logs d'accès
4. **Notifier** les utilisateurs concernés (RGPD)
5. **Documenter** l'incident

---

## 🔗 Ressources

- [Supabase Security Best Practices](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Next.js Security Headers](https://nextjs.org/docs/advanced-features/security-headers)
- [OWASP Top 10](https://owasp.org/www-project-top-ten/)

---

**Dernière mise à jour**: Février 2026
**Responsable sécurité**: Équipe FleetMaster Pro
**Prochain audit**: Dans 3 mois
