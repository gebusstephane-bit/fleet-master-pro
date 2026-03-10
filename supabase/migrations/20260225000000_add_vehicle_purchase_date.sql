-- Migration : Ajout de la colonne purchase_date à la table vehicles
-- Date : 2026-02-25
-- Issue : La colonne existe dans le schéma Zod mais pas en base de données

-- Ajouter la colonne purchase_date si elle n'existe pas
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'vehicles' 
        AND column_name = 'purchase_date'
    ) THEN
        ALTER TABLE vehicles 
        ADD COLUMN purchase_date DATE NULL;
        
        RAISE NOTICE 'Colonne purchase_date ajoutée à la table vehicles';
    ELSE
        RAISE NOTICE 'Colonne purchase_date existe déjà dans la table vehicles';
    END IF;
END $$;

-- Mettre à jour le commentaire de la table pour documenter cette colonne
COMMENT ON COLUMN vehicles.purchase_date IS 'Date d\'achat du véhicule (optionnel)';
