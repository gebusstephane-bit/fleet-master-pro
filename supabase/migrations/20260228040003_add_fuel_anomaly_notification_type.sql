-- ============================================================
-- Ajoute fuel_anomaly au CHECK constraint de notifications.type
-- La contrainte initiale (20250209000015) ne l'incluait pas en DB réelle
-- ============================================================

ALTER TABLE notifications
DROP CONSTRAINT IF EXISTS notifications_type_check;

ALTER TABLE notifications
ADD CONSTRAINT notifications_type_check
CHECK (type IN (
  'maintenance_due',
  'maintenance_overdue',
  'document_expiring',
  'document_expired',
  'fuel_anomaly',
  'geofencing_entry',
  'geofencing_exit',
  'alert_critical',
  'alert_warning',
  'route_assigned',
  'inspection_completed',
  'system'
));
