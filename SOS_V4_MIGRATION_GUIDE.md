# SOS Garage V4 - Guide de Migration

## 🎯 Résumé

La V4 est une **refonte complète** qui simplifie drastiquement le système SOS :
- ❌ Plus de géocodage précis
- ❌ Plus de détection autoroute par IA
- ❌ Plus de JSONB complexes
- ✅ Logique métier simple et lisible
- ✅ 4 questions = 1 solution

---

## 📋 Étapes de migration

### 1. Appliquer la migration SQL

```bash
# Lancer la migration
supabase migration up

# Ou exécuter manuellement
supabase/migrations/20250217000000_sos_v4_simplified.sql
```

### 2. Vérifier les nouvelles tables

Les tables créées :
- `sos_providers` - Garages partenaires simplifiés
- `sos_emergency_contracts` - Contrats d'urgence
- `sos_history` - Historique des appels (optionnel)

### 3. Configurer vos prestataires

Allez dans **Settings > SOS & Dépannage** :

#### Onglet "Prestataires"
Ajoutez vos garages partenaires :
- Nom du garage
- Spécialité (pneu/mécanique/frigo/general)
- Téléphone standard et 24h (si applicable)
- Ville (texte libre, pas de GPS)
- Rayon d'intervention

#### Onglet "Contrats 24/24"
Ajoutez vos contrats d'urgence :
- Type de service (pneu_24h, assurance, etc.)
- Nom et numéro
- Instructions pour le chauffeur
- Conditions (distance, immobilisé ou non)

### 4. Tester le flux SOS

1. Allez sur `/sos`
2. Sélectionnez un véhicule
3. Répondez aux 4 questions
4. Vérifiez que la solution s'affiche correctement

---

## 🗺️ Logique métier (Arbre de décision)

```
ACCIDENT → Assurance (toujours)
HAYON → Direction (toujours)

PNEU + IMMOBILISÉ → Contrat pneu 24h → Assurance
PNEU + ROULANT → Garage partenaire → Google Maps

FRIGO → Contrat frigo → Garage partenaire → Google Maps

MÉCANIQUE + IMMOBILISÉ → Contrat méca → Assurance
MÉCANIQUE + ROULANT → Garage partenaire → Google Maps
```

---

## 📁 Fichiers créés/modifiés

### Nouveaux fichiers
```
supabase/migrations/20250217000000_sos_v4_simplified.sql
src/app/(dashboard)/settings/sos/page.tsx
src/app/(dashboard)/sos/page.tsx
src/app/api/sos/analyze-simple/route.ts
src/app/api/sos/providers/route.ts
src/app/api/sos/providers/[id]/route.ts
src/app/api/sos/contracts/route.ts
src/app/api/sos/contracts/[id]/route.ts
src/components/sos/v4/EmergencyContractCard.tsx
src/components/sos/v4/InsuranceCard.tsx
src/components/sos/v4/GarageCard.tsx
```

### Fichiers modifiés
```
src/app/(dashboard)/settings/page.tsx (ajout carte SOS)
```

### Fichiers obsolètes (conservés pour référence)
```
src/app/api/sos/smart-search/route.ts (V3.2)
src/components/sos/SOSGarageCard.tsx (V3.2)
src/components/sos/EmergencyRuleCard.tsx (V3.2)
...
```

---

## 🧪 Tests recommandés

### Scénario 1: Pneu immobilisé avec contrat
1. Créer un contrat `pneu_24h`
2. Aller sur `/sos`
3. Sélectionner "Pneu" + "Immobilisé"
4. ✅ Voir la carte Contrat 24/24

### Scénario 2: Pneu immobilisé sans contrat
1. Pas de contrat pneu configuré
2. Créer un contrat `assurance`
3. Aller sur `/sos`
4. Sélectionner "Pneu" + "Immobilisé"
5. ✅ Voir la carte Assurance

### Scénario 3: Hayon
1. Créer un contrat `direction`
2. Aller sur `/sos`
3. Sélectionner "Hayon"
4. ✅ Voir la carte Direction avec warning

### Scénario 4: Hors périmètre
1. Sélectionner "Plus de 50 km"
2. ✅ Voir recherche Google Maps

---

## 🔧 API Endpoints

### Nouveaux endpoints

```
GET    /api/sos/providers          Liste des prestataires
POST   /api/sos/providers          Créer un prestataire
PUT    /api/sos/providers/:id      Modifier un prestataire
DELETE /api/sos/providers/:id      Supprimer un prestataire

GET    /api/sos/contracts          Liste des contrats
POST   /api/sos/contracts          Créer un contrat
PUT    /api/sos/contracts/:id      Modifier un contrat
DELETE /api/sos/contracts/:id      Supprimer un contrat

POST   /api/sos/analyze-simple     Analyser une panne (V4)
```

### Endpoints conservés
```
GET /api/sos/vehicles              Liste des véhicules (inchangé)
```

---

## 💡 Conseils d'utilisation

### Pour les pneus
- Configurez un contrat `pneu_24h` si vous avez un contrat de dépannage
- Sinon, configurez au moins un contrat `assurance`

### Pour le frigo
- Configurez un contrat `frigo_assistance` avec les instructions spécifiques
- Exemple d'instructions : "NE COUPEZ PAS LE GROUPE FRIGO. Notez le code erreur."

### Pour les hayons
- Configurez un contrat `direction` avec warning clair
- Le chauffeur ne doit PAS chercher de garage extérieur

### Pour les accidents
- Configurez toujours un contrat `assurance`
- C'est la première chose affichée en cas d'accident

---

## 🆘 Support

En cas de problème :
1. Vérifier la console du navigateur (F12)
2. Vérifier les logs serveur
3. Vérifier les tables dans Supabase

La logique métier est dans `src/app/api/sos/analyze-simple/route.ts` - facilement lisible et modifiable.
