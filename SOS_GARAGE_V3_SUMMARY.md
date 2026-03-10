# 🚨 SOS Garage V3 - Récapitulatif Implémentation

## ✅ Fonctionnalités implémentées

### 1. Logique Hiérarchique Intelligente

**NIVEAU 1 : Partenaires Internes** (🟢 Vert)
- Recherche dans `user_service_providers`
- Distance < 50km par défaut
- Compatible PL/VL selon le véhicule
- Badge "🛡️ Votre partenaire - Tarif négocié"

**NIVEAU 2 : Réseau Constructeur** (🟡 Jaune) 
- Recherche dynamique via **Apify** (Google Maps Scraper)
- Analyse IA avec **OpenAI GPT-4o-mini**
- Cache 6h pour limiter les coûts
- Badge "🔍 Réseau [Marque] - Vérifier tarif"
- Bouton "+ Ajouter à mes partenaires"

### 2. Détection Intelligente

| Type de panne | Stratégie de recherche |
|---------------|------------------------|
| Mécanique | Garage agréé [MARQUE_VÉHICULE] |
| Frigo | Réparateur agréé [MARQUE_FRIGO] (ou véhicule si pas de marque frigo) |
| Électrique | Garage électricité [MARQUE_VÉHICULE] |
| Pneu | Pneumatique dépannage [MARQUE_VÉHICULE] |
| Carrosserie | Carrosserie agréée [MARQUE_VÉHICULE] |

### 3. Architecture Technique

```
src/
├── lib/
│   ├── apify/
│   │   └── client.ts          # Client Apify pour Google Maps
│   └── openai/
│       └── garage-analyzer.ts # Analyse IA des garages
├── app/api/sos/
│   ├── smart-search/route.ts           # API principale hiérarchique
│   ├── add-external-to-partners/route.ts # Ajouter garage externe
│   └── mark-contacted/route.ts          # Marquer comme contacté
├── components/sos/
│   ├── InternalPartnerCard.tsx  # 🟢 Carte partenaire
│   ├── ExternalGarageCard.tsx   # 🟡 Carte externe
│   └── LocationForm.tsx         # Formulaire type de panne
└── app/(dashboard)/sos/
    ├── selection/page.tsx    # Écran 1: Choix véhicule
    ├── localisation/page.tsx # Écran 2: Type panne + GPS
    └── resultat/page.tsx     # Écran 3: Résultats
```

### 4. Tables Base de Données (Nouvelles)

```sql
-- user_service_providers (existante, enrichie)
- vehicle_brands TEXT[]
- frigo_brands TEXT[]
- contact_name TEXT
- contract_number TEXT

-- external_garages_cache (NOUVELLE)
- Cache des résultats Apify (6h)
- Évite de payer plusieurs fois la même recherche

-- emergency_searches (NOUVELLE)
- Historique complet des recherches
- Feedback post-intervention (score 1-5)
```

### 5. Coûts Estimés

| Service | Coût |
|---------|------|
| Apify | ~$5/1000 requêtes → ~1.50€/mois (avec cache 6h) |
| OpenAI GPT-4o-mini | ~$0.0006/appel → ~0.20€/mois |
| **Total** | **~1.70€/mois** pour 10 recherches/jour |

---

## 🚀 Procédure de démarrage

### 1. Exécuter la migration SQL

```bash
# Via Supabase SQL Editor, exécuter:
supabase/migrations/20250216000000_sos_garage_v3_external_search.sql
```

### 2. Vérifier les variables d'environnement

Dans `.env.local`, tu dois avoir:
```bash
OPENAI_API_KEY=your_openai_key_here
APIFY_API_TOKEN=your_apify_token_here
```

### 3. Installer les dépendances (si besoin)

```bash
npm install
```

### 4. Lancer le serveur

```bash
npm run dev
```

---

## 🧪 Scénarios de test

### Test 1 : Partenaire interne trouvé
1. Va sur `/sos/parametres`
2. Ajoute un garage proche de chez toi
3. Va sur `/sos` et lance une recherche
4. **Attendu** : Affichage 🟢 avec "Votre partenaire"

### Test 2 : Recherche externe (Niveau 2)
1. Supprime tous les partenaires ou met un rayon très petit
2. Lance une recherche avec un véhicule Audi/Mercedes
3. **Attendu** : Affichage 🟡 avec "Réseau [Marque]"

### Test 3 : Cache
1. Fais une recherche externe (Niveau 2)
2. Refais la même recherche immédiatement
3. **Attendu** : Badge "(résultats mis en cache)"

### Test 4 : Ajouter à mes partenaires
1. Sur un résultat externe (🟡)
2. Clique "+ Ajouter"
3. Vérifie dans `/sos/parametres` qu'il est ajouté

---

## ⚠️ IMPORTANT - LOCALHOST UNIQUEMENT

- ✅ Test en local (`npm run dev`)
- ❌ NE PAS déployer sur Vercel pour l'instant
- Tester complètement avant déploiement

---

## 📋 Checklist avant déploiement

- [ ] Migration SQL exécutée sur Supabase
- [ ] Clés API (OpenAI + Apify) configurées
- [ ] Test scénario 1 (partenaire interne) réussi
- [ ] Test scénario 2 (recherche externe) réussi
- [ ] Test scénario 3 (cache) réussi
- [ ] Test scénario 4 (ajout partenaire) réussi
- [ ] Coûts vérifiés (ne pas dépasser 5€/mois)
- [ ] Documentation utilisateur créée
