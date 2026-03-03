-- ============================================================================
-- MIGRATION : Ajout du rôle CHAUFFEUR + Accès application mobile
-- Date : 2025-03-01
-- ============================================================================

-- ----------------------------------------------------------------------------
-- ÉTAPE 1 : Ajouter le rôle CHAUFFEUR à la table profiles
-- ----------------------------------------------------------------------------

-- Note : Les rôles sont définis comme un type enum dans la contrainte CHECK
-- On doit recréer la contrainte pour ajouter 'CHAUFFEUR'

-- Vérifier la contrainte existante
-- \d profiles

-- Supprimer l'ancienne contrainte et créer la nouvelle avec CHAUFFEUR
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles
ADD CONSTRAINT profiles_role_check 
CHECK (role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT', 'CHAUFFEUR'));

-- ----------------------------------------------------------------------------
-- ÉTAPE 2 : Ajouter les colonnes d'accès app à la table drivers
-- ----------------------------------------------------------------------------

ALTER TABLE drivers 
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS has_app_access BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS app_access_enabled_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS app_access_enabled_by UUID REFERENCES auth.users(id);

-- ----------------------------------------------------------------------------
-- ÉTAPE 3 : Créer les index pour les performances
-- ----------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_drivers_user_id ON drivers(user_id);
CREATE INDEX IF NOT EXISTS idx_drivers_has_app_access ON drivers(has_app_access) WHERE has_app_access = true;

-- ----------------------------------------------------------------------------
-- ÉTAPE 4 : Fonction helper pour récupérer le véhicule assigné au conducteur
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION get_driver_vehicle_id(driver_uuid UUID)
RETURNS UUID AS $$
  SELECT v.id 
  FROM vehicles v
  WHERE v.assigned_driver_id = driver_uuid
     OR v.driver_id = driver_uuid
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Version qui utilise auth.uid() pour le contexte RLS
CREATE OR REPLACE FUNCTION get_current_driver_vehicle_id()
RETURNS UUID AS $$
  SELECT v.id 
  FROM vehicles v
  JOIN drivers d ON d.id = v.assigned_driver_id OR d.id = v.driver_id
  WHERE d.user_id = auth.uid()
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- ----------------------------------------------------------------------------
-- ÉTAPE 5 : Policies RLS pour l'isolation des données chauffeurs
-- ----------------------------------------------------------------------------

-- Note : Ces policies s'ajoutent aux policies existantes
-- Un chauffeur ne peut voir que les données de SON véhicule

-- Policy pour fuel_records : Chauffeur voit uniquement son véhicule
DROP POLICY IF EXISTS chauffeur_fuel_isolation ON fuel_records;
CREATE POLICY chauffeur_fuel_isolation ON fuel_records
  FOR SELECT USING (
    -- Les admins/directeurs voient tout (policy existante)
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
      AND p.company_id = fuel_records.company_id
    )
    OR
    -- Le chauffeur voit uniquement son véhicule
    (
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'CHAUFFEUR'
        AND p.company_id = fuel_records.company_id
      )
      AND vehicle_id = get_current_driver_vehicle_id()
    )
  );

-- Policy INSERT pour fuel_records (chauffeur peut saisir son carburant)
DROP POLICY IF EXISTS chauffeur_fuel_insert ON fuel_records;
CREATE POLICY chauffeur_fuel_insert ON fuel_records
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role = 'CHAUFFEUR'
      AND p.company_id = fuel_records.company_id
    )
    AND vehicle_id = get_current_driver_vehicle_id()
  );

-- Policy pour maintenance_records : Chauffeur voit les maintenances de son véhicule
DROP POLICY IF EXISTS chauffeur_maintenance_view ON maintenance_records;
CREATE POLICY chauffeur_maintenance_view ON maintenance_records
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
      AND p.company_id = maintenance_records.company_id
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'CHAUFFEUR'
        AND p.company_id = maintenance_records.company_id
      )
      AND vehicle_id = get_current_driver_vehicle_id()
    )
  );

-- Policy pour vehicles : Chauffeur voit uniquement son véhicule assigné
DROP POLICY IF EXISTS chauffeur_vehicle_view ON vehicles;
CREATE POLICY chauffeur_vehicle_view ON vehicles
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT')
      AND p.company_id = vehicles.company_id
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM profiles p 
        WHERE p.id = auth.uid() 
        AND p.role = 'CHAUFFEUR'
        AND p.company_id = vehicles.company_id
      )
      AND (assigned_driver_id IN (
        SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()
      ) OR driver_id IN (
        SELECT d.id FROM drivers d WHERE d.user_id = auth.uid()
      ))
    )
  );

-- Policy pour drivers : Un chauffeur ne peut voir que SON profil
DROP POLICY IF EXISTS chauffeur_driver_view ON drivers;
CREATE POLICY chauffeur_driver_view ON drivers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles p 
      WHERE p.id = auth.uid() 
      AND p.role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT')
      AND p.company_id = drivers.company_id
    )
    OR
    user_id = auth.uid()  -- Le chauffeur voit uniquement son propre profil
  );

-- Policy UPDATE pour drivers : Un chauffeur ne peut modifier que SON profil (champs limités)
DROP POLICY IF EXISTS chauffeur_driver_update ON drivers;
CREATE POLICY chauffeur_driver_update ON drivers
  FOR UPDATE USING (
    user_id = auth.uid()
  ) WITH CHECK (
    user_id = auth.uid()
  );

-- ----------------------------------------------------------------------------
-- ÉTAPE 6 : Trigger pour logger la création d'accès app
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION log_driver_app_access_change()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.has_app_access IS DISTINCT FROM NEW.has_app_access THEN
    IF NEW.has_app_access = true THEN
      NEW.app_access_enabled_at = NOW();
    ELSE
      NEW.app_access_enabled_at = NULL;
      NEW.app_access_enabled_by = NULL;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_driver_app_access ON drivers;
CREATE TRIGGER trigger_driver_app_access
  BEFORE UPDATE ON drivers
  FOR EACH ROW
  EXECUTE FUNCTION log_driver_app_access_change();

-- ----------------------------------------------------------------------------
-- ÉTAPE 7 : Commentaires pour documentation
-- ----------------------------------------------------------------------------

COMMENT ON COLUMN drivers.user_id IS 'Lien vers auth.users pour le compte de connexion du conducteur';
COMMENT ON COLUMN drivers.has_app_access IS 'Indique si le conducteur a un accès à l''application mobile';
COMMENT ON COLUMN drivers.app_access_enabled_at IS 'Date/heure d''activation de l''accès app';
COMMENT ON COLUMN drivers.app_access_enabled_by IS 'ID de l''utilisateur ayant activé l''accès';

-- ============================================================================
-- FIN DE LA MIGRATION
-- ============================================================================
