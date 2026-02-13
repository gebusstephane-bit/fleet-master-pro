-- Ajouter la colonne logo_url à la table companies
ALTER TABLE IF EXISTS companies ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Mettre à jour la fonction updated_at si nécessaire
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- S'assurer que le trigger existe
DROP TRIGGER IF EXISTS update_companies_updated_at ON companies;
CREATE TRIGGER update_companies_updated_at
    BEFORE UPDATE ON companies
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
