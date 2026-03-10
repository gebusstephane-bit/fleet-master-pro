# Mission Sécurité #4 - Rate Limiting et Durcissement API

## 📋 Résumé

Cette mission implémente un système de rate limiting en mémoire pour protéger les endpoints API contre le brute-force et l'abus, tout en maintenant les performances sur Vercel (sans Redis).

## 🛡️ Implémentations

### 1. Rate Limiting Global (Middleware)

Fichier: `src/middleware.ts`

Toutes les routes API sont maintenant protégées avec des limites spécifiques:

| Route | Limite | Fenêtre | Message personnalisé |
|-------|--------|---------|---------------------|
| `/api/*` (général) | 100 req | 1 min | Standard |
| `/api/stripe/create-checkout-session` | 5 req | 1 heure | "Trop de tentatives. Réessayez dans 1 heure ou contactez le support." |
| `/api/stripe/webhook` | 50 req | 1 min | Standard (Stripe envoie par batch) |
| `/api/auth/*` | 10 req | 1 min | Standard |
| `/api/sos/smart-search` | 30 req | 1 min | Standard |
| `/api/cron/*` | N/A | N/A | Vérification secret Vercel uniquement |

### 2. Protection CSRF (Routes sensibles)

Fichier: `src/lib/security/csrf.ts`

- Vérification des headers `Origin` et `Referer`
- Autorisation des sous-domaines `.fleetmaster.pro`
- Bypass automatique en développement
- Les webhooks sont exemptés (authentification par signature)

Routes protégées:
- `POST /api/stripe/create-checkout-session` (CSRF + Rate Limiting)
- `POST /api/stripe/webhook` (Rate Limiting uniquement)

### 3. Sécurisation des Cron Jobs

Les endpoints `/api/cron/*` vérifient le header `x-vercel-cron-secret`:
```typescript
const isVercelCron = vercelCronSecret === process.env.CRON_SECRET;
```

En production, les requêtes sans ce secret sont rejetées avec un 429.

### 4. Headers de Sécurité (Déjà existants)

Les headers suivants sont déjà configurés dans `next.config.js`:
- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- `Content-Security-Policy` (configuré)
- `X-Powered-By` supprimé (`poweredByHeader: false`)

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers
```
src/lib/security/
├── rate-limit.ts    # Implémentation rate limiting en mémoire
├── csrf.ts          # Protection CSRF
└── index.ts         # Export centralisé
```

### Fichiers modifiés
```
src/middleware.ts                                    # Rate limiting global
src/app/api/stripe/create-checkout-session/route.ts  # CSRF + Rate limiting
src/app/api/stripe/webhook/route.ts                  # Rate limiting
```

## 🔧 Utilisation

### Dans une route API

```typescript
import { withRateLimit, RateLimits, getClientIP } from '@/lib/security/rate-limit';
import { withCSRFProtection } from '@/lib/security/csrf';

async function handler(request: NextRequest) {
  // Votre logique ici
}

// Avec rate limiting uniquement
export const POST = withRateLimit(handler, RateLimits.general, {
  getIdentifier: (req) => getClientIP(req),
});

// Avec CSRF + rate limiting
export const POST = withCSRFProtection(
  withRateLimit(handler, RateLimits.sensitive, {
    getIdentifier: (req) => getClientIP(req),
  })
);
```

### Dans le middleware

Le rate limiting est automatiquement appliqué à toutes les routes API via le middleware.

## 🧪 Tests manuels

### Test rate limiting checkout
```bash
# Envoyer 6 requêtes rapidement
for i in {1..6}; do
  curl -X POST https://fleetmaster.pro/api/stripe/create-checkout-session \
    -H "Content-Type: application/json" \
    -d '{"email":"test@example.com","planType":"essential"}'
  echo ""
done

# La 6ème doit retourner: 429 Too Many Requests
```

### Test CSRF
```bash
# Requête sans header Origin (doit être bloquée en production)
curl -X POST https://fleetmaster.pro/api/stripe/create-checkout-session \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'

# Doit retourner: 403 Forbidden
```

### Test headers de rate limit
```bash
curl -I https://fleetmaster.pro/api/auth/login

# Doit contenir:
# X-RateLimit-Limit: 10
# X-RateLimit-Remaining: 9
# X-RateLimit-Reset: 1234567890
```

## ⚠️ Limitations

### Stockage en mémoire
- Sur Vercel, le stockage est réinitialisé à chaque "cold start" (fonctions serverless stateless)
- C'est acceptable pour une protection de base contre les abus ponctuels
- Pour une protection à long terme, migrer vers Redis (@upstash/redis)

### Pas de rate limiting par utilisateur
- Actuellement basé sur l'IP uniquement
- Un utilisateur authentifié et un anonyme partagent la même limite si même IP
- Amélioration possible: utiliser l'ID utilisateur quand disponible

## 📈 Améliorations futures

1. **Redis Upstash** : Pour un rate limiting persistant et distribué
2. **Rate limiting par user ID** : Séparer les limites des utilisateurs authentifiés
3. **Whitelist d'IPs** : Pour les partenaires/APIs internes
4. **Logging détaillé** : Envoyer les événements de rate limit à Sentry
5. **Circuit breaker** : Protection contre les cascades de requêtes

## ✅ Validation

- [x] `npm run build` passe sans erreur
- [x] Middleware modifié avec rate limiting
- [x] Routes API sensibles protégées (CSRF + Rate Limiting)
- [x] Protection des cron jobs par secret Vercel
- [x] Headers de sécurité déjà présents
- [x] Documentation créée

## 📚 Références

- [OWASP Rate Limiting](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html)
- [Next.js Middleware](https://nextjs.org/docs/app/building-your-application/routing/middleware)
- [Vercel Cron Jobs](https://vercel.com/docs/cron-jobs)
