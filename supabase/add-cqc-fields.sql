-- Ajout des champs CQC (Carte Qualification Conducteur) à la table drivers

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS cqc_card_number TEXT,
ADD COLUMN IF NOT EXISTS cqc_expiry_date DATE,
ADD COLUMN IF NOT EXISTS cqc_category TEXT CHECK (cqc_category IN ('PASSENGER', 'GOODS', 'BOTH'));

-- Ajout du type de permis
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS license_type TEXT DEFAULT 'B';

-- Ajout des scores (si pas déjà présents)
ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS safety_score INTEGER CHECK (safety_score >= 0 AND safety_score <= 100),
ADD COLUMN IF NOT EXISTS fuel_efficiency_score INTEGER CHECK (fuel_efficiency_score >= 0 AND fuel_efficiency_score <= 100);

-- Vérification
SELECT 
  column_name, 
  data_type,
  column_default
FROM information_schema.columns 
WHERE table_name = 'drivers' 
AND column_name IN ('cqc_card_number', 'cqc_expiry_date', 'cqc_category', 'license_type', 'safety_score', 'fuel_efficiency_score')
ORDER BY ordinal_position;
