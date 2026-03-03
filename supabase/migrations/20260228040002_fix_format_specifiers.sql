-- ============================================================
-- CORRECTIF : format() PostgreSQL ne supporte pas %.1f
-- Utilise %s + ROUND() pour formatter les nombres
-- ============================================================

CREATE OR REPLACE FUNCTION check_fuel_anomaly()
RETURNS TRIGGER AS $$
DECLARE
  avg_consumption  DECIMAL;
  deviation        DECIMAL;
  v_vehicle_label  TEXT;
  v_user           RECORD;
BEGIN
  IF NEW.consumption_l_per_100km IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT AVG(consumption_l_per_100km) INTO avg_consumption
  FROM (
    SELECT consumption_l_per_100km
    FROM fuel_records
    WHERE vehicle_id = NEW.vehicle_id
      AND id        != NEW.id
      AND consumption_l_per_100km IS NOT NULL
    ORDER BY date DESC
    LIMIT 5
  ) sub;

  IF avg_consumption IS NULL OR avg_consumption = 0 THEN
    RETURN NEW;
  END IF;

  deviation := ABS(NEW.consumption_l_per_100km - avg_consumption) / avg_consumption * 100;

  IF deviation <= 20 THEN
    RETURN NEW;
  END IF;

  SELECT registration_number INTO v_vehicle_label
  FROM vehicles WHERE id = NEW.vehicle_id;
  v_vehicle_label := COALESCE(v_vehicle_label, NEW.vehicle_id::TEXT);

  IF NEW.company_id IS NOT NULL THEN
    FOR v_user IN
      SELECT id FROM profiles
      WHERE company_id = NEW.company_id
        AND role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
        AND is_active = TRUE
    LOOP
      INSERT INTO notifications (user_id, type, priority, title, message, link, data)
      VALUES (
        v_user.id,
        'fuel_anomaly',
        CASE WHEN deviation > 35 THEN 'high' ELSE 'normal' END,
        'Anomalie carburant détectée',
        format(
          'Consommation anormale pour %s : %s L/100km (moyenne : %s L/100km, écart : %s%%)',
          v_vehicle_label,
          ROUND(NEW.consumption_l_per_100km::NUMERIC, 1),
          ROUND(avg_consumption::NUMERIC, 1),
          ROUND(deviation::NUMERIC, 0)
        ),
        '/fuel',
        jsonb_build_object(
          'vehicle_id',        NEW.vehicle_id,
          'fuel_record_id',    NEW.id,
          'actual',            NEW.consumption_l_per_100km,
          'average',           avg_consumption,
          'deviation_percent', deviation
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
