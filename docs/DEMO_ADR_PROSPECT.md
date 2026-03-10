# 🎯 Démonstration Prospect ADR

Ce guide explique comment démontrer au prospect la gestion automatique des échéances ADR.

## Prérequis

- Migration DB appliquée (`20260307_add_transport_activities.sql`)
- Seed des règles de conformité (`seed_compliance_rules.sql`)
- Build OK (`npm run build` pass)

## 🚀 Scénario de démo (3 minutes)

### Étape 1: Sélectionner un véhicule test

```sql
-- Choisir un PL existant
SELECT id, registration_number, type, company_id 
FROM vehicles 
WHERE type = 'POIDS_LOURD' 
LIMIT 1;
```

### Étape 2: Assigner l'activité ADR

```sql
-- Assigner l'activité ADR_COLIS au véhicule
INSERT INTO vehicle_activity_assignments (vehicle_id, activity, assigned_by, start_date, notes)
VALUES (
  'VEHICLE_ID_ICI',  -- Remplacer par l'ID du véhicule choisi
  'ADR_COLIS',
  'USER_ID_ADMIN',   -- Votre user ID
  CURRENT_DATE,
  'Démonstration prospect ADR'
);
```

### Étape 3: Vérifier les échéances dans le dashboard

Accéder au dashboard véhicule et constater:

1. **Nouvelle section "Documents réglementaires"** affichant:
   - ✅ Contrôle Technique (échéance existante)
   - ✅ Chronotachygraphe (échéance existante)
   - 🆕 **Agrément ADR Véhicule** (calculé à +12 mois)
   - 🆕 **Contrôle Équipement ADR** (calculé à +12 mois)

2. **Liste de l'équipement ADR requis** visible:
   - Valise ADR complète
   - Panneaux orange (2)
   - Gilets jaunes (1 par personne)
   - Cônes de signalisation (2)
   - Lampes torches antidéflagrantes
   - Protection oculaire
   - Gants de protection
   - Bottes de protection

### Étape 4: Montrer le calcul automatique

```typescript
// Code côté serveur (API route)
import { getVehicleComplianceDeadlines } from '@/lib/compliance';

const deadlines = await getVehicleComplianceDeadlines(vehicle, companyId, supabase);

// Le prospect voit que le système a AUTOMATIQUEMENT calculé:
// - L'échéance ADR à 12 mois (règle compliance_rules)
// - La liste d'équipement requise
// - Le statut (OK/WARNING/CRITICAL/EXPIRED)
```

## 📊 Messages clés pour le prospect

### 1. Automatisation
> "Plus besoin de gérer manuellement les échéances ADR. Dès que vous assignez l'activité 'ADR' à un véhicule, le système calcule automatiquement toutes les échéances."

### 2. Conformité
> "La liste de l'équipement ADR obligatoire est intégrée. Plus d'oubli lors des contrôles."

### 3. Alertes proactives
> "Le système alerte 30 jours avant expiration (configurable). Plus de mauvaise surprise lors d'un contrôle routier."

### 4. Traçabilité
> "Historique complet des activités par véhicule. Si vous changez d'activité, l'historique est conservé."

## 🎬 Script de démo pas à pas

```
1. "Voici votre parc actuel avec des véhicules standards."
   → Montrer dashboard avec CT/TACHY uniquement

2. "Maintenant, imaginons que ce PL passe en transport ADR."
   → Assigner ADR_COLIS en direct (SQL ou UI)

3. "Le système recalcule automatiquement."
   → Rafraîchir dashboard
   → Pointer les nouvelles lignes "Agrément ADR" et "Équipement ADR"

4. "Vous voyez l'équipement requis qui s'affiche."
   → Déplier la liste

5. "Et si vous changez d'activité plus tard..."
   → Insérer une nouvelle activité avec end_date sur l'ancienne
   → Montrer que l'historique est conservé
```

## 🧹 Nettoyage post-démo

```sql
-- Supprimer l'assignation de test
DELETE FROM vehicle_activity_assignments 
WHERE vehicle_id = 'VEHICLE_ID_ICI' 
  AND notes = 'Démonstration prospect ADR';
```

## 📞 Support technique

Si problème lors de la démo:

1. Vérifier que `compliance_rules` contient les règles ADR:
```sql
SELECT * FROM compliance_rules WHERE activity = 'ADR_COLIS';
```

2. Vérifier que le véhicule a bien l'activité assignée:
```sql
SELECT * FROM vehicle_activity_assignments 
WHERE vehicle_id = 'VEHICLE_ID_ICI' AND end_date IS NULL;
```

3. Vérifier les logs console pour erreurs Supabase
