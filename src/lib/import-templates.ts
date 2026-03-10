/**
 * Génération des templates CSV pour l'import en masse
 * Véhicules et chauffeurs
 */

// ─── Véhicules ───────────────────────────────────────────────────────────────

const VEHICLES_HEADER =
  'immatriculation;marque;modele;annee;type_vehicule;carburant;kilometrage;vin;date_mise_en_service;date_controle_technique;date_atp;date_tachygraphe;numero_serie';

const VEHICLES_EXAMPLE =
  '#AB-123-CD;Renault;Master;2022;FOURGON;diesel;45000;VF1JM1KBH5V123456;2022-01-15;2024-01-15;;2024-01-15;';

const VEHICLES_HINTS = [
  '# INSTRUCTIONS :',
  '# - Les lignes commençant par # sont ignorées',
  '# - Séparateur : point-virgule (;)',
  '# - type_vehicule valeurs : VOITURE | FOURGON | POIDS_LOURD | POIDS_LOURD_FRIGO',
  '# - carburant valeurs : diesel | gasoline | electric | hybrid | lpg',
  '# - Dates au format AAAA-MM-JJ (ex: 2025-06-30)',
  '# - annee = année sur 4 chiffres (ex: 2022)',
  '# - kilometrage = entier sans unité (ex: 45000)',
  '# - vin = numéro VIN (17 caractères), optionnel',
  '# - date_atp et date_tachygraphe = requis pour POIDS_LOURD_FRIGO et POIDS_LOURD',
  '#',
  '# Supprimez les lignes "#" avant d\'importer ou conservez-les (elles seront ignorées)',
].join('\n');

export function getVehiclesCSVTemplate(): string {
  return [VEHICLES_HINTS, VEHICLES_HEADER, VEHICLES_EXAMPLE].join('\n');
}

// ─── Chauffeurs ───────────────────────────────────────────────────────────────

const DRIVERS_HEADER =
  'nom;prenom;email;telephone;numero_permis;categorie_permis;date_expiration_permis;date_naissance;date_embauche;type_contrat';

const DRIVERS_EXAMPLE =
  '#Dupont;Jean;jean.dupont@example.com;0612345678;12AB34567;B;2026-12-31;1985-06-15;2020-01-01;CDI';

const DRIVERS_HINTS = [
  '# INSTRUCTIONS :',
  '# - Les lignes commençant par # sont ignorées',
  '# - Séparateur : point-virgule (;)',
  '# - categorie_permis valeurs : B | C | CE | D | BE | C1 | C1E | D1 | D1E',
  '# - type_contrat valeurs : CDI | CDD | Intérim | Gérant | Autre',
  '# - Dates au format AAAA-MM-JJ (ex: 2026-12-31)',
  '# - telephone = numéro sans espace (ex: 0612345678)',
  '# - email doit être unique par chauffeur',
  '#',
  '# Supprimez les lignes "#" avant d\'importer ou conservez-les (elles seront ignorées)',
].join('\n');

export function getDriversCSVTemplate(): string {
  return [DRIVERS_HINTS, DRIVERS_HEADER, DRIVERS_EXAMPLE].join('\n');
}

// ─── Download helper (client-side uniquement) ─────────────────────────────────

export function downloadCSVTemplate(content: string, filename: string): void {
  // BOM UTF-8 pour que Excel l'ouvre correctement
  const bom = '\uFEFF';
  const blob = new Blob([bom + content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
