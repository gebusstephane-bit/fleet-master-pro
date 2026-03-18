-- Ajout du rôle CHAUFFEUR à la contrainte check_user_role
-- Le rôle CHAUFFEUR est utilisé pour les conducteurs de la driver-app
-- Distinct du rôle EXPLOITANT (dashboard classique)

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS check_user_role;

ALTER TABLE profiles ADD CONSTRAINT check_user_role
CHECK (role IN ('ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC', 'EXPLOITANT', 'CHAUFFEUR'));
