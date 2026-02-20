# SOS Garage V4 - Analyse et Plan de migration

## Résumé des changements

### Architecture V3.2 → V4

```
V3.2 (Complexe)                          V4 (Simplifié)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
emergency_rules (JSONB)        →    sos_emergency_contracts (simple)
  - applies_to_breakdown_types[]      - service_type TEXT
  - applies_if_immobilized BOOL       - for_distance TEXT
  - applies_on_highway BOOL           - for_immobilized BOOL
  - conditions JSON                   - (pas de JSON)

user_service_providers         →    sos_providers (simplifiée)
  - lat/lng précis                    - city TEXT (pas de GPS)
  - géocodage obligatoire             - max_distance_km
  - adresse complète                  - adresse texte libre

/smart-search (POST)           →    /analyze-simple (POST)
  - body: {coordinates, address}      - body: {distance_category}
  - géocodage côté serveur            - pas de géocodage
  - calcul distance Haversine         - distance déclarée par user
  - détection autoroute IA            - pas de détection auto

Composants UI (15+)            →    Composants UI (3 cartes)
  - HighwayEmergencyCard              - EmergencyContractCard
  - HighwaySwitch                     - InsuranceCard  
  - ImmobilizationSwitch              - GarageCard
  - LocationForm (géocodé)            - (supprimés)
  - etc.
```

## Tables SQL V4

### sos_providers (remplace user_service_providers)
```sql
- id, user_id
- name (ex: "Euromaster Metz")
- specialty (pneu|mecanique|frigo|general)
- phone_standard, phone_24h
- max_distance_km (rayon d'action)
- city (ville uniquement, pas de lat/lng)
- address (texte libre)
- is_active
```

### sos_emergency_contracts (nouvelle)
```sql
- id, user_id
- service_type (pneu_24h|frigo_assistance|mecanique_24h|assurance|direction)
- name (ex: "Euromaster Astreinte")
- phone_number
- contract_ref
- instructions (texte multi-lignes)
- for_distance (close|far|both) - close=<50km, far=>50km
- for_immobilized (true|false|null)
- priority, is_active
```

## Logique de Décision V4 (Arbre simplifié)

```
ENTRÉE: breakdown_type, distance_category, vehicle_state

1. ACCIDENT ?
   → Assurance (toujours)

2. HAYON ?
   → Direction (toujours)

3. PNEU + IMMOBILISÉ ?
   → Contrat pneu_24h (close/both) OU Assurance

4. PNEU + ROULANT ?
   → Garage specialty='pneu' (close)

5. FRIGO ?
   → Contrat frigo_assistance OU Recherche garage

6. MÉCANIQUE + IMMOBILISÉ ?
   → Contrat mecanique_24h OU Assurance

7. MÉCANIQUE + ROULANT ?
   → Garage specialty='mecanique' (close)

8. HORS PERIMÈTRE (far) ?
   → Contrat (far/both) OU Assurance OU Google Maps
```

## Interface V4 (4 questions)

```
┌─────────────────────────────────────────────┐
│ 1. Type de problème :                        │
│    [Pneu] [Méca] [Frigo] [Hayon] [Accident] │
├─────────────────────────────────────────────┤
│ 2. Distance du dépôt :                       │
│    [< 50 km] [> 50 km]                      │
├─────────────────────────────────────────────┤
│ 3. État du véhicule :                        │
│    [🟢 Roulant] [🔴 Immobilisé]             │
├─────────────────────────────────────────────┤
│ 4. Localisation (optionnel) :                │
│    [✏️ Ville ou indication : _______]       │
└─────────────────────────────────────────────┘
```

## Cartes de Résultat (3 types)

### Type A: Contrat 24/24 (Vert)
- Titre + numéro gros bouton
- Instructions texte libre
- Badge distance

### Type B: Assurance (Orange)
- Titre + numéro
- Message remorquage
- Référence contrat

### Type C: Garage (Bleu)
- Nom + ville
- Téléphone
- Distance estimée (basée sur la catégorie, pas GPS)
- Note si externe (Apify)

## API V4

```typescript
// POST /api/sos/analyze-simple
{
  vehicleId: string;
  breakdownType: 'pneu' | 'mecanique' | 'frigo' | 'hayon' | 'accident';
  distanceCategory: 'close' | 'far'; // <50km ou >50km
  vehicleState: 'rolling' | 'immobilized';
  location?: string; // texte libre, optionnel
}

// Response
{
  type: 'contract' | 'insurance' | 'garage_partner' | 'garage_external' | 'none';
  data: {
    name: string;
    phone: string;
    instructions?: string;
    contractRef?: string;
    // ... selon type
  };
  message?: string; // message contextuel
}
```

## Migration données V3.2 → V4

### Depuis emergency_rules
```sql
-- Les règles de type 'contract_24_7' → sos_emergency_contracts
-- Les règles de type 'insurance' → sos_emergency_contracts  
-- Les règles de type 'management' → sos_emergency_contracts
```

### Depuis user_service_providers
```sql
-- Migrer vers sos_providers en simplifiant:
-- - lat/lng → juste city
-- - intervention_radius_km → max_distance_km
-- - specialties ARRAY → specialty TEXT (premier élément)
```

## Livrables

1. ✅ `supabase/migrations/20250217_sos_v4_simplified.sql`
2. ✅ `src/app/(dashboard)/settings/sos/page.tsx`
3. ✅ `src/app/(dashboard)/sos/page.tsx` (nouvelle version)
4. ✅ `src/app/api/sos/analyze-simple/route.ts`
5. ✅ `src/components/sos/v4/` (nouveaux composants)
6. ✅ `SOS_V4_MIGRATION_GUIDE.md`
