-- ============================================================
-- ROLLBACK - Restauration depuis backup
-- À exécuter UNIQUEMENT si le fix pose problème
-- ============================================================

-- Vérifier que le backup existe
SELECT 'BACKUP EXISTE' as check_type, COUNT(*) as nb_lignes 
FROM backup_auth_users_fix_providers;

-- Restauration (décommenter pour exécuter)
/*
UPDATE auth.users u
SET 
    raw_app_meta_data = b.raw_app_meta_data,
    raw_user_meta_data = b.raw_user_meta_data,
    email_confirmed_at = b.email_confirmed_at,
    encrypted_password = b.encrypted_password,
    is_sso_user = b.is_sso_user
FROM backup_auth_users_fix_providers b
WHERE u.id = b.id;

-- Supprimer les identities créées
DELETE FROM auth.identities 
WHERE user_id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');

SELECT 'ROLLBACK EFFECTUÉ' as status;
*/

-- Vérification post-rollback (si exécuté)
SELECT 'ÉTAT ACTUEL' as check_type, email, raw_app_meta_data 
FROM auth.users 
WHERE id IN ('8d29c266-4da4-4140-9e76-8e1161b81320', 'dced169e-76d7-44bf-88da-82ded5f5fb05');
