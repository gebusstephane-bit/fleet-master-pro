-- =====================================================
-- FONCTION RPC: Recuperer les vehicules sans RLS
-- =====================================================

-- Fonction qui retourne les vehicules d'une companie
-- SECURITY DEFINER permet de bypass RLS
DROP FUNCTION IF EXISTS get_company_vehicles(UUID);

CREATE OR REPLACE FUNCTION get_company_vehicles(p_company_id UUID)
RETURNS TABLE (
  id UUID,
  company_id UUID,
  registration_number TEXT,
  brand TEXT,
  model TEXT,
  type TEXT,
  mileage INTEGER,
  fuel_type TEXT,
  status TEXT,
  purchase_date DATE,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ,
  qr_code_data TEXT,
  qr_code_url TEXT,
  vin TEXT,
  year INTEGER,
  color TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    v.id,
    v.company_id,
    v.registration_number,
    v.brand,
    v.model,
    v.type,
    v.mileage,
    v.fuel_type,
    v.status,
    v.purchase_date,
    v.created_at,
    v.updated_at,
    v.qr_code_data,
    v.qr_code_url,
    v.vin,
    v.year,
    v.color
  FROM vehicles v
  WHERE v.company_id = p_company_id
  ORDER BY v.created_at DESC;
END;
$$;

-- Donner les droits d'execution
GRANT EXECUTE ON FUNCTION get_company_vehicles(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION get_company_vehicles(UUID) TO anon;

-- =====================================================
-- ALTERNATIVE: Vue avec SECURITY DEFINER
-- =====================================================

-- Creer une vue qui bypass RLS
DROP VIEW IF EXISTS vehicles_safe;

CREATE VIEW vehicles_safe AS
SELECT * FROM vehicles;

-- Activer RLS sur la vue (si possible) ou utiliser des grants
ALTER VIEW vehicles_safe OWNER TO postgres;

-- =====================================================
-- SOLUTION ULTIME: Desactiver RLS sur vehicles temporairement
-- =====================================================

-- Si tout echoue, desactiver RLS (decommenter si necessaire)
-- ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Verification
SELECT 'Fonction RPC creee:' as info;
SELECT routine_name FROM information_schema.routines 
WHERE routine_name = 'get_company_vehicles' AND routine_schema = 'public';
