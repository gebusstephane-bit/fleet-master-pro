# 🔍 AUDIT FORENSIC - CRISIS MODE
## Problème de connexion post-refonte sécurité

**Date d'audit :** 2025-02-20  
**Sévérité :** CRITIQUE  
**Statut :** 🚨 ANALYSE COMPLÈTE - ATTENTE CORRECTION

---

## 📋 RÉSUMÉ EXÉCUTIF

### Le problème en une phrase
> Les utilisateurs dont le `profiles.id` ne correspond pas à `auth.users.id` sont **totalement bloqués** car la fonction `get_current_user_company_id()` retourne NULL, invalidant toutes les RLS policies.

### Impact
- **Profils orphelins** (créés manuellement ou avant le système Stripe) : BLOQUÉS
- **Nouveaux utilisateurs** (via Stripe webhook) : FONCTIONNENT
- **Superadmin** (contact@fleet-master.fr) : BLOQUÉ si ID non aligné

---

## PHASE 1 : CARTOGRAPHIE DU FLUX D'INSCRIPTION

### 1.1 Flux actuel (Inscription payante via Stripe)

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   User UI       │────▶│  Stripe Checkout     │────▶│  Paiement Stripe    │
│  (RegisterForm) │     │  (create-checkout)   │     │  (carte bancaire)   │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
                                                               │
                                                               ▼
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│  User peut      │◀────│  Webhook Stripe      │◀────│  checkout.session   │
│  se connecter   │     │  (handleNewReg)      │     │  .completed         │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  1. auth.admin.      │
                    │     createUser()     │
                    │     → auth.users.id  │
                    └──────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  2. INSERT companies │
                    │     → company.id     │
                    └──────────────────────┘
                               │
                               ▼
                    ┌──────────────────────┐
                    │  3. INSERT profiles  │
                    │     id = auth.users.id
                    │     company_id = ... │
                    └──────────────────────┘
```

### 1.2 Points critiques identifiés

| Étape | Table | Condition critique |
|-------|-------|-------------------|
| 1 | `auth.users` | Créé par `supabase.auth.admin.createUser()` |
| 2 | `companies` | ID auto-généré (uuid) |
| 3 | `profiles` | **DOIT avoir `id = auth.users.id`** |

**⚠️ CONTRAINTE FK :** `profiles.id` référence `auth.users.id` (ON DELETE CASCADE)

---

## PHASE 2 : ANALYSE DES RELATIONS

### 2.1 Schéma de relations

```
auth.users (id UUID PK)
    │
    │ FK : profiles.id = auth.users.id
    ▼
profiles (id UUID PK, company_id UUID FK, role, email...)
    │
    │ FK : profiles.company_id = companies.id
    ▼
companies (id UUID PK, subscription_status, max_vehicles...)
    │
    │ FK : vehicles.company_id = companies.id
    ▼
vehicles (id UUID PK, company_id UUID FK...)
```

### 2.2 Différence entre user qui marche vs user bloqué

| Champ | User qui marche (Stéphane) | User bloqué (contact@fleet-master.fr) |
|-------|---------------------------|--------------------------------------|
| `auth.users.id` | `abc-123-def` | `1d519173-16d4-4cbd-a71f-6000cae39039` |
| `profiles.id` | `abc-123-def` (même) | `3b703ad9-e665-4a31-b4fa-c2dfc98755e4` (différent) |
| `profiles.company_id` | UUID valide | `18bd98ac-9c3b-4794-8729-218bf0e41927` |
| `companies.id` | Existe | Peut ne pas exister |

### 2.3 Requêtes d'audit SQL

#### A. Liste les profils orphelins (profils sans auth)
```sql
-- Profils qui n'ont pas d'utilisateur auth correspondant
SELECT 
    p.id as profile_id,
    p.email,
    p.company_id,
    p.role,
    p.created_at,
    'ORPHELIN' as status
FROM public.profiles p 
LEFT JOIN auth.users u ON p.id = u.id 
WHERE u.id IS NULL
ORDER BY p.created_at DESC;
```

#### B. Liste les auth sans profil
```sql
-- Utilisateurs auth qui n'ont pas de profil
SELECT 
    u.id as auth_id,
    u.email,
    u.created_at,
    u.last_sign_in_at,
    'SANS PROFIL' as status
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id 
WHERE p.id IS NULL
ORDER BY u.created_at DESC;
```

#### C. Vérifier l'alignement d'un utilisateur spécifique
```sql
-- Vérifier contact@fleet-master.fr
SELECT 
    u.id as auth_id,
    p.id as profile_id,
    u.email,
    CASE 
        WHEN u.id = p.id THEN '✅ ALIGNÉ'
        ELSE '❌ NON ALIGNÉ'
    END as alignment_status,
    p.company_id,
    c.name as company_name,
    c.subscription_status
FROM auth.users u
LEFT JOIN public.profiles p ON u.email = p.email
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE u.email = 'contact@fleet-master.fr';
```

#### D. Compter les utilisateurs impactés
```sql
-- Statistiques globales
SELECT 
    'Profils orphelins (sans auth)' as categorie,
    COUNT(*) as count
FROM public.profiles p 
LEFT JOIN auth.users u ON p.id = u.id 
WHERE u.id IS NULL

UNION ALL

SELECT 
    'Auth sans profil' as categorie,
    COUNT(*) as count
FROM auth.users u 
LEFT JOIN public.profiles p ON u.id = p.id 
WHERE p.id IS NULL

UNION ALL

SELECT 
    'Profils avec company_id inexistant' as categorie,
    COUNT(*) as count
FROM public.profiles p
LEFT JOIN public.companies c ON p.company_id = c.id
WHERE c.id IS NULL AND p.company_id IS NOT NULL;
```

---

## PHASE 3 : DIAGNOSTIC DES ACCÈS BLOQUÉS

### 3.1 Fonction critique : `get_current_user_company_id()`

```sql
CREATE OR REPLACE FUNCTION get_current_user_company_id()
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id 
  FROM profiles 
  WHERE id = auth.uid()  -- ⚠️ POINT DE RUPTURE
  LIMIT 1;
$$;
```

**Problème :** Si `profiles.id` ≠ `auth.uid()`, la fonction retourne **NULL**.

### 3.2 Impact sur les RLS Policies

Toutes les policies utilisent cette fonction :

```sql
-- Exemple: vehicles_select_policy
CREATE POLICY "vehicles_select_policy" ON vehicles
  FOR SELECT TO authenticated
  USING (company_id = get_current_user_company_id());
  -- Si get_current_user_company_id() = NULL
  -- Alors company_id = NULL → Jamais vrai → Aucune ligne retournée
```

### 3.3 Impact sur le middleware

```typescript
// src/middleware.ts ligne 107-111
const { data: profile } = await supabase
  .from('profiles')
  .select('role, company_id')
  .eq('id', user.id)  // ⚠️ Si profiles.id ≠ user.id → Pas de résultat
  .single();
```

**Conséquence :** Le middleware ne trouve pas le profil, donc `profile.company_id` = undefined.

### 3.4 Chaîne de défaillance

```
User se connecte
      │
      ▼
auth.users authentifié ✓
      │
      ▼
Middleware: SELECT * FROM profiles WHERE id = auth.uid()
      │
      ├── Si profiles.id = auth.uid() → ✅ ACCÈS PERMIS
      │
      └── Si profiles.id ≠ auth.uid() → ❌ PAS DE PROFIL TROUVÉ
                  │
                  ▼
        get_current_user_company_id() retourne NULL
                  │
                  ▼
        Toutes les RLS échouent (company_id = NULL)
                  │
                  ▼
        User voit "Aucun véhicule" / Dashboard vide
```

---

## PHASE 4 : FLUX D'INSCRIPTION - ANCIEN VS NOUVEAU

### 4.1 Ancien flux (cassé)
```
1. Création manuelle dans auth.users
2. Création manuelle dans profiles (avec ID différent)
3. ❌ PROBLÈME: profiles.id ≠ auth.users.id
```

### 4.2 Nouveau flux (fonctionnel)
```
1. Stripe webhook reçu
2. auth.admin.createUser() → génère auth.users.id
3. Création companies → company.id
4. Création profiles avec id = auth.users.id
5. ✅ profiles.id = auth.users.id
```

### 4.3 Triggers existants

```sql
-- Trigger sur appearance_settings (après création profile)
CREATE TRIGGER create_appearance_settings_on_profile
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION create_appearance_settings();

-- Vérifier les triggers sur auth.users
SELECT * FROM pg_trigger 
WHERE tgname LIKE '%auth%' 
   OR tgrelid = 'auth.users'::regclass;
```

**Résultat :** Aucun trigger `on_auth_user_created` trouvé dans les migrations.

---

## PHASE 5 : RAPPORT D'IMPACT

### 5.1 Tables impactées par le désalignement

| Table | Colonne FK | Impact si profil non aligné |
|-------|-----------|----------------------------|
| `profiles` | `id` | ❌ User non reconnu |
| `user_appearance_settings` | `user_id` | ❌ Paramètres UI perdus |
| `push_subscriptions` | `user_id` | ❌ Notifications push échouent |
| `activity_logs` | `user_id` | ❌ Logs non tracés |
| `notifications` | `user_id` | ❌ Notifications non reçues |
| `notification_preferences` | `user_id` | ❌ Préférences perdues |
| `maintenance_records` | `requested_by` | ⚠️ Historique orphelin |
| `inspections` | `created_by` | ⚠️ Historique orphelin |
| `vehicles` | `created_by` | ⚠️ Historique orphelin |

### 5.2 Scénarios de blocage

| Scénario | Cause | Symptôme |
|----------|-------|----------|
| **A** | `profiles.id` ≠ `auth.users.id` | Dashboard vide, "Aucun véhicule" |
| **B** | `profiles.company_id` inexistant | Erreur FK, création véhicule impossible |
| **C** | `subscription_status` = 'pending' | Redirection vers /payment-pending |
| **D** | `subscription_status` = 'canceled' | Redirection vers /pricing |

---

## PHASE 6 : REQUÊTES DE CORRECTION (À VALIDER)

### 6.1 Correction de l'ID (alignement)

```sql
-- ⚠️ EXÉCUTER UNIQUEMENT APRÈS BACKUP

-- 1. Désactiver les contraintes FK temporairement
ALTER TABLE user_appearance_settings DROP CONSTRAINT IF EXISTS user_appearance_settings_user_id_fkey;
-- ... (autres tables avec FK vers profiles.id)

-- 2. Mettre à jour les FK avant le profile
UPDATE user_appearance_settings 
SET user_id = 'NOUVEL_ID_AUTH' 
WHERE user_id = 'ANCIEN_ID_PROFILE';

-- 3. Mettre à jour le profile
UPDATE profiles 
SET id = 'NOUVEL_ID_AUTH' 
WHERE email = 'contact@fleet-master.fr';

-- 4. Réactiver les contraintes FK
ALTER TABLE user_appearance_settings 
ADD CONSTRAINT user_appearance_settings_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;
```

### 6.2 Création de la société manquante

```sql
-- Créer la société si elle n'existe pas
INSERT INTO companies (
    id, name, siret, address, postal_code, city, country,
    phone, email, subscription_plan, subscription_status,
    max_vehicles, max_drivers, created_at, updated_at, onboarding_completed
) VALUES (
    '18bd98ac-9c3b-4794-8729-218bf0e41927',
    'FleetMaster Pro',
    '00000000000000',
    'Adresse à définir',
    '75000',
    'Paris',
    'France',
    '+33 1 23 45 67 89',
    'contact@fleet-master.fr',
    'pro',
    'active',
    999,
    999,
    NOW(),
    NOW(),
    TRUE
)
ON CONFLICT (id) DO NOTHING;
```

---

## CONCLUSION ET RECOMMANDATIONS

### Diagnostic final

```
┌─────────────────────────────────────────────────────────────┐
│  🔴 PROBLÈME ROOT CAUSE IDENTIFIÉ                           │
├─────────────────────────────────────────────────────────────┤
│  Le profil contact@fleet-master.fr a été créé manuellement   │
│  ou avant la mise en place du système Stripe.               │
│                                                             │
│  profiles.id = 3b703ad9-e665-4a31-b4fa-c2dfc98755e4        │
│  auth.users.id = 1d519173-16d4-4cbd-a71f-6000cae39039      │
│                                                             │
│  → Désalignement critique                                   │
│  → get_current_user_company_id() retourne NULL              │
│  → Toutes les RLS échouent                                  │
│  → User totalement bloqué                                   │
└─────────────────────────────────────────────────────────────┘
```

### Options de correction

| Option | Description | Risque | Complexité |
|--------|-------------|--------|------------|
| **A** | Aligner `profiles.id` avec `auth.users.id` | Moyen (FK à gérer) | Moyenne |
| **B** | Modifier `get_current_user_company_id()` pour chercher par email | Faible | Faible |
| **C** | Recréer l'utilisateur avec le bon ID | Élevé (perte données) | Faible |
| **D** | Créer un mapping table `auth_id ↔ profile_id` | Faible | Élevée |

### Recommandation

**Option A (Alignement ID)** est la meilleure solution car :
1. Respecte la contrainte FK existante
2. Maintient l'intégrité référentielle
3. Fonctionne avec toutes les RLS actuelles
4. Pas de modification de code nécessaire

**PRÉREQUIS :**
- [ ] Backup complet de la base
- [ ] Exécution en heure creuse
- [ ] Test sur environnement de staging d'abord

---

## ANNEXES

### A. Vérification des RLS actuelles

```sql
SELECT 
    schemaname, 
    tablename, 
    policyname, 
    permissive, 
    roles, 
    cmd, 
    qual
FROM pg_policies 
WHERE tablename IN ('profiles', 'vehicles', 'drivers', 'companies')
ORDER BY tablename, cmd;
```

### B. Vérification des fonctions SECURITY DEFINER

```sql
SELECT 
    proname,
    prosecdef,
    proowner::regrole
FROM pg_proc 
WHERE proname = 'get_current_user_company_id';
```

### C. Statistiques de connexion

```sql
-- Derniers sign-in
SELECT 
    email,
    last_sign_in_at,
    created_at,
    raw_user_meta_data->>'company_id' as meta_company_id
FROM auth.users
ORDER BY last_sign_in_at DESC
LIMIT 10;
```

---

**FIN DU RAPPORT**

*Document généré par analyse forensique - NE PAS MODIFIER SANS VALIDATION*
