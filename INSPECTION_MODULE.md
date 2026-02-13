# Module Contrôle d'État (QR Code Inspection)

## Vue d'ensemble

Ce module permet aux conducteurs et gestionnaires de flotte de réaliser des contrôles d'état des véhicules via QR Code ou saisie manuelle de l'immatriculation.

## Fonctionnalités

### 1. Entrée d'inspection (`/inspection`)
- **Scanner QR Code**: Scanner HTML5 fonctionnel avec sélection caméra
- **Saisie manuelle**: Recherche par numéro d'immatriculation
- **Historique rapide**: Affichage des 5 dernières inspections

**Format des QR codes attendus:**
- `fleetmaster://vehicle/[id]` - Format recommandé
- `[id]` - ID du véhicule uniquement
- URL complète contenant l'ID en dernier segment

### 2. Formulaire d'inspection (`/inspection/[vehicleId]`)
Formulaire multi-étapes adaptatif selon le type de véhicule:

#### Étape 1: Informations générales
- Kilométrage compteur
- Lieu du contrôle
- Niveau de carburant (slider visuel)
- Niveau AdBlue (PL et PL Frigo uniquement)
- Niveau GNR groupe frigorifique (PL Frigo uniquement)

#### Étape 2: État de propreté
- Extérieur (carrosserie, vitres, rétroviseurs) - Note 1-5
- Intérieur (sièges, tableau de bord, sols) - Note 1-5
- Caisse/Soute (PL uniquement) - Note 1-5

#### Étape 3: Températures (PL Frigo uniquement)
- Compartiment C1 (zone avant/surgelés)
- Compartiment C2 (zone arrière/réfrigéré)

#### Étape 4: Validation
- Nom du conducteur
- Notes internes
- Récapitulatif

### 3. Liste des inspections (`/inspections`)
- Vue d'ensemble de toutes les inspections
- Filtres par statut (Tous, OK, Anomalies, Critiques)
- Recherche par plaque ou conducteur
- Statistiques rapides

### 4. Intégration Maintenance
Lorsqu'un défaut **CRITIQUE** est signalé lors d'une inspection:
- Une demande de maintenance est automatiquement créée
- Le statut passe à `DEMANDE_CREEE`
- La description inclut la référence au contrôle

## Types de véhicules supportés

| Type | Carburant | AdBlue | GNR | Caisse | Frigo |
|------|-----------|--------|-----|--------|-------|
| VOITURE | ✅ | ❌ | ❌ | ❌ | ❌ |
| FOURGON | ✅ | ❌ | ❌ | ❌ | ❌ |
| POIDS_LOURD | ✅ | ✅ | ❌ | ✅ | ❌ |
| POIDS_LOURD_FRIGO | ✅ | ✅ | ✅ | ✅ | ✅ |

## Schéma de base de données

### Table `vehicle_inspections`

```sql
- id: UUID PRIMARY KEY
- vehicle_id: UUID REFERENCES vehicles
- company_id: UUID REFERENCES companies
- created_by: UUID REFERENCES profiles
- mileage: INTEGER (kilométrage)
- fuel_level: INTEGER (0-100%)
- adblue_level: INTEGER (0-100%, nullable)
- gnr_level: INTEGER (0-100%, nullable)
- cleanliness_exterior: INTEGER (1-5)
- cleanliness_interior: INTEGER (1-5)
- cleanliness_cargo_area: INTEGER (1-5, nullable)
- compartment_c1_temp: DECIMAL (°C, nullable)
- compartment_c2_temp: DECIMAL (°C, nullable)
- tires_condition: JSONB (état des 5 pneus)
- reported_defects: JSONB (tableau de défauts)
- photos: TEXT[] (URLs des photos)
- driver_name: TEXT
- driver_signature: TEXT (base64)
- inspector_notes: TEXT
- location: TEXT
- status: ENUM (PENDING, COMPLETED, ISSUES_FOUND, CRITICAL_ISSUES)
- created_at: TIMESTAMPTZ
- updated_at: TIMESTAMPTZ
```

### Types enum

```sql
inspection_status: PENDING, COMPLETED, ISSUES_FOUND, CRITICAL_ISSUES
defect_severity: MINEUR, MAJEUR, CRITIQUE
defect_category: MECANIQUE, ELECTRIQUE, CARROSSERIE, PNEUMATIQUE, PROPRETE, AUTRE
```

## Installation

### 1. Exécuter le script SQL

```bash
# Dans l'éditeur SQL Supabase, exécuter:
supabase/migrations/20250208000000_create_inspections.sql
```

### 2. Vérifier les dépendances

Le module utilise les dépendances existantes:
- `@tanstack/react-query` - Hooks de données
- `lucide-react` - Icônes
- `html5-qrcode` - Scanner QR Code
- Composants shadcn/ui existants

```bash
npm install html5-qrcode
```

### 3. Navigation

Le lien "Inspections" est automatiquement ajouté dans la sidebar.

## Workflow utilisateur

### Pour le conducteur:
1. Se rendre sur `/inspection`
2. Scanner le QR code du véhicule OU entrer la plaque manuellement
3. Remplir le formulaire multi-étapes
4. Signer et valider
5. Recevoir une confirmation avec le récapitulatif

### Pour le gestionnaire:
1. Consulter `/inspections` pour voir tous les contrôles
2. Filtrer par statut pour identifier les problèmes
3. Cliquer sur une inspection pour voir les détails
4. Si défauts critiques, une maintenance est automatiquement créée

## API Endpoints

### Actions serveur (`src/actions/inspections.ts`)

- `createInspection(data: InspectionData)` - Créer une inspection
- `getInspectionsByVehicle(vehicleId: string)` - Inspections d'un véhicule
- `getRecentInspections(companyId: string, limit?: number)` - Inspections récentes
- `getInspectionById(inspectionId: string)` - Détail d'une inspection
- `findVehicleByPlate(plateNumber: string)` - Recherche par plaque

### API Routes (`src/app/api/vehicles/`)

- `GET /api/vehicles` - Liste des véhicules
- `GET /api/vehicles/[id]` - Détail d'un véhicule
- `PUT /api/vehicles/[id]` - Mise à jour
- `DELETE /api/vehicles/[id]` - Suppression

## Hooks React

### `useVehicle(vehicleId: string)`
Récupère un véhicule par son ID.

```typescript
const { data: vehicle, isLoading } = useVehicle(vehicleId);
```

### `useVehicles(companyId?: string)`
Récupère tous les véhicules d'une entreprise.

```typescript
const { data: vehicles } = useVehicles(companyId);
```

## Statuts d'inspection

| Statut | Description | Action automatique |
|--------|-------------|-------------------|
| COMPLETED | Tout est OK | Aucune |
| ISSUES_FOUND | Anomalies mineures | Aucune |
| CRITICAL_ISSUES | Problèmes critiques | Création maintenance |
| PENDING | En cours de remplissage | Aucune |

## Règles métier

1. **Kilométrage**: Doit être supérieur au kilométrage précédent
2. **Niveaux**: Tous les niveaux sont en pourcentage (0-100%)
3. **Propreté**: Notation de 1 (très sale) à 5 (très propre)
4. **Températures**: En degrés Celsius, décimales acceptées
5. **Signatures**: Optionnel mais recommandé pour validation
6. **Défauts critiques**: Déclenchent automatiquement une maintenance

## Améliorations futures

- [x] Scanner QR Code réel avec caméra (✅ Implémenté)
- [ ] Upload de photos des défauts
- [ ] Signature digitale canvas
- [ ] Inspection des pneus détaillée (pression, usure, dommages)
- [ ] Inspection du matériel de sécurité
- [ ] Rapports PDF des inspections
- [ ] Notifications en temps réel pour les défauts critiques
- [ ] Historique complet par véhicule
- [ ] Statistiques avancées et tableaux de bord

## Composants

### QRCodeScanner (`src/components/qr-code-scanner.tsx`)

Composant réutilisable pour scanner les QR codes.

**Props:**
- `onScan: (decodedText: string) => void` - Callback appelé quand un QR est détecté
- `onError?: (error: string) => void` - Callback appelé en cas d'erreur

**Fonctionnalités:**
- Détection automatique des caméras disponibles
- Sélection caméra arrière par défaut
- Overlay visuel avec coins et ligne de scan
- Gestion des permissions caméra
- Support format QR Code uniquement
