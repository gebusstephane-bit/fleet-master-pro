# Système QR Code Triple Accès - Documentation Sécurité

## 🔐 Vue d'ensemble

Le système QR Code à triple accès permet aux conducteurs et gestionnaires d'interagir avec les véhicules via scan QR, avec une isolation de sécurité maximale entre les zones publiques (anonymes) et privées (authentifiées).

### Architecture des accès

```
┌─────────────────────────────────────────────────────────────┐
│                    SCAN QR CODE                             │
│              /scan/[vehicleId]?token=xxx                    │
└───────────────────────┬─────────────────────────────────────┘
                        │
        ┌───────────────┼───────────────┐
        │               │               │
        ▼               ▼               ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│  INSPECTION  │ │   CARBURANT  │ │    CARNET    │
│   (PUBLIC)   │ │   (PUBLIC)   │ │  (PRIVÉ)     │
│              │ │              │ │              │
│ • Anonyme    │ │ • Anonyme    │ │ • Auth requise
│ • Rate limit │ │ • Rate limit │ │ • Rôle requis│
│ • INSERT     │ │ • INSERT     │ │ • SELECT/ALL │
│   uniquement │ │   uniquement │ │              │
└──────────────┘ └──────────────┘ └──────────────┘
```

## 🛡️ Mesures de sécurité

### 1. Authentification et Autorisation

#### Routes publiques (Inspection, Carburant)
- **Aucune authentification requise**
- Token QR Code obligatoire dans l'URL (`?token=UUID`)
- Validation du token côté serveur à chaque requête
- Rate limiting : **5 requêtes/minute par IP**

#### Route privée (Carnet Digital)
- **Authentification requise** (redirection vers /login)
- Vérification du rôle : `ADMIN`, `DIRECTEUR`, ou `AGENT_DE_PARC`
- Vérification IDOR : l'utilisateur doit appartenir à la même `company_id`
- Rate limiting standard : 100 requêtes/minute

### 2. Row Level Security (RLS)

#### Table `vehicles`
```sql
-- Les tokens QR sont stockés dans qr_code_data (UUID)
-- Index pour recherche rapide
CREATE INDEX idx_vehicles_qr_code_data ON vehicles(qr_code_data);
```

#### Table `fuel_records`
```sql
-- RLS Policy : SELECT uniquement pour users authentifiés de la même company
CREATE POLICY fuel_records_company_select ON fuel_records
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- RLS Policy : INSERT uniquement pour users authentifiés
CREATE POLICY fuel_records_company_insert ON fuel_records
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );
```

#### Table `vehicle_inspections`
```sql
-- RLS Policy existante maintenue
CREATE POLICY inspections_company_isolation ON vehicle_inspections
  FOR ALL USING (company_id IN (
    SELECT company_id FROM profiles WHERE id = auth.uid()
  ));
```

### 3. Rate Limiting

#### Middleware Next.js (`middleware.ts`)
```typescript
// Routes scan publiques avec rate limiting strict
if (isScanPublicRoute(pathname)) {
  const rateLimitResult = await checkSensitiveRateLimit(`scan:${ip}`);
  // 5 requêtes/minute par IP
}
```

#### Server Actions (`safe-action.ts`)
```typescript
// Client pour actions publiques QR Code
export const scanPublicActionClient = actionClient.use(async ({ next }) => {
  const rateLimit = await rateLimitMiddleware({ 
    isSensitive: true,
    customLimit: 5,
    windowSeconds: 60
  });
  // Protection brute-force sur les tokens
});
```

### 4. Validation des Tokens

#### Fonction de validation (`public-scan.ts`)
```typescript
async function validateVehicleAccess(vehicleId: string, accessToken: string) {
  // Vérifie que:
  // 1. Le véhicule existe
  // 2. Le token correspond (qr_code_data)
  // 3. Le véhicule est actif
  // Retourne null si invalide
}
```

#### Procédure stockée (SQL)
```sql
CREATE OR REPLACE FUNCTION verify_qr_token(
  p_vehicle_id UUID,
  p_token UUID
) RETURNS TABLE (...)
```

### 5. Isolation des données

#### Principes
- **Pas d'exposition de `company_id`** dans les URLs publiques
- **Pas de liste de véhicules** accessible publiquement
- **Insertion uniquement** (pas de SELECT/UPDATE/DELETE via accès public)
- **Champs anonymisés** : `driver_name` en texte libre (pas de FK vers `drivers`)

#### Exemple de sécurité dans les actions
```typescript
// createPublicFuelRecord
const vehicle = await validateVehicleAccess(vehicleId, accessToken);
if (!vehicle) {
  throw new Error('Accès non autorisé'); // Message générique
}

// On récupère le company_id côté serveur, jamais exposé au client
const company_id = vehicle.company_id;
```

## 📊 Flux de données

### 1. Scan QR Code → Page d'atterrissage
```
1. Utilisateur scanne QR → GET /scan/VEH-UUID?token=TOK-UUID
2. Middleware vérifie rate limit
3. Server Component vérifie token
4. Affichage ThreeCardsChoice
5. Accès carnet grisé si non authentifié
```

### 2. Formulaire public (Inspection/Carburant)
```
1. Clic sur carte → GET /scan/VEH-UUID/inspection?token=TOK-UUID
2. Validation du token
3. Affichage formulaire
4. Soumission → Server Action scanPublicActionClient
5. Rate limiting (5 req/min)
6. Validation token côté serveur
7. INSERT dans table (RLS contourné via SECURITY DEFINER)
8. Retour ticketNumber (pas d'autres données)
```

### 3. Carnet Digital (Authentifié)
```
1. Clic sur carte carnet (si authentifié)
2. Middleware vérifie auth (redirige vers /login si non)
3. Vérification rôle (ADMIN/DIRECTEUR/AGENT_DE_PARC)
4. Vérification IDOR (company_id match)
5. SELECT des données autorisées
6. Affichage CarnetDigital
```

## 🔒 Vérifications de sécurité

### Checklist de validation

| Vérification | Implémentation | Fichier |
|-------------|----------------|---------|
| Rate limiting scan | 5 req/min par IP | `middleware.ts` |
| Rate limiting actions | 5 req/min par IP | `safe-action.ts` |
| Validation token | UUID vérifié | `public-scan.ts` |
| Véhicule actif | status='active' | `public-scan.ts` |
| Auth carnet | getUser() requis | `carnet/page.tsx` |
| Rôle carnet | ADMIN/DIRECTEUR/AGENT_DE_PARC | `carnet/page.tsx` |
| IDOR protection | company_id match | `carnet/page.tsx` |
| RLS fuel_records | company isolation | SQL migration |
| RLS inspections | company isolation | SQL migration |
| Pas de company_id exposé | server-side only | `public-scan.ts` |

### Tests de sécurité recommandés

```bash
# 1. Test rate limiting
for i in {1..10}; do curl -s /scan/veh-uuid?token=xxx; done
# Doit bloquer après 5 requêtes (429)

# 2. Test token invalide
curl /scan/veh-uuid?token=INVALID
# Doit rediriger vers /?error=invalid_token

# 3. Test accès carnet sans auth
curl /scan/veh-uuid/carnet?token=xxx
# Doit rediriger vers /login

# 4. Test IDOR (utilisateur d'autre entreprise)
# Se connecter avec user d'entreprise A
# Essayer d'accéder à véhicule entreprise B
# Doit rediriger vers /unauthorized

# 5. Test SQL injection
curl "/scan/veh-uuid?token=' OR '1'='1"
# Doit être échappé et invalide

# 6. Test XSS
# Soumettre formulaire avec <script>alert('xss')</script>
# Doit être échappé côté serveur
```

## 🚨 Réponse aux incidents

### Si un token est compromis

1. **Régénérer le token** via l'interface admin
2. **Réimprimer les QR codes** concernés
3. **Auditer les accès** via `activity_logs`
4. **Bloquer temporairement** l'accès public si nécessaire

```sql
-- Régénérer un token
UPDATE vehicles 
SET qr_code_data = gen_random_uuid() 
WHERE id = 'vehicle-uuid';

-- Voir les accès publics suspects
SELECT * FROM activity_logs 
WHERE action_type LIKE '%PUBLIC%'
AND created_at > NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;
```

### Si brute-force détecté

Le rate limiting bloquera automatiquement l'IP après 5 tentatives.
Pour bloquer manuellement:

```sql
-- Blacklist temporaire (à implémenter si besoin)
INSERT INTO ip_blacklist (ip_address, reason, expires_at)
VALUES ('xxx.xxx.xxx.xxx', 'brute_force_scan', NOW() + INTERVAL '1 hour');
```

## 📝 Logs et traçabilité

Tous les accès publics sont loggés dans `activity_logs`:

```sql
-- Exemple de logs
{
  "action_type": "FUEL_RECORD_PUBLIC_CREATED",
  "entity_type": "fuel_record",
  "entity_id": "uuid",
  "description": "Plein de carburant saisi via QR Code",
  "metadata": {
    "fuel_type": "diesel",
    "liters": 120.5,
    "public_access": true
  }
}
```

## 🔧 Configuration requise

### Variables d'environnement

```env
# Rate limiting Redis (recommandé)
UPSTASH_REDIS_REST_URL=xxx
UPSTASH_REDIS_REST_TOKEN=xxx

# Fallback mémoire si Redis non configuré
# (fonctionne mais moins fiable en multi-instance)
```

### Permissions Supabase

```sql
-- Activer RLS sur les tables
ALTER TABLE fuel_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;

-- Accorder usage des fonctions RPC
GRANT EXECUTE ON FUNCTION verify_qr_token TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_fuel_record TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_public_inspection TO anon, authenticated;
```

## 📚 Références

- **Middleware**: `src/middleware.ts`
- **Actions publiques**: `src/actions/public-scan.ts`
- **Safe Action**: `src/lib/safe-action.ts`
- **Rate Limiter**: `src/lib/security/rate-limiter.ts`
- **Migration SQL**: `supabase/migrations/20260226010000_qrcode_triple_access.sql`
- **Composants Scan**: `src/components/scan/`
- **Routes**: `src/app/scan/[vehicleId]/`
