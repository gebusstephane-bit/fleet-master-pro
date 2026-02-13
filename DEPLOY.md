# 🚀 Guide de Déploiement - Fleet Master Pro

## ✅ ÉTAT ACTUEL

| Étape | Statut |
|-------|--------|
| Audit | ✅ Terminé - voir `AUDIT_REPORT.md` |
| Corrections | ✅ Types TypeScript fixés, middleware nettoyé |
| Git | ✅ Repository initialisé avec 4 commits |
| Build | ✅ Passe avec warnings mineurs |

---

## 📋 PRÉREQUIS

1. **Compte GitHub** : https://github.com/signup
2. **Compte Vercel** : https://vercel.com/signup (connexion avec GitHub recommandée)
3. **Variables d'environnement** : Prêtes dans `.env.local`

---

## 🌿 ÉTAPE 1 : Connexion à GitHub

### Option A - Interface graphique (Recommandé)
1. Ouvrir le projet dans VS Code
2. Cliquer sur l'icône "Source Control" (branche 🌿) dans la barre latérale
3. Cliquer sur "Publish to GitHub"
4. Suivre les instructions de connexion
5. Choisir "Publish to GitHub public repository"

### Option B - Ligne de commande
```powershell
# 1. Créer un repository sur GitHub d'abord (via l'interface web)
#    https://github.com/new
#    Nom: fleet-master-pro
#    Visibilité: Public ou Private

# 2. Connecter le repository local
git remote add origin https://github.com/VOTRE_USERNAME/fleet-master-pro.git

# 3. Push sur GitHub
git branch -M main
git push -u origin main
```

---

## 🚀 ÉTAPE 2 : Déploiement sur Vercel

### Méthode Automatique (Recommandée)
1. Aller sur https://vercel.com/new
2. Importer le repository GitHub `fleet-master-pro`
3. Vercel détectera automatiquement Next.js
4. Ajouter les variables d'environnement (voir liste ci-dessous)
5. Cliquer "Deploy"

### Variables d'Environnement à Configurer

Copier depuis `.env.local` et coller dans Vercel :

```bash
# APP
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app

# SUPABASE
NEXT_PUBLIC_SUPABASE_URL=https://xncpyxvklsfjrcxvdhtx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_j76_2sSDwi5TC2fP9xEvew_ki8CTtew
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# MAPBOX
NEXT_PUBLIC_MAPBOX_TOKEN=pk.eyJ1IjoiZ2Vic3RlcGgiLCJhIjoiY21sYWkwNHYxMGVwczNmcjRxczN3OHJhaCJ9...

# STRIPE (clés de production quand prêt)
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# EMAIL
RESEND_API_KEY=re_6wFNsy5E_3ExDchZLdRhbYKFvAU2RCB69
RESEND_FROM_EMAIL=onboarding@resend.dev

# NOTIFICATIONS
MAX_EMAILS_PER_DAY=10
NOTIFICATIONS_ENABLED=true
EMAIL_NOTIFICATIONS_ENABLED=true
PUSH_NOTIFICATIONS_ENABLED=false
```

---

## ⚙️ ÉTAPE 3 : Configuration Post-Déploiement

### 1. Configurer les URLs dans Supabase Auth
Aller sur https://app.supabase.com/project/_/auth/url-configuration

**Site URL** : `https://votre-domaine.vercel.app`

**Redirect URLs** :
```
https://votre-domaine.vercel.app/auth/callback
https://votre-domaine.vercel.app/login
```

### 2. Configurer le Webhook Stripe
Dans Stripe Dashboard → Developers → Webhooks → Add endpoint

**Endpoint URL** : `https://votre-domaine.vercel.app/api/stripe/webhook`

**Events à écouter** :
- `checkout.session.completed`
- `invoice.payment_succeeded`
- `invoice.payment_failed`
- `customer.subscription.deleted`
- `customer.subscription.updated`

Copier le **Signing secret** et l'ajouter dans Vercel : `STRIPE_WEBHOOK_SECRET`

### 3. Configurer Resend (Email)
1. Vérifier le domaine sur https://resend.com/domains
2. Ajouter les DNS records demandés
3. Mettre à jour `RESEND_FROM_EMAIL` avec votre domaine vérifié

---

## 🔒 ÉTAPE 4 : Sécurité Production

### 1. Activer TypeScript strict
Modifier `next.config.js` :
```javascript
module.exports = {
  eslint: {
    ignoreDuringBuilds: false, // ← Changer
  },
  typescript: {
    ignoreBuildErrors: false, // ← Changer
  },
  // ...
}
```

### 2. Vérifier les clés API
- ✅ Pas de clés dans le code
- ✅ Toutes les clés sont dans `.env.local`
- ✅ `.env.local` est dans `.gitignore`

### 3. Tester le SuperAdmin
Aller sur `https://votre-domaine.vercel.app/superadmin`
- Se connecter avec : `contact@fleet-master.fr` / `Emilie57`
- Si ça ne marche pas, vérifier que l'utilisateur existe dans Supabase Auth

---

## ✅ CHECKLIST PRÉ-LANCEMENT

- [ ] Build passe sans erreur : `npm run build`
- [ ] Connexion fonctionne
- [ ] Inscription fonctionne
- [ ] Dashboard s'affiche
- [ ] Création véhicule fonctionne
- [ ] Stripe checkout fonctionne (mode test)
- [ ] SuperAdmin accessible
- [ ] Responsive mobile OK
- [ ] Emails envoyés (vérifier dans Resend)

---

## 🆘 DÉPANNAGE

### Erreur "Build Failed"
1. Vérifier les logs Vercel
2. Vérifier que toutes les env vars sont définies
3. Relancer le build

### Erreur "Module not found"
```bash
# Local
npm install
npm run build
```

### Erreur 404 sur /superadmin
- Vérifier que `contact@fleet-master.fr` existe dans Supabase Auth
- Vérifier les logs middleware dans Vercel

### Webhook Stripe ne fonctionne pas
1. Vérifier `STRIPE_WEBHOOK_SECRET`
2. Tester avec : `stripe trigger checkout.session.completed`
3. Vérifier les logs Vercel Functions

---

## 📞 SUPPORT

En cas de problème :
1. Consulter `AUDIT_REPORT.md` pour les erreurs connues
2. Vérifier les logs Vercel (Runtime Logs)
3. Vérifier les logs Supabase (Logs Explorer)

---

**Dernière mise à jour** : 2026-02-13
