-- =====================================================
-- Ajout des clés étrangères pour les relations
-- =====================================================

-- 1. Ajouter la clé étrangère entre vehicle_inspections et vehicles
-- Seulement si elle n'existe pas déjà
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vehicle_inspections_vehicle_id_fkey'
    AND table_name = 'vehicle_inspections'
  ) THEN
    ALTER TABLE vehicle_inspections
    ADD CONSTRAINT vehicle_inspections_vehicle_id_fkey
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id) ON DELETE CASCADE;
  END IF;
END
$$;

-- 2. Ajouter la clé étrangère entre vehicle_inspections et profiles (created_by)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'vehicle_inspections_created_by_fkey'
    AND table_name = 'vehicle_inspections'
  ) THEN
    ALTER TABLE vehicle_inspections
    ADD CONSTRAINT vehicle_inspections_created_by_fkey
    FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE SET NULL;
  END IF;
END
$$;

-- 3. Rafraîchir le cache du schéma Supabase
-- Cette commande force Supabase à recharger les métadonnées
NOTIFY pgrst, 'reload schema';

-- Verification
SELECT 'Contraintes sur vehicle_inspections:' as info;
SELECT constraint_name, constraint_type 
FROM information_schema.table_constraints 
WHERE table_name = 'vehicle_inspections';
