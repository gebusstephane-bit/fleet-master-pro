-- Ajoute la colonne 'side' à driver_documents (recto/verso/complet)
-- À exécuter si la table a été créée sans cette colonne.

ALTER TABLE driver_documents
  ADD COLUMN IF NOT EXISTS side TEXT CHECK (side IN ('recto', 'verso', 'complet'));
