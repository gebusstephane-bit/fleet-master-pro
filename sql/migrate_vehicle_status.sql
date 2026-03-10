-- ============================================================================
-- MIGRATION : Harmonisation des statuts véhicules vers MAJUSCULE_UNDERSCORE
-- ============================================================================
-- Ordre : 1. Migrer les données → 2. Mettre à jour la contrainte
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ÉTAPE 1 : Vérifier les statuts actuels
-- ----------------------------------------------------------------------------
SELECT DISTINCT status, COUNT(*) as count 
FROM vehicles 
GROUP BY status 
ORDER BY status;

-- ----------------------------------------------------------------------------
-- ÉTAPE 2 : Migrer les données (tous les cas possibles)
-- ----------------------------------------------------------------------------

-- Actif
UPDATE vehicles 
SET status = 'ACTIF' 
WHERE status IN ('active', 'actif', 'Actif', 'ACTIF');

-- Inactif
UPDATE vehicles 
SET status = 'INACTIF' 
WHERE status IN ('inactive', 'inactif', 'Inactif', 'INACTIF', 'HORS_SERVICE', 'hors_service');

-- En maintenance
UPDATE vehicles 
SET status = 'EN_MAINTENANCE' 
WHERE status IN ('maintenance', 'Maintenance', 'EN_MAINTENANCE', 'En maintenance', 'en_maintenance');

-- Archivé
UPDATE vehicles 
SET status = 'ARCHIVE' 
WHERE status IN ('retired', 'Retired', 'archived', 'Archived', 'archive', 'Archive', 'ARCHIVE');

-- ----------------------------------------------------------------------------
-- ÉTAPE 3 : Vérifier qu'il ne reste que les 4 statuts standards
-- ----------------------------------------------------------------------------
SELECT DISTINCT status, COUNT(*) as count 
FROM vehicles 
GROUP BY status 
ORDER BY status;

-- ----------------------------------------------------------------------------
-- ÉTAPE 4 : Supprimer l'ancienne contrainte (si elle existe)
-- ----------------------------------------------------------------------------
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_status_check;

-- ----------------------------------------------------------------------------
-- ÉTAPE 5 : Ajouter la nouvelle contrainte
-- ----------------------------------------------------------------------------
ALTER TABLE vehicles 
ADD CONSTRAINT vehicles_status_check 
CHECK (status IN ('ACTIF', 'INACTIF', 'EN_MAINTENANCE', 'ARCHIVE'));

-- ----------------------------------------------------------------------------
-- ÉTAPE 6 : Vérification finale
-- ----------------------------------------------------------------------------
SELECT 
  status,
  COUNT(*) as count,
  CASE status
    WHEN 'ACTIF' THEN '✅ Actif'
    WHEN 'INACTIF' THEN '⚠️ Inactif'
    WHEN 'EN_MAINTENANCE' THEN '🔧 En maintenance'
    WHEN 'ARCHIVE' THEN '📦 Archivé'
    ELSE '❌ INCONNU!'
  END as label
FROM vehicles 
GROUP BY status 
ORDER BY status;
