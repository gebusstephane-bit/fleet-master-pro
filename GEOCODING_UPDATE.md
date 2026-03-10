# Mise à jour du Géocodage - Apify + Nominatim Fallback

## Résumé
Le service de géocodage utilise maintenant **Apify** (Google Maps Scraper) en priorité avec **Nominatim** (OpenStreetMap) en fallback.

## Fonctionnement

```
Requête utilisateur
        ↓
   [Apify Google Maps]
        ↓
   Succès ? → OUI → Résultat Google Maps
        ↓ NON
   [Nominatim OSM]
        ↓
   Succès ? → OUI → Résultat OSM
        ↓ NON
   Erreur 404
```

## Configuration requise

### 1. Clé Apify (déjà configurée)
```env
APIFY_API_TOKEN=your_apify_token_here
```

### 2. Installation du client
```bash
npm install apify-client
```

## API Endpoints

### GET /api/geocode?q=adresse
Forward geocoding (adresse → coordonnées)

**Exemple:**
```bash
curl "http://localhost:3000/api/geocode?q=Aire+de+repos+A6+km+245"
```

**Réponse:**
```json
[{
  "lat": 48.8566,
  "lng": 2.3522,
  "display_name": "Aire de Lisses, A6, km 245",
  "address": "Aire de Lisses, 91090 Lisses",
  "place_id": "ChIJ...",
  "source": "apify"
}]
```

### POST /api/geocode
Forward ou reverse geocoding

**Forward (adresse → coordonnées):**
```json
POST /api/geocode
{ "address": "Tour Eiffel, Paris" }
```

**Reverse (coordonnées → adresse):**
```json
POST /api/geocode
{ "lat": 48.8566, "lng": 2.3522 }
```

## Champs de réponse

| Champ | Type | Description |
|-------|------|-------------|
| `lat` | number | Latitude |
| `lng` | number | Longitude |
| `display_name` | string | Adresse formatée |
| `address` | string | Adresse détaillée (si disponible) |
| `place_id` | string | ID du lieu (Google Maps) |
| `source` | string | `apify` ou `nominatim` |

## Acteur Apify utilisé

**Actor:** `compass/crawler-google-places`

**Paramètres:**
- `searchQueries`: Requête de recherche (ex: "Aire de repos A6, France")
- `maxCrawledPlaces`: 1 (on ne veut que le premier résultat)
- `language`: fr
- `maxImages`: 0 (pas besoin d'images)
- `includeWebResults`: false
- `scrapeReviews`: false
- `scrapeContactInfo`: false

## Fallback Nominatim

Si Apify échoue (pas de crédits, timeout, etc.), le système utilise automatiquement Nominatim (OpenStreetMap) qui est gratuit mais moins précis pour les points d'intérêt comme les aires d'autoroute.

**Limitations Nominatim:**
- Requêtes limitées (1 seconde entre chaque requête)
- Moins précis pour les aires d'autoroute
- Pas de données temps réel

## Tests

### Test 1: Adresse simple
```bash
curl "http://localhost:3000/api/geocode?q=12+rue+de+Paris,+Lyon"
```

### Test 2: Aire d'autoroute
```bash
curl "http://localhost:3000/api/geocode?q=Aire+de+repos+A6+km+245"
```

### Test 3: Reverse geocoding
```bash
curl -X POST http://localhost:3000/api/geocode \
  -H "Content-Type: application/json" \
  -d '{"lat": 48.8566, "lng": 2.3522}'
```

## Dépannage

### "Apify not configured"
Vérifiez que `APIFY_API_TOKEN` est bien défini dans `.env.local`

### "Adresse non trouvée"
L'adresse est peut-être trop vague. Essayez d'ajouter plus de détails (ville, code postal).

### Timeout
Les requêtes ont un timeout de 5 secondes. Si Apify est lent, le système bascule sur Nominatim.

## Coûts Apify

L'acteur `compass/crawler-google-places` consomme des crédits Apify. Vérifiez votre solde régulièrement sur https://console.apify.com

**Estimation:** ~10 crédits par requête de géocodage.

## Roadmap

- [ ] Cache Redis pour les résultats fréquents
- [ ] Alternative: Google Geocoding API directe (nécessite clé GCP)
- [ ] Détection automatique des aires d'autoroute
