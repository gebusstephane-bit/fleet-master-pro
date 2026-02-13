# Dashboard Beta Production - Setup Guide

## 🎯 Résumé des changements

Le dashboard a été complètement refondu pour afficher des **données réelles** depuis Supabase :

### ✅ Fonctionnalités implémentées

1. **4 KPIs** avec données réelles :
   - Véhicules (total, actifs, en maintenance, inactifs)
   - Chauffeurs (total, actifs)
   - Maintenances (urgentes < 7j, à venir < 30j, en cours)
   - Inspections (en attente, terminées ce mois)

2. **Alertes maintenance** - Maintenances prioritaires (< 30 jours)

3. **Inspections en attente** - Liste des inspections à compléter

4. **RDV programmés** - Maintenances planifiées dans les 60 jours

5. **Véhicules à risque IA** - Prédictions de pannes (probabilité > 30%)

6. **Activité récente** - Feed d'activité avec logs automatiques

7. **Actions rapides** - Boutons d'accès rapide

### 🗄️ Tables utilisées

| Table | Colonnes clés |
|-------|--------------|
| `vehicles` | id, company_id, registration_number, brand, model, status |
| `drivers` | id, company_id, first_name, last_name, status |
| `maintenance_records` | id, company_id, vehicle_id, type, status, service_date |
| `inspections` | id, company_id, vehicle_id, status, inspection_type, created_at |
| `ai_predictions` | id, vehicle_id, failure_probability, urgency_level |
| `activity_logs` | id, company_id, user_id, action_type, entity_name |

### 🔧 Fichiers créés/modifiés

**Server Actions** (`src/actions/dashboard-production.ts`):
- `getDashboardKPIs()` - Récupère tous les KPIs
- `getMaintenanceAlerts()` - Alertes maintenance
- `getPendingInspections()` - Inspections en attente
- `getScheduledAppointments()` - RDV programmés
- `getRiskVehicles()` - Véhicules à risque IA
- `getRecentActivity()` - Activité récente

**Composants** (`src/components/dashboard/`):
- `kpi-cards.tsx` - Cartes KPI (existant, modifié)
- `alert-banner.tsx` - Bannière alertes (existant)
- `pending-inspections.tsx` - Inspections en attente (nouveau)
- `scheduled-appointments.tsx` - RDV programmés (nouveau)
- `risk-vehicles.tsx` - Véhicules à risque IA (nouveau)
- `activity-feed.tsx` - Feed activité (existant)
- `quick-actions.tsx` - Actions rapides (existant)

**Page Dashboard** (`src/app/(dashboard)/dashboard/page.tsx`):
- Intègre tous les composants
- Gère les chargements et erreurs

## 🚀 Installation

### 1. Exécuter la migration SQL

Dans le SQL Editor de Supabase, exécutez :

```sql
-- Migration: 20250210000002_dashboard_final.sql
-- (copier le contenu du fichier supabase/migrations/20250210000002_dashboard_final.sql)
```

Cela créera :
- La table `activity_logs` avec triggers automatiques
- Les colonnes manquantes dans `ai_predictions`
- Des données de test pour les prédictions IA

### 2. Vérifier les données

Exécutez ces requêtes SQL pour vérifier que vos données existent :

```sql
-- Vérifier les véhicules
SELECT COUNT(*) as total, 
       COUNT(CASE WHEN status = 'active' THEN 1 END) as actifs
FROM vehicles 
WHERE company_id = 'VOTRE_COMPANY_ID';

-- Vérifier les chauffeurs
SELECT COUNT(*) FROM drivers WHERE company_id = 'VOTRE_COMPANY_ID';

-- Vérifier les maintenances
SELECT COUNT(*) FROM maintenance_records 
WHERE company_id = 'VOTRE_COMPANY_ID' 
AND status IN ('scheduled', 'in_progress');

-- Vérifier les inspections en attente
SELECT COUNT(*) FROM inspections 
WHERE company_id = 'VOTRE_COMPANY_ID' 
AND status = 'pending';

-- Vérifier les prédictions IA
SELECT * FROM ai_predictions 
WHERE failure_probability > 0.3 
ORDER BY failure_probability DESC;
```

### 3. Redémarrer le serveur Next.js

```bash
npm run dev
```

Puis faites **Ctrl + Shift + R** (hard reload) sur la page Dashboard.

## 🐛 Dépannage

### Problème: "0" affiché partout

**Cause probable** : Les Server Actions ne trouvent pas le `company_id` de l'utilisateur.

**Solution** :
1. Vérifiez que l'utilisateur a un profil dans la table `profiles` avec un `company_id` défini
2. Vérifiez que les données (véhicules, etc.) ont le même `company_id`

```sql
-- Vérifier le profil utilisateur
SELECT id, email, company_id FROM profiles 
WHERE id = 'ID_UTILISATEUR';

-- Vérifier les véhicules
SELECT id, registration_number, company_id FROM vehicles 
WHERE company_id = 'COMPANY_ID_DU_PROFILE';
```

### Problème: Les inspections/maintenances ne s'affichent pas

**Cause probable** : Mauvais statut dans la base de données.

**Vérifier les statuts** :
```sql
-- Inspections
SELECT DISTINCT status FROM inspections;
-- Doit contenir 'pending' pour les inspections en attente

-- Maintenances
SELECT DISTINCT status FROM maintenance_records;
-- Doit contenir 'scheduled', 'in_progress', 'completed'
```

### Problème: Les prédictions IA ne s'affichent pas

**Solution** :
```sql
-- Vérifier si la table existe
SELECT * FROM ai_predictions LIMIT 1;

-- Si vide, exécuter la migration 20250210000002_dashboard_final.sql
-- qui génère des données de test
```

### Problème: L'activité récente est vide

**Normal** : Les logs sont créés automatiquement pour les nouvelles actions.
Pour ajouter des logs historiques :

```sql
-- Insérer un log manuellement
INSERT INTO activity_logs (company_id, user_id, action_type, entity_type, entity_name, description)
VALUES (
    'VOTRE_COMPANY_ID',
    'VOTRE_USER_ID',
    'VEHICLE_CREATED',
    'vehicle',
    'AA-123-AA (Renault Master)',
    'Véhicule ajouté pour test'
);
```

## 📊 Structure des statuts attendus

### Vehicles.status
- `active` - Véhicule actif
- `inactive` - Inactif
- `maintenance` - En maintenance
- `retired` - Retiré du service

### Drivers.status
- `active` - Actif
- `inactive` - Inactif
- `on_leave` - En congé
- `suspended` - Suspendu

### Maintenance_records.status
- `scheduled` - Planifié
- `in_progress` - En cours
- `completed` - Terminé
- `cancelled` - Annulé

### Inspections.status
- `pending` - En attente
- `completed` - Terminé

## 🔍 Debugging

Les logs sont visibles dans la console du serveur Next.js. Recherchez les messages :
- `getDashboardKPIs:`
- `getMaintenanceAlerts:`
- `getUserCompanyId:`

## ✅ Vérification finale

Une fois tout configuré, le dashboard doit afficher :
1. ✅ 4 KPIs avec vos vraies données
2. ✅ Alertes maintenance (si maintenances < 30j)
3. ✅ Inspections en attente (si status = 'pending')
4. ✅ RDV programmés (si maintenances futures)
5. ✅ Véhicules à risque IA (si prédictions avec probabilité > 30%)
6. ✅ Activité récente (avec logs automatiques)
7. ✅ Actions rapides

---

**Build OK** : `npm run build` doit réussir sans erreurs.
