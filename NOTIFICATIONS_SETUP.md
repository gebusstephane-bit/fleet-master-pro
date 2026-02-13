# 🔔 Configuration du Système de Notifications FleetMaster

Ce guide explique comment configurer le système de notifications multi-canal.

---

## 📋 Prérequis

Votre `.env.local` doit contenir ces variables (déjà configurées) :

```env
# Resend Email
RESEND_API_KEY=re_xxxxxxxxxxxxxxxx
RESEND_FROM_EMAIL=contact@fleet-master.fr

# App URL (pour les liens dans les emails)
NEXT_PUBLIC_APP_URL=http://localhost:3000  # ou https://votredomaine.com
```

---

## 📧 Canal 1: Email (Resend)

### Étape 1: Créer un compte Resend
1. Allez sur https://resend.com
2. Créez un compte gratuit (6 000 emails/mois gratuits)
3. Vérifiez votre domaine OU utilisez `onboarding@resend.dev` pour tester

### Étape 2: Générer une API Key
1. Dashboard > API Keys > Create API Key
2. Choisissez "Sending access"
3. Copiez la clé dans `RESEND_API_KEY`

### Étape 3: Configurer l'expéditeur
**Option A - Test (rapide)** :
```env
RESEND_FROM_EMAIL=onboarding@resend.dev
```

**Option B - Domaine personnalisé (recommandé)** :
1. Dashboard > Domains > Add Domain
2. Suivez les instructions DNS
3. Une fois vérifié :
```env
RESEND_FROM_EMAIL=notifications@votredomaine.com
```

### Test Email
```bash
# Redémarrer le serveur pour prendre en compte les changements
npm run dev
```

Créez une maintenance avec une date d'échéance proche - vous devriez recevoir un email.

---

## 📱 Canal 2: Push Mobile (Firebase) - Optionnel

### Étape 1: Créer un projet Firebase
1. Allez sur https://console.firebase.google.com
2. Créez un nouveau projet
3. Ajoutez une application Web

### Étape 2: Télécharger la clé Service Account
1. Project Settings > Service Accounts
2. Cliquez "Generate new private key"
3. Téléchargez le fichier JSON

### Étape 3: Encoder en base64
```bash
# Linux/Mac
base64 -i serviceAccountKey.json | pbcopy

# Windows (PowerShell)
[Convert]::ToBase64String([IO.File]::ReadAllBytes("serviceAccountKey.json")) | Set-Clipboard
```

### Étape 4: Ajouter au .env
```env
FIREBASE_SERVICE_ACCOUNT_KEY=eyJ0eXBlIjoic2VydmljZV9hY2NvdW50I...
```

### Étape 5: Configurer le client web
Ajoutez dans votre app React :
```typescript
// Récupérer le token FCM
const messaging = getMessaging();
const token = await getToken(messaging, { vapidKey: 'VOTRE_VAPID_KEY' });

// Envoyer au serveur
await fetch('/api/push/register', {
  method: 'POST',
  body: JSON.stringify({ token })
});
```

---

## 🗄️ Configuration Base de Données

Les migrations ont déjà été créées. Exécutez-les dans Supabase Dashboard :

```sql
-- 1. Créer les tables
-- Copiez le contenu de:
-- - supabase/migrations/20250209000012_notifications.sql
-- - supabase/migrations/20250209000013_notification_tables.sql

-- 2. Activer Realtime sur la table notifications
BEGIN;
  -- Activer Realtime
  ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
  
  -- Vérifier
  SELECT * FROM pg_publication_tables WHERE tablename = 'notifications';
COMMIT;
```

---

## ⚙️ Configuration Edge Functions (Supabase)

Déployez la fonction de traitement des notifications :

```bash
# Installer Supabase CLI si pas déjà fait
npm install -g supabase

# Se connecter
supabase login

# Déployer la fonction
supabase functions deploy notifications

# Configurer les secrets
supabase secrets set RESEND_API_KEY=votre_clé
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=votre_clé_service
```

### Créer les cron jobs
Dans Supabase Dashboard > Database > Cron Jobs :

```sql
-- Vérifier les maintenances (tous les jours à 8h)
SELECT cron.schedule(
  'check-maintenance',
  '0 8 * * *',
  $$ 
    SELECT net.http_post(
      url:='https://votre-projet.supabase.co/functions/v1/notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer votre_anon_key"}'::jsonb,
      body:='{"action": "check_maintenance"}'::jsonb
    );
  $$
);

-- Vérifier les documents (tous les jours à 9h)
SELECT cron.schedule(
  'check-documents',
  '0 9 * * *',
  $$ 
    SELECT net.http_post(
      url:='https://votre-projet.supabase.co/functions/v1/notifications',
      headers:='{"Content-Type": "application/json"}'::jsonb,
      body:='{"action": "check_documents"}'::jsonb
    );
  $$
);
```

---

## 🧪 Test du Système

### Test 1: Notification In-App
1. Ouvrez l'application dans 2 onglets
2. Créez une maintenance depuis un onglet
3. Vérifiez que la notification apparaît en temps réel sur l'autre

### Test 2: Email
1. Assurez-vous que `EMAIL_NOTIFICATIONS_ENABLED=true`
2. Créez une maintenance avec `next_service_date` dans 3 jours
3. Exécutez la Edge Function manuellement :
```bash
curl -X POST https://votre-projet.supabase.co/functions/v1/notifications \
  -H "Content-Type: application/json" \
  -d '{"action": "check_maintenance"}'
```
4. Vérifiez votre boîte mail

### Test 3: Préférences
1. Allez sur `/notifications`
2. Onglet "Préférences"
3. Désactivez les emails
4. Créez une maintenance - aucun email ne doit partir

---

## 🔒 Sécurité & Rate Limiting

Le système inclut ces protections :

| Limite | Valeur | Description |
|--------|--------|-------------|
| Emails/jour | 10/user | Prévention spam |
| Requêtes API | 10/min (IP) | Protection anonyme |
| Requêtes API | 100/min (user) | Protection authentifié |
| Notifications | Dédoublonnage | 1 notif/user/type/entité |

---

## 🐛 Dépannage

### Problème: Emails non envoyés
```bash
# Vérifier les logs Resend
# Dashboard Resend > Logs

# Vérifier les logs Supabase
# Dashboard > Edge Functions > notifications > Logs
```

### Problème: Realtime ne fonctionne pas
```sql
-- Vérifier que Realtime est actif
SELECT * FROM pg_publication_tables WHERE tablename = 'notifications';

-- Si vide, exécuter:
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
```

### Problème: Rate limit atteint
```sql
-- Vérifier les logs d'emails
SELECT user_id, COUNT(*) FROM email_logs 
WHERE sent_at > NOW() - INTERVAL '24 hours'
GROUP BY user_id;
```

---

## 📚 Ressources

- [Resend Documentation](https://resend.com/docs)
- [Firebase Cloud Messaging](https://firebase.google.com/docs/cloud-messaging)
- [Supabase Realtime](https://supabase.com/docs/guides/realtime)
- [Supabase Cron](https://supabase.com/docs/guides/database/extensions/pg_cron)
