-- ============================================================================
-- MIGRATION : Correction colonne photos + ajout bucket storage inspections
-- Objectif : Passer photos de text[] à JSONB pour cohérence Supabase
-- ============================================================================

-- ============================================================================
-- ÉTAPE 1 : Backup sécurité (créer une vue temporaire avec données actuelles)
-- ============================================================================
DO $$
BEGIN
    -- Vérifier si la colonne existe et est bien text[]
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'vehicle_inspections' 
        AND column_name = 'photos' 
        AND data_type = 'ARRAY'
    ) THEN
        RAISE NOTICE 'Migration photos text[] → JSONB démarrée';
    END IF;
END $$;

-- ============================================================================
-- ÉTAPE 2 : Transformer les données existantes (text[] → JSONB)
-- ============================================================================
-- Créer une colonne temporaire JSONB
ALTER TABLE vehicle_inspections 
ADD COLUMN IF NOT EXISTS photos_jsonb JSONB DEFAULT '[]'::jsonb;

-- Migrer les données : text[] → JSONB
UPDATE vehicle_inspections 
SET photos_jsonb = COALESCE(
    to_jsonb(photos),  -- Convertit text[] en JSONB array
    '[]'::jsonb
)
WHERE photos IS NOT NULL AND array_length(photos, 1) > 0;

-- ============================================================================
-- ÉTAPE 3 : Supprimer l'ancienne colonne et renommer la nouvelle
-- ============================================================================
ALTER TABLE vehicle_inspections 
DROP COLUMN IF EXISTS photos;

ALTER TABLE vehicle_inspections 
RENAME COLUMN photos_jsonb TO photos;

-- ============================================================================
-- ÉTAPE 4 : Contrainte de validation (max 4 photos)
-- ============================================================================
ALTER TABLE vehicle_inspections 
DROP CONSTRAINT IF EXISTS check_photos_max_count;

ALTER TABLE vehicle_inspections 
ADD CONSTRAINT check_photos_max_count 
CHECK (jsonb_array_length(COALESCE(photos, '[]'::jsonb)) <= 4);

-- ============================================================================
-- ÉTAPE 5 : Bucket Storage pour les photos d'inspection
-- ============================================================================
-- Créer le bucket s'il n'existe pas
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'inspections',
    'inspections',
    true,
    2097152,  -- 2MB max par fichier
    ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- ÉTAPE 6 : Politiques RLS pour le bucket inspections
-- ============================================================================
-- Politique : Lecture publique (photos accessibles via URL)
DROP POLICY IF EXISTS "Inspection photos are publicly accessible" ON storage.objects;
CREATE POLICY "Inspection photos are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'inspections');

-- Politique : Insertion uniquement pour utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can upload inspection photos" ON storage.objects;
CREATE POLICY "Authenticated users can upload inspection photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'inspections' 
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text 
        FROM profiles 
        WHERE id = auth.uid()
    )
);

-- Politique : Suppression uniquement par le propriétaire de l'entreprise
DROP POLICY IF EXISTS "Users can delete their company inspection photos" ON storage.objects;
CREATE POLICY "Users can delete their company inspection photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'inspections'
    AND (storage.foldername(name))[1] IN (
        SELECT company_id::text 
        FROM profiles 
        WHERE id = auth.uid()
    )
);

-- ============================================================================
-- ÉTAPE 7 : Commentaire
-- ============================================================================
COMMENT ON COLUMN vehicle_inspections.photos IS 'URLs des photos (max 4) stockées dans le bucket inspections';

-- ============================================================================
-- Vérification finale
-- ============================================================================
DO $$
BEGIN
    RAISE NOTICE '✅ Migration terminée : photos est maintenant JSONB avec max 4 éléments';
    RAISE NOTICE '✅ Bucket storage inspections créé avec limite 2MB/photo';
END $$;
