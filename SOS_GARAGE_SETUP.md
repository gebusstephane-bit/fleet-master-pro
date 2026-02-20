# SOS Garage - Mes Prestataires

## Vue d'ensemble

Le module **SOS Garage** est un assistant d'urgence pour les pannes de véhicules qui utilise l'IA pour recommander automatiquement le meilleur garage partenaire en fonction de :
- La localisation de la panne
- Le type de véhicule (PL/VL) et spécificités (frigo)
- Le type de panne (moteur, frigo, pneu, etc.)
- Les spécialités des garages
- Le rayon d'intervention

## Fonctionnalités

### 1. Workflow en 3 étapes

1. **Sélection du véhicule** (`/sos/selection`)
   - Liste des véhicules actifs de l'entreprise
   - Détection automatique PL (camions/remorques) vs VL (voitures/vans)
   - Indicateur frigo si applicable

2. **Localisation et type de panne** (`/sos/localisation`)
   - Géolocalisation automatique ou saisie manuelle d'adresse
   - Sélection du type de panne :
     - 🔧 Moteur / Mécanique
     - ❄️ Frigo / Groupe froid
     - 🛞 Pneumatique / Crevaison
     - ⚡ Électrique / Batterie
     - 🚪 Carrosserie
     - ❓ Autre
   - Informations complémentaires (optionnel)

3. **Résultats IA** (`/sos/resultat`)
   - Top 3 des garages recommandés avec scores
   - Distance et temps estimé
   - Bouton d'appel direct
   - Explications de l'IA sur le choix

### 2. Gestion des prestataires (`/sos/parametres`)

Configuration des garages partenaires avec :
- **Coordonnées** : nom, téléphone, email, adresse
- **Types acceptés** : PL (Poids Lourd), VL (Véhicule Léger)
- **Spécialités** :
  - 24h/24 7j/7
  - Frigo / Groupe froid
  - Moteur / Mécanique
  - Pneumatique
  - Électrique
  - Carrosserie
- **Rayon d'intervention** : configurable par garage
- **Tonnage max** : pour les camions lourds
- **Priorité** : influence le classement IA (0-10)

### 3. Intelligence Artificielle

L'IA (OpenAI GPT-4o-mini) analyse selon :
- **40%** - Compatibilité type de panne / spécialité garage
- **40%** - Distance et temps d'intervention
- **20%** - Disponibilité 24/7 et priorité configurée

En cas d'indisponibilité du service IA, un fallback par distance est automatique.

## Base de données

### Tables créées (ZERO impact sur tables existantes)

```sql
-- user_service_providers : Garages partenaires
CREATE TABLE user_service_providers (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  name TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  address TEXT NOT NULL,
  city TEXT NOT NULL,
  lat FLOAT,
  lng FLOAT,
  vehicle_types_supported TEXT[], -- ['PL', 'VL']
  specialties TEXT[], -- ['24_7', 'FRIGO_CARRIER', 'MOTEUR', ...]
  max_tonnage INTEGER,
  intervention_radius_km INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW()
);

-- emergency_searches : Historique des recherches
CREATE TABLE emergency_searches (
  id UUID PRIMARY KEY,
  user_id UUID,
  vehicle_id UUID,
  breakdown_location_lat FLOAT,
  breakdown_location_lng FLOAT,
  breakdown_address TEXT,
  breakdown_type TEXT,
  recommended_provider_id UUID,
  ai_reasoning TEXT,
  distance_km FLOAT,
  estimated_time_minutes INTEGER,
  created_at TIMESTAMP DEFAULT NOW()
);
```

## API Routes

| Route | Méthode | Description |
|-------|---------|-------------|
| `/api/sos/vehicles` | GET | Liste des véhicules de l'utilisateur |
| `/api/sos/analyze` | POST | Analyse IA et recommandations |
| `/api/sos/contact` | POST | Initier contact avec un garage |
| `/api/sos/providers` | GET | Liste des prestataires |
| `/api/sos/providers` | POST | Ajouter un prestataire |
| `/api/sos/providers/[id]` | DELETE | Supprimer un prestataire |

## Configuration requise

### Variables d'environnement

```bash
# Déjà requises pour le projet
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Requise pour l'IA
OPENAI_API_KEY=sk-...
```

### Installation du package

```bash
npm install openai
```

## Intégration dans la sidebar

Le lien SOS Garage apparaît dans la sidebar avec :
- Couleur rouge distinctive
- Icône sirène (Siren)
- Style hover spécifique
- Indicateur actif lors de la navigation

## Utilisation

### Premier démarrage

1. Aller dans `/sos/parametres`
2. Ajouter au moins un garage partenaire avec :
   - Coordonnées complètes
   - Types de véhicules acceptés
   - Spécialités
   - Rayon d'intervention
3. Tester le workflow SOS

### En cas de panne

1. Cliquer sur **SOS Garage** dans la sidebar
2. Sélectionner le véhicule en panne
3. Indiquer la localisation et type de panne
4. Contacter le garage recommandé par l'IA

## Sécurité

- Toutes les routes vérifient l'authentification
- Les véhicules sont vérifiés comme appartenant à l'utilisateur
- Les prestataires sont filtrés par `user_id`
- Les coordonnées GPS ne sont stockées que temporairement

## Fallbacks

| Situation | Comportement |
|-----------|--------------|
| 0 prestataire configuré | Message + lien vers paramètres |
| Aucun prestataire dans le rayon | Affichage du plus proche + warning |
| Service IA indisponible | Tri par distance uniquement |
| Géocodage échoue | Utilisation adresse texte |

## Prochaines améliorations possibles

- [ ] Envoi SMS au garage depuis l'app
- [ ] Partage de la position GPS en temps réel
- [ ] Historique des interventions par véhicule
- [ ] Notation des prestataires après intervention
- [ ] Intégration avec API dépanneur externe
- [ ] Mode "flotte" : gestion multi-pannes simultanées
