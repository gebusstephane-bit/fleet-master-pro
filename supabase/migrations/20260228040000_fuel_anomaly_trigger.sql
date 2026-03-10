-- ============================================================
-- TRIGGER : Détection d'anomalies carburant
-- Déclenché AFTER INSERT sur fuel_records
-- Insère une notification pour chaque admin/gestionnaire
-- de la société si l'écart dépasse 20% de la moyenne.
-- ============================================================

-- Fonction trigger
CREATE OR REPLACE FUNCTION check_fuel_anomaly()
RETURNS TRIGGER AS $$
DECLARE
  avg_consumption  DECIMAL;
  deviation        DECIMAL;
  v_vehicle_label  TEXT;
  v_user           RECORD;
BEGIN
  -- Ne rien faire si la consommation n'est pas calculée
  IF NEW.consumption_l_per_100km IS NULL THEN
    RETURN NEW;
  END IF;

  -- Moyenne des 5 derniers pleins pour ce véhicule (hors enregistrement courant)
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

  -- Pas encore d'historique suffisant
  IF avg_consumption IS NULL OR avg_consumption = 0 THEN
    RETURN NEW;
  END IF;

  deviation := ABS(NEW.consumption_l_per_100km - avg_consumption) / avg_consumption * 100;

  IF deviation <= 20 THEN
    RETURN NEW;
  END IF;

  -- Récupérer l'immatriculation pour le message
  SELECT registration_number INTO v_vehicle_label
  FROM vehicles
  WHERE id = NEW.vehicle_id;

  v_vehicle_label := COALESCE(v_vehicle_label, NEW.vehicle_id::TEXT);

  -- Créer une notification pour chaque admin/directeur/agent_de_parc de l'entreprise
  IF NEW.company_id IS NOT NULL THEN
    FOR v_user IN
      SELECT id
      FROM profiles
      WHERE company_id = NEW.company_id
        AND role       IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC')
        AND is_active  = TRUE
    LOOP
      INSERT INTO notifications (
        user_id,
        type,
        priority,
        title,
        message,
        link,
        data
      ) VALUES (
        v_user.id,
        'fuel_anomaly',
        CASE WHEN deviation > 35 THEN 'high' ELSE 'normal' END,
        'Anomalie carburant détectée',
        format(
          'Consommation anormale pour %s : %.1f L/100km (moyenne : %.1f L/100km, écart : %.0f%%)',
          v_vehicle_label,
          NEW.consumption_l_per_100km,
          avg_consumption,
          deviation
        ),
        '/fuel',
        jsonb_build_object(
          'vehicle_id',      NEW.vehicle_id,
          'fuel_record_id',  NEW.id,
          'actual',          NEW.consumption_l_per_100km,
          'average',         avg_consumption,
          'deviation_percent', deviation
        )
      );
    END LOOP;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Supprimer le trigger s'il existait déjà (idempotent)
DROP TRIGGER IF EXISTS fuel_anomaly_trigger ON fuel_records;

CREATE TRIGGER fuel_anomaly_trigger
  AFTER INSERT ON fuel_records
  FOR EACH ROW
  EXECUTE FUNCTION check_fuel_anomaly();
