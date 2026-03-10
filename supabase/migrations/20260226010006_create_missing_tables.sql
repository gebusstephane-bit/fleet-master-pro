-- ============================================
-- CRÉATION DES TABLES MANQUANTES
-- ============================================

-- Table vehicle_inspections
CREATE TABLE IF NOT EXISTS vehicle_inspections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID,
  mileage INTEGER NOT NULL DEFAULT 0,
  fuel_level INTEGER DEFAULT 50,
  driver_name TEXT,
  location TEXT DEFAULT 'Dépôt',
  score INTEGER DEFAULT 100,
  grade TEXT DEFAULT 'A',
  status TEXT DEFAULT 'PENDING',
  reported_defects JSONB DEFAULT '[]'::jsonb,
  cleanliness_exterior INTEGER DEFAULT 3,
  cleanliness_interior INTEGER DEFAULT 3,
  inspection_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vehicle_inspections_vehicle ON vehicle_inspections(vehicle_id);

-- Table maintenance_records (si nécessaire pour les triggers)
CREATE TABLE IF NOT EXISTS maintenance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  vehicle_id UUID REFERENCES vehicles(id) ON DELETE CASCADE,
  company_id UUID,
  type TEXT DEFAULT 'CORRECTIVE',
  status TEXT DEFAULT 'DEMANDE_CREEE',
  description TEXT,
  priority TEXT DEFAULT 'NORMAL',
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Table activity_logs
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  user_id UUID,
  action_type TEXT,
  entity_type TEXT,
  entity_id UUID,
  entity_name TEXT,
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_company ON activity_logs(company_id);

-- Activer RLS
ALTER TABLE vehicle_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenance_records ENABLE ROW LEVEL SECURITY;

-- Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    -- vehicle_inspections policies
    DROP POLICY IF EXISTS vehicle_inspections_select ON vehicle_inspections;
    CREATE POLICY vehicle_inspections_select ON vehicle_inspections
      FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
    
    -- maintenance_records policies  
    DROP POLICY IF EXISTS maintenance_records_select ON maintenance_records;
    CREATE POLICY maintenance_records_select ON maintenance_records
      FOR SELECT USING (company_id IN (SELECT company_id FROM profiles WHERE id = auth.uid()));
  END IF;
END $$;
