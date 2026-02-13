-- ============================================
-- MIGRATION : Correction définitive des contraintes
-- ============================================

-- 1. SUPPRIMER TOUTES les contraintes existantes problématiques
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_type_check;
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_status_check;
ALTER TABLE maintenance_records DROP CONSTRAINT IF EXISTS maintenance_records_priority_check;

-- 2. Recréer les contraintes avec TOUTES les valeurs possibles (anciennes + nouvelles)
ALTER TABLE maintenance_records 
ADD CONSTRAINT maintenance_records_type_check 
CHECK (type IN ('PREVENTIVE', 'CORRECTIVE', 'PNEUMATIQUE', 'CARROSSERIE', 'routine', 'repair', 'inspection', 'tire_change', 'oil_change', 'BRAKE_CHANGE', 'FILTER_CHANGE', 'TIMING_BELT', 'TECHNICAL_CONTROL', 'OTHER'));

ALTER TABLE maintenance_records 
ADD CONSTRAINT maintenance_records_status_check 
CHECK (status IN ('DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS', 'TERMINEE', 'REFUSEE', 'completed', 'pending', 'in_progress', 'open', 'scheduled'));

ALTER TABLE maintenance_records 
ADD CONSTRAINT maintenance_records_priority_check 
CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL'));

-- 3. Supprimer les colonnes obsolètes qui causent des erreurs NOT NULL (si elles existent)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'maintenance_records' AND column_name = 'service_date') THEN
        ALTER TABLE maintenance_records ALTER COLUMN service_date DROP NOT NULL;
    END IF;
    
    IF EXISTS (SELECT 1 FROM information_schema.columns 
               WHERE table_name = 'maintenance_records' AND column_name = 'scheduled_date') THEN
        ALTER TABLE maintenance_records ALTER COLUMN scheduled_date DROP NOT NULL;
    END IF;
END $$;

-- 4. S'assurer que toutes les colonnes nécessaires existent
ALTER TABLE maintenance_records 
ADD COLUMN IF NOT EXISTS requested_by UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'DEMANDE_CREEE',
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'NORMAL',
ADD COLUMN IF NOT EXISTS requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS validated_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS rdv_confirmed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS completed_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS garage_name TEXT,
ADD COLUMN IF NOT EXISTS garage_address TEXT,
ADD COLUMN IF NOT EXISTS garage_phone TEXT,
ADD COLUMN IF NOT EXISTS rdv_date DATE,
ADD COLUMN IF NOT EXISTS rdv_time TIME,
ADD COLUMN IF NOT EXISTS estimated_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS final_cost DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS notes_request TEXT,
ADD COLUMN IF NOT EXISTS notes_validation TEXT,
ADD COLUMN IF NOT EXISTS notes_completion TEXT,
ADD COLUMN IF NOT EXISTS validation_token UUID DEFAULT gen_random_uuid(),
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES companies(id);

-- 5. Mettre à jour les enregistrements existants pour avoir des valeurs par défaut valides
UPDATE maintenance_records 
SET status = 'DEMANDE_CREEE' 
WHERE status IS NULL OR status NOT IN ('DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 'EN_COURS', 'TERMINEE', 'REFUSEE', 'completed', 'pending');

UPDATE maintenance_records 
SET type = 'CORRECTIVE' 
WHERE type IS NULL OR type NOT IN ('PREVENTIVE', 'CORRECTIVE', 'PNEUMATIQUE', 'CARROSSERIE', 'routine', 'repair');

UPDATE maintenance_records 
SET priority = 'NORMAL' 
WHERE priority IS NULL OR priority NOT IN ('LOW', 'NORMAL', 'HIGH', 'CRITICAL');

UPDATE maintenance_records 
SET requested_at = created_at 
WHERE requested_at IS NULL;

-- 6. Recréer la vue
DROP VIEW IF EXISTS maintenance_with_details;
CREATE VIEW maintenance_with_details AS
SELECT 
  m.*,
  v.registration_number as vehicle_registration,
  v.brand as vehicle_brand,
  v.model as vehicle_model,
  v.mileage as vehicle_mileage,
  u.first_name as requester_first_name,
  u.last_name as requester_last_name,
  u.email as requester_email
FROM maintenance_records m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
LEFT JOIN users u ON m.requested_by = u.id;

-- 7. Vérification
SELECT 'Contraintes mises à jour avec succès' as result;
