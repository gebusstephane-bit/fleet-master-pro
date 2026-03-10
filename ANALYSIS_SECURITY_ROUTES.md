# RAPPORT D'ANALYSE D'IMPACT - Routes API Admin

**Date :** 2026-02-22
**Mission :** Sécurisation des routes API admin avec préservation des fonctionnalités utiles

---

## 📊 RÉSUMÉ EXÉCUTIF

| Fichier | Utilisé ? | Danger | Action Recommandée |
|---------|-----------|--------|-------------------|
| `apply-migration/route.ts` | ❌ NON | 🔴 CRITIQUE | SUPPRESSION ou AUTH STRICTE |
| `cleanup-triggers/route.ts` | ❌ NON | 🔴 CRITIQUE | SUPPRESSION ou AUTH STRICTE |
| `fix-activity-logs/route.ts` | ❌ NON | 🔴 CRITIQUE | SUPPRESSION ou AUTH STRICTE |
| `rls-bypass.ts` | ❌ NON* | 🟡 MOYEN | SUPPRESSION (code mort) |

*Utilisé uniquement par `use-emergency-fetch.ts` → `EmergencyDataLoader` → **NON UTILISÉ dans l'UI**

---

## 🔍 DÉTAIL PAR FICHIER

### 1. RLS-BYPASS.TS (`src/lib/supabase/rls-bypass.ts`)

**Fonctions exportées :**
- `apiQuery<T>()` - Requête GET avec filtrage
- `apiInsert<T>()` - Insertion
- `apiUpdate<T>()` - Mise à jour
- `apiDelete()` - Suppression
- `getAuthToken()` - Récupération token localStorage

**Utilisations trouvées :**
```
src/hooks/use-emergency-fetch.ts:11:import { apiQuery } from '@/lib/supabase/rls-bypass';
```

**Chaîne d'appel :**
1. `rls-bypass.ts` exporte `apiQuery`
2. `use-emergency-fetch.ts` importe et utilise `apiQuery` dans 3 hooks :
   - `useEmergencyVehicles()`
   - `useEmergencyDrivers()`
   - `useEmergencyRoutes()`
3. `emergency-data-loader.tsx` importe ces 3 hooks
4. **RECHERCHE :** `EmergencyDataLoader` n'est importé dans AUCUNE page

**Conclusion :** Code mort - peut être supprimé sans impact

---

### 2. APPLY-MIGRATION (`src/app/api/admin/apply-migration/route.ts`)

**Fonctionnalité :**
- Exécute du SQL via `supabase.rpc('exec_sql', ...)`
- Crée des politiques RLS pour `ai_predictions`
- Recrée un trigger `tr_create_prediction_on_vehicle`

**Authentification :** ❌ AUCUNE (accès public)

**Appels trouvés :**
- ❌ Aucun fetch/axios dans le codebase
- ❌ Aucun bouton UI
- ❌ Aucun script package.json
- ❌ Référencé uniquement dans `AUDIT-FLEETMASTER.md` (documentation)

**Middleware :**
```typescript
// middleware.ts ligne 28
const publicApiRoutes = ['/api/auth', '/api/stripe/webhook', ...];
// NOTE: apply-migration N'EST PAS dans publicApiRoutes mais n'a pas d'auth non plus
```

**Conclusion :** Route dangereuse non utilisée - à supprimer ou sécuriser

---

### 3. CLEANUP-TRIGGERS (`src/app/api/admin/cleanup-triggers/route.ts`)

**Fonctionnalité :**
- Supprime et recrée le trigger `tr_log_maintenance`
- Corrige la référence à `NEW.service_type` → `NEW.type`

**Authentification :** ❌ AUCUNE (accès public)

**Appels trouvés :**
- ❌ Aucun dans le codebase
- ❌ Référencé uniquement dans `AUDIT-FLEETMASTER.md`

**Conclusion :** Route dangereuse non utilisée - à supprimer ou sécuriser

---

### 4. FIX-ACTIVITY-LOGS (`src/app/api/admin/fix-activity-logs/route.ts`)

**Fonctionnalité :**
- Identique à cleanup-triggers (redondant)
- Corrige le trigger `tr_log_maintenance`

**Authentification :** ❌ AUCUNE (accès public)

**Appels trouvés :**
- ❌ Aucun dans le codebase
- ❌ Référencé uniquement dans `AUDIT-FLEETMASTER.md`

**Conclusion :** Route dangereuse non utilisée et REDONDANTE avec cleanup-triggers

---

## 🎯 ANALYSE DES DÉPENDANCES

### Graphe de dépendances RLS-BYPASS

```
rls-bypass.ts
    └── use-emergency-fetch.ts
            └── emergency-data-loader.tsx
                    └── [AUCUN CONSOMMATEUR]
```

### Recherche exhaustive effectuée

| Type de recherche | Résultat |
|-------------------|----------|
| Imports de rls-bypass.ts | 1 fichier (use-emergency-fetch.ts) |
| Utilisation d'apiQuery/apiInsert/etc | 3 hooks dans use-emergency-fetch.ts |
| Utilisation EmergencyDataLoader | 0 fichiers |
| Appels fetch vers /api/admin/apply-migration | 0 |
| Appels fetch vers /api/admin/cleanup-triggers | 0 |
| Appels fetch vers /api/admin/fix-activity-logs | 0 |
| Scripts package.json | 0 références |
| Références dans .md | AUDIT-FLEETMASTER.md uniquement |

---

## ⚠️ ÉVALUATION DES RISQUES

### Routes API Admin (CRITIQUE)

**Risque :** 🔴 CRITIQUE
- **Impact :** Exécution SQL arbitraire par n'importe qui sur Internet
- **Exploitation :** `curl -X POST https://fleetmaster.pro/api/admin/apply-migration`
- **Conséquences :** Exfiltration ou destruction complète de la base de données

**Preuve de danger :**
```typescript
// apply-migration/route.ts
export async function POST() {
  const supabase = createAdminClient(); // Droits super admin
  const { error } = await supabase.rpc('exec_sql', { sql: MIGRATION_SQL });
  // AUCUNE VÉRIFICATION D'AUTHENTIFICATION
}
```

### RLS-BYPASS (MOYEN)

**Risque :** 🟡 MOYEN
- **Impact :** Contournement partiel des politiques RLS
- **Exploitation :** Nécessite un token d'authentification valide
- **Conséquences :** Accès aux données d'autres entreprises si utilisé

**Note :** Ce fichier n'est actuellement pas utilisé, donc le risque est théorique.

---

## ✅ RECOMMANDATIONS

### Option 1 : Suppression pure (RECOMMANDÉ)

**Fichiers à supprimer :**
1. `src/app/api/admin/apply-migration/route.ts` → SUPPRIMER
2. `src/app/api/admin/cleanup-triggers/route.ts` → SUPPRIMER
3. `src/app/api/admin/fix-activity-logs/route.ts` → SUPPRIMER
4. `src/lib/supabase/rls-bypass.ts` → SUPPRIMER
5. `src/hooks/use-emergency-fetch.ts` → SUPPRIMER
6. `src/components/emergency-data-loader.tsx` → SUPPRIMER

**Justification :** Aucun de ces fichiers n'est utilisé dans l'application.

### Option 2 : Sécurisation (si maintenance nécessaire)

Si vous souhaitez conserver ces routes pour des opérations de maintenance :

1. **Ajouter authentification SUPERADMIN :**
```typescript
// Exemple de protection
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
  }
  
  // Vérifier si superadmin
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
    
  if (profile?.role !== 'SUPERADMIN') {
    return NextResponse.json({ error: 'Accès interdit' }, { status: 403 });
  }
  
  // ... reste du code
}
```

2. **Restreindre par IP (optionnel) :**
```typescript
const allowedIPs = process.env.ADMIN_IPS?.split(',') || [];
const clientIP = request.ip || request.headers.get('x-forwarded-for');

if (!allowedIPs.includes(clientIP)) {
  return NextResponse.json({ error: 'IP non autorisée' }, { status: 403 });
}
```

3. **Ajouter une clé API secrète :**
```typescript
const adminKey = request.headers.get('x-admin-key');
if (adminKey !== process.env.ADMIN_SECRET_KEY) {
  return NextResponse.json({ error: 'Clé invalide' }, { status: 401 });
}
```

### Option 3 : Conversion en scripts locaux

Convertir les routes API en scripts exécutés localement (pas exposés sur Internet) :

```typescript
// scripts/apply-migration.ts
// Script exécutable uniquement en local avec accès à la DB
```

---

## 🔒 ACTIONS IMMÉDIATES REQUISES

### AVANT suppression (sécurité)

1. **Vérifier les logs Vercel :**
   - Consulter les logs de ces routes pour voir si elles ont été appelées
   - URL : https://vercel.com/dashboard → Project → Logs

2. **Vérifier la base de données :**
   ```sql
   -- Vérifier si des migrations ont été appliquées récemment
   SELECT * FROM ai_predictions LIMIT 1;
   \d vehicles -- Vérifier les triggers
   ```

3. **Révoquer la clé service_role si compromise :**
   - Supabase Dashboard → Project Settings → API → Regenerate service_role key

### APRÈS suppression

1. **Mettre à jour middleware.ts :**
   ```typescript
   // Retirer /api/admin des routes publiques si présent
   const publicApiRoutes = ['/api/auth', '/api/stripe/webhook', '/api/cron'];
   ```

2. **Mettre à jour AUDIT-FLEETMASTER.md :**
   - Marquer les vulnérabilités comme corrigées

3. **Déployer et tester :**
   - Vérifier que l'application fonctionne normalement
   - Vérifier que les fonctionnalités de maintenance fonctionnent

---

## 📋 CONCLUSION

**Verdict :** Tous les fichiers analysés peuvent être **SUPPRIMÉS SANS RISQUE** car ils ne sont utilisés par aucune partie de l'application.

**Priorité :** 🔴 CRITIQUE - Ces routes représentent une faille de sécurité majeure qui doit être corrigée immédiatement.

**Temps estimé :** 15 minutes pour suppression + déploiement

**Validation :** Aucune régression fonctionnelle attendue (code mort)
