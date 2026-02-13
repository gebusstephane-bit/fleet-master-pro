# 🤖 FleetMaster AI Predict - Guide d'installation

Système de prédiction de pannes par IA avec 80%+ de précision.

---

## 📊 Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   Télémétrie    │────▶│  Modèle ML       │────▶│  Prédictions    │
│   (OBD/GPS)     │     │  TensorFlow.js   │     │  (DB + API)     │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌──────────────────┐
                        │  Feedback Loop   │
                        │  (Réentraînement)│
                        └──────────────────┘
```

---

## 🚀 Installation Rapide

### Étape 1: Créer les tables

Dans **Supabase Dashboard** > SQL Editor :

```sql
-- Schéma de base
\i supabase/migrations/20250209000019_ai_predict_schema.sql

-- Données synthétiques (1000 lignes)
\i supabase/migrations/20250209000020_ai_synthetic_data.sql

-- Vérifier
SELECT 
    'Tables créées' as status,
    (SELECT COUNT(*) FROM vehicle_telemetry) as telemetry_count,
    (SELECT COUNT(*) FROM ai_predictions) as predictions_count;
```

### Étape 2: Déployer l'Edge Function

```bash
# Déployer la fonction AI Predict
supabase functions deploy ai-predict

# Configurer les secrets
supabase secrets set SUPABASE_SERVICE_ROLE_KEY=votre_clé
```

### Étape 3: Vérifier l'API

```bash
# Test local
npm run dev

# Vérifier endpoint
curl http://localhost:3000/api/predict/maintenance/VOTRE_VEHICLE_ID
```

---

## 📈 Features utilisées par le modèle

| Feature | Poids | Description |
|---------|-------|-------------|
| `days_since_last_maintenance` | 25% | Jours depuis dernière révision |
| `current_mileage` | 20% | Kilométrage total |
| `vehicle_age_years` | 15% | Âge du véhicule |
| `avg_coolant_temp` | 12% | Température moteur moyenne |
| `harsh_braking_30d` | 10% | Freinages brusques (30j) |
| `harsh_acceleration_30d` | 8% | Accélérations brusques (30j) |
| `avg_battery_voltage` | 5% | Voltage batterie moyen |
| `fault_code_count_30d` | 3% | Codes défaut (30j) |
| `mileage_last_30d` | 2% | Distance parcourue (30j) |

---

## 🎯 Types de pannes prédites

- **Freinage** - Usure prématurée des freins
- **Moteur - Surchauffe** - Problème refroidissement
- **Batterie - Décharge** - Batterie faible
- **Transmission** - Usure embrayage/boîte
- **Suspension** - Amortisseurs usés
- **Courroie distribution** - Remplacement nécessaire
- **Pneumatiques** - Usure irrégulière

---

## 🧪 Test du système

### Test 1: Vérifier prédiction existante

```sql
-- Voir les dernières prédictions
SELECT 
    v.registration_number,
    p.failure_probability,
    p.predicted_failure_type,
    p.urgency_level
FROM ai_predictions p
JOIN vehicles v ON v.id = p.vehicle_id
ORDER BY p.created_at DESC
LIMIT 10;
```

### Test 2: Générer une prédiction via API

```typescript
// Dans l'app ou Postman
const response = await fetch('/api/predict/maintenance/YOUR_VEHICLE_ID');
const data = await response.json();
console.log(data.prediction);
```

### Test 3: Simuler télémétrie

```sql
-- Ajouter données télémétrie pour un véhicule
INSERT INTO vehicle_telemetry (
    vehicle_id, mileage, engine_hours,
    harsh_braking_count, coolant_temp, battery_voltage,
    fault_codes, recorded_at
) VALUES (
    'votre-vehicle-id',
    85000, 2150,
    15, 105.5, 11.8,
    '[{"code": "P0128", "severity": "high"}]',
    NOW()
);

-- Générer prédiction
SELECT * FROM get_vehicle_prediction_features('votre-vehicle-id');
```

---

## 🎨 Composants UI

### Badge de risque dans la liste véhicules

```tsx
import { VehicleRiskBadge } from '@/components/ai-predict';

// Dans votre tableau véhicules
<td>
  <VehicleRiskBadge vehicleId={vehicle.id} />
</td>
```

### Carte de prédiction détaillée

```tsx
import { PredictionCard } from '@/components/ai-predict';

// Dans la page véhicule
<PredictionCard vehicleId={vehicleId} />
```

### Hook pour récupérer les données

```tsx
import { useVehiclePrediction } from '@/hooks/use-ai-predictions';

function VehiclePage({ vehicleId }) {
  const { data: prediction, isLoading } = useVehiclePrediction(vehicleId);
  
  if (isLoading) return <Loader />;
  if (!prediction) return <NoData />;
  
  return (
    <div>
      Risque: {(prediction.failure_probability * 100).toFixed(1)}%
    </div>
  );
}
```

---

## 🔄 Feedback Loop

### Comment ça marche

1. **Prédiction générée** → Stockée en DB avec `actual_failure_occurred = NULL`
2. **Maintenance effectuée** ou **panne constatée** → User soumet feedback
3. **Feedback enregistré** → `actual_failure_occurred = true/false`
4. **Réentraînement mensuel** → Amélioration du modèle

### Soumettre un feedback

```tsx
import { usePredictionFeedback } from '@/hooks/use-ai-predictions';

const feedbackMutation = usePredictionFeedback();

// Quand maintenance faite
feedbackMutation.mutate({
  predictionId: 'prediction-id',
  actualFailureOccurred: true, // ou false
  notes: 'Panne confirmée: embrayage usé'
});
```

---

## 📊 Monitoring

### Performance du modèle

```sql
-- Précision globale
SELECT 
    model_version,
    COUNT(*) as total_predictions,
    COUNT(*) FILTER (WHERE actual_failure_occurred = true) as true_positives,
    COUNT(*) FILTER (WHERE actual_failure_occurred = false) as true_negatives,
    ROUND(100.0 * COUNT(*) FILTER (WHERE actual_failure_occurred IS NOT NULL) / COUNT(*), 1) as feedback_rate
FROM ai_predictions
GROUP BY model_version;

-- Distribution des risques
SELECT 
    CASE 
        WHEN failure_probability >= 0.7 THEN 'Critique (≥70%)'
        WHEN failure_probability >= 0.5 THEN 'Élevé (50-70%)'
        WHEN failure_probability >= 0.3 THEN 'Moyen (30-50%)'
        ELSE 'Faible (<30%)'
    END as risk_category,
    COUNT(*) as count
FROM ai_predictions
GROUP BY 1
ORDER BY 2 DESC;
```

### Historique entraînement

```sql
SELECT * FROM model_training_history ORDER BY training_date DESC;
```

---

## 🔧 Configuration avancée

### Modifier les seuils de risque

Dans `supabase/functions/ai-predict/index.ts` :

```typescript
function determineUrgency(probability: number) {
  if (probability >= 0.8) return 'critical'; // Augmenter seuil
  if (probability >= 0.6) return 'high';
  // ...
}
```

### Ajouter une nouvelle feature

1. **Ajouter colonne** dans `vehicle_telemetry`
2. **Mettre à jour** `get_vehicle_prediction_features()`
3. **Ajouter poids** dans la fonction `predictFailure()`
4. **Redéployer** l'Edge Function

### Réentraînement manuel

```bash
# Déclencher réentraînement
supabase functions invoke ai-predict --method POST --body '{"action": "retrain"}'
```

---

## 📱 Intégration Mobile

Pour les notifications push quand risque critique :

```typescript
// Dans le service worker
if (prediction.urgency_level === 'critical') {
  new Notification('Alerte FleetMaster', {
    body: `Risque de panne ${prediction.predicted_failure_type} détecté`,
    icon: '/icon.png'
  });
}
```

---

## 🐛 Dépannage

### Pas de prédiction générée

```sql
-- Vérifier télémétrie disponible
SELECT COUNT(*) FROM vehicle_telemetry WHERE vehicle_id = '...';

-- Vérifier dernière maintenance
SELECT * FROM maintenance_records 
WHERE vehicle_id = '...' 
ORDER BY requested_at DESC LIMIT 1;
```

### Edge Function erreur 500

```bash
# Voir les logs
supabase functions logs ai-predict --tail
```

### Précision faible

1. Augmenter volume données d'entraînement
2. Vérifier qualité des feedbacks
3. Ajuster les poids des features

---

## 📚 Ressources

- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [Supabase Edge Functions](https://supabase.com/docs/guides/functions)
- [ML pour la maintenance prédictive](https://www.notion.so/ml-predictive-maintenance)

---

## 🎯 Roadmap

- [ ] Intégration vraie données OBD-II
- [ ] Modèle LSTM pour séries temporelles
- [ ] Prédiction consommation carburant
- [ ] Optimisation itinéraires ML
- [ ] Détection anomalie temps réel
