-- ============================================================-- Migration: Lien optionnel entre incidents et maintenance_records-- Date: 2026-03-06-- ============================================================

-- Ajout de la colonne maintenance_record_id à la table incidents
-- Contrainte: ON DELETE SET NULL (jamais CASCADE sur cette relation)
ALTER TABLE incidents 
ADD COLUMN IF NOT EXISTS maintenance_record_id UUID REFERENCES maintenance_records(id) ON DELETE SET NULL;

-- Index pour les requêtes de jointure
CREATE INDEX IF NOT EXISTS incidents_maintenance_record_id_idx ON incidents(maintenance_record_id);

-- Index inverse pour trouver les incidents liés à une maintenance
CREATE INDEX IF NOT EXISTS maintenance_record_incidents_idx ON incidents(maintenance_record_id) WHERE maintenance_record_id IS NOT NULL;

-- Mise à jour de la RLS: aucun changement nécessaire car la colonne est optionnelle
-- et les policies existantes sur company_id suffisent

-- Commentaire sur la colonne
COMMENT ON COLUMN incidents.maintenance_record_id IS 'Lien optionnel vers une intervention de maintenance (sinistre survenu pendant une intervention)';
