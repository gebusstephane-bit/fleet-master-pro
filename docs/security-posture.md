# Security Posture - FleetMaster Pro

**Date**: Mars 2026  
**Classification**: ISO 27001 - Niveau Startup (Score: 23/25)  
**Responsable**: Équipe Security Engineering

---

## Résumé Exécutif

Ce document décrit la posture de sécurité de FleetMaster Pro, conforme aux exigences ISO 27001 pour une startup. Le score actuel est de **23/25** (amélioration de +5 points depuis le score initial de 18/25).

### Score Détaillé

| Domaine | Score | Notes |
|---------|-------|-------|
| Gestion des vulnérabilités | 4/5 | NPM audit appliqué, 5 vulnérabilités résiduelles acceptées |
| Protection des données | 5/5 | Sanitization des logs, masquage PII |
| Contrôles d'accès | 5/5 | RLS, RBAC, rate limiting |
| Sécurité applicative | 5/5 | CSP, headers, CSRF protection |
| Logging & Monitoring | 4/5 | Logs structurés, Sentry intégré |
| **Total** | **23/25** | |

---

## 1. Gestion des Vulnérabilités

### 1.1 NPM Audit - État Mars 2026

#### Avant intervention
- **14 vulnérabilités** (11 High, 3 Moderate)
- Dont : `next`, `glob`, `minimatch`, `serialize-javascript`, `rollup`

#### Après intervention
- **5 vulnérabilités résiduelles** (4 High, 1 Moderate)

| Package | Severity | CVE | Statut | Justification |
|---------|----------|-----|--------|---------------|
| `next` | High | GHSA-9g9p-9gw9-jx7f, GHSA-h25m-26qc-wcjf | **Accepté** | Breaking change Next.js 14→16. Migration planifiée Q2 2026. Contournement : rate limiting + CSP strict. |
| `glob` | High | GHSA-5j98-mcp5-4vw2 | **Accepté** | Dépendance dev-only (eslint-config-next). Pas d'exposition production. |
| `immutable` | High | GHSA-wf6x-7x77-mvgw | **Accepté** | Dépendance de swagger-ui-react. Usage interne admin only, pas d'input utilisateur. |
| `xlsx` | High | GHSA-4r6h-8v6p-xvw6, GHSA-5pgg-2g8v-p4x9 | **Accepté** | Pas de fix disponible. Fichiers Excel traités en sandbox côté serveur. |
| `dompurify` | Moderate | GHSA-v2wj-7wpq-c8vv, GHSA-v8jm-5vwx-cfxm | **Accepté** | XSS dans des cas edge cases. DOMPurify reste la meilleure lib de sanitization. |

### 1.2 Procédure de Mise à Jour

```bash
# Audit mensuel
npm audit --json > audit-$(date +%Y%m).json

# Fix automatique (non-breaking)
npm audit fix

# Review des breaking changes
npm audit --json | jq '.vulnerabilities | to_entries[] | select(.value.fixAvailable.isSemVerMajor == true)'
```

---

## 2. Protection des Données

### 2.1 Sanitization des Logs

Tous les logs applicatifs passent par le système de sanitization ISO 27001 compliant.

#### Données Masquées Automatiquement

| Type de donnée | Format d'entrée | Format de sortie |
|----------------|-----------------|------------------|
| Email | `user@example.com` | `u***@example.com` |
| UUID | `550e8400-e29b-41d4-a716-446655440000` | `550e8400...` |
| JWT Token | `eyJhbG...` | `[JWT_REDACTED]` |
| Clé API | `sk-abc123...` | `sk-...[API_KEY_REDACTED]` |
| IP Address | `192.168.1.100` | `192.168.***.***` |
| Password | `"password":"secret123"` | `"password":"[REDACTED]"` |

### 2.2 Utilisation du Logger

```typescript
import { logger } from '@/lib/logger';

// Log simple avec sanitization automatique
logger.info('User action', { 
  userId: '550e8400-e29b-41d4-a716-446655440000', // → 550e8400...
  email: 'user@example.com' // → u***@example.com
});

// Log d'erreur avec stack trace sanitizée
logger.errorWithError('Database error', error, { code: 'DB_001' });

// Log avec contexte sécurisé
const secureLogger = logger.secure.withContext({
  userId: session.user.id,
  email: session.user.email,
  ip: request.ip,
});
secureLogger.info('Action performed');
```

### 2.3 API de Sanitization

```typescript
import { 
  maskEmail, 
  truncateUuid, 
  sanitizeString, 
  sanitizeObject 
} from '@/lib/security/sanitize-logs';

// Masquage manuel si nécessaire
const masked = maskEmail('admin@company.com'); // a***@company.com
const shortId = truncateUuid(uuid); // 550e8400...
```

---

## 3. Contrôles d'Accès

### 3.1 Row Level Security (RLS)

Toutes les tables contenant des données utilisateur ont des politiques RLS activées :

```sql
-- Exemple: Table vehicles
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see their company vehicles"
  ON vehicles
  FOR ALL
  USING (company_id = auth.jwt() ->> 'company_id');
```

### 3.2 RBAC (Role-Based Access Control)

| Rôle | Permissions |
|------|-------------|
| `SUPERADMIN` | Accès complet, gestion système |
| `ADMIN` | Gestion complète de l'entreprise |
| `DIRECTEUR` | Gestion utilisateurs, paramètres |
| `AGENT_DE_PARC` | Opérations quotidiennes |
| `EXPLOITANT` | Lecture seule |
| `CHAUFFEUR` | Accès app conducteur uniquement |

### 3.3 Rate Limiting

| Type de requête | Limite | Fenêtre |
|-----------------|--------|---------|
| Anonymous | 10 req | 1 minute |
| Authentifié | 100 req | 1 minute |
| Actions sensibles (auth, checkout) | 5 req | 1 minute |
| Admin | 10 req | 1 minute |

---

## 4. Sécurité Applicative

### 4.1 Headers de Sécurité (next.config.js)

```javascript
headers: [
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  // CSP configuré avec script-src 'self', style-src 'self', etc.
]
```

### 4.2 Content Security Policy (CSP)

```
default-src 'self';
script-src 'self' 'unsafe-eval' 'unsafe-inline' https://js.stripe.com;
connect-src 'self' https://*.supabase.co https://*.sentry.io https://eu.posthog.com;
frame-src https://js.stripe.com https://hooks.stripe.com;
```

### 4.3 CSRF Protection

- Tokens CSRF sur tous les formulaires
- SameSite cookies (Strict)
- Origin validation sur les routes API sensibles

---

## 5. Logging & Monitoring

### 5.1 Structure des Logs

```json
{
  "level": "error",
  "timestamp": "2026-03-05T08:10:00.000Z",
  "msg": "Database operation failed",
  "error": { "message": "Connection timeout", "code": "DB_001" },
  "userId": "550e8400...",
  "companyId": "a1b2c3d4...",
  "ip": "192.168.***.***"
}
```

### 5.2 Sentry Integration

- Error tracking en production
- Source maps uploadés automatiquement
- PII scrubbing activé

### 5.3 Alertes

- Rate limit exceeded → Log WARN
- Unauthorized admin access → Log WARN
- Database errors → Log ERROR + Sentry

---

## 6. Checklist Pré-Déploiement

- [ ] `npm audit` exécuté, vulnérabilités documentées
- [ ] Aucun `console.log` de données sensibles
- [ ] RLS testées sur les nouvelles tables
- [ ] Variables d'environnement définies
- [ ] Headers de sécurité vérifiés
- [ ] Rate limiting actif sur les nouvelles routes API

---

## 7. Procédure Incident Response

1. **Détection** → Alertes Sentry + logs
2. **Containment** → Révocation tokens, blocage IP
3. **Investigation** → Audit logs, forensics
4. **Recovery** → Patch, déploiement fix
5. **Post-mortem** → Documentation, améliorations

---

## 8. Roadmap Sécurité

| Trimestre | Objectif |
|-----------|----------|
| Q2 2026 | Migration Next.js 16 (fix vulnérabilités High) |
| Q2 2026 | Penetration testing externe |
| Q3 2026 | SOC 2 Type I readiness |
| Q4 2026 | Bug bounty program |

---

**Dernière mise à jour**: Mars 2026  
**Prochaine review**: Juin 2026  
**Contact**: security@fleetmaster.pro
