# Correctifs de Sécurité - 2026-02-22

## 🚨 Actions Réalisées

### Mission Critique #1 : Suppression des routes API admin dangereuses
- ✅ `src/app/api/admin/apply-migration/route.ts` - SUPPRIMÉ
- ✅ `src/app/api/admin/cleanup-triggers/route.ts` - SUPPRIMÉ
- ✅ `src/app/api/admin/fix-activity-logs/route.ts` - SUPPRIMÉ

### Suppression du code mort (rls-bypass)
- ✅ `src/lib/supabase/rls-bypass.ts` - SUPPRIMÉ
- ✅ `src/hooks/use-emergency-fetch.ts` - SUPPRIMÉ
- ✅ `src/components/emergency-data-loader.tsx` - SUPPRIMÉ

### Nettoyage des répertoires vides
- ✅ `src/app/api/admin/apply-migration/` - SUPPRIMÉ
- ✅ `src/app/api/admin/cleanup-triggers/` - SUPPRIMÉ
- ✅ `src/app/api/admin/fix-activity-logs/` - SUPPRIMÉ

### Mission Critique #2 : RGPD - Sécurisation du flux d'inscription Stripe
- ✅ Création table `pending_registrations` (migration SQL)
- ✅ Modification `create-checkout-session/route.ts` - Token-based auth
- ✅ Modification `webhook/route.ts` - Récupération sécurisée
- ✅ Gestion des tokens expirés (email recovery)

### Mission Critique #3 : Sécurisation IDOR (Dashboard uniquement)
- ✅ `src/app/api/sos/smart-search/route.ts` - Vérification company_id
- ✅ `src/actions/inspections-safe.ts` - Vérification IDOR sur validateInspection/rejectInspection
- ✅ Préservation workflow QR Code public (non modifié)

### Mission Critique #4 : Rate Limiting et Durcissement API
- ✅ `src/lib/security/rate-limit.ts` - Implémentation rate limiting en mémoire
- ✅ `src/lib/security/csrf.ts` - Protection CSRF pour routes sensibles
- ✅ `src/middleware.ts` - Rate limiting global sur toutes les routes API
- ✅ `src/app/api/stripe/create-checkout-session/route.ts` - CSRF + Rate limiting (5 req/heure)
- ✅ `src/app/api/stripe/webhook/route.ts` - Rate limiting (50 req/min)
- ✅ Protection cron jobs par secret Vercel

### Mission Qualité #5 : Tests E2E Playwright (Parcours Critiques)
- ✅ `e2e/critical-flows.spec.ts` - 3 tests critiques implémentés
  - Inscription complète avec paiement Stripe
  - Isolation multi-tenant (Company A vs Company B)
  - Workflow véhicule et alertes documents
- ✅ `e2e/fixtures/test-data.ts` - Données de test centralisées
- ✅ `e2e/global-setup.ts` - Configuration globale des tests
- ✅ `.env.test.example` - Template de configuration
- ✅ `.github/workflows/e2e-tests.yml` - CI GitHub Actions
- ✅ `e2e/README.md` - Documentation complète

---

## ⚠️ Rationale

### Faille #1 : Routes API Admin (CVSS 10.0)
Ces endpoints permettaient l'exécution SQL arbitraire sans authentification :
- **Vecteur d'attaque :** `curl -X POST https://fleetmaster.pro/api/admin/apply-migration`
- **Impact :** Exfiltration ou destruction complète de la base de données

### Faille #2 : Stockage mot de passe en clair dans Stripe (RGPD Article 32)
**Avant :** Le mot de passe utilisateur était stocké en clair dans les metadata Stripe
```typescript
// ❌ AVANT (Violation RGPD)
subscription_data: {
  metadata: {
    user_password: tempData.password, // Visible dans Dashboard Stripe!
  }
}
```

**Après :** Utilisation d'un token à usage unique
```typescript
// ✅ APRÈS (RGPD Compliant)
// 1. Stockage local dans pending_registrations (DB sécurisée)
// 2. Envoi du setup_token (UUID inoffensif) à Stripe
// 3. Récupération via token lors du webhook
```

### Faille #3 : IDOR sur SOS et Inspections (CVSS 8.1)
**Vulnérabilité :** Un utilisateur authentifié pouvait accéder aux données d'autres entreprises

**Avant :**
```typescript
// ❌ AVANT (IDOR - Aucune vérification d'appartenance)
const { data: vehicle } = await adminClient
  .from('vehicles')
  .select('*')
  .eq('id', vehicleId)  // N'importe quel ID accepté!
  .single();
```

**Après :**
```typescript
// ✅ APRÈS (IDOR sécurisé)
// 1. Récupérer le profil avec company_id
// 2. Vérifier que l'entité appartient à l'entreprise
if (vehicle.company_id !== profile.company_id) {
  return { error: 'Véhicule non trouvé', status: 404 }; // Même message pour ne pas fuiter l'info
}
```

**Distinction critique Dashboard vs QR Code :**
- **Dashboard (authentifié)** : Vérification company_id obligatoire
- **QR Code (public)** : Workflow préservé sans authentification pour les conducteurs

### Faille #4 : Absence de Rate Limiting (CVSS 5.3)
**Avant :** Les endpoints API acceptaient un nombre illimité de requêtes
- **Vecteur d'attaque :** Brute-force sur auth, spam de création de sessions, DoS
- **Impact :** Déni de service, consommation abusive de ressources

**Après :** Rate limiting adaptatif avec protection CSRF
```typescript
// ✅ Rate limiting par IP avec fenêtres glissantes
if (rateLimitExceeded) {
  return 429 Too Many Requests
}

// ✅ Protection CSRF sur les routes sensibles
if (!verifyOrigin(request)) {
  return 403 Forbidden
}
```

---

## 🔍 Analyse d'Impact Réalisée

### Mission #1
| Fichier | Dépendances trouvées | Utilisé dans l'UI ? | Action |
|---------|---------------------|---------------------|--------|
| apply-migration | 0 | ❌ Non | Suppression |
| cleanup-triggers | 0 | ❌ Non | Suppression |
| fix-activity-logs | 0 | ❌ Non | Suppression |
| rls-bypass.ts | 1 (use-emergency-fetch.ts) | ❌ Non (code mort) | Suppression |
| use-emergency-fetch.ts | 1 (emergency-data-loader.tsx) | ❌ Non (code mort) | Suppression |
| emergency-data-loader.tsx | 0 | ❌ Non | Suppression |

### Mission #2
| Fichier | Changement | Impact Utilisateur |
|---------|-----------|-------------------|
| `create-checkout-session/route.ts` | Token-based | Aucun (transparent) |
| `webhook/route.ts` | Récupération via DB | Aucun (transparent) |
| `sql/migrations/` | Nouvelle table | Aucun (backend) |

### Mission #3
| Fichier | Changement | Workflow impacté |
|---------|-----------|------------------|
| `api/sos/smart-search/route.ts` | +Vérification company_id | Dashboard SOS uniquement |
| `actions/inspections-safe.ts` | +Vérification IDOR sur validate/reject | Dashboard inspections |
| QR Code submission | ❌ NON MODIFIÉ | Workflow public préservé |

### Mission #4
| Fichier | Changement | Impact Utilisateur |
|---------|-----------|-------------------|
| `middleware.ts` | Rate limiting global | Blocage après 100 req/min par IP |
| `api/stripe/create-checkout-session` | CSRF + Rate limit (5/h) | Message après 5 tentatives |
| `api/stripe/webhook` | Rate limit (50/min) | Aucun (usage interne Stripe) |
| `api/cron/*` | Vérification secret Vercel | Sécurité renforcée |
| `lib/security/*` | Nouveau module sécurité | Aucun (backend) |

### Mission #5 (Qualité)
| Fichier | Type | Description |
|---------|------|-------------|
| `e2e/critical-flows.spec.ts` | Test E2E | 3 parcours critiques automatisés |
| `e2e/fixtures/test-data.ts` | Fixture | Données de test réutilisables |
| `.github/workflows/e2e-tests.yml` | CI/CD | Tests automatisés sur PR |

---

## ✅ Validation Post-Correction

| Test | Résultat |
|------|----------|
| `npm run build` | ✅ PASS (0 erreurs) |
| Recherche références restantes | ✅ Aucune trouvée |
| Routes dashboard fonctionnelles | ⏳ À vérifier manuellement |
| Création véhicule | ⏳ À vérifier manuellement |
| Page inscription Stripe | ⏳ À vérifier manuellement |
| Build après modifications RGPD | ✅ PASS |
| Build après corrections IDOR | ✅ PASS |
| Build après rate limiting | ✅ PASS |
| Configuration Playwright | ✅ OK |
| Tests E2E critiques | ⏳ À configurer manuellement |

---

## 🔐 Actions Manuelles Requises (IMPORTANT)

### 1. Appliquer la Migration SQL
```sql
-- Exécuter dans Supabase Dashboard → SQL Editor
-- Fichier : sql/migrations/20260222_create_pending_registrations.sql
```

### 2. Régénérer la clé Service Role Supabase
```
Supabase Dashboard → Project Settings → API →
Service Role Key → Regenerate
```

### 3. Mettre à jour les variables d'environnement Vercel
```
Vercel Dashboard → Project Settings → Environment Variables →
SUPABASE_SERVICE_ROLE_KEY → Update value
```

### 4. Redéployer l'application
```
Vercel Dashboard → Deployments → Redeploy Latest
```

### 5. Vérification fonctionnelle rapide (checklist)
- [ ] Page `/dashboard/vehicles` s'affiche correctement
- [ ] Page `/dashboard/drivers` s'affiche correctement
- [ ] Création d'un véhicule fonctionne
- [ ] Navigation dashboard sans erreur 500
- [ ] Page d'inscription Stripe charge correctement
- [ ] **NOUVEAU** : Inscription complète (test avec carte 4242 4242 4242 4242)
- [ ] **NOUVEAU** : Vérifier dans Stripe Dashboard (mode test) qu'aucun password n'apparaît
- [ ] **NOUVEAU** : SOS smart-search fonctionne depuis le dashboard
- [ ] **NOUVEAU** : Validation d'inspection depuis le dashboard fonctionne

### 6. Nettoyage des anciennes metadata Stripe (si applicable)
Si des inscriptions ont eu lieu AVANT cette correction :
```
Stripe Dashboard → Customers → [Sélectionner chaque customer] →
Supprimer la metadata "user_password" si présente
```

### 7. Test de sécurité IDOR (optionnel mais recommandé)
```bash
# Tenter d'accéder à un véhicule d'une autre entreprise
# Doit retourner 404 (pas 403, pour ne pas fuiter l'existence)
curl -X POST https://fleetmaster.pro/api/sos/smart-search \
  -H "Authorization: Bearer TOKEN_USER_ENTREPRISE_A" \
  -d '{"vehicleId": "ID_VEHICULE_ENTREPRISE_B", "breakdownType": "mechanical"}'
# Réponse attendue : {"error": "Véhicule non trouvé"} - Status 404
```

### 8. Test de rate limiting (Mission #4)
```bash
# Test rate limiting checkout (doit bloquer après 5 requêtes)
for i in {1..6}; do
  curl -X POST https://fleetmaster.pro/api/stripe/create-checkout-session \
    -H "Content-Type: application/json" \
    -d '{"email":"test'$i'@example.com","planType":"essential"}'
  echo ""
done
# La 6ème doit retourner: 429 Too Many Requests

# Vérifier les headers de rate limit
curl -I https://fleetmaster.pro/api/auth/login
# Doit contenir: X-RateLimit-Limit, X-RateLimit-Remaining, X-RateLimit-Reset
```

### 9. Configuration des tests E2E (Mission #5)

#### a. Installer les navigateurs Playwright
```bash
npx playwright install
```

#### b. Créer le fichier de configuration
cp .env.test.example .env.test
# Éditer .env.test avec vos credentials
```

#### c. Créer les utilisateurs de test dans Supabase
```
Supabase Dashboard → Authentication → Users → New User

1. Company A:
   - Email: company-a@test.fleetmaster.local
   - Password: CompanyA123!
   - Créer entreprise "Company A Test"
   - Abonnement actif requis

2. Company B:
   - Email: company-b@test.fleetmaster.local
   - Password: CompanyB123!
   - Créer entreprise "Company B Test"
   - Abonnement actif requis
```

#### d. Lancer les tests
```bash
# Tests critiques uniquement
npm run test:e2e:critical

# Mode visuel (pour déboguer)
npm run test:e2e:headed

# Interface graphique
npm run test:e2e:ui
```

---

## 📅 Dates de correction
- **2026-02-22** - Suppression des 6 fichiers vulnérables (Mission #1)
- **2026-02-22** - Migration RGPD du flux d'inscription (Mission #2)
- **2026-02-23** - Sécurisation IDOR Dashboard (Mission #3)
- **2026-02-23** - Rate Limiting et Durcissement API (Mission #4)
- **2026-02-23** - Tests E2E Playwright (Mission #5)

## 👤 Responsable
Kimi Code CLI - Agent de sécurité

## 📝 Notes
- Les migrations SQL doivent désormais être gérées via Supabase CLI ou le dashboard Supabase
- Les opérations de maintenance doivent être effectuées par des utilisateurs authentifiés avec rôle SUPERADMIN
- Aucune régression fonctionnelle attendue (tous les fichiers supprimés étaient du code mort)
- Le flux d'inscription Stripe est maintenant **RGPD Article 32 compliant**
- Les accès IDOR sont maintenant sécurisés tout en préservant le workflow QR Code public
- Le rate limiting est implémenté en mémoire (stateless) - acceptable pour Vercel mais à migrer vers Redis pour la production à grande échelle

## 📚 Documentation Additionnelle
- `RGPD_MIGRATION.md` - Guide complet de la migration RGPD
- `ANALYSIS_SECURITY_ROUTES.md` - Analyse d'impact détaillée (Mission #1)
- `SECURITY_RATE_LIMITING.md` - Guide du rate limiting et protection API (Mission #4)
