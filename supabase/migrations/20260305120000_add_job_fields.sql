-- Ajout des champs métier manquants
ALTER TABLE profiles
ADD COLUMN job_title TEXT,
ADD COLUMN department TEXT;