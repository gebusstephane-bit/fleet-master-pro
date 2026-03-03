-- ============================================================
-- Migration : Étendre driver_alert_logs.document_type
--
-- Ajout des 4 nouveaux types de documents réglementaires :
--   DRIVER_CARD  → Carte conducteur numérique
--   FCOS         → FCO (Formation Continue Obligatoire)
--   MEDICAL      → Aptitude médicale
--   ADR          → Certificat ADR (matières dangereuses)
--
-- La contrainte UNIQUE existante (driver_id, document_type, alert_level, expiry_date)
-- s'applique automatiquement aux nouveaux types — pas besoin de la recréer.
-- ============================================================

-- Supprimer l'ancien CHECK constraint (uniquement 'LICENSE', 'CQC')
ALTER TABLE driver_alert_logs
  DROP CONSTRAINT IF EXISTS driver_alert_logs_document_type_check;

-- Recréer avec les 6 types valides
ALTER TABLE driver_alert_logs
  ADD CONSTRAINT driver_alert_logs_document_type_check
  CHECK (document_type IN ('LICENSE', 'CQC', 'DRIVER_CARD', 'FCOS', 'MEDICAL', 'ADR'));
