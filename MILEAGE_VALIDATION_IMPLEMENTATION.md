# ✅ Validation du Kilométrage - Implémentation Complète

## 🎯 Objectif
Bloquer la saisie d'un plein si le kilométrage est inférieur au kilométrage actuel du véhicule (253,562 km dans le cas signalé).

---

## 🔒 Validation Côté Client (Immédiate)

### 1. Formulaire Multi-Carburant (QR Code)
**Fichiers modifiés :**
- `src/app/scan/[vehicleId]/fuel/page.tsx` - Récupère le kilométrage actuel du véhicule
- `src/components/scan/multi-fuel-form.tsx` - Passe le kilométrage au hook
- `src/hooks/useFuelSession.ts` - Valide le kilométrage en temps réel
- `src/components/scan/fuel-line.tsx` - Affiche l'erreur et le kilométrage de référence

**Comportement :**
- Affiche le kilométrage actuel du véhicule (ex: "Actuel: 253,562 km")
- L'input a un `min` égal au kilométrage actuel
- Message d'erreur immédiat si le kilométrage est trop bas
- Style visuel rouge en cas d'erreur

### 2. Formulaire Dashboard (FuelForm)
**Fichier modifié :** `src/components/fuel/fuel-form.tsx`

**Comportement :**
- Validation Zod dynamique avec `.refine()`
- Vérifie que `mileage_at_fill >= vehicle.mileage`
- Message d'erreur sous le champ : "Le kilométrage ne peut pas être inférieur au kilométrage actuel du véhicule"
- Affiche "Actuel: X km" à côté du label

---

## 🛡️ Validation Côté Serveur (Sécurité)

### Fonction SQL : `create_fuel_session`
**Fichier :** `sql/fix_kilometrage_validation.sql`

**Validations ajoutées :**
```sql
-- Validation contre le kilométrage du véhicule
IF v_mileage < v_vehicle_current_mileage THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Kilometrage saisi (125000) inferieur au kilometrage actuel du vehicule (253562). Impossible de revenir en arriere.',
    'code', 'MILEAGE_TOO_LOW'
  );
END IF;

-- Validation contre les pleins existants
IF v_mileage < v_max_existing_mileage THEN
  RETURN jsonb_build_object(
    'success', false, 
    'error', 'Kilometrage saisi (125000) inferieur au dernier plein enregistre (253562). Saisie impossible.',
    'code', 'MILEAGE_LOWER_THAN_PREVIOUS'
  );
END IF;
```

**Exception :** Le GNR (Gazole Non Routier) n'est pas soumis à cette validation car il alimente le groupe frigo, pas le moteur.

---

## 🚀 Déploiement

### Étape 1 : Déployer la fonction SQL
```bash
# Dans Supabase SQL Editor, exécuter :
sql/fix_kilometrage_validation.sql
```

### Étape 2 : Redémarrer l'application Next.js
```bash
npm run dev
# ou
npm run build && npm start
```

---

## 🧪 Tests

### Test 1 : Saisie invalide (doit être bloquée)
1. Ouvrir un formulaire de plein (QR ou Dashboard)
2. Sélectionner un véhicule avec kilométrage connu (ex: 253,562 km)
3. Saisir un kilométrage inférieur (ex: 125,000 km)
4. **Résultat attendu :** Message d'erreur immédiat, bouton désactivé

### Test 2 : Saisie valide (doit passer)
1. Saisir un kilométrage supérieur (ex: 254,000 km)
2. **Résultat attendu :** Aucune erreur, soumission possible

### Test 3 : GNR (doit passer sans kilométrage)
1. Sélectionner GNR comme carburant
2. **Résultat attendu :** Champ kilométrage désactivé, validation ignorée

---

## 📁 Fichiers Modifiés

```
src/
├── app/
│   └── scan/[vehicleId]/fuel/page.tsx      # + mileage dans la requête
├── components/
│   ├── fuel/fuel-form.tsx                  # Validation Zod dynamique
│   └── scan/
│       ├── fuel-line.tsx                   # Affichage erreur + ref km
│       └── multi-fuel-form.tsx             # Passe mileage au hook
├── hooks/
│   └── useFuelSession.ts                   # Validation mileage en temps réel
└── types/
    └── fuel.ts                             # (inchangé)

sql/
└── fix_kilometrage_validation.sql          # Validation SQL + fonction RPC
```

---

## 🎨 UI/UX - Ce qui change pour l'utilisateur

### Avant
- Champ kilométrage sans indication de référence
- Erreur uniquement après soumission (si détectée)
- Possible de saisir 125,000 km sur un véhicule à 253,562 km

### Après
- **Info visuelle :** "Actuel: 253,562 km" affiché à côté du label
- **Input contraint :** `min="253562"` sur le champ
- **Validation temps réel :** Erreur immédiate si valeur < référence
- **Style d'erreur :** Bordure rouge + message explicite
- **Bouton bloqué :** Impossible de valider tant que l'erreur persiste

---

## 🔐 Sécurité

| Couche | Protection |
|--------|------------|
| **Client** | Validation Zod + HTML5 min attribute |
| **Hook** | Validation en temps réel, bloque la soumission |
| **Serveur** | Fonction SQL avec vérification stricte |
| **DB** | Trigger optionnel (peut être ajouté) |

---

## ✅ Checklist de Validation

- [x] Validation côté client (formulaire dashboard)
- [x] Validation côté client (formulaire QR code multi-fuel)
- [x] Validation côté serveur (fonction SQL)
- [x] Affichage du kilométrage de référence
- [x] Message d'erreur explicite en français
- [x] Exception pour le GNR (pas de validation km)
- [x] TypeScript compile sans erreur
- [x] Gestion des valeurs NULL/undefined
