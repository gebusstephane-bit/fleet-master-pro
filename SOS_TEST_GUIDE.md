# 🧪 Guide de Test - Module SOS Garage

## Scénario de Test Complet

### Prérequis
- [ ] Serveur Next.js démarré (`npm run dev`)
- [ ] Connecté avec un compte utilisateur
- [ ] Au moins 1 véhicule créé dans la section Véhicules
- [ ] Clé OpenAI configurée dans `.env.local`

---

## Test 1 : Configuration des Prestataires

### Étape 1.1 - Accéder aux paramètres
1. Va sur http://localhost:3000/sos/parametres
2. **Résultat attendu** : Page s'affiche avec "0 Prestataires enregistrés"

### Étape 1.2 - Ajouter un garage
1. Clique sur **"Ajouter un prestataire"**
2. Remplis le formulaire :
   ```
   Nom : Garage Test Paris
   Téléphone : 01 23 45 67 89
   Email : test@garage.fr
   Adresse : 123 Avenue de la République
   Code postal : 75011
   Ville : Paris
   Types acceptés : ☑️ PL + ☑️ VL
   Spécialités : ☑️ 24h/24 + ☑️ Moteur + ☑️ Frigo
   Rayon d'intervention : 50 km
   Tonnage max : 44
   Priorité : 5
   ```
3. Clique **"Ajouter"**
4. **Résultat attendu** : Toast "Prestataire ajouté avec succès" + apparition dans la liste

### Étape 1.3 - Ajouter un 2ème garage (optionnel)
Ajoute un autre garage à Lyon ou Marseille pour tester le classement IA par distance.

---

## Test 2 : Workflow SOS Complet

### Étape 2.1 - Page d'accueil SOS
1. Va sur http://localhost:3000/sos
2. **Résultat attendu** : Page avec sirène rouge animée + explications
3. Clique sur **"Commencer maintenant"**

### Étape 2.2 - Sélection du véhicule
1. **Résultat attendu** : Liste de tes véhicules avec badge PL/VL
2. Clique sur un véhicule
3. **Vérification** : Le localStorage doit contenir `sos_vehicle`
   ```js
   // Dans la console du navigateur
   JSON.parse(localStorage.getItem('sos_vehicle'))
   ```

### Étape 2.3 - Localisation et type de panne
1. **Résultat attendu** : Formulaire avec le véhicule sélectionné affiché
2. Sélectionne un type de panne (ex: "🔧 Moteur")
3. Entre une adresse de test : `Aire de repos A6, km 245, Beaune`
4. Clique **"Utiliser ma position"** (autorise la géoloc si demandé)
5. Clique **"Analyser avec l'IA"**
6. **Résultat attendu** : Loading spinner "Analyse IA en cours..."

### Étape 2.4 - Résultats IA
1. **Résultat attendu** : Page avec Top 3 des garages recommandés
2. Vérifie les éléments affichés :
   - [ ] Distance en km
   - [ ] Temps estimé
   - [ ] Score de confiance IA
   - [ ] Explications ("Spécialiste moteur, ouvert 24/7...")
   - [ ] Badge spécialités (24h/24, Moteur, etc.)
   - [ ] Bouton "Appeler 01 23 45 67 89"

### Étape 2.5 - Test d'appel
1. Clique sur le bouton d'appel du premier garage
2. **Résultat attendu** : Redirection `tel:01 23 45 67 89` ou ouverture app téléphone

---

## Test 3 : Cas d'Erreur

### Test 3.1 - Aucun prestataire configuré
1. Supprime tous les prestataires dans `/sos/parametres`
2. Va sur `/sos/localisation` et lance une analyse
3. **Résultat attendu** : Message "Aucun garage partenaire configuré" + bouton vers paramètres

### Test 3.2 - Aucun prestataire dans le rayon
1. Ajoute un garage à Paris (rayon 10km)
2. Simule une panne à Lyon
3. **Résultat attendu** : Warning "Hors zone habituelle" + affichage du plus proche

### Test 3.3 - Véhicule frigo + panne frigo
1. Sélectionne un véhicule avec `has_fridge: true`
2. Choisis type de panne "❄️ Frigo / Groupe froid"
3. **Résultat attendu** : L'IA priorise les garages avec spécialité "FRIGO_CARRIER"

---

## Test 4 : API Directe (via curl ou Postman)

### Test 4.1 - GET /api/sos/vehicles
```bash
curl http://localhost:3000/api/sos/vehicles \
  -H "Cookie: ton-cookie-de-session"
```
**Résultat attendu** : JSON avec tableau de véhicules

### Test 4.2 - POST /api/sos/analyze
```bash
curl -X POST http://localhost:3000/api/sos/analyze \
  -H "Content-Type: application/json" \
  -H "Cookie: ton-cookie-de-session" \
  -d '{
    "vehicleId": "uuid-du-vehicule",
    "breakdownLocation": {
      "lat": 48.8566,
      "lng": 2.3522,
      "address": "Paris"
    },
    "breakdownType": "MOTEUR"
  }'
```
**Résultat attendu** : JSON avec recommendations[]

---

## 🔍 Debugging

### Vérifier la connexion Supabase
```javascript
// Console navigateur
fetch('/api/sos/vehicles').then(r => r.json()).then(console.log)
```

### Vérifier les données en base
```sql
-- Dans Supabase SQL Editor
SELECT * FROM user_service_providers WHERE user_id = 'ton-user-id';
SELECT * FROM emergency_searches ORDER BY created_at DESC LIMIT 5;
```

### Vérifier l'appel OpenAI
Regarde les logs serveur, tu dois voir :
```
[OpenAI] Analyzing X providers for breakdown: MOTEUR
[OpenAI] Top recommendation: Garage X (confidence: 0.92)
```

### Problèmes courants

| Problème | Solution |
|----------|----------|
| "Non authentifié" | Reconnecte-toi sur l'app |
| "Aucun véhicule" | Crée un véhicule dans /vehicles |
| "Module not found: openai" | `npm install openai` |
| "Invalid API key" | Vérifie OPENAI_API_KEY dans .env.local |
| Tables inexistantes | Re-exécute la migration SQL |

---

## ✅ Checklist Finale

- [ ] Migration SQL exécutée sur Supabase
- [ ] OPENAI_API_KEY dans .env.local
- [ ] Au moins 1 prestataire ajouté
- [ ] Au moins 1 véhicule créé
- [ ] Test workflow SOS complet réussi
- [ ] L'IA retourne des recommandations pertinentes
- [ ] Le bouton d'appel fonctionne

**Si tout est coché → Le module SOS est opérationnel ! 🎉**
