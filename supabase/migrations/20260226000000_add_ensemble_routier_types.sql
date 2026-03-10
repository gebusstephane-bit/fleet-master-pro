-- ============================================================
-- MIGRATION : Ajout des types "Ensemble Routier"
-- Nouveaux types : TRACTEUR_ROUTIER, REMORQUE, REMORQUE_FRIGO
-- ============================================================

-- Étape 1 : Supprimer l'ancienne contrainte CHECK sur vehicles.type
ALTER TABLE vehicles DROP CONSTRAINT IF EXISTS vehicles_type_check;

-- Étape 2 : Ajouter la nouvelle contrainte avec les 7 types valides
ALTER TABLE vehicles ADD CONSTRAINT vehicles_type_check
CHECK (type IN (
  'VOITURE',
  'FOURGON',
  'POIDS_LOURD',
  'POIDS_LOURD_FRIGO',
  'TRACTEUR_ROUTIER',   -- Ensemble routier : tracteur (CT 1an + Tachy 2ans)
  'REMORQUE',           -- Ensemble routier : remorque (CT 1an)
  'REMORQUE_FRIGO'      -- Ensemble routier : remorque frigo (CT 1an + ATP 5ans)
));

-- ============================================================
-- Étape 3 : Mettre à jour le trigger de calcul automatique
-- Le trigger existant (calculate_vehicle_expiry_dates) calcule déjà
-- correctement les dates car il se base sur :
--   - type IN ('POIDS_LOURD', 'POIDS_LOURD_FRIGO') → CT 1 an  (SINON 2 ans)
--   - tachy_control_date IS NOT NULL             → Tachy +2 ans
--   - atp_date IS NOT NULL                       → ATP +5 ans
--
-- On met à jour la fonction pour inclure les nouveaux types PL.
-- ============================================================

CREATE OR REPLACE FUNCTION calculate_vehicle_expiry_dates()
RETURNS TRIGGER AS $$
BEGIN
    -- CT : 1 an pour tous les PL / Ensemble routier, 2 ans pour VL/Fourgon
    IF NEW.technical_control_date IS NOT NULL THEN
        IF NEW.type IN ('POIDS_LOURD', 'POIDS_LOURD_FRIGO', 'TRACTEUR_ROUTIER', 'REMORQUE', 'REMORQUE_FRIGO') THEN
            NEW.technical_control_expiry := NEW.technical_control_date + INTERVAL '1 year';
        ELSE
            NEW.technical_control_expiry := NEW.technical_control_date + INTERVAL '2 years';
        END IF;
    END IF;

    -- Tachygraphe : +2 ans (Tracteur Routier, PL, PL Frigo)
    IF NEW.tachy_control_date IS NOT NULL THEN
        NEW.tachy_control_expiry := NEW.tachy_control_date + INTERVAL '2 years';
    END IF;

    -- ATP : +5 ans (PL Frigo, Remorque Frigo)
    IF NEW.atp_date IS NOT NULL THEN
        NEW.atp_expiry := NEW.atp_date + INTERVAL '5 years';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- Étape 4 : Mettre à jour les commentaires de documentation
-- ============================================================

COMMENT ON COLUMN vehicles.type IS
  'Type de véhicule : '
  'VOITURE (CT 2ans) | FOURGON (CT 2ans) | '
  'POIDS_LOURD (CT 1an + Tachy 2ans) | POIDS_LOURD_FRIGO (CT 1an + Tachy 2ans + ATP 5ans) | '
  'TRACTEUR_ROUTIER (CT 1an + Tachy 2ans) | REMORQUE (CT 1an) | REMORQUE_FRIGO (CT 1an + ATP 5ans)';

-- ============================================================
-- Vérification
-- ============================================================

SELECT
    type,
    COUNT(*) AS count,
    CASE
        WHEN type IN ('VOITURE', 'FOURGON', 'POIDS_LOURD', 'POIDS_LOURD_FRIGO',
                      'TRACTEUR_ROUTIER', 'REMORQUE', 'REMORQUE_FRIGO')
        THEN '✅ VALIDE'
        ELSE '❌ INVALIDE'
    END AS status
FROM vehicles
GROUP BY type;
