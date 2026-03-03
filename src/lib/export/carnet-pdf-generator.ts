/**
 * Carnet d'Entretien Digital — PDF Generator (A4 Portrait)
 * Professional maintenance logbook for DREAL audits and vehicle resale.
 * Uses pdf-lib (pure JS, WinAnsi safe — no pdfkit / no native deps).
 */

import { PDFDocument, rgb, StandardFonts, RGB, PDFPage, PDFFont } from 'pdf-lib';
import {
  formatDateFR,
  VEHICLE_TYPE_LABELS,
  VEHICLE_STATUS_LABELS,
  MAINTENANCE_STATUS_LABELS,
} from './formatters';

// ─── WinAnsi normalizer ────────────────────────────────────────────────────────
function nt(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\u00A0\u202F\u2007\u2060]/g, ' ')
    .replace(/[""«»]/g, '"')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[—–\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\xFF]/g, '?');
}

// ─── Color palette (print-friendly — white background) ───────────────────────
const C = {
  blue:      rgb(0.11, 0.38, 0.68),  // #1C61AD corporate blue
  blueDark:  rgb(0.07, 0.25, 0.50),  // #124080
  blueLight: rgb(0.90, 0.93, 0.97),  // #E6EEF8
  white:     rgb(1, 1, 1),
  black:     rgb(0.09, 0.09, 0.11),  // #171719
  gray:      rgb(0.42, 0.42, 0.47),  // #6B6B78
  grayLight: rgb(0.96, 0.96, 0.97),  // #F5F5F8
  border:    rgb(0.80, 0.80, 0.85),  // #CCCCD9
  green:     rgb(0.10, 0.62, 0.33),  // #1A9E54
  red:       rgb(0.80, 0.13, 0.13),  // #CC2020
  orange:    rgb(0.82, 0.46, 0.08),  // #D17514
};

// ─── A4 Portrait dimensions ───────────────────────────────────────────────────
const PAGE_W   = 595.28;
const PAGE_H   = 841.89;
const MARGIN   = 40;
const CONTENT_W = PAGE_W - MARGIN * 2; // 515.28

// ─── Input types ─────────────────────────────────────────────────────────────
// Interfaces volontairement larges : on accepte tous les champs DB via select('*')
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type MaintenanceEntry = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type InspectionEntry = Record<string, any>;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type FuelEntry = Record<string, any>;

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
    email?: string | null;
  };
  maintenances: MaintenanceEntry[];
  inspections: InspectionEntry[];
  fuelRecords: FuelEntry[];
}

interface Fonts { regular: PDFFont; bold: PDFFont; }

// ─── Primitive helpers ────────────────────────────────────────────────────────

function newPage(pdfDoc: PDFDocument): PDFPage {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.white });
  return page;
}

function hLine(page: PDFPage, y: number, color: RGB = C.border, thickness = 0.5,
               x0 = MARGIN, x1 = PAGE_W - MARGIN) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number,
              fill: RGB, border?: RGB) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill,
    borderColor: border, borderWidth: border ? 0.5 : 0 });
}

/** Draw text clipped to maxWidth; supports left/center/right alignment. */
function txt(
  page: PDFPage, text: string,
  x: number, y: number,
  size: number, font: PDFFont, color: RGB,
  align: 'left' | 'center' | 'right' = 'left',
  maxWidth = CONTENT_W,
) {
  let s = nt(text);
  const pad = 6;
  const avail = maxWidth - pad * 2;
  while (s.length > 1 && font.widthOfTextAtSize(s, size) > avail) s = s.slice(0, -1);
  if (s !== nt(text) && s.length > 1) s = s.slice(0, -1) + '.';
  const tw = font.widthOfTextAtSize(s, size);
  let dx = x + pad;
  if (align === 'center') dx = x + (maxWidth - tw) / 2;
  if (align === 'right')  dx = x + maxWidth - tw - pad;
  page.drawText(s, { x: dx, y, size, font, color });
}

// ─── Expiry status ────────────────────────────────────────────────────────────
function expiryStatus(expiry: string | null | undefined) {
  if (!expiry) return { label: 'N/A', color: C.gray, sublabel: 'Non applicable' };
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  if (days < 0)  return { label: 'EXPIRE',  color: C.red,    sublabel: `Il y a ${Math.abs(days)} j` };
  if (days < 30) return { label: 'URGENT',  color: C.red,    sublabel: `Dans ${days} j` };
  if (days < 90) return { label: 'BIENTOT', color: C.orange, sublabel: `Dans ${days} j` };
  return { label: 'OK', color: C.green, sublabel: `Dans ${days} j` };
}

// ─── Shared page header (pages 2+) ────────────────────────────────────────────
function drawPageHeader(page: PDFPage, fonts: Fonts, registration: string, sectionTitle: string) {
  rect(page, 0, PAGE_H - 36, PAGE_W, 36, C.blue);
  txt(page, 'FleetMaster Pro', MARGIN, PAGE_H - 23, 9, fonts.bold, C.white);
  const tag = nt(`CARNET - ${registration.toUpperCase()}`);
  const tagW = fonts.regular.widthOfTextAtSize(tag, 8);
  txt(page, tag, PAGE_W - MARGIN - tagW - 6, PAGE_H - 23, 8, fonts.regular, C.blueLight, 'left', tagW + 6);
  txt(page, nt(sectionTitle), MARGIN, PAGE_H - 56, 12, fonts.bold, C.black);
  hLine(page, PAGE_H - 63, C.border);
}

// ─── Shared page footer ───────────────────────────────────────────────────────
function drawPageFooter(page: PDFPage, fonts: Fonts, pageNum: number, companyName: string) {
  hLine(page, 36, C.border);
  txt(page, nt(`FleetMaster Pro - Document confidentiel - ${companyName}`),
      MARGIN, 20, 7, fonts.regular, C.gray);
  const right = nt(`Page ${pageNum}  |  Genere le ${formatDateFR(new Date())}`);
  const rw = fonts.regular.widthOfTextAtSize(right, 7);
  txt(page, right, PAGE_W - MARGIN - rw - 6, 20, 7, fonts.regular, C.gray, 'left', rw + 6);
}

// ─── PAGE 1: COVER ────────────────────────────────────────────────────────────
function drawCover(page: PDFPage, fonts: Fonts, data: VehicleCarnetData, firstDate: string | null) {
  const { vehicle, company } = data;

  // Top blue header
  rect(page, 0, PAGE_H - 78, PAGE_W, 78, C.blue);
  txt(page, 'FleetMaster Pro', MARGIN, PAGE_H - 34, 20, fonts.bold, C.white);
  txt(page, 'Systeme de gestion de flotte', MARGIN, PAGE_H - 52, 9, fonts.regular, C.blueLight);
  // "DOCUMENT OFFICIEL" badge top-right
  const badge = 'DOCUMENT OFFICIEL';
  const badgeW = fonts.bold.widthOfTextAtSize(badge, 8) + 16;
  rect(page, PAGE_W - MARGIN - badgeW, PAGE_H - 52, badgeW, 18, C.blueDark);
  txt(page, badge, PAGE_W - MARGIN - badgeW + 2, PAGE_H - 44, 8, fonts.bold, C.white, 'center', badgeW - 4);
  // Thin accent stripe
  rect(page, 0, PAGE_H - 82, PAGE_W, 4, C.blueDark);

  // Main title
  const titleY = PAGE_H - 138;
  txt(page, "CARNET D'ENTRETIEN", MARGIN, titleY, 30, fonts.bold, C.black);
  txt(page, 'ET DE MAINTENANCE', MARGIN, titleY - 34, 22, fonts.regular, C.blue);
  rect(page, MARGIN, titleY - 50, 90, 3, C.blue);

  // Vehicle identity card
  const cardY = titleY - 75;
  const cardH  = 190;
  rect(page, MARGIN, cardY - cardH, CONTENT_W, cardH, C.grayLight, C.border);
  // Card colour bar left
  rect(page, MARGIN, cardY - cardH, 5, cardH, C.blue);
  // Card title row
  rect(page, MARGIN + 5, cardY - 38, CONTENT_W - 5, 38, C.blueLight);
  txt(page, nt(vehicle.registration_number), MARGIN + 14, cardY - 22,
      20, fonts.bold, C.blue, 'left', 160);
  const brandModel = nt(`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim());
  txt(page, brandModel, MARGIN + 14, cardY - 36, 9, fonts.regular, C.gray, 'left', 180);

  // Vehicle details — 2-column grid
  const col1 = MARGIN + 14;
  const col2 = MARGIN + CONTENT_W / 2 + 10;
  const lh   = 26;
  const fuelMap: Record<string, string> = {
    diesel: 'Diesel', gasoline: 'Essence', electric: 'Electrique',
    hybrid: 'Hybride', lpg: 'GPL', adblue: 'AdBlue',
  };
  const details: [string, string][] = [
    ['Annee de mise en service', vehicle.year ? String(vehicle.year) : '-'],
    ['Type de vehicule', VEHICLE_TYPE_LABELS[vehicle.type ?? ''] ?? vehicle.type ?? '-'],
    ['Energie', fuelMap[vehicle.fuel_type ?? ''] ?? vehicle.fuel_type ?? '-'],
    ['N° VIN / Chassis', vehicle.vin ?? '-'],
    ['Kilometrage actuel', vehicle.mileage != null ? `${vehicle.mileage.toLocaleString('fr-FR')} km` : '-'],
    ['Statut', VEHICLE_STATUS_LABELS[vehicle.status] ?? vehicle.status],
  ];
  details.forEach(([label, value], i) => {
    const isRight = i % 2 === 1;
    const xp = isRight ? col2 : col1;
    const yp = cardY - 55 - Math.floor(i / 2) * lh;
    if (!isRight && i > 0) hLine(page, yp + lh - 2, C.border, 0.3, MARGIN + 10, PAGE_W - MARGIN - 10);
    txt(page, nt(label), xp, yp + 11, 7, fonts.regular, C.gray, 'left', CONTENT_W / 2 - 22);
    txt(page, nt(value), xp, yp - 1, 9.5, fonts.bold, C.black, 'left', CONTENT_W / 2 - 22);
  });

  // Period
  const periodY = cardY - cardH - 30;
  txt(page, 'PERIODE COUVERTE', MARGIN, periodY, 8, fonts.bold, C.gray);
  hLine(page, periodY - 6, C.border);
  const fromDate = firstDate ? formatDateFR(firstDate) : 'Premier enregistrement';
  txt(page, nt(`Du ${fromDate}  au  ${formatDateFR(new Date())}`),
      MARGIN, periodY - 22, 11, fonts.regular, C.black);

  // Fleet manager
  const ownerY = periodY - 62;
  txt(page, 'GESTIONNAIRE DE FLOTTE', MARGIN, ownerY, 8, fonts.bold, C.gray);
  hLine(page, ownerY - 6, C.border);
  txt(page, nt(company.name), MARGIN, ownerY - 22, 11, fonts.bold, C.black);
  const addrParts = [company.siret ? `SIRET: ${company.siret}` : null,
                     company.address, company.city].filter(Boolean).join('   ');
  if (addrParts) txt(page, nt(addrParts), MARGIN, ownerY - 37, 8.5, fonts.regular, C.gray);

  // Bottom blue footer bar (cover only)
  rect(page, 0, 0, PAGE_W, 46, C.blue);
  txt(page, 'FleetMaster Pro - Document confidentiel - Ne pas diffuser', MARGIN, 18, 8, fonts.regular, C.blueLight);
  const gen = nt(`Genere le ${formatDateFR(new Date())}`);
  const genW = fonts.regular.widthOfTextAtSize(gen, 8);
  txt(page, gen, PAGE_W - MARGIN - genW - 4, 18, 8, fonts.regular, C.blueLight, 'left', genW + 4);
}

// ─── PAGE 2: COMPLIANCE DASHBOARD ────────────────────────────────────────────
function drawCompliance(page: PDFPage, fonts: Fonts, data: VehicleCarnetData, pn: number) {
  const { vehicle, company, maintenances, fuelRecords } = data;
  drawPageHeader(page, fonts, vehicle.registration_number, 'TABLEAU DE BORD REGLEMENTAIRE');

  const startY = PAGE_H - 78;
  const cardW  = (CONTENT_W - 12) / 2;
  const cardH  = 76;
  const gap    = 12;

  const regItems = [
    { label: 'Controle Technique',  expiry: vehicle.technical_control_expiry },
    { label: 'Assurance',            expiry: vehicle.insurance_expiry },
    { label: 'Tachygraphe',          expiry: vehicle.tachy_control_expiry },
    { label: 'Certificat ATP',       expiry: vehicle.atp_expiry },
  ];

  regItems.forEach(({ label, expiry }, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const cx  = MARGIN + col * (cardW + gap);
    const cy  = startY - row * (cardH + gap);
    const { label: stLabel, color: stColor, sublabel } = expiryStatus(expiry);
    const dateStr = expiry ? formatDateFR(expiry) : 'Non renseigne';

    rect(page, cx, cy - cardH, cardW, cardH, C.grayLight, C.border);
    rect(page, cx, cy - cardH, 5, cardH, stColor);          // left status bar
    txt(page, nt(label.toUpperCase()), cx + 14, cy - 16, 8, fonts.bold, C.gray, 'left', cardW - 18);
    txt(page, nt(dateStr), cx + 14, cy - 36, 16, fonts.bold, stColor, 'left', cardW - 20);
    // Badge top-right
    const bw = fonts.bold.widthOfTextAtSize(stLabel, 7.5) + 12;
    rect(page, cx + cardW - bw - 6, cy - 19, bw, 16, stColor);
    txt(page, stLabel, cx + cardW - bw - 4, cy - 12, 7.5, fonts.bold, C.white, 'left', bw + 4);
    txt(page, nt(sublabel), cx + 14, cy - 54, 8.5, fonts.regular, C.gray, 'left', cardW - 20);
  });

  // Stats strip
  const statsY = startY - 2 * (cardH + gap) - 30;
  txt(page, 'STATISTIQUES DU VEHICULE', MARGIN, statsY, 8, fonts.bold, C.gray);
  hLine(page, statsY - 8, C.border);

  const totalCost = maintenances.reduce((s, m) => s + Number(m.final_cost ?? m.cost ?? m.estimated_cost ?? 0), 0);
  const consoVals = fuelRecords
    .map(f => f.consumption_l_per_100km ?? f.consumption ?? null)
    .filter((v): v is number => v != null && !isNaN(Number(v)))
    .map(Number);
  const avgConso = consoVals.length > 0
    ? consoVals.reduce((a, b) => a + b, 0) / consoVals.length : null;

  const stats: [string, string][] = [
    ['Kilometrage actuel', vehicle.mileage != null ? `${vehicle.mileage.toLocaleString('fr-FR')} km` : '-'],
    ['Nb. interventions',  String(maintenances.length)],
    ['Nb. controles',      String(data.inspections.length)],
    ['Cout total maint.',  totalCost > 0 ? `${totalCost.toLocaleString('fr-FR')} EUR` : '-'],
    ['Conso. moy. diesel', avgConso != null ? `${avgConso.toFixed(1)} L/100km` : '-'],
    ['Pleins effectues',   String(fuelRecords.length)],
  ];

  const sw = (CONTENT_W - 20) / 3;
  stats.forEach(([label, value], i) => {
    const col = i % 3;
    const row = Math.floor(i / 3);
    const sx  = MARGIN + col * (sw + 10);
    const sy  = statsY - 20 - row * 54;
    rect(page, sx, sy - 44, sw, 44, C.blueLight, C.border);
    txt(page, nt(label), sx + 8, sy - 16, 7.5, fonts.regular, C.gray, 'left', sw - 16);
    txt(page, nt(value), sx + 8, sy - 34, 12, fonts.bold, C.black, 'left', sw - 16);
  });

  drawPageFooter(page, fonts, pn, company.name);
}

// ─── TIMELINE SECTION (pagination) ───────────────────────────────────────────
/** Extrait une date valide depuis un objet DB (essaie plusieurs noms de colonnes) */
function extractDate(row: Record<string, unknown>): string | null {
  const candidates = [
    'scheduled_date', 'service_date', 'completed_at',
    'inspection_date', 'date', 'created_at', 'updated_at',
  ];
  for (const key of candidates) {
    const v = row[key];
    if (v && typeof v === 'string') return v;
  }
  return null;
}

// ─── Helpers spécifiques aux sections ────────────────────────────────────────

/** Résume le champ JSON reported_defects en texte court */
function formatDefects(reported_defects: unknown): string {
  if (!reported_defects) return 'Aucun';
  try {
    const d = typeof reported_defects === 'string'
      ? JSON.parse(reported_defects) : reported_defects;
    if (Array.isArray(d)) {
      if (d.length === 0) return 'Aucun';
      const labels = d
        .map((item: unknown) => {
          if (typeof item === 'string') return item;
          if (item && typeof item === 'object') {
            const o = item as Record<string, unknown>;
            return String(o.description ?? o.label ?? o.type ?? o.name ?? '');
          }
          return '';
        })
        .filter(Boolean);
      if (labels.length === 0) return `${d.length} defaut(s)`;
      return labels.slice(0, 2).join(', ') + (d.length > 2 ? ` +${d.length - 2}` : '');
    }
    if (typeof d === 'object' && d !== null) {
      const vals = Object.values(d as Record<string, unknown>).filter(Boolean);
      return vals.length > 0 ? String(vals[0]) : 'Voir rapport';
    }
    return String(d);
  } catch {
    return 'Voir rapport';
  }
}

/** Retourne la couleur RGB selon le score (0-100) */
function scoreColor(score: number | null | undefined): RGB {
  if (score == null) return C.gray;
  if (score >= 80) return C.green;
  if (score >= 60) return C.orange;
  return C.red;
}

function drawSectionHeader(
  page: PDFPage, fonts: Fonts, cols: { header: string; w: number; align: 'left'|'center'|'right' }[],
  y: number,
): number {
  const H = 24;
  rect(page, MARGIN, y - H, CONTENT_W, H, C.blue);
  let xp = MARGIN;
  for (const col of cols) {
    txt(page, col.header.toUpperCase(), xp, y - H + 8, 7, fonts.bold, C.white, col.align, col.w);
    xp += col.w;
  }
  return y - H;
}

// ─── SECTION MAINTENANCES ─────────────────────────────────────────────────────
// Colonnes : Date | Type | Description | Effectué par | Coût
const MAINT_COLS = [
  { header: 'Date',         w: 65,  align: 'center' as const },
  { header: 'Type',         w: 78,  align: 'center' as const },
  { header: 'Description',  w: 200, align: 'left'   as const },
  { header: 'Effectue par', w: 107, align: 'left'   as const },
  { header: 'Cout',         w: 65,  align: 'right'  as const },
];

const MAINT_TYPE_LABELS: Record<string, string> = {
  PREVENTIVE:   'Preventive', preventive:   'Preventive',
  CORRECTIVE:   'Corrective', corrective:   'Corrective',
  PNEUMATIQUE:  'Pneumatiq.', pneumatique:  'Pneumatiq.',
  CARROSSERIE:  'Carrosser.', carrosserie:  'Carrosser.',
  ELECTRICITE:  'Electrique', electricite:  'Electrique',
  VIDANGE:      'Vidange',
};

/** Returns last page number used. */
function drawMaintenancesSection(
  pdfDoc: PDFDocument, fonts: Fonts, data: VehicleCarnetData, startPn: number,
): number {
  const ROW_H  = 26;
  const BOTTOM = 48;
  let page = newPage(pdfDoc);
  let pn   = startPn;
  drawPageHeader(page, fonts, data.vehicle.registration_number, 'HISTORIQUE DES MAINTENANCES');
  let y = drawSectionHeader(page, fonts, MAINT_COLS, PAGE_H - 78);

  if (data.maintenances.length === 0) {
    txt(page, 'Aucune maintenance enregistree.', MARGIN + 10, y - 20, 10, fonts.regular, C.gray);
    drawPageFooter(page, fonts, pn, data.company.name);
    return pn;
  }

  // Trier par date desc
  const sorted = [...data.maintenances].sort((a, b) => {
    const da = extractDate(a) ?? '';
    const db = extractDate(b) ?? '';
    return db.localeCompare(da);
  });

  sorted.forEach((m, idx) => {
    if (y - ROW_H < BOTTOM) {
      drawPageFooter(page, fonts, pn, data.company.name);
      page = newPage(pdfDoc);
      pn++;
      drawPageHeader(page, fonts, data.vehicle.registration_number, 'HISTORIQUE DES MAINTENANCES (suite)');
      y = drawSectionHeader(page, fonts, MAINT_COLS, PAGE_H - 78);
    }

    const bg   = idx % 2 === 0 ? C.white : C.grayLight;
    rect(page, MARGIN, y - ROW_H, CONTENT_W, ROW_H, bg, C.border);

    const ds   = extractDate(m);
    const cost = m.final_cost ?? m.cost ?? m.estimated_cost;
    const typeRaw = String(m.type ?? m.service_type ?? '');
    const typeLabel = MAINT_TYPE_LABELS[typeRaw] ?? typeRaw;

    const values = [
      ds ? formatDateFR(ds) : '-',
      typeLabel || '-',
      String(m.description ?? m.notes ?? m.service_type ?? 'Intervention'),
      String(m.garage_name ?? m.performed_by ?? m.requested_by ?? '-'),
      cost != null ? `${Number(cost).toLocaleString('fr-FR')} EUR` : '-',
    ];

    let xp = MARGIN;
    values.forEach((val, i) => {
      const col  = MAINT_COLS[i];
      const font = i <= 1 ? fonts.bold : fonts.regular;
      const color = i === 1 ? C.blue : C.black;
      txt(page, val, xp, y - ROW_H + 9, i === 1 ? 7 : 8, font, color, col.align, col.w);
      xp += col.w;
    });
    y -= ROW_H;
  });

  drawPageFooter(page, fonts, pn, data.company.name);
  return pn;
}

// ─── SECTION CONTROLES / INSPECTIONS ─────────────────────────────────────────
// Colonnes : Date | Type | Score | Statut | Problèmes signalés
const INSP_COLS = [
  { header: 'Date',      w: 65,  align: 'center' as const },
  { header: 'Type',      w: 90,  align: 'center' as const },
  { header: 'Score',     w: 55,  align: 'center' as const },
  { header: 'Statut',    w: 90,  align: 'center' as const },
  { header: 'Problemes signales', w: 215, align: 'left' as const },
];

const INSP_STATUS_LABELS: Record<string, string> = {
  COMPLETED:       'Termine',
  ISSUES_FOUND:    'Anomalies',
  CRITICAL_ISSUES: 'Critique',
  PENDING:         'En attente',
};

const INSP_STATUS_COLORS: Record<string, RGB> = {
  COMPLETED:       C.green,
  ISSUES_FOUND:    C.orange,
  CRITICAL_ISSUES: C.red,
  PENDING:         C.gray,
};

/** Returns last page number used. */
function drawInspectionsSection(
  pdfDoc: PDFDocument, fonts: Fonts, data: VehicleCarnetData, startPn: number,
): number {
  const ROW_H  = 26;
  const BOTTOM = 48;
  let page = newPage(pdfDoc);
  let pn   = startPn;
  drawPageHeader(page, fonts, data.vehicle.registration_number,
    'HISTORIQUE DES CONTROLES ET INSPECTIONS');
  let y = drawSectionHeader(page, fonts, INSP_COLS, PAGE_H - 78);

  if (data.inspections.length === 0) {
    txt(page, 'Aucun controle enregistre.', MARGIN + 10, y - 20, 10, fonts.regular, C.gray);
    drawPageFooter(page, fonts, pn, data.company.name);
    return pn;
  }

  // Trier par date desc
  const sorted = [...data.inspections].sort((a, b) => {
    const da = extractDate(a) ?? '';
    const db = extractDate(b) ?? '';
    return db.localeCompare(da);
  });

  sorted.forEach((insp, idx) => {
    if (y - ROW_H < BOTTOM) {
      drawPageFooter(page, fonts, pn, data.company.name);
      page = newPage(pdfDoc);
      pn++;
      drawPageHeader(page, fonts, data.vehicle.registration_number,
        'HISTORIQUE DES CONTROLES (suite)');
      y = drawSectionHeader(page, fonts, INSP_COLS, PAGE_H - 78);
    }

    const bg  = idx % 2 === 0 ? C.white : C.grayLight;
    rect(page, MARGIN, y - ROW_H, CONTENT_W, ROW_H, bg, C.border);

    const ds      = extractDate(insp);
    const score   = insp.score != null ? Number(insp.score) : null;
    const status  = String(insp.status ?? '');
    const defects = formatDefects(insp.reported_defects ?? insp.defects ?? insp.issues);
    const typeRaw = String(insp.inspection_type ?? insp.type ?? 'Inspection');

    const scoreStr  = score != null ? `${score}/100` : '-';
    const statusStr = (INSP_STATUS_LABELS[status] ?? status) || '-';
    const sColor    = INSP_STATUS_COLORS[status] ?? C.gray;

    const colData = [
      { val: ds ? formatDateFR(ds) : '-', color: C.black,  font: fonts.regular },
      { val: typeRaw,                      color: C.blue,   font: fonts.bold    },
      { val: scoreStr,                     color: scoreColor(score), font: fonts.bold },
      { val: statusStr,                    color: sColor,   font: fonts.bold    },
      { val: defects,                      color: C.black,  font: fonts.regular },
    ];

    let xp = MARGIN;
    colData.forEach(({ val, color, font }, i) => {
      const col = INSP_COLS[i];
      txt(page, val, xp, y - ROW_H + 9, i <= 3 ? 7.5 : 8, font, color, col.align, col.w);
      xp += col.w;
    });
    y -= ROW_H;
  });

  drawPageFooter(page, fonts, pn, data.company.name);
  return pn;
}

// ─── FUEL SECTION ─────────────────────────────────────────────────────────────
const FUEL_COLS = [
  { header: 'Date',    w: 65,  align: 'center' as const },
  { header: 'Type',    w: 68,  align: 'center' as const },
  { header: 'Litres',  w: 62,  align: 'right'  as const },
  { header: 'Montant', w: 80,  align: 'right'  as const },
  { header: 'Km',      w: 75,  align: 'right'  as const },
  { header: 'Conso',   w: 80,  align: 'right'  as const },
  { header: 'Station', w: 85,  align: 'left'   as const },
];

function drawFuel(page: PDFPage, fonts: Fonts, data: VehicleCarnetData, pn: number) {
  const { vehicle, company, fuelRecords } = data;
  drawPageHeader(page, fonts, vehicle.registration_number, 'HISTORIQUE DES CONSOMMATIONS');

  const ROW_H  = 22;
  const HDR_H  = 24;
  let y        = PAGE_H - 78;

  if (fuelRecords.length === 0) {
    txt(page, 'Aucune donnee de consommation disponible.', MARGIN, y - 20, 10, fonts.regular, C.gray);
    drawPageFooter(page, fonts, pn, company.name);
    return;
  }

  // Table header
  rect(page, MARGIN, y - HDR_H, CONTENT_W, HDR_H, C.blue);
  let xp = MARGIN;
  for (const col of FUEL_COLS) {
    txt(page, col.header.toUpperCase(), xp, y - HDR_H + 8, 7, fonts.bold, C.white, col.align, col.w);
    xp += col.w;
  }
  y -= HDR_H;

  const fuelLabel: Record<string, string> = {
    diesel: 'Diesel', adblue: 'AdBlue', gnr: 'GNR',
    gasoline: 'Essence', electric: 'Elec.', hybrid: 'Hybride', lpg: 'GPL',
  };

  fuelRecords.slice(0, 32).forEach((f, idx) => {
    if (y - ROW_H < 48) return;
    const bg = idx % 2 === 0 ? C.white : C.grayLight;
    rect(page, MARGIN, y - ROW_H, CONTENT_W, ROW_H, bg, C.border);
    const fDate  = extractDate(f);
    const fType  = f.fuel_type ?? f.type ?? '';
    const fLiter = f.quantity_liters ?? f.liters ?? null;
    const fPrice = f.price_total ?? f.price ?? null;
    const fKm    = f.mileage_at_fill ?? f.mileage ?? null;
    const fConso = f.consumption_l_per_100km ?? f.consumption ?? null;
    const values = [
      fDate ? formatDateFR(fDate) : '-',
      fuelLabel[fType] ?? fType ?? '-',
      fLiter  != null ? `${Number(fLiter).toFixed(1)} L`                        : '-',
      fPrice  != null ? `${Number(fPrice).toFixed(2)} EUR`                      : '-',
      fKm     != null ? `${Number(fKm).toLocaleString('fr-FR')} km`             : '-',
      fConso  != null ? `${Number(fConso).toFixed(1)} L/100`                    : '-',
      String(f.station_name ?? '-'),
    ];
    let tx = MARGIN;
    values.forEach((val, i) => {
      const col = FUEL_COLS[i];
      txt(page, val, tx, y - ROW_H + 7, 8, fonts.regular, C.black, col.align, col.w);
      tx += col.w;
    });
    y -= ROW_H;
  });

  if (fuelRecords.length > 32) {
    txt(page, nt(`... et ${fuelRecords.length - 32} autre(s) enregistrement(s) non affiches.`),
        MARGIN, y - 14, 8, fonts.regular, C.gray);
  }

  drawPageFooter(page, fonts, pn, company.name);
}

// ─── LEGAL PAGE ───────────────────────────────────────────────────────────────
function drawLegal(page: PDFPage, fonts: Fonts, data: VehicleCarnetData, pn: number) {
  const { vehicle, company } = data;
  drawPageHeader(page, fonts, vehicle.registration_number, 'CERTIFICATION ET MENTIONS LEGALES');

  let y = PAGE_H - 90;

  // Certification box
  rect(page, MARGIN, y - 108, CONTENT_W, 108, C.blueLight, C.blue);
  rect(page, MARGIN, y - 4, CONTENT_W, 4, C.blue);
  txt(page, 'CERTIFICATION DE CONFORMITE', MARGIN + 14, y - 22, 10, fonts.bold, C.blue);
  const certLines = [
    `Le present document atteste que le vehicule immatricule ${vehicle.registration_number},`,
    `exploite par ${company.name}, a fait l'objet d'un suivi regulier`,
    `d'entretien et de maintenance conforme aux obligations reglementaires en vigueur.`,
    '',
    `Ce carnet numerique constitue une preuve de tracabilite recevable lors des`,
    `controles DREAL et dans le cadre de toute cession du vehicule.`,
  ];
  certLines.forEach((line, i) => {
    txt(page, nt(line), MARGIN + 14, y - 38 - i * 12, 8.5, fonts.regular, C.black, 'left', CONTENT_W - 28);
  });

  y -= 128;

  // Generation info
  txt(page, 'INFORMATIONS DE GENERATION', MARGIN, y, 8, fonts.bold, C.gray);
  hLine(page, y - 8, C.border);
  const now = new Date();
  const infos: [string, string][] = [
    ['Document genere le',  `${formatDateFR(now)} a ${now.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}`],
    ['Logiciel',            'FleetMaster Pro - Gestion de flotte professionnelle'],
    ['Gestionnaire',        company.name],
    ['Vehicule',            nt(`${vehicle.registration_number} - ${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim())],
    ['Reference document',  nt(`CARNET-${vehicle.registration_number}-${now.toISOString().slice(0, 10)}`)],
    ['SIRET gestionnaire',  company.siret ?? 'Non renseigne'],
  ];
  infos.forEach(([label, value], i) => {
    const ly = y - 24 - i * 20;
    txt(page, nt(`${label} :`), MARGIN, ly, 8.5, fonts.regular, C.gray, 'left', 160);
    txt(page, nt(value), MARGIN + 160, ly, 8.5, fonts.bold, C.black, 'left', CONTENT_W - 162);
  });

  y -= 160;

  // Disclaimer
  txt(page, 'AVERTISSEMENT', MARGIN, y, 8, fonts.bold, C.gray);
  hLine(page, y - 8, C.border);
  const disclaimer = [
    `Ce document est genere automatiquement par le systeme FleetMaster Pro a partir`,
    `des donnees enregistrees par les gestionnaires de flotte. L'exactitude des`,
    `informations releve de la responsabilite de l'entreprise gestionnaire.`,
    '',
    `FleetMaster Pro ne saurait etre tenu responsable d'eventuelles inexactitudes.`,
    `Ce document est confidentiel et destine uniquement a ${company.name}`,
    `et aux autorites de controle habilitees.`,
  ];
  disclaimer.forEach((line, i) => {
    txt(page, nt(line), MARGIN, y - 22 - i * 12, 8, fonts.regular, C.gray, 'left', CONTENT_W);
  });

  drawPageFooter(page, fonts, pn, company.name);
}

// ─── MAIN EXPORT ──────────────────────────────────────────────────────────────
export async function generateCarnetPDF(data: VehicleCarnetData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(nt(`Carnet d'Entretien - ${data.vehicle.registration_number}`));
  pdfDoc.setAuthor('FleetMaster Pro');
  pdfDoc.setSubject(nt(`Carnet numerique - ${data.vehicle.registration_number}`));
  pdfDoc.setCreationDate(new Date());

  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts: Fonts = { regular, bold };

  // First event date (for period on cover)
  const allDates = [
    ...data.maintenances.map(m => extractDate(m)),
    ...data.inspections.map(i => extractDate(i)),
    ...data.fuelRecords.map(f => extractDate(f)),
  ].filter(Boolean) as string[];
  allDates.sort();
  const firstDate = allDates[0] ?? null;

  // Page 1: Cover
  const coverPage = newPage(pdfDoc);
  drawCover(coverPage, fonts, data, firstDate);

  // Page 2: Compliance
  const compPage = newPage(pdfDoc);
  drawCompliance(compPage, fonts, data, 2);

  // Pages 3+: Maintenances (section dédiée avec colonnes Date/Type/Description/Effectué par/Coût)
  let pn = drawMaintenancesSection(pdfDoc, fonts, data, 3);

  // Pages suivantes: Contrôles/Inspections (colonnes Date/Type/Score/Statut/Problèmes)
  pn = drawInspectionsSection(pdfDoc, fonts, data, pn + 1);

  // Optional: Fuel page
  if (data.fuelRecords.length > 0) {
    pn++;
    const fuelPage = newPage(pdfDoc);
    drawFuel(fuelPage, fonts, data, pn);
  }

  // Last: Legal
  pn++;
  const legalPage = newPage(pdfDoc);
  drawLegal(legalPage, fonts, data, pn);

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes) as unknown as Buffer;
}
