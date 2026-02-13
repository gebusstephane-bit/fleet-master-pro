# ⏰ Configuration des Notifications Automatiques (Cron Jobs)

Ce guide explique comment configurer les notifications automatiques pour FleetMaster Pro.

---

## 📋 Vue d'ensemble

Les cron jobs vérifient automatiquement :

| Type | Fréquence | Seuils d'alerte |
|------|-----------|-----------------|
| **Maintenances** | Tous les jours à 8h | 7j, 3j, 1j avant + retard |
| **Documents** | Tous les jours à 9h | 30j, 15j, 7j, 1j avant + expiré |

---

## 🚀 Installation

### Étape 1: Exécuter le fichier SQL

Dans **Supabase Dashboard** > SQL Editor :

```sql
\i supabase/migrations/20250209000018_cron_notifications.sql
```

Ou copie-colle le contenu de `supabase/migrations/20250209000018_cron_notifications.sql`

### Étape 2: Vérifier l'installation

```sql
-- Voir les cron jobs actifs
SELECT * FROM cron.job;

-- Voir les exécutions récentes
SELECT * FROM cron.job_run_details 
ORDER BY start_time DESC 
LIMIT 10;
```

---

## 🧪 Test immédiat

### Test 1: Vérifier maintenances manuellement

```sql
-- Exécuter la fonction manuellement
SELECT check_maintenance_due();

-- Voir les notifications créées
SELECT * FROM notifications 
ORDER BY created_at DESC 
LIMIT 10;
```

### Test 2: Vérifier documents manuellement

```sql
-- Exécuter la fonction manuellement
SELECT check_document_expiry();

-- Voir les notifications créées
SELECT * FROM notifications 
WHERE type LIKE 'document_%'
ORDER BY created_at DESC 
LIMIT 10;
```

### Test 3: Créer une maintenance test

```sql
-- Créer une maintenance avec échéance dans 3 jours
INSERT INTO maintenance_records (
    vehicle_id,
    type,
    requested_at,
    rdv_date,
    status,
    estimated_cost
) VALUES (
    (SELECT id FROM vehicles LIMIT 1),  -- Premier véhicule
    'PREVENTIVE',
    NOW(),
    CURRENT_DATE + INTERVAL '3 days',  -- Dans 3 jours
    'RDV_PRIS',
    150.00
);

-- Déclencher la vérification
SELECT check_maintenance_due();

-- Vérifier la notification créée
SELECT * FROM notifications WHERE type = 'maintenance_due';
```

---

## ⚙️ Configuration avancée

### Modifier l'heure des notifications

```sql
-- Changer l'heure de vérification des maintenances (ex: 14h)
SELECT cron.unschedule('check-maintenance-daily');
SELECT cron.schedule(
    'check-maintenance-daily',
    '0 14 * * *',  -- Tous les jours à 14h00
    'SELECT check_maintenance_due()'
);
```

### Désactiver temporairement

```sql
-- Désactiver les notifications de maintenance
SELECT cron.unschedule('check-maintenance-daily');

-- Réactiver
SELECT cron.schedule(
    'check-maintenance-daily',
    '0 8 * * *',
    'SELECT check_maintenance_due()'
);
```

### Vérifier les logs

```sql
-- Voir les dernières exécutions
SELECT 
    jobid,
    jobname,
    status,
    start_time,
    end_time,
    error_message
FROM cron.job_run_details 
WHERE jobname = 'check-maintenance-daily'
ORDER BY start_time DESC 
LIMIT 5;
```

---

## 📧 Intégration Email

Les notifications créées dans la base sont automatiquement envoyées par email si :

1. **L'utilisateur a activé les emails** :
   ```sql
   SELECT email_enabled FROM notification_preferences WHERE user_id = 'uuid-user';
   ```

2. **Le type de notification est autorisé** :
   ```sql
   SELECT maintenance_due_email FROM notification_preferences WHERE user_id = 'uuid-user';
   ```

3. **La limite de rate limiting n'est pas atteinte** (10 emails/24h)

### Envoi manuel des emails

Pour l'instant, les emails sont envoyés via l'Edge Function. Pour déclencher un envoi :

```bash
# Déployer la Edge Function
supabase functions deploy notifications

# Invoquer manuellement
curl -X POST https://votre-projet.supabase.co/functions/v1/notifications \
  -H "Authorization: Bearer ANON_KEY" \
  -H "Content-Type: application/json" \
  -d '{"action": "check_maintenance"}'
```

---

## 🔧 Dépannage

### Problème: "extension pg_cron not found"

```sql
-- Activer l'extension
CREATE EXTENSION pg_cron;

-- Si erreur de permissions, contacter Supabase support
-- ou utiliser la méthode alternative avec Edge Functions
```

### Problème: Aucune notification créée

```sql
-- Vérifier que les données existent
SELECT COUNT(*) FROM maintenance_records WHERE next_service_date IS NOT NULL;
SELECT COUNT(*) FROM drivers WHERE license_expiry IS NOT NULL;
SELECT COUNT(*) FROM vehicles WHERE insurance_expiry IS NOT NULL;

-- Vérifier les profils
SELECT COUNT(*) FROM profiles WHERE role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC');
```

### Problème: Doublons de notifications

Le système inclut une déduplication automatique :
- Maintenance: max 1 notification/jour par maintenance
- Documents: max 1 notification/7jours par document

Pour forcer une nouvelle notification :
```sql
-- Supprimer l'ancienne notification
DELETE FROM notifications 
WHERE data->>'maintenance_id' = 'votre-id';
```

---

## 📊 Monitoring

### Dashboard SQL utiles

```sql
-- Nombre de notifications créées par jour
SELECT 
    DATE(created_at) as date,
    type,
    COUNT(*) as count
FROM notifications
GROUP BY DATE(created_at), type
ORDER BY date DESC;

-- Utilisateurs avec le plus de notifications
SELECT 
    p.email,
    COUNT(*) as notification_count
FROM notifications n
JOIN profiles p ON p.id = n.user_id
WHERE n.created_at > CURRENT_DATE - INTERVAL '7 days'
GROUP BY p.email
ORDER BY notification_count DESC;

-- Taux de lecture des notifications
SELECT 
    type,
    COUNT(*) as total,
    COUNT(read_at) as read_count,
    ROUND(100.0 * COUNT(read_at) / COUNT(*), 2) as read_rate
FROM notifications
GROUP BY type;
```

---

## 🎯 Prochaines étapes

1. **Vérifier les notifications** dans l'app : `/notifications`
2. **Configurer les préférences** par utilisateur
3. **Ajouter Firebase** pour les notifications push
4. **Créer des règles métier** personnalisées

---

## 📚 Ressources

- [Supabase Cron Docs](https://supabase.com/docs/guides/database/extensions/pg_cron)
- [PostgreSQL Cron Syntax](https://en.wikipedia.org/wiki/Cron)
- [FleetMaster Notifications](/NOTIFICATIONS_SETUP.md)
