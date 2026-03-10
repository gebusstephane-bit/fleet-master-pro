/**
 * Utilitaires d'export CSV et PDF pour les données carburant
 */

import { FuelRecord, FuelFilters, FUEL_TYPE_CONFIG } from '@/types/fuel';

// ============================================
// EXPORT CSV
// ============================================

interface CSVOptions {
  filename?: string;
  separator?: string;
  includeHeaders?: boolean;
}

export function generateFuelCSV(
  records: FuelRecord[],
  filters?: FuelFilters,
  options: CSVOptions = {}
): string {
  const {
    filename = `fuel_export_${new Date().toISOString().split('T')[0]}`,
    separator = ';',
    includeHeaders = true,
  } = options;

  // En-têtes
  const headers = [
    'ID',
    'Date',
    'Véhicule (Immat)',
    'Marque',
    'Modèle',
    'Type',
    'Conducteur',
    'Type Carburant',
    'Quantité (L)',
    'Prix Total (€)',
    'Prix/L (€)',
    'Kilométrage',
    'Consommation (L/100km)',
    'Station',
    'Notes',
    'Company ID',
  ];

  // Lignes de données
  const rows = records.map((record) => [
    record.id,
    new Date(record.date).toLocaleString('fr-FR'),
    record.vehicles?.registration_number || '',
    record.vehicles?.brand || '',
    record.vehicles?.model || '',
    record.vehicles?.type || '',
    record.driver_name || (record.drivers ? `${record.drivers.first_name} ${record.drivers.last_name}` : 'Anonyme'),
    FUEL_TYPE_CONFIG[record.fuel_type]?.label || record.fuel_type,
    (record.quantity_liters ?? 0).toString().replace('.', ','),
    (record.price_total ?? '').toString().replace('.', ','),
    (record.price_per_liter ?? '').toString().replace('.', ','),
    (record.mileage_at_fill ?? '').toString(),
    (record.consumption_l_per_100km ?? '').toString().replace('.', ','),
    record.station_name || '',
    (record.notes || '').replace(/[;\n\r]/g, ' '),
    record.company_id,
  ]);

  // Assemblage
  const lines: string[] = [];
  if (includeHeaders) {
    lines.push(headers.join(separator));
  }
  lines.push(...rows.map((row) => row.join(separator)));

  // Ajouter une ligne de totaux
  const totalLiters = records.reduce((sum, r) => sum + (r.quantity_liters || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.price_total || 0), 0);
  const avgConsumption =
    records.filter((r) => r.consumption_l_per_100km).length > 0
      ? records.reduce((sum, r) => sum + (r.consumption_l_per_100km || 0), 0) /
        records.filter((r) => r.consumption_l_per_100km).length
      : 0;

  lines.push('');
  lines.push(`TOTAL${separator}${separator}${separator}${separator}${separator}${separator}${separator}${totalLiters.toFixed(2).replace('.', ',')}${separator}${totalCost.toFixed(2).replace('.', ',')}${separator}${separator}${separator}${avgConsumption.toFixed(2).replace('.', ',')}`);

  // Info filtres
  if (filters) {
    lines.push('');
    lines.push('FILTRES APPLIQUÉS');
    if (filters.startDate) lines.push(`Date début;${filters.startDate.toLocaleDateString('fr-FR')}`);
    if (filters.endDate) lines.push(`Date fin;${filters.endDate.toLocaleDateString('fr-FR')}`);
    if (filters.vehicleIds?.length) lines.push(`Véhicules;${filters.vehicleIds.length} sélectionnés`);
    if (filters.fuelTypes?.length) lines.push(`Carburants;${filters.fuelTypes.join(', ')}`);
    if (filters.driverName) lines.push(`Conducteur;${filters.driverName}`);
  }

  return lines.join('\n');
}

export function downloadCSV(content: string, filename: string): void {
  // Ajouter BOM pour Excel UTF-8
  const BOM = '\uFEFF';
  const blob = new Blob([BOM + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${filename}.csv`;
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ============================================
// EXPORT PDF (via impression navigateur)
// ============================================

interface PDFOptions {
  title?: string;
  subtitle?: string;
  filters?: FuelFilters;
}

export function generateFuelPDF(
  records: FuelRecord[],
  options: PDFOptions = {}
): void {
  const { title = 'Rapport de Consommation', subtitle, filters } = options;

  // Vérifier qu'il y a des données à exporter
  if (!records || records.length === 0) {
    throw new Error('Aucune donnée à exporter');
  }

  // Créer une fenêtre d'impression
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    throw new Error('La fenêtre d\'impression a été bloquée. Veuillez autoriser les popups pour ce site.');
  }

  const totalLiters = records.reduce((sum, r) => sum + (r.quantity_liters || 0), 0);
  const totalCost = records.reduce((sum, r) => sum + (r.price_total || 0), 0);
  const avgConsumption =
    records.filter((r) => r.consumption_l_per_100km).length > 0
      ? records.reduce((sum, r) => sum + (r.consumption_l_per_100km || 0), 0) /
        records.filter((r) => r.consumption_l_per_100km).length
      : 0;

  // Construire le HTML
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title} - Fleet Master</title>
  <style>
    @page { size: A4 landscape; margin: 15mm; }
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 10pt;
      line-height: 1.4;
      color: #1a1a1a;
      margin: 0;
      padding: 20px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
      padding-bottom: 15px;
      border-bottom: 2px solid #0891b2;
    }
    .logo {
      font-size: 18pt;
      font-weight: bold;
      color: #0891b2;
    }
    .meta {
      text-align: right;
      font-size: 9pt;
      color: #666;
    }
    h1 {
      font-size: 16pt;
      margin: 0 0 5px 0;
      color: #1a1a1a;
    }
    .subtitle {
      color: #666;
      font-size: 10pt;
      margin-bottom: 15px;
    }
    .stats {
      display: flex;
      gap: 20px;
      margin-bottom: 20px;
      padding: 15px;
      background: #f8fafc;
      border-radius: 8px;
    }
    .stat-box {
      flex: 1;
      text-align: center;
    }
    .stat-value {
      font-size: 16pt;
      font-weight: bold;
      color: #0891b2;
    }
    .stat-label {
      font-size: 8pt;
      color: #666;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 15px;
    }
    th {
      background: #0891b2;
      color: white;
      padding: 8px;
      text-align: left;
      font-weight: 600;
      font-size: 9pt;
    }
    td {
      padding: 6px 8px;
      border-bottom: 1px solid #e2e8f0;
      font-size: 9pt;
    }
    tr:nth-child(even) {
      background: #f8fafc;
    }
    .text-right {
      text-align: right;
    }
    .badge {
      display: inline-block;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 8pt;
      font-weight: 500;
    }
    .badge-diesel { background: #dbeafe; color: #1e40af; }
    .badge-adblue { background: #cffafe; color: #155e75; }
    .badge-gnr { background: #dcfce7; color: #166534; }
    .footer {
      margin-top: 20px;
      padding-top: 10px;
      border-top: 1px solid #e2e8f0;
      font-size: 8pt;
      color: #666;
      display: flex;
      justify-content: space-between;
    }
    .filters {
      margin-bottom: 15px;
      padding: 10px;
      background: #f1f5f9;
      border-radius: 6px;
      font-size: 9pt;
    }
    .filters-title {
      font-weight: 600;
      margin-bottom: 5px;
    }
    @media print {
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">Fleet Master Pro</div>
    <div class="meta">
      <div>${new Date().toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      <div>${new Date().toLocaleTimeString('fr-FR')}</div>
    </div>
  </div>
  
  <h1>${title}</h1>
  ${subtitle ? `<div class="subtitle">${subtitle}</div>` : ''}
  
  <div class="stats">
    <div class="stat-box">
      <div class="stat-value">${records.length}</div>
      <div class="stat-label">Pleins</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${totalLiters.toFixed(0)} L</div>
      <div class="stat-label">Total Litres</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${totalCost.toFixed(0)} €</div>
      <div class="stat-label">Coût Total</div>
    </div>
    <div class="stat-box">
      <div class="stat-value">${avgConsumption.toFixed(1)} L/100</div>
      <div class="stat-label">Moyenne Conso</div>
    </div>
  </div>
  
  ${filters && (filters.startDate || filters.endDate || filters.vehicleIds?.length || filters.fuelTypes?.length) ? `
  <div class="filters">
    <div class="filters-title">Filtres appliqués</div>
    ${filters.startDate ? `Du ${filters.startDate.toLocaleDateString('fr-FR')} ` : ''}
    ${filters.endDate ? `au ${filters.endDate.toLocaleDateString('fr-FR')}` : ''}
    ${filters.vehicleIds?.length ? `• ${filters.vehicleIds.length} véhicule(s)` : ''}
    ${filters.fuelTypes?.length ? `• Carburants: ${filters.fuelTypes.join(', ')}` : ''}
  </div>
  ` : ''}
  
  <table>
    <thead>
      <tr>
        <th>Date</th>
        <th>Véhicule</th>
        <th>Conducteur</th>
        <th>Carburant</th>
        <th class="text-right">Quantité</th>
        <th class="text-right">Prix Total</th>
        <th class="text-right">Km</th>
        <th class="text-right">Conso</th>
      </tr>
    </thead>
    <tbody>
      ${records.map((r) => `
        <tr>
          <td>${new Date(r.date).toLocaleDateString('fr-FR')}</td>
          <td>${r.vehicles?.registration_number || 'N/A'} ${r.vehicles?.brand ? `(${r.vehicles.brand})` : ''}</td>
          <td>${r.driver_name || (r.drivers ? `${r.drivers.first_name} ${r.drivers.last_name}` : 'Anonyme')}</td>
          <td><span class="badge badge-${r.fuel_type}">${FUEL_TYPE_CONFIG[r.fuel_type]?.label || r.fuel_type}</span></td>
          <td class="text-right">${(r.quantity_liters ?? 0).toFixed(2)} L</td>
          <td class="text-right">${r.price_total ? r.price_total.toFixed(2) + ' €' : '-'}</td>
          <td class="text-right">${r.mileage_at_fill ? r.mileage_at_fill.toLocaleString('fr-FR') : '-'}</td>
          <td class="text-right">${r.consumption_l_per_100km ? r.consumption_l_per_100km.toFixed(1) + ' L/100' : '-'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <div class="footer">
    <div>Généré par Fleet Master Pro</div>
    <div>Page 1/1</div>
  </div>
  
  <script>
    window.onload = function() {
      setTimeout(function() {
        window.print();
      }, 500);
    };
  </script>
</body>
</html>
`;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
}

// ============================================
// UTILITAIRES DE FORMATAGE
// ============================================

export function formatFuelType(type: string): string {
  return FUEL_TYPE_CONFIG[type as keyof typeof FUEL_TYPE_CONFIG]?.label || type;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
}

export function formatNumber(value: number, decimals = 0): string {
  return new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
