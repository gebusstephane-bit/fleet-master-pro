-- =====================================================
-- URGENCE: Recuperation et correction des vehicules
-- =====================================================

-- ETAPE 1: Diagnostic - Verifier si les vehicules existent
SELECT 'Nombre de vehicules: ' || COUNT(*)::text as info FROM vehicles;

-- ETAPE 2: Si RLS pose probleme, verifions et corrigeons
-- Desactiver temporairement RLS pour voir toutes les donnees (diagnostic uniquement)
ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Verifier les vehicules
SELECT id, registration_number, brand, model, company_id, created_at 
FROM vehicles 
ORDER BY created_at DESC 
LIMIT 10;

-- Reactiver RLS
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- ETAPE 3: Ajouter les champs QR Code manquants
-- =====================================================

-- Ajouter qr_code_data si manquant
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS qr_code_data TEXT;
COMMENT ON COLUMN vehicles.qr_code_data IS 'Donnees encodees dans le QR code';

-- Ajouter qr_code_url si manquant  
ALTER TABLE vehicles ADD COLUMN IF NOT EXISTS qr_code_url TEXT;
COMMENT ON COLUMN vehicles.qr_code_url IS 'URL du QR code generee';

-- =====================================================
-- ETAPE 4: Generer les QR codes pour tous les vehicules
-- =====================================================

UPDATE vehicles 
SET qr_code_data = CASE 
  WHEN qr_code_data IS NULL OR qr_code_data = '' 
  THEN 'fleetmaster://vehicle/' || id::text
  ELSE qr_code_data
END;

-- Verifier
SELECT id, registration_number, qr_code_data FROM vehicles LIMIT 5;

-- =====================================================
-- ETAPE 5: Corriger les politiques RLS
-- =====================================================

-- Supprimer les anciennes politiques
DROP POLICY IF EXISTS vehicles_select_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_insert_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_update_policy ON vehicles;
DROP POLICY IF EXISTS vehicles_delete_policy ON vehicles;

-- S'assurer que RLS est active
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- Politique SELECT
CREATE POLICY vehicles_select_policy ON vehicles
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique INSERT
CREATE POLICY vehicles_insert_policy ON vehicles
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique UPDATE
CREATE POLICY vehicles_update_policy ON vehicles
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique DELETE (admin uniquement)
CREATE POLICY vehicles_delete_policy ON vehicles
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- ETAPE 6: Verifier la table profiles
-- =====================================================

-- Creer la table profiles si elle n'existe pas
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  company_id UUID,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Verifier les profiles
SELECT id, email, full_name, role, company_id FROM profiles LIMIT 5;

-- =====================================================
-- ETAPE 7: Resultat final
-- =====================================================

SELECT 
  'Total vehicules: ' || COUNT(*)::text as resultat,
  'Avec QR code: ' || COUNT(*) FILTER (WHERE qr_code_data IS NOT NULL)::text as qr_codes
FROM vehicles;
