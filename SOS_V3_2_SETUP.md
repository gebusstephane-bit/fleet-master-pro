# SOS Garage V3.2 - Mise en place

## Résumé des changements

### Nouvelle architecture
- **Table remplacée**: `emergency_protocols` → `emergency_rules`
- **Logique**: Arbre de décision intelligent par type de panne
- **UI**: Composant unifié `SOSGarageCard` au lieu du workflow multi-page

### Nouveaux composants créés
1. `EmergencyRuleCard` - Affichage des règles (contrat, assurance, direction)
2. `HighwayEmergencyCard` - Urgence autoroute (priorité absolue)
3. `ManagementOnlyCard` - Contact direction uniquement
4. `ImmobilizationSwitch` - Indicateur véhicule immobilisé
5. `HighwaySwitch` - Indicateur autoroute
6. `VehicleSelect` - Sélection véhicule (version simplifiée)
7. `NoPartnerFallback` - Fallback quand aucun partenaire trouvé

### API modifiée
- `/api/sos/smart-search` - Nouvelle logique d'arbre de décision
- `/api/geocode` - Proxy Nominatim (déjà existant)

## Installation

### 1. Appliquer la migration SQL

```bash
# Lancer Supabase CLI
supabase migration up

# Ou exécuter manuellement le fichier:
supabase/migrations/20250216000400_sos_v3_2_emergency_rules.sql
```

### 2. Configurer les règles d'urgence

Dans Supabase, insérez des règles dans `emergency_rules`:

```sql
-- Exemple: Contrat Euromaster pneu 24/7
INSERT INTO emergency_rules (
  user_id, 
  name, 
  rule_type, 
  applies_to_breakdown_types, 
  applies_if_immobilized, 
  applies_on_highway,
  phone_number, 
  contract_reference,
  instructions,
  display_color,
  priority
) VALUES (
  'votre-user-id',
  'Euromaster Pneu 24/24',
  'contract_24_7',
  ARRAY['tire'],
  null,  -- s'applique quelle que soit la situation
  false, -- hors autoroute uniquement
  '06.12.34.56.78',
  'CTR-EURO-2024',
  '1. Indiquez votre position exacte\n2. Précisez le type de pneu (dimensions)\n3. Attendez l''intervention sur place',
  'green',
  0
);

-- Exemple: Direction pour problème hayon
INSERT INTO emergency_rules (
  user_id,
  name,
  rule_type,
  applies_to_breakdown_types,
  phone_number,
  instructions,
  display_color,
  priority
) VALUES (
  'votre-user-id',
  'Direction Technique',
  'management',
  ARRAY['tailgate'],
  '06.98.76.54.32',
  'Contacter la direction uniquement. Ne pas chercher de garage extérieur.',
  'blue',
  0
);
```

### 3. Types de règles disponibles

| Type | Description | Quand s'applique |
|------|-------------|------------------|
| `contract_24_7` | Contrat de dépannage 24h/24 | Panne couverte par contrat |
| `insurance` | Assurance | Quand pas de contrat spécifique |
| `management` | Direction | Hayon, cas particuliers |
| `highway_service` | Service autoroute | Autoroute + immobilisé |
| `garage_partner` | Garage partenaire | Recherche standard |

## Arbre de décision V3.2

```
1. Autoroute + Immobilisé ?
   └─> OUI: ALERTE ROUGE - Appeler 112 immédiatement

2. Type de panne ?
   
   ├─ PNEU ──────┬─ Contrat pneu ? → Afficher contrat
   │              └─ Immobilisé sans contrat ? → Assurance obligatoire
   │              └─ Roulant sans contrat ? → Recherche standard
   │
   ├─ HAYON ─────┬─ Contrat hayon ? → Afficher contrat
   │              └─ Pas de contrat ? → DIRECTION uniquement
   │
   ├─ FRIGO ─────┬─ Contrat frigo ? → Afficher contrat + instructions groupe
   │              └─ Pas de contrat ? → Recherche standard
   │
   ├─ ÉLECTRIQUE ┬─ Contrat ? → Afficher contrat
   │              └─ Pas de contrat ? → Recherche standard
   │
   ├─ CARROSSERIE → Recherche standard (non urgent)
   │
   └─ MÉCANIQUE ─┬─ Contrat ? → Afficher contrat
                  └─ Pas de contrat ? → Recherche standard

3. Recherche standard
   └─ Partenaires internes dans le rayon → Afficher
   └─ Aucun partenaire → Google Maps fallback
```

## Types de panne supportés

- `tire` - Pneumatique
- `mechanical` - Mécanique générale
- `frigo` - Groupe frigorifique
- `electric` - Électrique/batterie
- `bodywork` - Carrosserie
- `tailgate` - Hayon élévateur

## URL de test

La nouvelle interface V3.2 est accessible à:
```
http://localhost:3000/sos/v3
```

## Comportement attendu

### Cas 1: Pneu + Contrat Euromaster
- Affiche la carte contrat avec numéro 24/7
- Instructions de dépannage
- Option "Chercher quand même" pour bypass

### Cas 2: Pneu + Immobilisé + Pas de contrat
- Affiche carte assurance (si configurée)
- Warning: "Aucun contrat pneu configuré"
- Message: contactez votre assurance

### Cas 3: Hayon + Pas de contrat
- Affiche carte Direction
- Warning rouge: "Ne contactez pas de garage extérieur"
- Pas de bouton recherche

### Cas 4: Autoroute + Immobilisé
- Affiche carte URGENCE AUTOROUTE
- Instructions de sécurité en rouge
- Bouton appel 112 en grand
- Priorité absolue

## Dépannage

### Problème: "Aucun véhicule trouvé"
Vérifiez que la table `vehicles` contient des données avec les colonnes:
- `id`, `brand`, `model`, `type`, `registration_number`

### Problème: "Erreur lors de la recherche"
Vérifiez les logs console et:
1. La connexion Supabase
2. L'existence de la table `emergency_rules`
3. Les RLS policies

### Problème: Géocodage qui échoue
L'API Nominatim peut être lente. Vérifiez `/api/geocode`.

## Migration depuis V3.1

Si vous avez des données dans `emergency_protocols`:

```sql
-- Migrer les anciens protocoles vers les nouvelles règles
INSERT INTO emergency_rules (
  user_id,
  name,
  rule_type,
  applies_to_breakdown_types,
  phone_number,
  instructions,
  priority,
  is_active
)
SELECT 
  user_id,
  name,
  CASE 
    WHEN condition_type = 'always' THEN 'contract_24_7'
    WHEN condition_type = 'brand_specific' THEN 'contract_24_7'
    ELSE 'garage_partner'
  END,
  CASE 
    WHEN condition_value = 'tire' THEN ARRAY['tire']
    WHEN condition_value = 'mechanical' THEN ARRAY['mechanical']
    ELSE ARRAY['mechanical', 'tire', 'frigo', 'electric']
  END,
  phone_number,
  instructions,
  priority,
  true
FROM emergency_protocols
WHERE is_active = true;
```

## Roadmap V3.3 (futur)

- [ ] Détection automatique autoroute via API
- [ ] Notifications push au gestionnaire de flotte
- [ ] Historique des pannes par véhicule
- [ ] Intégration temps réel position GPS
- [ ] Chat avec le garage sélectionné
