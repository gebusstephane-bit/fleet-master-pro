-- ============================================
-- MIGRATION FIX: Ajout des colonnes manquantes à vehicles
-- ============================================

-- Fonction utilitaire pour ajouter une colonne si elle n'existe pas
CREATE OR REPLACE FUNCTION add_column_if_not_exists(
    p_table TEXT,
    p_column TEXT,
    p_type TEXT
) RETURNS void AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = p_table 
        AND column_name = p_column
    ) THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN %I %s', p_table, p_column, p_type);
    END IF;
END;
$$ LANGUAGE plpgsql;

-- Ajouter les colonnes manquantes à vehicles
SELECT add_column_if_not_exists('vehicles', 'company_id', 'UUID REFERENCES companies(id) ON DELETE CASCADE');
SELECT add_column_if_not_exists('vehicles', 'qr_code_data', 'UUID DEFAULT gen_random_uuid()');
SELECT add_column_if_not_exists('vehicles', 'status', 'TEXT DEFAULT ''active''');
SELECT add_column_if_not_exists('vehicles', 'mileage', 'INTEGER DEFAULT 0');
SELECT add_column_if_not_exists('vehicles', 'registration_number', 'TEXT');
SELECT add_column_if_not_exists('vehicles', 'brand', 'TEXT');
SELECT add_column_if_not_exists('vehicles', 'model', 'TEXT');
SELECT add_column_if_not_exists('vehicles', 'type', 'TEXT');
SELECT add_column_if_not_exists('vehicles', 'updated_at', 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()');
SELECT add_column_if_not_exists('vehicles', 'created_at', 'TIMESTAMP WITH TIME ZONE DEFAULT NOW()');

-- Supprimer la fonction utilitaire
DROP FUNCTION add_column_if_not_exists;

-- Index sur qr_code_data
CREATE INDEX IF NOT EXISTS idx_vehicles_qr_code_data ON vehicles(qr_code_data);

-- Générer des tokens pour les véhicules existants
UPDATE vehicles 
SET qr_code_data = gen_random_uuid()
WHERE qr_code_data IS NULL;

-- Mettre à jour les véhicules sans company_id (optionnel - nécessite une valeur par défaut)
-- UPDATE vehicles SET company_id = (SELECT id FROM companies LIMIT 1) WHERE company_id IS NULL;
