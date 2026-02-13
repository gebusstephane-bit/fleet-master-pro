-- Créer le bucket pour les logos si non existant
INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

-- Politique pour permettre l'upload (admin/service role uniquement via API)
-- Les téléchargements sont publics

-- Supprimer les anciennes politiques si elles existent
DROP POLICY IF EXISTS "Allow public access to logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin upload to logos" ON storage.objects;
DROP POLICY IF EXISTS "Allow admin delete from logos" ON storage.objects;

-- Politique : tout le monde peut lire les logos
CREATE POLICY "Allow public access to logos"
ON storage.objects FOR SELECT
USING (bucket_id = 'logos');

-- Politique : admin peut upload
CREATE POLICY "Allow admin upload to logos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'logos');

-- Politique : admin peut supprimer
CREATE POLICY "Allow admin delete from logos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'logos');

-- Politique : admin peut mettre à jour
CREATE POLICY "Allow admin update logos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'logos');
