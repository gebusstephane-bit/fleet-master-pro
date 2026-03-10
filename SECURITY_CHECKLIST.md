# 🔐 Security Checklist - FleetMaster Pro

> **Document de référence pour la sécurité de l'application**
>
> Dernière mise à jour : 2025-01
> Responsable : Équipe DevSecOps

---

## 📋 Table des matières

1. [Secrets critiques](#secrets-critiques)
2. [Procédure de vérification avant déploiement](#procédure-de-vérification)
3. [Rotation des secrets](#rotation-des-secrets)
4. [Vérification Vercel](#vérification-vercel)
5. [Procédure en cas de compromission](#procédure-incident)
6. [Contacts d'urgence](#contacts-durgence)

---

## Secrets critiques

### 🔴 Niveau CRITIQUE (accès complet)

| Secret | Variable | Longueur min | Génération | Utilisation |
|--------|----------|--------------|------------|-------------|
| **SuperAdmin Setup** | `SUPERADMIN_SETUP_SECRET` | 64 caractères | `openssl rand -hex 32` | Création du SuperAdmin |
| **CRON_SECRET** | `CRON_SECRET` | 64 caractères | `openssl rand -hex 32` | Authentification des cron jobs |
| **JWT_SECRET** | `NEXT_PUBLIC_JWT_SECRET` | 64 caractères | `openssl rand -hex 32` | Signature des tokens JWT |

### 🟡 Niveau ÉLEVÉ (données sensibles)

| Secret | Variable | Utilisation |
|--------|----------|-------------|
| **Stripe Secret Key** | `STRIPE_SECRET_KEY` | Paiements (commence par `sk_live_`) |
| **Supabase Service Role** | `SUPERADMIN_SETUP_SECRET` | Accès admin base de données |
| **VAPID Private Key** | `VAPID_PRIVATE_KEY` | Notifications push |

### 🟢 Niveau STANDARD

| Secret | Variable | Utilisation |
|--------|----------|-------------|
| **Resend API Key** | `RESEND_API_KEY` | Envoi d'emails |
| **OpenAI API Key** | `OPENAI_API_KEY` | Fonctionnalités IA |
| **Sentry DSN** | `SENTRY_DSN` | Monitoring d'erreurs |

---

## Procédure de vérification

### ✅ Pré-déploiement (obligatoire)

```bash
# 1. Vérifier la longueur des secrets critiques
echo "SUPERADMIN_SETUP_SECRET: ${#SUPERADMIN_SETUP_SECRET} caractères"
echo "CRON_SECRET: ${#CRON_SECRET} caractères"

# Doit afficher 64 pour chaque (32 bytes hex = 64 caractères)
```

### 🔍 Checklist avant chaque déploiement

- [ ] **Secrets** : Longueur ≥ 64 caractères pour les secrets critiques
- [ ] **SuperAdmin** : Le secret n'est PAS dans le code source
- [ ] **API Keys** : Utilisation de clés de production (pas de `sk_test_` en prod)
- [ ] **HTTPS** : Tous les endpoints utilisent HTTPS
- [ ] **CORS** : Origines configurées correctement
- [ ] **Rate Limiting** : Redis Upstash est configuré
- [ ] **Sentry** : DSN configuré pour la production

### 🛠️ Commandes de vérification Vercel

```bash
# Lister toutes les variables d'environnement
vercel env ls

# Vérifier une variable spécifique
vercel env ls | grep SUPERADMIN_SETUP_SECRET

# Ajouter une variable en production
vercel env add SUPERADMIN_SETUP_SECRET production

# Supprimer une variable (rotation)
vercel env rm SUPERADMIN_SETUP_SECRET production
```

---

## Rotation des secrets

### 🔄 Fréquence recommandée

| Secret | Rotation | Action en cas de fuite |
|--------|----------|------------------------|
| `SUPERADMIN_SETUP_SECRET` | Tous les 90 jours | **Immédiate** |
| `CRON_SECRET` | Tous les 90 jours | **Immédiate** |
| `STRIPE_SECRET_KEY` | Tous les 180 jours | **Immédiate** |
| `SUPABASE_SERVICE_ROLE_KEY` | Tous les 180 jours | **Immédiate** |
| `RESEND_API_KEY` | Tous les 365 jours | Sous 24h |
| `OPENAI_API_KEY` | Tous les 365 jours | Sous 24h |

### 📋 Procédure de rotation

1. **Générer le nouveau secret**
   ```bash
   ./scripts/generate-secrets.sh
   ```

2. **Mettre à jour dans Vercel** (production d'abord)
   ```bash
   vercel env add NOM_DU_SECRET production
   ```

3. **Redéployer l'application**
   ```bash
   vercel --prod
   ```

4. **Vérifier le bon fonctionnement**
   - Test de connexion SuperAdmin
   - Test des cron jobs
   - Test des paiements Stripe

5. **Supprimer l'ancien secret** (après vérification)
   ```bash
   vercel env rm ANCIEN_SECRET production
   ```

---

## Vérification Vercel

### 🔍 Audit des variables d'environnement

```bash
# Export de toutes les variables (pour audit)
vercel env ls > env-audit-$(date +%Y%m%d).txt

# Vérifier les variables manquantes
./scripts/check-env.sh  # Si disponible
```

### 🚨 Alertes de sécurité à surveiller

1. **Dans Sentry** : Rechercher `Tentative accès admin non autorisée`
2. **Dans Vercel Logs** : Rechercher `Rate limit admin dépassé`
3. **Dans Supabase** : Audit des connexions auth

### 📊 Métriques de sécurité

| Métrique | Seuil d'alerte |
|----------|----------------|
| Tentatives auth échouées / IP | > 5 en 15 min |
| Tentatives admin échouées | > 3 en 1 heure |
| Erreurs 429 (rate limit) | > 100 / jour |
| Erreurs Sentry auth | > 10 / jour |

---

## Procédure incident

### 🚨 En cas de compromission d'un secret

#### 1. Immédiat (< 5 minutes)

- [ ] Identifier le secret compromis
- [ ] Révoquer immédiatement dans Vercel : `vercel env rm SECRET production`
- [ ] Notifier l'équipe sécurité

#### 2. Court terme (< 30 minutes)

- [ ] Générer un nouveau secret : `./scripts/generate-secrets.sh`
- [ ] Déployer le nouveau secret : `vercel env add SECRET production`
- [ ] Redéployer l'application : `vercel --prod`
- [ ] Vérifier les logs d'accès suspects

#### 3. Analyse (< 24 heures)

- [ ] Audit des accès dans Supabase
- [ ] Audit des logs Vercel
- [ ] Recherche dans Sentry d'erreurs liées
- [ ] Identifier la source de la fuite

#### 4. Documentation

- [ ] Remplir le rapport d'incident
- [ ] Mettre à jour cette checklist si nécessaire
- [ ] Planifier une revue de sécurité

### 📝 Template rapport d'incident

```markdown
## Incident Sécurité - [DATE]

### Secret compromis
- Nom : SUPERADMIN_SETUP_SECRET
- Date de détection : 
- Source de la fuite : 

### Actions prises
- [ ] Secret révoqué : [heure]
- [ ] Nouveau secret généré : [heure]
- [ ] Redéploiement effectué : [heure]

### Impact
- Données potentiellement accédées :
- Comptes affectés :
- Actions correctives :

### Leçons apprises
- 
```

---

## Contacts d'urgence

| Rôle | Contact | Disponibilité |
|------|---------|---------------|
| **Responsable Sécurité** | security@fleet-master.fr | 24/7 |
| **Lead DevOps** | devops@fleet-master.fr | Lundi-Vendredi 9h-19h |
| **Vercel Support** | support@vercel.com | 24/7 (Premium) |
| **Supabase Support** | support@supabase.io | 24/7 (Pro) |
| **Stripe Support** | support@stripe.com | 24/7 |

---

## Scripts utiles

### Génération des secrets

```bash
# Générer tous les secrets
./scripts/generate-secrets.sh

# Générer un secret unique
openssl rand -hex 32
```

### Vérification de force

```bash
# Vérifier la longueur d'un secret
echo -n "VotreSecret" | wc -c

# Doit retourner ≥ 64 pour les secrets critiques
```

### Test des endpoints admin

```bash
# Test avec secret valide (remplacez YOUR_SECRET)
curl -X POST https://fleet-master.fr/api/admin/create-superadmin \
  -H "X-Setup-Secret: YOUR_SECRET"

# Test avec secret invalide (doit retourner 401)
curl -X POST https://fleet-master.fr/api/admin/create-superadmin \
  -H "X-Setup-Secret: invalid_secret" \
  -w "HTTP Status: %{http_code}\n"
```

---

## Références

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Vercel Security Best Practices](https://vercel.com/docs/concepts/edge-network/security)
- [Supabase Security](https://supabase.com/docs/guides/security)
- [Node.js crypto.timingSafeEqual](https://nodejs.org/api/crypto.html#cryptotimingsafeequala-b)

---

**⚠️  Attention : Ce document est confidentiel. Ne le partagez pas avec des personnes extérieures à l'équipe.**

*Pour toute question : security@fleet-master.fr*
