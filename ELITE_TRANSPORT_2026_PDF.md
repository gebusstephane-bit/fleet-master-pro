# 🚀 Elite Transport 2026 — Carnet d'Entretien PDF

## Vue d'ensemble

Générateur de PDF **Dashboard Premium** pour le carnet d'entretien numérique des véhicules de flotte. Transforme une liste de données brute en un document professionnel digne d'une application iPad moderne.

## ✨ Caractéristiques

### Design System "Safe Fleet"
- **Header bleu nuit** (#0D1B2A) sur toute la largeur
- **Immatriculation en gros** avec VIN en petit
- **Logo FleetMaster Pro** avec pastille de statut ACTIF verte

### Grille de Conformité (4 Cards)
- **Contrôle Technique** — avec barre de statut colorée
- **Tachygraphe** — date et badge OK/Alerte
- **Assurance** — visuellement regroupée
- **Certificat ATP** — affiché uniquement si activité frigorifique

**Logique de badges:**
- ✅ **OK** (vert) si date > 30 jours
- ⚠️ **Alerte** (orange) si "Non renseigné"
- 🔴 **Danger** (rouge) si expiré ou < 30 jours

### Tableau Maintenance Premium
- **Alternance de gris** (#F8F9FA) pour les lignes
- **Montants alignés à droite**, **toujours en gras**
- **Police plus grande** (10pt) si montant > 500€
- **Badges colorés** par type d'intervention

### Bloc Énergie (Visualisation)
- **Barres de progression horizontales** pour chaque carburant
- **Icônes de jauges** à la fin des barres
- **Total général** en pied de section
- Support: Diesel, AdBlue, GNR, Essence, GNV

### Footer Certification
- Ligne de séparation fine
- **"Certifié conforme DREAL — Signature numérique ID: [UNIQUE]"**
- **Numérotation** "Page X sur Y"
- Date de génération centrée

## 📁 Structure du Code

```
src/lib/export/
├── carnet-pdf-generator.ts           # Générateur principal (Elite)
├── carnet-pdf-generator-classic.ts   # Version classique (backup)
├── carnet-pdf-generator-elite.ts     # Version Elite complète
├── carnet-pdf-generator.example.ts   # Exemple d'utilisation
└── formatters.ts                     # Utilitaires de formatage
```

## 🔧 API

### Fonction Principale

```typescript
import { generateCarnetPDF, VehicleCarnetData } from '@/lib/export/carnet-pdf-generator';

const pdfBuffer = await generateCarnetPDF(data);
```

### Interface des Données

```typescript
interface VehicleCarnetData {
  vehicle: {
    id: string;
    registration_number: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    type?: string | null;
    fuel_type?: string | null;
    vin?: string | null;
    mileage?: number | null;
    status: string;
    insurance_expiry?: string | null;
    technical_control_expiry?: string | null;
    tachy_control_expiry?: string | null;
    atp_expiry?: string | null;
  };
  company: {
    name: string;
    siret?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    email?: string | null;
  };
  maintenances: MaintenanceEntry[];
  inspections: InspectionEntry[];
  fuelRecords: FuelEntry[];
  activities?: string[];
}
```

## 🎨 Fonctions de Dessin (Modulaires)

### `drawHeader(page, fonts, data)`
Dessine le bandeau supérieur "Safe Fleet" avec:
- Fond bleu nuit (#0D1B2A)
- Immatriculation en 22pt bold
- VIN en 9pt
- Logo FleetMaster Pro
- Pastille ACTIF verte

### `drawComplianceGrid(page, fonts, data, startY)`
Crée la grille de 4 cards de conformité:
- Bordures légères
- Barre d'accentuation colorée
- Badges OK/Alerte

### `drawMaintenanceTable(page, fonts, maintenances, startY)`
Génère le tableau des interventions:
- Header bleu nuit
- Lignes alternées gris/blanc
- Montants en gras, alignés droite
- Ligne de total

### `drawEnergySection(page, fonts, fuelRecords, startY)`
Visualise les consommations:
- Barres de progression
- Labels colorés par type
- Total général

### `drawFooter(page, fonts, data, pageNum, totalPages, uniqueId)`
Ajoute le footer de certification DREAL.

## 🎯 Exemple de Test

```typescript
import { generateExample } from './carnet-pdf-generator.example';

// Génère un PDF de test
await generateExample();
```

## 📝 Contraintes Techniques Respectées

| Directive | Implémentation |
|-----------|----------------|
| `drawRectangle` pour sections | ✅ Utilisé partout |
| Polices StandardFonts | ✅ Helvetica, HelveticaBold, HelveticaOblique |
| Fonctions séparées | ✅ `drawHeader()`, `drawComplianceGrid()`, `drawMaintenanceTable()` |
| Badge OK si > 30j | ✅ Logique implémentée |
| Alerte orange si non renseigné | ✅ Logique implémentée |
| Montants alignés droite en gras | ✅ Spécification respectée |
| Barres de progression énergie | ✅ Avec icônes de jauges |
| Footer DREAL + ID unique | ✅ Signature numérique |
| Numérotation Page X/Y | ✅ Implémentée |

## 🔄 Migration depuis l'ancienne version

L'API reste **100% compatible**. Il suffit de remplacer l'import:

```typescript
// Avant
import { generateCarnetPDF } from '@/lib/export/carnet-pdf-generator-classic';

// Après (nouveau design Elite)
import { generateCarnetPDF } from '@/lib/export/carnet-pdf-generator';
```

Le fichier `carnet-pdf-generator.ts` contient maintenant la version Elite.
L'ancienne version est conservée dans `carnet-pdf-generator-classic.ts`.

## 🖼️ Rendu Visuel Attendu

```
┌─────────────────────────────────────────────────────────────┐
│  AB-123-CD          FleetMaster Pro              [ACTIF]    │  ← Header bleu nuit
│  VIN: VF1...                                                │
├─────────────────────────────────────────────────────────────┤
│  CONFORMITÉ RÉGLEMENTAIRE                                   │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐           │
│  │CT       │ │TACHY    │ │ASSURANCE│ │ATP      │           │  ← 4 Cards
│  │12/08/26 │ │10/09/26 │ │15/12/26 │ │05/11/26 │           │
│  │[OK +120j]│ │[OK +90j]│ │[OK +210j]│ │[OK +150j]│         │
│  └─────────┘ └─────────┘ └─────────┘ └─────────┘           │
├─────────────────────────────────────────────────────────────┤
│  HISTORIQUE DES MAINTENANCES                                │
│  ┌────┬────────┬─────────────┬────────────┬────────┐       │
│  │DATE│ TYPE   │ DESCRIPTION │ EFFECTUÉ   │  COÛT  │       │  ← Tableau
│  ├────┼────────┼─────────────┼────────────┼────────┤       │     premium
│  │... │Prevent.│ Vidange...  │ Garage...  │ 320 EUR│       │
│  │... │Correct.│ Freins...   │ Auto...    │ 580 EUR│ ← gras
│  └────┴────────┴─────────────┴────────────┴────────┘       │
│  TOTAL MAINTENANCES:                              1 320 EUR │
├─────────────────────────────────────────────────────────────┤
│  CONSOMMATION ÉNERGÉTIQUE                                   │
│  Diesel  ████████████████████●        430,00 EUR (325,5 L)  │  ← Jauges
│  AdBlue  █████●                        85,50 EUR (52,0 L)   │
│  TOTAL CARBURANTS:                                515,50 EUR│
├─────────────────────────────────────────────────────────────┤
│  Certifié conforme DREAL — Signature ID: FM-123456789...    │  ← Footer
│  Généré le 06/03/2026              Page 1 sur 1             │
└─────────────────────────────────────────────────────────────┘
```

## 🛠️ Dépendances

```json
{
  "pdf-lib": "^1.x",
  "@types/node": "^20.x"
}
```

## 📄 Licence

Ce générateur PDF est propriétaire de FleetMaster Pro.
Conforme aux normes DREAL pour la traçabilité des véhicules de transport.
