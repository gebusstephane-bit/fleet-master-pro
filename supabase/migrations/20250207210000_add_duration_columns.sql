-- Ajouter les colonnes pour la durée estimée
ALTER TABLE maintenance_records 
ADD COLUMN IF NOT EXISTS estimated_days INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS estimated_hours INTEGER DEFAULT 0;

-- Mettre à jour la vue maintenance_with_details
DROP VIEW IF EXISTS maintenance_with_details;
CREATE VIEW maintenance_with_details AS
SELECT 
  m.*,
  v.registration_number as vehicle_registration,
  v.brand as vehicle_brand,
  v.model as vehicle_model,
  v.mileage as vehicle_mileage,
  u.first_name as requester_first_name,
  u.last_name as requester_last_name,
  u.email as requester_email
FROM maintenance_records m
LEFT JOIN vehicles v ON m.vehicle_id = v.id
LEFT JOIN users u ON m.requested_by = u.id;
