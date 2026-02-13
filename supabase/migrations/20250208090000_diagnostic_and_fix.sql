-- =====================================================
-- DIAGNOSTIC ET CORRECTION - Vehicules et QR Code
-- =====================================================

-- 1. VERIFICATION: La table vehicles existe-t-elle encore?
SELECT 
  EXISTS (
    SELECT 1 FROM pg_tables 
    WHERE tablename = 'vehicles' AND schemaname = 'public'
  ) as vehicles_table_exists;

-- 2. VERIFICATION: Combien de vehicules dans la table?
SELECT COUNT(*) as total_vehicles FROM vehicles;

-- 3. VERIFICATION: Structure de la table vehicles
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'vehicles' 
ORDER BY ordinal_position;

-- =====================================================
-- CORRECTION: Ajout du champ qr_code si manquant
-- =====================================================

-- Ajouter la colonne qr_code_url pour stocker l'URL du QR code
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'qr_code_url'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN qr_code_url TEXT;
    COMMENT ON COLUMN vehicles.qr_code_url IS 'URL du QR code unique pour ce vehicule';
  END IF;
END
$$;

-- Ajouter la colonne qr_code_data pour stocker les donnees du QR
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'vehicles' AND column_name = 'qr_code_data'
  ) THEN
    ALTER TABLE vehicles ADD COLUMN qr_code_data TEXT;
    COMMENT ON COLUMN vehicles.qr_code_data IS 'Donnees encodees dans le QR code (ex: fleetmaster://vehicle/[id])';
  END IF;
END
$$;

-- =====================================================
-- GENERATION des QR codes pour les vehicules existants
-- =====================================================

-- Mettre a jour tous les vehicules avec leur QR code unique
UPDATE vehicles 
SET qr_code_data = 'fleetmaster://vehicle/' || id::text
WHERE qr_code_data IS NULL;

-- =====================================================
-- VERIFICATION des politiques RLS sur vehicles
-- =====================================================

-- Verifier si RLS est active
SELECT relname, relrowsecurity 
FROM pg_class 
WHERE relname = 'vehicles';

-- Si les vehicules ne sont pas visibles, desactiver temporairement RLS pour diagnostic
-- (A commenter en production)
-- ALTER TABLE vehicles DISABLE ROW LEVEL SECURITY;

-- Reactiver RLS
-- ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- POLITIQUES RLS pour vehicles (securise)
-- =====================================================

-- Politique SELECT: Voir les vehicules de sa companie
DROP POLICY IF EXISTS vehicles_select_policy ON vehicles;
CREATE POLICY vehicles_select_policy ON vehicles
  FOR SELECT USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique INSERT: Creer des vehicules pour sa companie
DROP POLICY IF EXISTS vehicles_insert_policy ON vehicles;
CREATE POLICY vehicles_insert_policy ON vehicles
  FOR INSERT WITH CHECK (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique UPDATE: Modifier les vehicules de sa companie
DROP POLICY IF EXISTS vehicles_update_policy ON vehicles;
CREATE POLICY vehicles_update_policy ON vehicles
  FOR UPDATE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Politique DELETE: Supprimer les vehicules de sa companie (admin seulement)
DROP POLICY IF EXISTS vehicles_delete_policy ON vehicles;
CREATE POLICY vehicles_delete_policy ON vehicles
  FOR DELETE USING (
    company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    ) AND EXISTS (
      SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'ADMIN')
    )
  );

-- =====================================================
-- VERIFICATION: Table profiles
-- =====================================================

-- S'assurer que la table profiles existe avec les bonnes colonnes
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  full_name TEXT,
  role TEXT DEFAULT 'user',
  company_id UUID,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Activer RLS sur profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Politique pour profiles (utilisateur voit son propre profil et ceux de sa companie)
DROP POLICY IF EXISTS profiles_select_policy ON profiles;
CREATE POLICY profiles_select_policy ON profiles
  FOR SELECT USING (
    id = auth.uid() OR company_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid()
    )
  );

-- =====================================================
-- RECAPITULATIF
-- =====================================================

-- Afficher le nombre de vehicules par companie
SELECT 
  c.name as company_name,
  COUNT(v.id) as vehicle_count
FROM companies c
LEFT JOIN vehicles v ON c.id = v.company_id
GROUP BY c.id, c.name
ORDER BY c.name;

-- Afficher les 5 premiers vehicules avec leur QR code
SELECT 
  id,
  registration_number,
  brand,
  model,
  qr_code_data,
  qr_code_url
FROM vehicles
LIMIT 5;
