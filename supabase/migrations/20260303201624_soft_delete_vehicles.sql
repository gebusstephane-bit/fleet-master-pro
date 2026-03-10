-- Migration : Soft Delete pour les véhicules
-- Objectif : Permettre la suppression logique des véhicules sans perdre les données historiques liées
-- Date : 2026-03-03

-- 1. Ajout de la colonne deleted_at à la table vehicles
ALTER TABLE vehicles 
ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Création de l'index pour optimiser les requêtes filtrant sur deleted_at
CREATE INDEX IF NOT EXISTS idx_vehicles_deleted_at ON vehicles(deleted_at) 
WHERE deleted_at IS NOT NULL;

-- 3. Mise à jour des policies RLS existantes pour exclure les véhicules supprimés
-- Note : Les policies INSERT/UPDATE/DELETE restent inchangées

-- Suppression et recréation des policies SELECT pour ajouter le filtre deleted_at IS NULL
-- Policy : Les utilisateurs peuvent voir les véhicules de leur entreprise non supprimés
DROP POLICY IF EXISTS "Users can view vehicles from their company" ON vehicles;

CREATE POLICY "Users can view vehicles from their company" ON vehicles
    FOR SELECT
    USING (
        company_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
        AND deleted_at IS NULL
    );

-- Policy : Les admins peuvent voir tous les véhicules non supprimés de leur entreprise
DROP POLICY IF EXISTS "Admins can view all vehicles" ON vehicles;

CREATE POLICY "Admins can view all vehicles" ON vehicles
    FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM profiles 
            WHERE id = auth.uid() 
            AND role IN ('ADMIN', 'DIRECTEUR')
            AND company_id = vehicles.company_id
        )
        AND deleted_at IS NULL
    );

-- 4. Commentaire sur la colonne pour documentation
COMMENT ON COLUMN vehicles.deleted_at IS 'Date de suppression logique du véhicule. NULL = actif, valeur = supprimé.';

-- 5. Vue pour faciliter l'accès aux véhicules actifs (optionnel, pour compatibilité)
CREATE OR REPLACE VIEW active_vehicles AS
SELECT * FROM vehicles WHERE deleted_at IS NULL;

COMMENT ON VIEW active_vehicles IS 'Vue des véhicules non supprimés (actifs)';
