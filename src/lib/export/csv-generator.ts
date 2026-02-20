/**
 * CSV Generator — Format FR (séparateur ;, UTF-8 BOM, dates FR)
 */

import {
  escapeCSV,
  formatDateFR,
  formatMileageFR,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  DRIVER_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from './formatters';

// UTF-8 BOM ensures Excel opens the file with correct encoding
const BOM = '\uFEFF';
const SEP = ';';

function row(values: unknown[]): string {
  return values.map(escapeCSV).join(SEP);
}

function buildCSV(headers: string[], rows: unknown[][]): string {
  const lines = [row(headers), ...rows.map(row)];
  return BOM + lines.join('\r\n');
}

// ─── Vehicles ──────────────────────────────────────────────────────────────

const VEHICLE_HEADERS = [
  'Immatriculation',
  'VIN',
  'Marque',
  'Modèle',
  'Année',
  'Type',
  'Kilométrage',
  'Statut',
  'Dernier CT',
  'Prochain CT',
  'Tachygraphe (expiration)',
  'ATP (expiration)',
  'Assurance (expiration)',
  'Date création',
];

export function generateVehiclesCSV(vehicles: any[]): string {
  const rows = vehicles.map((v) => [
    v.registration_number ?? '',
    v.vin ?? '',
    v.brand ?? '',
    v.model ?? '',
    v.year ?? '',
    VEHICLE_TYPE_LABELS[v.type] ?? v.type ?? '',
    v.mileage != null ? v.mileage.toLocaleString('fr-FR') : '',
    VEHICLE_STATUS_LABELS[v.status] ?? v.status ?? '',
    formatDateFR(v.last_technical_control ?? v.technical_control_date),
    formatDateFR(v.technical_control_expiry),
    formatDateFR(v.tachy_control_expiry ?? v.tachy_control_date),
    formatDateFR(v.atp_expiry ?? v.atp_date),
    formatDateFR(v.insurance_expiry),
    formatDateFR(v.created_at),
  ]);
  return buildCSV(VEHICLE_HEADERS, rows);
}

// ─── Drivers ───────────────────────────────────────────────────────────────

const DRIVER_HEADERS = [
  'Prénom',
  'Nom',
  'Email',
  'Téléphone',
  'N° Permis',
  'Type permis',
  'Expiration permis',
  'Statut',
  'Score sécurité',
  'Véhicule assigné',
  'Date création',
];

export function generateDriversCSV(drivers: any[]): string {
  const rows = drivers.map((d) => [
    d.first_name ?? '',
    d.last_name ?? '',
    d.email ?? '',
    d.phone ?? '',
    d.license_number ?? '',
    d.license_type ?? '',
    formatDateFR(d.license_expiry),
    DRIVER_STATUS_LABELS[d.status] ?? d.status ?? '',
    d.safety_score != null ? d.safety_score : '',
    d.vehicles?.registration_number ?? '',
    formatDateFR(d.created_at),
  ]);
  return buildCSV(DRIVER_HEADERS, rows);
}

// ─── Maintenance ───────────────────────────────────────────────────────────

const MAINTENANCE_HEADERS = [
  'Véhicule',
  'Immatriculation',
  'Type',
  'Description',
  'Statut',
  'Date planifiée',
  'Date réalisée',
  'Coût (€)',
  'Prestataire',
];

export function generateMaintenanceCSV(records: any[]): string {
  const rows = records.map((m) => [
    m.vehicles?.brand ? `${m.vehicles.brand} ${m.vehicles.model ?? ''}`.trim() : '',
    m.vehicles?.registration_number ?? '',
    m.type ?? '',
    m.description ?? '',
    MAINTENANCE_STATUS_LABELS[m.status] ?? m.status ?? '',
    formatDateFR(m.scheduled_date),
    formatDateFR(m.completed_date),
    m.cost != null ? m.cost.toLocaleString('fr-FR') : '',
    m.provider ?? '',
  ]);
  return buildCSV(MAINTENANCE_HEADERS, rows);
}

// ─── Route selector ────────────────────────────────────────────────────────

export type ExportType = 'vehicles' | 'drivers' | 'maintenance';

export function generateCSV(type: ExportType, data: any[]): string {
  switch (type) {
    case 'vehicles':
      return generateVehiclesCSV(data);
    case 'drivers':
      return generateDriversCSV(data);
    case 'maintenance':
      return generateMaintenanceCSV(data);
    default:
      throw new Error(`Type d'export inconnu: ${type}`);
  }
}
