# Module de Conformité Réglementaire

Ce module gère le calcul des échéances réglementaires pour les véhicules avec support des activités spéciales (ADR, Frigo, etc.).

## 🎯 Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ZERO RÉGRESSION                          │
│                                                             │
│   Véhicule Legacy (sans activité)                          │
│           ↓                                                 │
│   mapLegacyToComplianceDeadlines()                         │
│           ↓                                                 │
│   CT (+1/2 ans), TACHY (+2 ans), ATP (+5 ans)              │
│   → IDENTIQUE à calculate-dates.ts                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Nouvelle assignation d'activité
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                    NOUVEAU SYSTÈME                          │
│                                                             │
│   Véhicule avec activité ADR/Frigo                         │
│           ↓                                                 │
│   getVehicleComplianceDeadlines()                          │
│           ↓                                                 │
│   compliance_rules → calculateDeadlinesByActivity()        │
│           ↓                                                 │
│   CT, TACHY, ADR_CERT (+12m), Équipement ADR...            │
└─────────────────────────────────────────────────────────────┘
```

## 📦 Usage

### Fonction principale (hybride)

```typescript
import { getVehicleComplianceDeadlines } from '@/lib/compliance';

const deadlines = await getVehicleComplianceDeadlines(vehicle, companyId, supabase);

// Résultat:
// [
//   { documentCode: 'CT', documentName: 'Contrôle Technique', expiryDate: '2025-03-15', daysLeft: 365, status: 'OK', ... },
//   { documentCode: 'ADR_CERT', documentName: 'Agrément ADR Véhicule', expiryDate: '2025-06-01', daysLeft: 90, status: 'WARNING', equipmentList: [...] },
// ]
```

### Calcul direct ADR (sans DB)

```typescript
import { calculateADRDeadlines } from '@/lib/compliance';

const adrDeadlines = calculateADRDeadlines(vehicle, lastCertDate, lastEquipmentCheck);
```

### Calcul direct Frigo (sans DB)

```typescript
import { calculateFrigoDeadlines } from '@/lib/compliance';

const frigoDeadlines = calculateFrigoDeadlines(vehicle, lastCalibrationDate);
```

## 🧪 Tests

```bash
# Tests unitaires
npm test -- src/lib/compliance/calculate-deadlines.test.ts

# Validation build TypeScript
npm run build
```

## 📋 Types principaux

```typescript
interface ComplianceDeadline {
  documentCode: string;      // 'CT', 'TACHY', 'ADR_CERT', etc.
  documentName: string;      // 'Contrôle Technique', 'Agrément ADR Véhicule'
  expiryDate: string;        // '2025-03-15'
  daysLeft: number;          // Jours jusqu'à expiration
  status: 'OK' | 'WARNING' | 'CRITICAL' | 'EXPIRED';
  isMandatory: boolean;
  equipmentList: string[] | null;  // Liste d'équipement si applicable
  lastDate: string | null;   // Dernière date connue
  frequencyMonths: number;   // Périodicité en mois
}

type TransportActivity = 
  | 'MARCHANDISES_GENERALES'
  | 'FRIGORIFIQUE'
  | 'ADR_COLIS'
  | 'ADR_CITERNE'
  | 'CONVOI_EXCEPTIONNEL'
  | 'BENNE_TRAVAUX_PUBLICS'
  | 'ANIMAUX_VIVANTS';
```

## 🔗 Tables DB

- `vehicle_activity_assignments` : Historique des activités par véhicule
- `compliance_rules` : Règles métier par activité
- `company_activities` : Activités autorisées par entreprise
- `vehicle_current_activity` (View) : Vue simplifiée de l'activité courante

## ✅ Validation des règles

### Test 1 - Véhicule Legacy (sans activité)
```typescript
const vehicle = { type: 'POIDS_LOURD', /* pas d'activité assignée */ };
const deadlines = await getVehicleComplianceDeadlines(vehicle, companyId, supabase);
// → CT: +1 an, TACHY: +2 ans, pas d'ADR
```

### Test 2 - Véhicule ADR
```typescript
// Assigner activité 'ADR_COLIS' dans vehicle_activity_assignments
const deadlines = await getVehicleComplianceDeadlines(vehicle, companyId, supabase);
// → CT: +1 an, TACHY: +2 ans, ADR_CERT: +12 mois, Équipement ADR listé
```

### Test 3 - Véhicule Frigo
```typescript
// Assigner activité 'FRIGORIFIQUE' dans vehicle_activity_assignments
const deadlines = await getVehicleComplianceDeadlines(vehicle, companyId, supabase);
// → CT: +1 an, TACHY: +2 ans, ATP: +36 mois, Étalonnage: +12 mois
```
