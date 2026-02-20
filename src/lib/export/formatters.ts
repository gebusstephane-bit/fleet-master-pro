/**
 * Formatters FR pour les exports CSV/PDF
 */

/** Format a date in French DD/MM/YYYY */
export function formatDateFR(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Format a number with French decimal separator (comma) */
export function formatNumberFR(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toLocaleString('fr-FR');
}

/** Format a mileage value with km suffix */
export function formatMileageFR(value: number | null | undefined): string {
  if (value == null) return '';
  return `${value.toLocaleString('fr-FR')} km`;
}

/** Format a currency in EUR */
export function formatCurrencyFR(value: number | null | undefined): string {
  if (value == null) return '';
  return value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });
}

/** Escape a value for CSV (RFC 4180 compliant, semicolon separator) */
export function escapeCSV(value: unknown): string {
  if (value == null) return '';
  const str = String(value);
  if (str.includes(';') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }
  return str;
}

/** Generate current timestamp for filename */
export function fileDateStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Status label mappings */
export const VEHICLE_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  ACTIF: 'Actif',
  inactive: 'Inactif',
  INACTIF: 'Inactif',
  maintenance: 'Maintenance',
  EN_MAINTENANCE: 'Maintenance',
  retired: 'Hors service',
  HORS_SERVICE: 'Hors service',
};

export const DRIVER_STATUS_LABELS: Record<string, string> = {
  active: 'Actif',
  inactive: 'Inactif',
  on_leave: 'En congé',
  terminated: 'Terminé',
};

export const MAINTENANCE_STATUS_LABELS: Record<string, string> = {
  PENDING: 'En attente',
  IN_PROGRESS: 'En cours',
  COMPLETED: 'Terminé',
  CANCELLED: 'Annulé',
};

export const VEHICLE_TYPE_LABELS: Record<string, string> = {
  truck: 'Camion',
  van: 'Fourgon',
  car: 'Voiture',
  motorcycle: 'Moto',
  trailer: 'Remorque',
  VOITURE: 'Voiture',
  FOURGON: 'Fourgon',
  POIDS_LOURD: 'Poids Lourd',
  POIDS_LOURD_FRIGO: 'PL Frigorifique',
};
