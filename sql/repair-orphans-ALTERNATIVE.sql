-- ============================================================
-- ALTERNATIVE : SUPPRESSION + RÉINSCRIPTION MANUELLE
-- Utiliser SI la création SQL directe échoue
-- ============================================================

-- ============================================================
-- ÉTAPE 1: SAUVEGARDE COMPLÈTE (DÉJÀ FAITE DANS L'AUTRE SCRIPT)
-- ============================================================

-- Vérifier le backup existe
SELECT 'BACKUP EXISTANT' as check_status, COUNT(*) as nb_lignes 
FROM backup_profiles_orphelins_20260221;

-- ============================================================
-- ÉTAPE 2: EXPORT DES DONNÉES CRITIQUES À PRÉSERVER
-- ============================================================

-- Créer une table de mapping pour réassociation post-réinscription
CREATE TABLE IF NOT EXISTS temp_orphan_data_recovery AS
SELECT 
    p.id as old_profile_id,
    p.email,
    p.company_id,
    p.role,
    p.first_name,
    p.last_name,
    p.phone,
    c.name as company_name,
    c.siret,
    c.subscription_plan,
    c.subscription_status,
    c.max_vehicles,
    c.max_drivers,
    (SELECT COUNT(*) FROM vehicles v WHERE v.company_id = p.company_id) as nb_vehicles,
    (SELECT COUNT(*) FROM drivers d WHERE d.company_id = p.company_id) as nb_drivers,
    NOW() as backup_date
FROM profiles p
LEFT JOIN companies c ON c.id = p.company_id
WHERE p.id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- Vérifier l'export
SELECT * FROM temp_orphan_data_recovery;

-- ============================================================
-- ÉTAPE 3: SUPPRESSION DES PROFILS ORPHELINS
-- ============================================================

-- ATTENTION: Décommenter pour exécuter
-- DELETE FROM profiles 
-- WHERE id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- Vérifier la suppression
-- SELECT 'Profils restants' as status, COUNT(*) FROM profiles 
-- WHERE id IN ('dced169e-76d7-44bf-88da-82ded5f5fb05', '8d29c266-4da4-4140-9e76-8e1161b81320');

-- ============================================================
-- ÉTAPE 4: INSTRUCTIONS POST-SUPPRESSION
-- ============================================================

/*
APRÈS LA SUPPRESSION, FAIRE:

1. Demander aux 2 users de se réinscrire sur /register avec leur email

2. Une fois réinscrits, récupérer leurs NOUVEAUX IDs:
   SELECT id, email FROM auth.users 
   WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com');

3. Mettre à jour les entreprises existantes avec leurs nouveaux company_id
   (Si les entreprises ont été recréées, migrer les véhicules)

4. OU lier leurs nouveaux profils aux anciennes entreprises:
   
   UPDATE profiles 
   SET company_id = 'ANCIEN_COMPANY_ID'
   WHERE email = 'fleet.master.contact@gmail.com';
   
   (Remplacer ANCIEN_COMPANY_ID par la valeur de temp_orphan_data_recovery)

5. Vérifier que les véhicules sont accessibles:
   SELECT v.* FROM vehicles v
   JOIN profiles p ON p.company_id = v.company_id
   WHERE p.email = 'fleet.master.contact@gmail.com';
*/

-- ============================================================
-- SCRIPT DE RÉASSOCIATION RAPIDE (après réinscription)
-- ============================================================

-- À exécuter APRÈS que les users se soient réinscrits

/*
-- Récupérer les nouveaux IDs
WITH new_users AS (
    SELECT id as new_auth_id, email
    FROM auth.users
    WHERE email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com')
),
old_data AS (
    SELECT * FROM temp_orphan_data_recovery
)
-- Mettre à jour les profils avec les anciens company_id
UPDATE profiles p
SET company_id = od.company_id
FROM new_users nu
JOIN old_data od ON od.email = nu.email
WHERE p.id = nu.new_auth_id;
*/

-- ============================================================
-- VÉRIFICATION FINALE (après réassociation)
-- ============================================================

/*
SELECT 
    p.email,
    p.company_id,
    c.name as company_name,
    COUNT(v.id) as nb_vehicules
FROM profiles p
JOIN companies c ON c.id = p.company_id
LEFT JOIN vehicles v ON v.company_id = p.company_id
WHERE p.email IN ('fleet.master.contact@gmail.com', 'gebus.emma@gmail.com')
GROUP BY p.email, p.company_id, c.name;
*/
