/**
 * PDF Generator — pdf-lib (pure JS, no native deps)
 * Produces a professional PDF report with cover header + data table
 */

import { PDFDocument, rgb, StandardFonts, RGB } from 'pdf-lib';
import {
  formatDateFR,
  VEHICLE_STATUS_LABELS,
  VEHICLE_TYPE_LABELS,
  DRIVER_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from './formatters';

export type ExportType = 'vehicles' | 'drivers' | 'maintenance';

/**
 * Normalise le texte pour la compatibilité WinAnsi (StandardFonts de pdf-lib).
 * Élimine les caractères non encodables : espaces insécables, guillemets
 * typographiques, tirets longs, points de suspension Unicode, etc.
 */
function normalizeText(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\u00A0\u202F\u2007\u2060]/g, ' ')  // espaces spéciaux → espace normal
    .replace(/[""«»]/g, '"')                        // guillemets → droits
    .replace(/[''‚]/g, "'")                         // apostrophes → droites
    .replace(/[—–−]/g, '-')                         // tirets → simple
    .replace(/…/g, '...')                            // ellipse Unicode → 3 points
    .replace(/[^\x00-\xFF]/g, '?');                 // tout autre hors Latin-1 → ?
}

interface PDFConfig {
  type: ExportType;
  data: any[];
  companyName: string;
}

// ─── Colors (pdf-lib uses 0-1 range) ────────────────────────────────────────

const C = {
  blue:    rgb(0.231, 0.510, 0.965), // #3B82F6
  dark:    rgb(0.035, 0.035, 0.043), // #09090B
  card:    rgb(0.094, 0.094, 0.106), // #18181B
  cardAlt: rgb(0.059, 0.059, 0.063), // #0F0F10
  header:  rgb(0.118, 0.125, 0.188), // #1E2030
  white:   rgb(1, 1, 1),
  muted:   rgb(0.631, 0.631, 0.671), // #A1A1AA
  subtle:  rgb(0.322, 0.322, 0.357), // #52525B
  slate:   rgb(0.800, 0.835, 0.902), // #CBD5E1
};

// A4 landscape dimensions (points)
const PAGE_W = 841.89;
const PAGE_H = 595.28;
const MARGIN = 40;

/** Generates a PDF buffer from data. Returns a Promise<Buffer>. */
export async function generatePDF(config: PDFConfig): Promise<Buffer> {
  const { type, data, companyName } = config;

  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(`Rapport ${typeLabel(type)} — ${companyName}`);
  pdfDoc.setAuthor('FleetMaster Pro');
  pdfDoc.setCreationDate(new Date());

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const columns = getColumns(type);
  const contentW = PAGE_W - MARGIN * 2;
  const colW = contentW / columns.length;
  const ROW_H = 22;

  // ─── Helper: draw text clipped to a box ──────────────────────────────────
  function drawCell(
    page: Awaited<ReturnType<typeof pdfDoc.addPage>>,
    text: string,
    x: number, y: number,
    width: number,
    size: number,
    font: typeof regular,
    color: RGB,
    align: 'left' | 'center' | 'right' = 'left'
  ) {
    const pad = 6;
    const maxW = width - pad * 2;
    // Truncate text to fit — normalise first to avoid WinAnsi encoding errors
    let display = normalizeText(text);
    while (display.length > 1 && font.widthOfTextAtSize(display, size) > maxW) {
      display = display.slice(0, -1);
    }
    if (display !== normalizeText(text)) display = display.slice(0, -1) + '.';

    let textX = x + pad;
    if (align === 'center') {
      textX = x + (width - font.widthOfTextAtSize(display, size)) / 2;
    } else if (align === 'right') {
      textX = x + maxW - font.widthOfTextAtSize(display, size) + pad;
    }

    page.drawText(display, { x: textX, y, size, font, color });
  }

  // ─── Page factory ─────────────────────────────────────────────────────────
  function addPage() {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    // Background
    page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.dark });
    return page;
  }

  // ─── Draw cover header (first page only) ─────────────────────────────────
  function drawCoverHeader(page: ReturnType<typeof addPage>) {
    // Blue accent bar at top
    page.drawRectangle({ x: 0, y: PAGE_H - 8, width: PAGE_W, height: 8, color: C.blue });

    // Title
    page.drawText(normalizeText(`Rapport - ${typeLabel(type)}`), {
      x: MARGIN, y: PAGE_H - 38, size: 22, font: bold, color: C.white,
    });

    // Subtitle
    const subtitle = normalizeText(`${companyName}  -  Genere le ${formatDateFR(new Date())}  -  ${data.length} enregistrement(s)`);
    page.drawText(subtitle, {
      x: MARGIN, y: PAGE_H - 56, size: 9, font: regular, color: C.muted,
    });

    // Branding right
    const brandText = 'FleetMaster Pro';
    const brandW = bold.widthOfTextAtSize(brandText, 13);
    page.drawText(brandText, {
      x: PAGE_W - MARGIN - brandW, y: PAGE_H - 38, size: 13, font: bold, color: C.blue,
    });
    const confText = 'Confidentiel';
    const confW = regular.widthOfTextAtSize(confText, 9);
    page.drawText(confText, {
      x: PAGE_W - MARGIN - confW, y: PAGE_H - 54, size: 9, font: regular, color: C.muted,
    });

    // Separator
    page.drawLine({
      start: { x: MARGIN, y: PAGE_H - 68 },
      end:   { x: PAGE_W - MARGIN, y: PAGE_H - 68 },
      thickness: 0.5,
      color: C.card,
    });
  }

  // ─── Draw table header row ────────────────────────────────────────────────
  function drawTableHeader(page: ReturnType<typeof addPage>, tableTopY: number) {
    page.drawRectangle({ x: MARGIN, y: tableTopY, width: contentW, height: ROW_H, color: C.header });
    columns.forEach((col, i) => {
      drawCell(
        page,
        col.header.toUpperCase(),
        MARGIN + i * colW,
        tableTopY + 7,
        colW,
        7,
        bold,
        C.slate,
        col.align ?? 'left'
      );
    });
  }

  // ─── Draw footer ──────────────────────────────────────────────────────────
  function drawFooter(page: ReturnType<typeof addPage>, pageNum: number) {
    const footerY = 20;
    page.drawLine({
      start: { x: MARGIN, y: footerY + 14 },
      end:   { x: PAGE_W - MARGIN, y: footerY + 14 },
      thickness: 0.5,
      color: C.card,
    });

    page.drawText(normalizeText(`FleetMaster Pro - ${companyName} - Confidentiel`), {
      x: MARGIN, y: footerY, size: 7, font: regular, color: C.subtle,
    });

    const rightText = normalizeText(`Page ${pageNum}  -  Genere le ${formatDateFR(new Date())}`);
    const rightW = regular.widthOfTextAtSize(rightText, 7);
    page.drawText(rightText, {
      x: PAGE_W - MARGIN - rightW, y: footerY, size: 7, font: regular, color: C.subtle,
    });
  }

  // ─── Build pages ──────────────────────────────────────────────────────────

  // First page
  let page = addPage();
  drawCoverHeader(page);

  let tableTopY = PAGE_H - 84;  // Below cover header
  drawTableHeader(page, tableTopY);

  let rowY = tableTopY - ROW_H; // Start of first data row (going down = decreasing Y)
  let pageNum = 1;

  if (data.length === 0) {
    page.drawText('Aucune donnée disponible.', {
      x: MARGIN, y: rowY - 10, size: 11, font: regular, color: C.muted,
    });
  }

  data.forEach((item, rowIdx) => {
    // New page if not enough space (keep 50pt for footer)
    if (rowY < 50 + ROW_H) {
      drawFooter(page, pageNum);
      page = addPage();
      pageNum++;
      tableTopY = PAGE_H - 40;
      drawTableHeader(page, tableTopY);
      rowY = tableTopY - ROW_H;
    }

    const rowColor = rowIdx % 2 === 0 ? C.card : C.cardAlt;
    page.drawRectangle({ x: MARGIN, y: rowY, width: contentW, height: ROW_H, color: rowColor });

    columns.forEach((col, i) => {
      const val = col.getValue(item);
      drawCell(
        page,
        val,
        MARGIN + i * colW,
        rowY + 7,
        colW,
        7.5,
        col.bold ? bold : regular,
        col.highlight ? C.blue : C.muted,
        col.align ?? 'left'
      );
    });

    rowY -= ROW_H;
  });

  drawFooter(page, pageNum);

  // ─── Serialize ────────────────────────────────────────────────────────────
  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// ─── Column definitions ────────────────────────────────────────────────────

interface ColDef {
  header: string;
  getValue: (item: any) => string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  highlight?: boolean;
}

function getColumns(type: ExportType): ColDef[] {
  if (type === 'vehicles') {
    return [
      { header: 'Immatriculation', getValue: (v) => v.registration_number ?? '', bold: true, highlight: true },
      { header: 'Marque / Modele', getValue: (v) => `${v.brand ?? ''} ${v.model ?? ''}`.trim() },
      { header: 'Type', getValue: (v) => VEHICLE_TYPE_LABELS[v.type] ?? v.type ?? '' },
      { header: 'Km', getValue: (v) => v.mileage != null ? v.mileage.toLocaleString('fr-FR') : '', align: 'right' },
      { header: 'Statut', getValue: (v) => VEHICLE_STATUS_LABELS[v.status] ?? v.status ?? '' },
      { header: 'CT (exp.)', getValue: (v) => formatDateFR(v.technical_control_expiry), align: 'center' },
      { header: 'Tachy (exp.)', getValue: (v) => formatDateFR(v.tachy_control_expiry ?? v.tachy_control_date), align: 'center' },
      { header: 'ATP (exp.)', getValue: (v) => formatDateFR(v.atp_expiry ?? v.atp_date), align: 'center' },
      { header: 'Assurance', getValue: (v) => formatDateFR(v.insurance_expiry), align: 'center' },
    ];
  }

  if (type === 'drivers') {
    return [
      { header: 'Prénom', getValue: (d) => d.first_name ?? '', bold: true },
      { header: 'Nom', getValue: (d) => d.last_name ?? '', bold: true },
      { header: 'Email', getValue: (d) => d.email ?? '' },
      { header: 'Téléphone', getValue: (d) => d.phone ?? '' },
      { header: 'N° Permis', getValue: (d) => d.license_number ?? '', highlight: true },
      { header: 'Type', getValue: (d) => d.license_type ?? '', align: 'center' },
      { header: 'Expiration', getValue: (d) => formatDateFR(d.license_expiry), align: 'center' },
      { header: 'Statut', getValue: (d) => DRIVER_STATUS_LABELS[d.status] ?? d.status ?? '' },
      { header: 'Score', getValue: (d) => d.safety_score != null ? String(d.safety_score) : '', align: 'center' },
    ];
  }

  // maintenance
  return [
    { header: 'Véhicule', getValue: (m) => m.vehicles?.registration_number ?? '', bold: true, highlight: true },
    { header: 'Marque/Modèle', getValue: (m) => m.vehicles?.brand ? `${m.vehicles.brand} ${m.vehicles.model ?? ''}`.trim() : '' },
    { header: 'Type', getValue: (m) => m.type ?? '' },
    { header: 'Description', getValue: (m) => m.description ?? '' },
    { header: 'Statut', getValue: (m) => MAINTENANCE_STATUS_LABELS[m.status] ?? m.status ?? '' },
    { header: 'Planifiée', getValue: (m) => formatDateFR(m.scheduled_date), align: 'center' },
    { header: 'Réalisée', getValue: (m) => formatDateFR(m.completed_date), align: 'center' },
    { header: 'Coût', getValue: (m) => m.cost != null ? m.cost.toLocaleString('fr-FR') + ' €' : '', align: 'right' },
  ];
}

function typeLabel(type: ExportType): string {
  const labels: Record<ExportType, string> = {
    vehicles: 'Véhicules',
    drivers: 'Chauffeurs',
    maintenance: 'Maintenances',
  };
  return labels[type] ?? type;
}
