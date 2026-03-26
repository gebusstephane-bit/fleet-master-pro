/**
 * Carnet d'Entretien Digital — PDF Generator v2 (A4 Portrait)
 * Professional maintenance logbook for DREAL audits and vehicle resale.
 * Uses pdf-lib + @pdf-lib/fontkit (Inter) — no pdfkit, no native deps.
 * Footer: single final-pass only — no duplication possible.
 */

import { PDFDocument, PDFPage, rgb, RGB } from 'pdf-lib';
import { loadFonts, FontSet } from '@/lib/pdf/pdf-fonts';
import { hexToRgb } from '@/lib/pdf/pdf-colors';
import { nt } from '@/lib/pdf/pdf-helpers';
import { formatDateFR, VEHICLE_TYPE_LABELS } from './formatters';

// ─── Design system ────────────────────────────────────────────────────────────
const K = {
  primary:        hexToRgb('#1a237e'),
  primaryMid:     hexToRgb('#283593'),
  primaryBg:      hexToRgb('#e8eaf6'),
  primaryBorder:  hexToRgb('#c5cae9'),

  success:        hexToRgb('#16A34A'),
  successBg:      hexToRgb('#F0FDF4'),
  successBorder:  hexToRgb('#86EFAC'),
  successText:    hexToRgb('#166534'),

  warning:        hexToRgb('#D97706'),
  warningBg:      hexToRgb('#FFFBEB'),
  warningBorder:  hexToRgb('#FCD34D'),
  warningText:    hexToRgb('#92400E'),

  danger:         hexToRgb('#DC2626'),
  dangerBg:       hexToRgb('#FEF2F2'),
  dangerBorder:   hexToRgb('#FCA5A5'),
  dangerText:     hexToRgb('#991B1B'),

  infoBg:         hexToRgb('#EFF6FF'),
  infoBorder:     hexToRgb('#BFDBFE'),
  infoText:       hexToRgb('#1D4ED8'),

  text:           hexToRgb('#1E293B'),
  textSecond:     hexToRgb('#64748B'),
  textMuted:      hexToRgb('#94A3B8'),
  border:         hexToRgb('#E2E8F0'),
  bgAlt:          hexToRgb('#f5f5f5'),
  white:          rgb(1, 1, 1),
  headerText:     hexToRgb('#93C5FD'),  // blue-300 on dark bg
};

// ─── Layout ───────────────────────────────────────────────────────────────────
const PAGE_W    = 595;
const PAGE_H    = 842;
const MARGIN    = 30;
const CONTENT_W = PAGE_W - MARGIN * 2;  // 535pt
const HDR_H     = 35;
const BOTTOM    = 48;                    // minimum y for content before footer

// ─── Public types (API unchanged) ─────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MaintenanceEntry = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InspectionEntry  = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FuelEntry        = Record<string, any>;

export interface VehicleCarnetData {
  vehicle: {
    id: string;
    registration_number: string;
    brand?: string | null;
    model?: string | null;
    year?: number | null;
    type?: string | null;
    fuel_type?: string | null;
    vin?: string | null;
    mileage?: number | null;
    status: string;
    insurance_expiry?: string | null;
    technical_control_expiry?: string | null;
    tachy_control_expiry?: string | null;
    atp_expiry?: string | null;
  };
  company: {
    name: string;
    siret?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    email?: string | null;
  };
  maintenances:  MaintenanceEntry[];
  inspections:   InspectionEntry[];
  fuelRecords:   FuelEntry[];
  activities?:   string[];
}

// ─── Primitive helpers ────────────────────────────────────────────────────────

function newPage(pdfDoc: PDFDocument): PDFPage {
  const p = pdfDoc.addPage([PAGE_W, PAGE_H]);
  p.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: K.white });
  return p;
}

function rect(
  page: PDFPage, x: number, y: number, w: number, h: number,
  fill: RGB, border?: RGB, bw = 0.5,
) {
  page.drawRectangle({
    x, y, width: w, height: h, color: fill,
    borderColor: border, borderWidth: border ? bw : 0,
  });
}

function hLine(page: PDFPage, y: number, color: RGB = K.border, thickness = 0.5,
               x0 = MARGIN, x1 = PAGE_W - MARGIN) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
}

function vLine(page: PDFPage, x: number, y0: number, y1: number,
               color: RGB = K.border, thickness = 0.5) {
  page.drawLine({ start: { x, y: y0 }, end: { x, y: y1 }, thickness, color });
}

/**
 * Draw text with auto-ellipsis if too wide.
 * align is relative to the zone [x, x+maxWidth].
 */
function txt(
  page: PDFPage, text: string,
  x: number, y: number, size: number,
  font: FontSet['regular'], color: RGB,
  align: 'left' | 'center' | 'right' = 'left',
  maxWidth = CONTENT_W,
  padding = 4,
) {
  let s = nt(text);
  if (!s) return;
  const avail = maxWidth - padding * 2;
  while (s.length > 1 && font.widthOfTextAtSize(s, size) > avail) s = s.slice(0, -1);
  if (s !== nt(text) && s.length > 3) s = s.slice(0, -3) + '...';
  const tw = font.widthOfTextAtSize(s, size);
  let dx = x + padding;
  if (align === 'center') dx = x + (maxWidth - tw) / 2;
  if (align === 'right')  dx = x + maxWidth - tw - padding;
  page.drawText(s, { x: dx, y, size, font, color });
}

/** Wrap text across multiple lines. Returns final Y (after last line). */
function wrapText(
  page: PDFPage, text: string,
  x: number, y: number, maxWidth: number, lineHeight: number,
  font: FontSet['regular'], size: number, color: RGB,
  maxLines = 999,
): number {
  const words = nt(text).split(' ').filter(Boolean);
  let line = '';
  let curY = y;
  let lineCount = 0;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(test, size) > maxWidth && line) {
      if (lineCount >= maxLines - 1) {
        let t = line;
        while (t.length > 3 && font.widthOfTextAtSize(t + '...', size) > maxWidth) t = t.slice(0, -1);
        page.drawText(t + '...', { x, y: curY, size, font, color });
        return curY - lineHeight;
      }
      page.drawText(line, { x, y: curY, size, font, color });
      line = word;
      curY -= lineHeight;
      lineCount++;
    } else {
      line = test;
    }
  }
  if (line) { page.drawText(line, { x, y: curY, size, font, color }); curY -= lineHeight; }
  return curY;
}

// ─── Document status helper ────────────────────────────────────────────────────

type DocStatus = { color: RGB; bgColor: RGB; borderColor: RGB; dateLabel: string; badgeText: string };

function docStatus(expiry: string | null | undefined): DocStatus {
  if (!expiry) return {
    color: K.textMuted, bgColor: K.bgAlt, borderColor: K.border,
    dateLabel: 'Non renseigne', badgeText: '- Non renseigne',
  };
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  const dateLabel = formatDateFR(expiry);
  if (days < 0)  return { color: K.dangerText,  bgColor: K.dangerBg,  borderColor: K.dangerBorder,  dateLabel, badgeText: `Expire il y a ${Math.abs(days)}j` };
  if (days <= 30) return { color: K.dangerText,  bgColor: K.dangerBg,  borderColor: K.dangerBorder,  dateLabel, badgeText: `! Dans ${days}j restants` };
  if (days <= 60) return { color: K.warningText, bgColor: K.warningBg, borderColor: K.warningBorder, dateLabel, badgeText: `~ Dans ${days}j restants` };
  return           { color: K.successText, bgColor: K.successBg, borderColor: K.successBorder, dateLabel, badgeText: `OK - Dans ${days}j` };
}

// ─── Date extraction from DB row ─────────────────────────────────────────────

function extractDate(row: Record<string, unknown>): string | null {
  for (const key of ['scheduled_date', 'service_date', 'completed_at', 'inspection_date', 'date', 'created_at', 'updated_at']) {
    const v = row[key];
    if (v && typeof v === 'string') return v;
  }
  return null;
}

// ─── Shared page header (pages 2+) ────────────────────────────────────────────

/** Draws header bar, returns Y after header (ready for content). */
function drawPageHeader(
  page: PDFPage, fonts: FontSet,
  sectionTitle: string, immat: string,
  companyName = '',
): number {
  rect(page, 0, PAGE_H - HDR_H, PAGE_W, HDR_H, K.primary);

  // Left: company name (bold white) + separator + section title (muted)
  const coStr = nt(companyName || 'Fleet-Master');
  const coW   = fonts.bold.widthOfTextAtSize(coStr, 9);
  page.drawText(coStr, { x: MARGIN, y: PAGE_H - 23, size: 9, font: fonts.bold, color: K.white });
  if (sectionTitle) {
    page.drawText(` | ${nt(sectionTitle)}`, {
      x: MARGIN + coW + 2, y: PAGE_H - 23, size: 9, font: fonts.regular, color: K.headerText,
    });
  }

  // Right: "Fleet-Master" pill badge
  const badgeLabel = 'Fleet-Master';
  const badgeLW    = fonts.bold.widthOfTextAtSize(badgeLabel, 8);
  const badgeW     = badgeLW + 14;
  const badgeX     = PAGE_W - MARGIN - badgeW;
  const badgeY     = PAGE_H - HDR_H + 6;
  rect(page, badgeX, badgeY, badgeW, HDR_H - 12, K.primaryMid, K.headerText, 0.5);
  page.drawText(badgeLabel, { x: badgeX + 7, y: badgeY + 7, size: 8, font: fonts.bold, color: K.white });

  hLine(page, PAGE_H - HDR_H, K.border, 0.3, 0, PAGE_W);
  return PAGE_H - HDR_H - 12;
}

/** Standard footer — called ONCE per page in the final pass. */
function drawPageFooter(
  page: PDFPage, fonts: FontSet,
  pageNum: number, totalPages: number,
  companyName: string, generatedAt: Date,
) {
  hLine(page, 32, K.border, 0.5, 0, PAGE_W);
  const dateStr = generatedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });

  // Left: company name
  txt(page, nt(companyName), MARGIN, 18, 7, fonts.regular, K.textMuted, 'left', 180, 0);

  // Center: "Document certifié DREAL - Généré le DD/MM/YYYY"
  const certStr = `Document certifie DREAL - Genere le ${dateStr}`;
  txt(page, certStr, 0, 18, 7, fonts.regular, K.textMuted, 'center', PAGE_W, 0);

  // Right: "Page X / Y" (full text, never truncated)
  const pageStr = `Page ${pageNum} / ${totalPages}`;
  const pageW = fonts.bold.widthOfTextAtSize(pageStr, 7);
  page.drawText(pageStr, { x: PAGE_W - MARGIN - pageW, y: 18, size: 7, font: fonts.bold, color: K.primary });
}

// ─── Table header helper ──────────────────────────────────────────────────────

type ColDef = { label: string; w: number; align: 'left' | 'center' | 'right' };

function drawTableHeader(
  page: PDFPage, fonts: FontSet,
  cols: ColDef[], y: number,
  bgColor: RGB = K.primary,
): number {
  const H = 26;
  let x = MARGIN;
  cols.forEach(col => {
    rect(page, x, y - H, col.w, H, bgColor);
    txt(page, col.label, x, y - H + 8, 7.5, fonts.bold, K.white, col.align, col.w, 6);
    x += col.w;
  });
  return y - H;
}

// ─── PAGE 1: COVER ────────────────────────────────────────────────────────────

function drawCover(page: PDFPage, fonts: FontSet, data: VehicleCarnetData, firstDate: string | null) {
  const { vehicle, company } = data;

  // ── Left accent sidebar (8pt)
  rect(page, 0, 0, 8, PAGE_H, K.primary);

  // ── Header (top 130pt)
  const HEADER_H = 130;
  rect(page, 0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, K.primary);

  // Logo + tagline
  page.drawText('Fleet-Master', { x: MARGIN, y: PAGE_H - 48, size: 18, font: fonts.bold, color: K.white });
  page.drawText('Systeme de gestion de flotte', { x: MARGIN, y: PAGE_H - 68, size: 9, font: fonts.regular, color: K.headerText });

  // "DOCUMENT OFFICIEL" badge top-right
  const docLabel = 'DOCUMENT OFFICIEL';
  const dLW = fonts.bold.widthOfTextAtSize(docLabel, 8);
  const dBW = dLW + 16;
  rect(page, PAGE_W - MARGIN - dBW, PAGE_H - 64, dBW, 18, K.primaryMid);
  page.drawText(docLabel, { x: PAGE_W - MARGIN - dBW + (dBW - dLW) / 2, y: PAGE_H - 51, size: 8, font: fonts.bold, color: K.white });

  // ── Document title
  txt(page, "CARNET D'ENTRETIEN", 0, PAGE_H - HEADER_H - 24, 22, fonts.bold, K.primary, 'center', PAGE_W, 0);
  txt(page, 'ET DE MAINTENANCE',  0, PAGE_H - HEADER_H - 44, 16, fonts.regular, K.primaryMid, 'center', PAGE_W, 0);
  const lineW = 200;
  page.drawLine({ start: { x: (PAGE_W - lineW) / 2, y: PAGE_H - HEADER_H - 58 }, end: { x: (PAGE_W + lineW) / 2, y: PAGE_H - HEADER_H - 58 }, thickness: 2, color: K.primary });

  // ── Hero immatriculation
  let y = PAGE_H - HEADER_H - 88;
  const immat = nt(vehicle.registration_number);
  const immatW = fonts.bold.widthOfTextAtSize(immat, 36);
  page.drawText(immat, { x: (PAGE_W - immatW) / 2, y, size: 36, font: fonts.bold, color: K.primary });
  y -= 44;
  const brandModel = nt(`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim());
  if (brandModel) {
    txt(page, brandModel, 0, y, 16, fonts.regular, K.textSecond, 'center', PAGE_W, 0);
    y -= 22;
  }

  // ── Identity grid 2 × 3
  y -= 14;
  const CELL_W = CONTENT_W / 2;
  const CELL_H = 42;
  const GX = MARGIN;

  const fuelMap: Record<string, string> = {
    diesel: 'Diesel', gasoline: 'Essence', electric: 'Electrique',
    hybrid: 'Hybride', lpg: 'GPL', adblue: 'AdBlue', gnr: 'GNR', gnv: 'GNV',
  };
  const statusCfg: Record<string, { bg: RGB; text: RGB; label: string }> = {
    ACTIVE:         { bg: hexToRgb('#DCFCE7'), text: hexToRgb('#166534'), label: 'ACTIF' },
    MAINTENANCE:    { bg: hexToRgb('#FEF3C7'), text: hexToRgb('#92400E'), label: 'EN MAINTENANCE' },
    OUT_OF_SERVICE: { bg: hexToRgb('#FEE2E2'), text: hexToRgb('#991B1B'), label: 'HORS SERVICE' },
  };

  const cells: { label: string; value: string; isStatus?: boolean }[] = [
    { label: 'Annee mise en service', value: vehicle.year ? String(vehicle.year) : '-' },
    { label: 'Type de vehicule',      value: VEHICLE_TYPE_LABELS[vehicle.type ?? ''] ?? vehicle.type ?? '-' },
    { label: 'Energie',               value: fuelMap[vehicle.fuel_type ?? ''] ?? vehicle.fuel_type ?? '-' },
    { label: 'N° VIN / Chassis',      value: vehicle.vin ?? '-' },
    { label: 'Kilometrage actuel',    value: vehicle.mileage != null ? `${vehicle.mileage.toLocaleString('fr-FR')} km` : '-' },
    { label: 'Statut',                value: vehicle.status, isStatus: true },
  ];

  cells.forEach((cell, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx = GX + col * CELL_W;
    const cy = y - row * CELL_H;
    const bg = row % 2 === 0 ? K.white : K.bgAlt;

    rect(page, cx, cy - CELL_H, CELL_W, CELL_H, bg, K.border, 0.3);
    if (col === 0) vLine(page, cx + CELL_W, cy - CELL_H, cy, K.border, 0.3);

    txt(page, cell.label, cx + 10, cy - 13, 8, fonts.regular, K.textSecond, 'left', CELL_W - 20, 0);

    if (cell.isStatus) {
      const sc = statusCfg[vehicle.status] ?? { bg: K.bgAlt, text: K.textMuted, label: vehicle.status };
      const bLW = fonts.bold.widthOfTextAtSize(sc.label, 8);
      const bW = bLW + 12;
      rect(page, cx + 10, cy - CELL_H + 7, bW, 16, sc.bg);
      page.drawText(sc.label, { x: cx + 10 + (bW - bLW) / 2, y: cy - CELL_H + 11, size: 8, font: fonts.bold, color: sc.text });
    } else {
      txt(page, cell.value, cx + 10, cy - 30, 11, fonts.bold, K.text, 'left', CELL_W - 20, 0);
    }
  });

  y -= 3 * CELL_H + 18;

  // ── Period block (centered)
  const periodH = 50;
  const periodW = 340;
  const periodX = (PAGE_W - periodW) / 2;
  rect(page, periodX, y - periodH, periodW, periodH, K.primaryBg, K.primaryBorder);
  txt(page, 'PERIODE COUVERTE', 0, y - 14, 8, fonts.bold, K.textSecond, 'center', PAGE_W, 0);
  const fromDate = firstDate ? formatDateFR(firstDate) : 'Premier enregistrement';
  txt(page, `Du ${fromDate}  au  ${formatDateFR(new Date())}`, 0, y - 32, 13, fonts.bold, K.primary, 'center', PAGE_W, 0);

  y -= periodH + 16;

  // ── Company block
  const compH = 58;
  rect(page, MARGIN, y - compH, CONTENT_W, compH, K.bgAlt, K.border);
  rect(page, MARGIN, y - compH, 4, compH, K.primary);
  txt(page, 'GESTIONNAIRE DE FLOTTE', MARGIN + 14, y - 14, 8, fonts.bold, K.textSecond, 'left', CONTENT_W - 24, 0);
  txt(page, nt(company.name), MARGIN + 14, y - 30, 11, fonts.bold, K.primary, 'left', CONTENT_W - 24, 0);
  const addrParts = [
    company.siret ? `SIRET : ${company.siret}` : null,
    [company.address, company.postal_code, company.city].filter(Boolean).join(' '),
  ].filter(Boolean).join('  |  ');
  if (addrParts) txt(page, nt(addrParts), MARGIN + 14, y - 46, 8.5, fonts.regular, K.textSecond, 'left', CONTENT_W - 24, 0);
}

// ─── PAGE 2: REGULATORY DASHBOARD ─────────────────────────────────────────────

function drawDashboard(page: PDFPage, fonts: FontSet, data: VehicleCarnetData): void {
  const { vehicle, maintenances, fuelRecords, inspections, activities } = data;

  let y = drawPageHeader(page, fonts, 'TABLEAU DE BORD REGLEMENTAIRE', vehicle.registration_number, data.company.name) - 8;

  // ── Section label
  txt(page, 'DOCUMENTS REGLEMENTAIRES', MARGIN, y, 9, fonts.bold, K.textSecond);
  y -= 14;

  // ── Regulatory cards 2 × N
  const hasAtp = !activities || activities.some(a => a === 'FRIGORIFIQUE');
  const regDocs: { label: string; expiry: string | null | undefined }[] = [
    { label: 'CONTROLE TECHNIQUE', expiry: vehicle.technical_control_expiry },
    { label: 'ASSURANCE',          expiry: vehicle.insurance_expiry },
    { label: 'TACHYGRAPHE',        expiry: vehicle.tachy_control_expiry },
  ];
  if (hasAtp) regDocs.push({ label: 'CERTIFICAT ATP', expiry: vehicle.atp_expiry });

  const CARD_GAP = 6;
  const CARD_W   = (CONTENT_W - CARD_GAP * (regDocs.length - 1)) / regDocs.length;
  const CARD_H   = 90;

  regDocs.forEach(({ label, expiry }, i) => {
    const cx = MARGIN + i * (CARD_W + CARD_GAP);
    const ds = docStatus(expiry);

    // Card background + top status bar (3pt) + border
    rect(page, cx, y - CARD_H, CARD_W, CARD_H, K.white, K.border);
    rect(page, cx, y - 3, CARD_W, 3, ds.color);          // top accent stripe

    // Status dot + label
    const dotX = cx + 10;
    const dotY = y - 18;
    page.drawEllipse({ x: dotX + 4, y: dotY + 3, xScale: 4, yScale: 4, color: ds.color });
    txt(page, label, dotX + 12, dotY, 8, fonts.bold, K.primary, 'left', CARD_W - 28, 0);

    // Date
    txt(page, ds.dateLabel, cx + 10, y - 38, 12, fonts.bold, ds.color, 'left', CARD_W - 16, 0);

    // Status badge
    const bLW = fonts.bold.widthOfTextAtSize(nt(ds.badgeText), 6.5);
    const bW  = Math.min(bLW + 10, CARD_W - 16);
    const bX  = cx + 8;
    const bY  = y - CARD_H + 8;
    rect(page, bX, bY, bW, 14, ds.bgColor, ds.borderColor, 0.5);
    txt(page, ds.badgeText, bX, bY + 2, 6.5, fonts.bold, ds.color, 'center', bW, 0);
  });

  y -= CARD_H + 20;

  // ── KPI strip
  txt(page, 'STATISTIQUES DU VEHICULE', MARGIN, y, 9, fonts.bold, K.textSecond);
  y -= 14;

  const totalCost = maintenances.reduce((s, m) => s + Number(m.final_cost ?? m.cost ?? m.estimated_cost ?? 0), 0);
  const consoVals = fuelRecords
    .map(f => f.consumption_l_per_100km ?? f.consumption ?? null)
    .filter((v): v is number => v != null && !isNaN(Number(v)))
    .map(Number);
  const avgConso = consoVals.length > 0
    ? consoVals.reduce((a, b) => a + b, 0) / consoVals.length : null;

  const kpis = [
    { label: 'Kilometrage',      value: vehicle.mileage != null ? `${vehicle.mileage.toLocaleString('fr-FR')} km` : '-' },
    { label: 'Interventions',    value: String(maintenances.length) },
    { label: 'Controles',        value: String(inspections.length) },
    { label: 'Cout maintenance', value: totalCost > 0 ? `${totalCost.toLocaleString('fr-FR')} EUR` : '-' },
    { label: 'Conso. moy.',      value: avgConso != null ? `${avgConso.toFixed(1)} L/100` : 'N/A' },
    { label: 'Pleins effectues', value: String(fuelRecords.length) },
  ];

  const KPI_W = CONTENT_W / kpis.length;
  const KPI_H = 62;
  rect(page, MARGIN, y - KPI_H, CONTENT_W, KPI_H, K.bgAlt, K.border);

  kpis.forEach((kpi, i) => {
    const kx = MARGIN + i * KPI_W;
    if (i > 0) vLine(page, kx, y - KPI_H + 8, y - 8, K.border);

    // Value (large, centered)
    const valW = fonts.bold.widthOfTextAtSize(nt(kpi.value), 20);
    page.drawText(nt(kpi.value), {
      x: kx + (KPI_W - valW) / 2, y: y - 30,
      size: 20, font: fonts.bold, color: K.primary,
    });
    // Label (small, centered, below)
    txt(page, nt(kpi.label), kx, y - KPI_H + 12, 8, fonts.regular, K.textSecond, 'center', KPI_W, 0);
  });
}

// ─── MAINTENANCE TYPE BADGES ──────────────────────────────────────────────────

const MAINT_BADGES: Record<string, { bg: RGB; text: RGB; label: string }> = {
  PREVENTIVE:  { bg: hexToRgb('#F0FDF4'), text: hexToRgb('#16A34A'), label: 'Preventive'  },
  preventive:  { bg: hexToRgb('#F0FDF4'), text: hexToRgb('#16A34A'), label: 'Preventive'  },
  CORRECTIVE:  { bg: hexToRgb('#FEF2F2'), text: hexToRgb('#DC2626'), label: 'Corrective'  },
  corrective:  { bg: hexToRgb('#FEF2F2'), text: hexToRgb('#DC2626'), label: 'Corrective'  },
  INSPECTION:  { bg: hexToRgb('#DBEAFE'), text: hexToRgb('#1D4ED8'), label: 'Inspection'  },
  inspection:  { bg: hexToRgb('#DBEAFE'), text: hexToRgb('#1D4ED8'), label: 'Inspection'  },
  REPARATION:  { bg: hexToRgb('#FEF3C7'), text: hexToRgb('#92400E'), label: 'Reparation'  },
  reparation:  { bg: hexToRgb('#FEF3C7'), text: hexToRgb('#92400E'), label: 'Reparation'  },
  PNEUMATIQUE: { bg: hexToRgb('#EDE9FE'), text: hexToRgb('#7C3AED'), label: 'Pneumatique' },
  pneumatique: { bg: hexToRgb('#EDE9FE'), text: hexToRgb('#7C3AED'), label: 'Pneumatique' },
  VIDANGE:     { bg: hexToRgb('#F3F4F6'), text: hexToRgb('#374151'), label: 'Vidange'     },
  vidange:     { bg: hexToRgb('#F3F4F6'), text: hexToRgb('#374151'), label: 'Vidange'     },
};

// ─── PAGE 3+: MAINTENANCES ────────────────────────────────────────────────────

// Date(75) | Type(95) | Description(195) | Effectue par(100) | Cout(70) = 535pt
const MAINT_COLS: ColDef[] = [
  { label: 'DATE',          w: 75,  align: 'center' },
  { label: 'TYPE',          w: 95,  align: 'center' },
  { label: 'DESCRIPTION',   w: 195, align: 'left'   },
  { label: 'EFFECTUE PAR',  w: 100, align: 'left'   },
  { label: 'COUT',          w: 70,  align: 'right'  },
];

function drawMaintenancesSection(
  pdfDoc: PDFDocument, fonts: FontSet, data: VehicleCarnetData, startPn: number,
): number {
  const ROW_H = 30;
  let page = newPage(pdfDoc);
  let pn   = startPn;
  let y    = drawPageHeader(page, fonts, 'HISTORIQUE DES MAINTENANCES', data.vehicle.registration_number, data.company.name) - 8;
  y = drawTableHeader(page, fonts, MAINT_COLS, y);

  if (data.maintenances.length === 0) {
    y -= 12;
    rect(page, MARGIN, y - 38, CONTENT_W, 38, K.bgAlt, K.border);
    txt(page, 'Aucune intervention enregistree sur la periode selectionnee', MARGIN, y - 21, 9, fonts.regular, K.textSecond, 'center', CONTENT_W);
    return pn;
  }

  const sorted = [...data.maintenances].sort((a, b) =>
    (extractDate(b) ?? '').localeCompare(extractDate(a) ?? ''));

  let totalCost = 0;

  sorted.forEach((m, idx) => {
    if (y - ROW_H < BOTTOM) {
      page = newPage(pdfDoc);
      pn++;
      y = drawPageHeader(page, fonts, 'MAINTENANCES (suite)', data.vehicle.registration_number, data.company.name) - 8;
      y = drawTableHeader(page, fonts, MAINT_COLS, y);
    }

    const bg = idx % 2 === 0 ? K.white : K.bgAlt;
    let x = MARGIN;
    MAINT_COLS.forEach(col => { rect(page, x, y - ROW_H, col.w, ROW_H, bg, K.border, 0.25); x += col.w; });

    const ds      = extractDate(m);
    const typeRaw = String(m.type ?? m.service_type ?? '');
    const mb      = MAINT_BADGES[typeRaw];
    const cost    = m.final_cost ?? m.cost ?? m.estimated_cost;
    const costNum = cost != null ? Number(cost) : null;
    if (costNum != null) totalCost += costNum;
    const costColor = costNum != null && costNum > 500 ? K.danger : K.text;
    const midY = y - ROW_H / 2 - 3;

    x = MARGIN;

    // Date
    txt(page, ds ? formatDateFR(ds) : '-', x, midY, 8, fonts.regular, K.text, 'center', MAINT_COLS[0].w, 0);
    x += MAINT_COLS[0].w;

    // Type badge
    if (mb) {
      const bLW = fonts.bold.widthOfTextAtSize(mb.label, 7);
      const bW  = bLW + 10;
      const bX  = x + (MAINT_COLS[1].w - bW) / 2;
      const bY  = y - ROW_H / 2 - 10;
      rect(page, bX, bY, bW, 15, mb.bg);
      page.drawText(mb.label, { x: bX + 5, y: bY + 4, size: 7, font: fonts.bold, color: mb.text });
    } else {
      txt(page, nt(typeRaw || '-'), x, midY, 8, fonts.regular, K.text, 'center', MAINT_COLS[1].w, 0);
    }
    x += MAINT_COLS[1].w;

    // Description
    txt(page, nt(String(m.description ?? m.notes ?? m.service_type ?? 'Intervention')), x + 4, midY, 8, fonts.regular, K.text, 'left', MAINT_COLS[2].w - 8, 0);
    x += MAINT_COLS[2].w;

    // Effectué par
    txt(page, nt(String(m.garage_name ?? m.performed_by ?? m.requested_by ?? '-')), x + 4, midY, 8, fonts.regular, K.textSecond, 'left', MAINT_COLS[3].w - 8, 0);
    x += MAINT_COLS[3].w;

    // Coût (right-aligned, red if > 500)
    const costStr = costNum != null ? `${costNum.toLocaleString('fr-FR')} EUR` : '-';
    txt(page, costStr, x, midY, 8, costNum != null && costNum > 500 ? fonts.bold : fonts.regular, costColor, 'right', MAINT_COLS[4].w, 6);

    y -= ROW_H;
  });

  // Total row
  if (y - 26 > BOTTOM && totalCost > 0) {
    rect(page, MARGIN, y - 26, CONTENT_W, 26, K.primaryBg, K.primaryBorder);
    txt(page, 'TOTAL MAINTENANCES', MARGIN + 8, y - 15, 8, fonts.bold, K.primary, 'left', 240, 0);
    const totStr = `${totalCost.toLocaleString('fr-FR')} EUR`;
    const totW = fonts.bold.widthOfTextAtSize(totStr, 9);
    page.drawText(totStr, { x: PAGE_W - MARGIN - totW, y: y - 15, size: 9, font: fonts.bold, color: K.primary });
  }

  return pn;
}

// ─── INSPECTION STATUS BADGES ─────────────────────────────────────────────────

const INSP_STATUS: Record<string, { bg: RGB; text: RGB; label: string }> = {
  COMPLETED:       { bg: hexToRgb('#F0FDF4'), text: hexToRgb('#16A34A'), label: 'Conforme'    },
  ISSUES_FOUND:    { bg: hexToRgb('#FFFBEB'), text: hexToRgb('#92400E'), label: 'Anomalies'   },
  CRITICAL_ISSUES: { bg: hexToRgb('#FEF2F2'), text: hexToRgb('#DC2626'), label: 'Refuse'      },
  PENDING:         { bg: hexToRgb('#EFF6FF'), text: hexToRgb('#1D4ED8'), label: 'A surveiller' },
};

function formatDefects(raw: unknown): string {
  if (!raw) return 'Aucun';
  try {
    const d = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (Array.isArray(d)) {
      if (d.length === 0) return 'Aucun';
      const labels = d.map((item: unknown) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const o = item as Record<string, unknown>;
          return String(o.description ?? o.label ?? o.type ?? o.name ?? '');
        }
        return '';
      }).filter(Boolean);
      return labels.length > 0
        ? labels.slice(0, 2).join(', ') + (d.length > 2 ? ` +${d.length - 2}` : '')
        : `${d.length} defaut(s)`;
    }
    return String(d);
  } catch { return 'Voir rapport'; }
}

// ─── PAGE 4+: INSPECTIONS ─────────────────────────────────────────────────────

// Date(80) | Type(90) | Score(90) | Statut(85) | Problemes(190) = 535pt
const INSP_COLS: ColDef[] = [
  { label: 'DATE',               w: 80,  align: 'center' },
  { label: 'TYPE',               w: 90,  align: 'center' },
  { label: 'SCORE',              w: 90,  align: 'center' },
  { label: 'STATUT',             w: 85,  align: 'center' },
  { label: 'PROBLEMES SIGNALES', w: 190, align: 'left'   },
];

function drawInspectionsSection(
  pdfDoc: PDFDocument, fonts: FontSet, data: VehicleCarnetData, startPn: number,
): number {
  const ROW_H = 38;
  let page = newPage(pdfDoc);
  let pn   = startPn;
  let y    = drawPageHeader(page, fonts, 'CONTROLES ET INSPECTIONS', data.vehicle.registration_number, data.company.name) - 8;
  y = drawTableHeader(page, fonts, INSP_COLS, y);

  if (data.inspections.length === 0) {
    y -= 12;
    rect(page, MARGIN, y - 38, CONTENT_W, 38, K.bgAlt, K.border);
    txt(page, 'Aucun controle enregistre sur la periode selectionnee', MARGIN, y - 21, 9, fonts.regular, K.textSecond, 'center', CONTENT_W);
    return pn;
  }

  const sorted = [...data.inspections].sort((a, b) =>
    (extractDate(b) ?? '').localeCompare(extractDate(a) ?? ''));

  sorted.forEach((insp, idx) => {
    if (y - ROW_H < BOTTOM) {
      page = newPage(pdfDoc);
      pn++;
      y = drawPageHeader(page, fonts, 'CONTROLES (suite)', data.vehicle.registration_number, data.company.name) - 8;
      y = drawTableHeader(page, fonts, INSP_COLS, y);
    }

    const bg = idx % 2 === 0 ? K.white : K.bgAlt;
    let x = MARGIN;
    INSP_COLS.forEach(col => { rect(page, x, y - ROW_H, col.w, ROW_H, bg, K.border, 0.25); x += col.w; });

    const ds      = extractDate(insp);
    const score   = insp.score != null ? Number(insp.score) : null;
    const status  = String(insp.status ?? '');
    const defects = formatDefects(insp.reported_defects ?? insp.defects ?? insp.issues);
    const typeStr = nt(String(insp.inspection_type ?? insp.type ?? 'Inspection'));
    const sc      = INSP_STATUS[status] ?? { bg: K.bgAlt, text: K.textMuted, label: status || '-' };
    const midY    = y - ROW_H / 2 - 3;

    x = MARGIN;

    // Date
    txt(page, ds ? formatDateFR(ds) : '-', x, midY, 8, fonts.regular, K.text, 'center', INSP_COLS[0].w, 0);
    x += INSP_COLS[0].w;

    // Type
    txt(page, typeStr, x, midY, 8, fonts.bold, K.primary, 'center', INSP_COLS[1].w, 0);
    x += INSP_COLS[1].w;

    // Score — chiffre coloré + mini barre de progression
    const scoreColX = x;
    const scoreColW = INSP_COLS[2].w;
    if (score != null) {
      const sc2 = score >= 80 ? K.success : score >= 50 ? K.warning : K.danger;
      const scoreStr = `${score}/100`;
      const sw = fonts.bold.widthOfTextAtSize(scoreStr, 10);
      page.drawText(scoreStr, { x: scoreColX + (scoreColW - sw) / 2, y: y - 14, size: 10, font: fonts.bold, color: sc2 });
      // Mini progress bar (60pt × 5pt)
      const BAR_W = 60;
      const barX  = scoreColX + (scoreColW - BAR_W) / 2;
      const barY  = y - ROW_H + 8;
      rect(page, barX, barY, BAR_W, 5, K.border);
      rect(page, barX, barY, Math.max(1, BAR_W * (score / 100)), 5, sc2);
    } else {
      txt(page, '-', x, midY, 8, fonts.regular, K.textMuted, 'center', scoreColW, 0);
    }
    x += scoreColW;

    // Status badge (centered in cell)
    const bLW  = fonts.bold.widthOfTextAtSize(nt(sc.label), 7);
    const bW   = bLW + 10;
    const bX   = x + (INSP_COLS[3].w - bW) / 2;
    const bY   = y - ROW_H / 2 - 10;
    rect(page, bX, bY, bW, 15, sc.bg, K.border, 0.25);
    page.drawText(nt(sc.label), { x: bX + 5, y: bY + 4, size: 7, font: fonts.bold, color: sc.text });
    x += INSP_COLS[3].w;

    // Problems (wrap 2 lines)
    if (defects && defects !== 'Aucun') {
      wrapText(page, defects, x + 4, y - 12, INSP_COLS[4].w - 8, 10, fonts.regular, 7.5, K.text, 2);
    } else {
      txt(page, 'Aucun', x + 4, midY, 8, fonts.italic, K.textMuted, 'left', INSP_COLS[4].w - 8, 0);
    }

    y -= ROW_H;
  });

  return pn;
}

// ─── FUEL TYPE BADGES ─────────────────────────────────────────────────────────

const FUEL_BADGES: Record<string, { bg: RGB; text: RGB; label: string }> = {
  diesel:   { bg: hexToRgb('#F3F4F6'), text: hexToRgb('#374151'), label: 'Diesel'  },
  Diesel:   { bg: hexToRgb('#F3F4F6'), text: hexToRgb('#374151'), label: 'Diesel'  },
  adblue:   { bg: hexToRgb('#DBEAFE'), text: hexToRgb('#1D4ED8'), label: 'AdBlue'  },
  AdBlue:   { bg: hexToRgb('#DBEAFE'), text: hexToRgb('#1D4ED8'), label: 'AdBlue'  },
  gnr:      { bg: hexToRgb('#FEF3C7'), text: hexToRgb('#92400E'), label: 'GNR'     },
  GNR:      { bg: hexToRgb('#FEF3C7'), text: hexToRgb('#92400E'), label: 'GNR'     },
  gasoline: { bg: hexToRgb('#EDE9FE'), text: hexToRgb('#7C3AED'), label: 'Essence' },
  essence:  { bg: hexToRgb('#EDE9FE'), text: hexToRgb('#7C3AED'), label: 'Essence' },
  Essence:  { bg: hexToRgb('#EDE9FE'), text: hexToRgb('#7C3AED'), label: 'Essence' },
  gnv:      { bg: hexToRgb('#D1FAE5'), text: hexToRgb('#065F46'), label: 'GNV'     },
  GNV:      { bg: hexToRgb('#D1FAE5'), text: hexToRgb('#065F46'), label: 'GNV'     },
};

// ─── PAGE 5+: CONSOMMATIONS ───────────────────────────────────────────────────

// Date(75) | Type(80) | Litres(70) | Montant(80) | Km(90) | Conso(65) | Station(75) = 535pt
const FUEL_COLS: ColDef[] = [
  { label: 'DATE',    w: 75,  align: 'center' },
  { label: 'TYPE',    w: 80,  align: 'center' },
  { label: 'LITRES',  w: 70,  align: 'right'  },
  { label: 'MONTANT', w: 80,  align: 'right'  },
  { label: 'KM',      w: 90,  align: 'right'  },
  { label: 'CONSO',   w: 65,  align: 'right'  },
  { label: 'STATION', w: 75,  align: 'left'   },
];

function drawFuelSection(
  pdfDoc: PDFDocument, fonts: FontSet, data: VehicleCarnetData, startPn: number,
): number {
  const ROW_H = 28;
  let page = newPage(pdfDoc);
  let pn   = startPn;
  let y    = drawPageHeader(page, fonts, 'HISTORIQUE DES CONSOMMATIONS', data.vehicle.registration_number, data.company.name) - 8;
  y = drawTableHeader(page, fonts, FUEL_COLS, y);

  if (data.fuelRecords.length === 0) {
    y -= 12;
    rect(page, MARGIN, y - 38, CONTENT_W, 38, K.bgAlt, K.border);
    txt(page, 'Aucune donnee de consommation disponible', MARGIN, y - 21, 9, fonts.regular, K.textSecond, 'center', CONTENT_W);
    return pn;
  }

  const sorted = [...data.fuelRecords].sort((a, b) =>
    (extractDate(b) ?? '').localeCompare(extractDate(a) ?? ''));

  // Accumulate totals per fuel type
  const totals: Record<string, { litres: number; montant: number }> = {};
  let grandTotal = 0;

  sorted.forEach((f, idx) => {
    if (y - ROW_H < BOTTOM) {
      page = newPage(pdfDoc);
      pn++;
      y = drawPageHeader(page, fonts, 'CONSOMMATIONS (suite)', data.vehicle.registration_number, data.company.name) - 8;
      y = drawTableHeader(page, fonts, FUEL_COLS, y);
    }

    const bg = idx % 2 === 0 ? K.white : K.bgAlt;
    let x = MARGIN;
    FUEL_COLS.forEach(col => { rect(page, x, y - ROW_H, col.w, ROW_H, bg, K.border, 0.25); x += col.w; });

    const fDate  = extractDate(f);
    const fType  = String(f.fuel_type ?? f.type ?? '');
    const fLiter = f.quantity_liters ?? f.liters ?? null;
    const fPrice = f.price_total ?? f.price ?? null;
    const fKm    = f.mileage_at_fill ?? f.mileage ?? null;
    const fConso = f.consumption_l_per_100km ?? f.consumption ?? null;
    const fb     = FUEL_BADGES[fType] ?? FUEL_BADGES[fType.toLowerCase() as string];
    const lNum   = fLiter != null ? Number(fLiter) : null;
    const pNum   = fPrice != null ? Number(fPrice) : null;
    const midY   = y - ROW_H / 2 - 3;

    // Accumulate
    if (fb) {
      const key = fb.label;
      if (!totals[key]) totals[key] = { litres: 0, montant: 0 };
      if (lNum) totals[key].litres += lNum;
      if (pNum) { totals[key].montant += pNum; grandTotal += pNum; }
    }

    x = MARGIN;

    // Date
    txt(page, fDate ? formatDateFR(fDate) : '-', x, midY, 8, fonts.regular, K.text, 'center', FUEL_COLS[0].w, 0);
    x += FUEL_COLS[0].w;

    // Fuel type badge
    if (fb) {
      const bLW = fonts.bold.widthOfTextAtSize(fb.label, 7);
      const bW  = bLW + 10;
      const bX  = x + (FUEL_COLS[1].w - bW) / 2;
      const bY  = y - ROW_H / 2 - 10;
      rect(page, bX, bY, bW, 15, fb.bg);
      page.drawText(fb.label, { x: bX + 5, y: bY + 4, size: 7, font: fonts.bold, color: fb.text });
    } else {
      txt(page, nt(fType || '-'), x, midY, 8, fonts.regular, K.text, 'center', FUEL_COLS[1].w, 0);
    }
    x += FUEL_COLS[1].w;

    // Litres
    txt(page, lNum != null ? `${lNum.toFixed(1)} L` : '-', x, midY, 8, fonts.regular, K.text, 'right', FUEL_COLS[2].w, 6);
    x += FUEL_COLS[2].w;

    // Montant
    txt(page, pNum != null ? `${pNum.toFixed(2)} EUR` : '-', x, midY, 8, fonts.regular, K.text, 'right', FUEL_COLS[3].w, 6);
    x += FUEL_COLS[3].w;

    // Km
    txt(page, fKm != null ? `${Number(fKm).toLocaleString('fr-FR')} km` : '-', x, midY, 8, fonts.regular, K.text, 'right', FUEL_COLS[4].w, 6);
    x += FUEL_COLS[4].w;

    // Conso (orange + bold if > 38 L/100)
    const consoNum = fConso != null ? Number(fConso) : null;
    const highConso = consoNum != null && consoNum > 38;
    txt(page, consoNum != null ? `${consoNum.toFixed(1)} L/100` : '-',
      x, midY, 8, highConso ? fonts.bold : fonts.regular,
      highConso ? K.warning : K.text, 'right', FUEL_COLS[5].w, 6);
    x += FUEL_COLS[5].w;

    // Station
    txt(page, nt(String(f.station_name ?? '-')), x + 4, midY, 8, fonts.regular, K.textSecond, 'left', FUEL_COLS[6].w - 8, 0);

    y -= ROW_H;
  });

  // Totals block
  if (y - 52 > BOTTOM && Object.keys(totals).length > 0) {
    y -= 4;
    const fuelTotalStr = Object.entries(totals)
      .map(([label, { litres, montant }]) => `${label}: ${litres.toFixed(1)} L - ${montant.toFixed(2)} EUR`)
      .join('   |   ');
    rect(page, MARGIN, y - 26, CONTENT_W, 26, K.primaryBg, K.primaryBorder);
    txt(page, fuelTotalStr, MARGIN + 8, y - 15, 7.5, fonts.regular, K.primary, 'left', CONTENT_W - 16, 0);
    y -= 26;

    rect(page, MARGIN, y - 26, CONTENT_W, 26, K.primaryBg, K.primaryBorder);
    txt(page, 'TOTAL CARBURANTS', MARGIN + 8, y - 15, 8, fonts.bold, K.primary, 'left', 240, 0);
    const gtStr = `${grandTotal.toFixed(2)} EUR`;
    const gtW = fonts.bold.widthOfTextAtSize(gtStr, 9);
    page.drawText(gtStr, { x: PAGE_W - MARGIN - gtW, y: y - 15, size: 9, font: fonts.bold, color: K.primary });
  }

  return pn;
}

// ─── LAST PAGE: CERTIFICATION ─────────────────────────────────────────────────

function drawLegal(page: PDFPage, fonts: FontSet, data: VehicleCarnetData, generatedAt: Date): void {
  const { vehicle, company } = data;

  let y = drawPageHeader(page, fonts, 'CERTIFICATION ET MENTIONS LEGALES', vehicle.registration_number, company.name) - 14;

  // ── Certification block (green)
  const certH = 92;
  rect(page, MARGIN, y - certH, CONTENT_W, certH, K.successBg, K.successBorder);
  rect(page, MARGIN, y - certH, 4, certH, K.success);
  txt(page, 'CERTIFICATION DE CONFORMITE', MARGIN + 14, y - 17, 11, fonts.bold, K.successText, 'left', CONTENT_W - 24, 0);
  wrapText(
    page,
    `Le present document atteste que le vehicule immatricule ${nt(vehicle.registration_number)}, exploite par ${nt(company.name)}, a fait l'objet d'un suivi regulier d'entretien et de maintenance conforme aux obligations reglementaires. Ce carnet numerique constitue une preuve de tracabilite recevable lors des controles DREAL et dans le cadre de toute cession du vehicule.`,
    MARGIN + 14, y - 34, CONTENT_W - 28, 12, fonts.regular, 9, hexToRgb('#374151'),
  );

  y -= certH + 20;

  // ── Info grid 2 columns
  txt(page, 'INFORMATIONS DE GENERATION', MARGIN, y, 9, fonts.bold, K.textSecond, 'left', CONTENT_W, 0);
  y -= 10;
  hLine(page, y, K.border);
  y -= 8;

  const dateStr = generatedAt.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const timeStr = generatedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const docRef  = nt(`CARNET-${vehicle.registration_number}-${generatedAt.toISOString().slice(0, 10)}`);

  const infoRows: [string, string, string, string][] = [
    ['Document genere le', `${dateStr} a ${timeStr}`, 'Reference document', docRef],
    ['Logiciel',           'Fleet-Master',          'SIRET gestionnaire',  company.siret ?? 'Non renseigne'],
    ['Gestionnaire',       nt(company.name),            'Vehicule',            nt(`${vehicle.registration_number} - ${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim())],
  ];

  const COL_W = CONTENT_W / 2;
  const ROW_H = 36;

  infoRows.forEach((row, ri) => {
    const ry = y - ri * ROW_H;
    const bg = ri % 2 === 0 ? K.white : K.bgAlt;
    rect(page, MARGIN, ry - ROW_H, CONTENT_W, ROW_H, bg, K.border, 0.3);
    vLine(page, MARGIN + COL_W, ry - ROW_H + 4, ry - 4);
    // Left cell
    txt(page, row[0], MARGIN + 8, ry - 13, 8, fonts.regular, K.textSecond, 'left', COL_W - 16, 0);
    txt(page, row[1], MARGIN + 8, ry - 27, 9, fonts.bold, K.text, 'left', COL_W - 16, 0);
    // Right cell
    txt(page, row[2], MARGIN + COL_W + 8, ry - 13, 8, fonts.regular, K.textSecond, 'left', COL_W - 16, 0);
    txt(page, row[3], MARGIN + COL_W + 8, ry - 27, 9, fonts.bold, K.text, 'left', COL_W - 16, 0);
  });

  y -= infoRows.length * ROW_H + 20;

  // ── QR Code placeholder (centered)
  const QR_W = 210;
  const QR_H = 76;
  const QR_X = (PAGE_W - QR_W) / 2;
  rect(page, QR_X, y - QR_H, QR_W, QR_H, K.bgAlt, K.border);

  // Simulated QR pattern (decorative grid top-left)
  for (let qi = 0; qi < 4; qi++) {
    for (let qj = 0; qj < 4; qj++) {
      if ((qi + qj) % 2 === 0) {
        rect(page, QR_X + 10 + qi * 7, y - QR_H + 10 + qj * 7, 6, 6, K.primary);
      }
    }
  }

  txt(page, `Ref. : ${docRef}`, QR_X, y - 36, 8, fonts.bold, K.primary, 'center', QR_W, 0);
  txt(page, 'Verification : app.fleetmaster.fr', QR_X, y - QR_H + 12, 7, fonts.regular, K.textSecond, 'center', QR_W, 0);

  y -= QR_H + 16;

  // ── Warning block (orange)
  if (y - 60 > BOTTOM + 44) {
    const warnH = 60;
    rect(page, MARGIN, y - warnH, CONTENT_W, warnH, K.warningBg, K.warningBorder);
    rect(page, MARGIN, y - warnH, 4, warnH, K.warning);
    txt(page, 'AVERTISSEMENT', MARGIN + 14, y - 16, 9, fonts.bold, K.warningText, 'left', CONTENT_W - 24, 0);
    wrapText(
      page,
      "Ce document est genere automatiquement par Fleet-Master a partir des donnees enregistrees par les gestionnaires de flotte. L'exactitude des informations releve de la responsabilite de l'entreprise gestionnaire. Fleet-Master ne saurait etre tenu responsable d'eventuelles inexactitudes.",
      MARGIN + 14, y - 32, CONTENT_W - 28, 10, fonts.regular, 8, K.warningText, 3,
    );
    y -= warnH + 16;
  }

  // ── Signature block (fixed above footer)
  const SIG_Y  = 80;
  const SIG_H  = 46;
  const SIG_W  = CONTENT_W;
  const SIG_DIV = SIG_W / 2;

  rect(page, MARGIN, SIG_Y, SIG_W, SIG_H, K.bgAlt, K.border);
  vLine(page, MARGIN + SIG_DIV, SIG_Y + 4, SIG_Y + SIG_H - 4);

  // Left: document info
  txt(page, 'Rapport etabli par Fleet-Master', MARGIN + 10, SIG_Y + SIG_H - 14, 9, fonts.bold, K.primary, 'left', SIG_DIV - 16, 0);
  txt(page, nt(company.name), MARGIN + 10, SIG_Y + SIG_H - 28, 8, fonts.regular, K.text, 'left', SIG_DIV - 16, 0);
  txt(page, `Ref. : ${docRef}`, MARGIN + 10, SIG_Y + SIG_H - 42, 7, fonts.regular, K.textMuted, 'left', SIG_DIV - 16, 0);

  // Right: signature line
  hLine(page, SIG_Y + 22, K.textMuted, 0.5, MARGIN + SIG_DIV + 14, MARGIN + SIG_W - 14);
  txt(page, 'Signature & cachet gestionnaire', MARGIN + SIG_DIV, SIG_Y + 10, 8, fonts.regular, K.textMuted, 'center', SIG_DIV, 0);
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────

export async function generateCarnetPDF(data: VehicleCarnetData): Promise<Buffer> {
  const pdfDoc     = await PDFDocument.create();
  const generatedAt = new Date();

  pdfDoc.setTitle(nt(`Carnet d'Entretien - ${data.vehicle.registration_number}`));
  pdfDoc.setAuthor('Fleet-Master');
  pdfDoc.setSubject(nt(`Carnet numerique - ${data.vehicle.registration_number}`));
  pdfDoc.setCreationDate(generatedAt);

  const fonts = await loadFonts(pdfDoc);

  // First event date (cover period)
  const allDates = [
    ...data.maintenances.map(m => extractDate(m)),
    ...data.inspections.map(i => extractDate(i)),
    ...data.fuelRecords.map(f => extractDate(f)),
  ].filter(Boolean) as string[];
  allDates.sort();
  const firstDate = allDates[0] ?? null;

  // ── Page 1: Cover
  const coverPage = newPage(pdfDoc);
  drawCover(coverPage, fonts, data, firstDate);

  // ── Page 2: Regulatory dashboard + KPI strip
  const dashPage = newPage(pdfDoc);
  drawDashboard(dashPage, fonts, data);

  // ── Pages 3+: Maintenances
  let pn = drawMaintenancesSection(pdfDoc, fonts, data, 3);

  // ── Pages 4+: Inspections
  pn = drawInspectionsSection(pdfDoc, fonts, data, pn + 1);

  // ── Pages 5+: Fuel (only if records exist)
  if (data.fuelRecords.length > 0) {
    pn = drawFuelSection(pdfDoc, fonts, data, pn + 1);
  }

  // ── Last page: Certification / Legal
  pn++;
  const legalPage = newPage(pdfDoc);
  drawLegal(legalPage, fonts, data, generatedAt);

  // ── Final pass: add footer to ALL pages with correct total page count
  // Single call per page — no duplication possible
  const pages = pdfDoc.getPages();
  const total  = pages.length;
  pages.forEach((pg, idx) => {
    drawPageFooter(pg, fonts, idx + 1, total, data.company.name, generatedAt);
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes) as unknown as Buffer;
}
