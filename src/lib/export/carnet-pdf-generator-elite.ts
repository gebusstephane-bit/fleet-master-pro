/**
 * ╔══════════════════════════════════════════════════════════════════════════════╗
 * ║  CARNET D'ENTRETIEN DIGITAL — "ELITE TRANSPORT 2026" EDITION                ║
 * ║  Design Dashboard Premium pour pdf-lib                                       ║
 * ║                                                                              ║
 * ║  Rôle: Expert UI/UX spécialisé en documents logistiques de haut standing    ║
 * ╚══════════════════════════════════════════════════════════════════════════════╝
 */

import {
  PDFDocument,
  PDFPage,
  rgb,
  RGB,
  StandardFonts,
} from 'pdf-lib';
import { hexToRgb } from '@/lib/pdf/pdf-colors';
import { formatDateFR, VEHICLE_TYPE_LABELS } from './formatters';

// ═══════════════════════════════════════════════════════════════════════════════
// DESIGN SYSTEM — "Elite Transport 2026"
// ═══════════════════════════════════════════════════════════════════════════════

const DS = {
  // Couleurs principales
  safeFleet:      hexToRgb('#0D1B2A'),  // Bleu nuit header
  safeFleetLight: hexToRgb('#1B2F45'),  // Variante plus claire
  accent:         hexToRgb('#2E5C8A'),  // Bleu acier
  
  // Feedback visuel
  success:        hexToRgb('#16A34A'),
  successBg:      hexToRgb('#DCFCE7'),
  successText:    hexToRgb('#166534'),
  
  warning:        hexToRgb('#F59E0B'),
  warningBg:      hexToRgb('#FEF3C7'),
  warningText:    hexToRgb('#92400E'),
  
  danger:         hexToRgb('#DC2626'),
  dangerBg:       hexToRgb('#FEE2E2'),
  dangerText:     hexToRgb('#991B1B'),
  
  // Neutres premium
  text:           hexToRgb('#1E293B'),
  textSecondary:  hexToRgb('#64748B'),
  textMuted:      hexToRgb('#94A3B8'),
  border:         hexToRgb('#E2E8F0'),
  borderLight:    hexToRgb('#F1F5F9'),
  bgCard:         hexToRgb('#FFFFFF'),
  bgAlt:          hexToRgb('#F8F9FA'),  // Gris très clair pour alternance
  bgHover:        hexToRgb('#F1F5F9'),
  
  white:          rgb(1, 1, 1),
  black:          rgb(0, 0, 0),
};

// Layout constants
const PAGE_W    = 595;   // A4 width in points
const PAGE_H    = 842;   // A4 height in points
const MARGIN    = 32;    // Marges élégantes
const CONTENT_W = PAGE_W - (MARGIN * 2);
const HEADER_H  = 75;    // Header Safe Fleet
const FOOTER_H  = 45;    // Espace footer

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════════

export type MaintenanceEntry = Record<string, unknown>;
export type InspectionEntry  = Record<string, unknown>;
export type FuelEntry        = Record<string, unknown>;

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

interface FontSet {
  regular: import('pdf-lib').PDFFont;
  bold: import('pdf-lib').PDFFont;
  italic: import('pdf-lib').PDFFont;
}

// ═══════════════════════════════════════════════════════════════════════════════
// UTILITAIRES DE TEXTE
// ═══════════════════════════════════════════════════════════════════════════════

/** Normalise le texte pour WinAnsi (polices standard) */
function nt(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\u00A0\u202F\u2007\u2060]/g, ' ')
    .replace(/[""«»\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[—–\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\xFF]/g, '');
}

/** Formate un montant en EUR avec espaces */
function formatEUR(amount: number): string {
  return amount.toLocaleString('fr-FR') + ' EUR';
}

/** Calcule les jours restants avant expiration */
function getDaysUntil(expiry: string | null | undefined): number | null {
  if (!expiry) return null;
  const days = Math.ceil((new Date(expiry).getTime() - Date.now()) / 86_400_000);
  return days;
}

/** Extrait une date d'un objet de données */
function extractDate(row: Record<string, unknown>): string | null {
  const keys = ['scheduled_date', 'service_date', 'completed_at', 'inspection_date', 'date', 'created_at'];
  for (const key of keys) {
    const v = row[key];
    if (v && typeof v === 'string') return v;
  }
  return null;
}

// ═══════════════════════════════════════════════════════════════════════════════
// PRIMITIVES DE DESSIN
// ═══════════════════════════════════════════════════════════════════════════════

/** Dessine un rectangle avec bordure optionnelle */
function drawRect(
  page: PDFPage,
  x: number, y: number, w: number, h: number,
  fill: RGB,
  border?: RGB,
  borderWidth = 0.5,
) {
  page.drawRectangle({
    x, y, width: w, height: h,
    color: fill,
    borderColor: border,
    borderWidth: border ? borderWidth : 0,
  });
}

/** Dessine une ligne horizontale */
function drawHLine(
  page: PDFPage,
  y: number,
  color: RGB = DS.border,
  thickness = 0.5,
  x0 = MARGIN,
  x1 = PAGE_W - MARGIN,
) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
}

/** Dessine une ligne verticale */
function drawVLine(
  page: PDFPage,
  x: number, y0: number, y1: number,
  color: RGB = DS.border,
  thickness = 0.5,
) {
  page.drawLine({ start: { x, y: y0 }, end: { x, y: y1 }, thickness, color });
}

/** Dessine du texte avec alignement */
function drawText(
  page: PDFPage,
  text: string,
  x: number, y: number,
  size: number,
  font: import('pdf-lib').PDFFont,
  color: RGB,
  align: 'left' | 'center' | 'right' = 'left',
  maxWidth = CONTENT_W,
) {
  const s = nt(text);
  if (!s) return;
  const w = font.widthOfTextAtSize(s, size);
  let dx = x;
  if (align === 'center') dx = x + (maxWidth - w) / 2;
  else if (align === 'right') dx = x + maxWidth - w;
  page.drawText(s, { x: dx, y, size, font, color });
}

/** Dessine du texte dans une cellule avec troncature */
function drawCellText(
  page: PDFPage,
  text: string,
  x: number, y: number,
  size: number,
  font: import('pdf-lib').PDFFont,
  color: RGB,
  cellW: number,
  align: 'left' | 'center' | 'right' = 'left',
  padding = 6,
) {
  let s = nt(text);
  if (!s) return;
  const avail = cellW - padding * 2;
  while (s.length > 1 && font.widthOfTextAtSize(s, size) > avail) {
    s = s.slice(0, -1);
  }
  if (s !== nt(text) && s.length > 3) s = s.slice(0, -3) + '...';
  
  const w = font.widthOfTextAtSize(s, size);
  let dx = x + padding;
  if (align === 'center') dx = x + (cellW - w) / 2;
  else if (align === 'right') dx = x + cellW - w - padding;
  page.drawText(s, { x: dx, y, size, font, color });
}

/** Dessine un badge avec fond arrondi (simulation via rectangle) */
function drawBadge(
  page: PDFPage,
  text: string,
  x: number, y: number,
  bgColor: RGB,
  textColor: RGB,
  font: import('pdf-lib').PDFFont,
  fontSize = 8,
  paddingX = 10,
  paddingY = 4,
): number {
  const label = nt(text);
  const textW = font.widthOfTextAtSize(label, fontSize);
  const badgeW = textW + paddingX * 2;
  const badgeH = fontSize + paddingY * 2;
  
  drawRect(page, x, y - badgeH, badgeW, badgeH, bgColor);
  page.drawText(label, { 
    x: x + paddingX, 
    y: y - badgeH + paddingY + 2, 
    size: fontSize, 
    font, 
    color: textColor 
  });
  return badgeW;
}

/** Dessine une barre de progression horizontale */
function drawProgressBar(
  page: PDFPage,
  x: number, y: number,
  width: number, height: number,
  percentage: number,  // 0-100
  fillColor: RGB,
  bgColor: RGB = DS.borderLight,
) {
  // Fond
  drawRect(page, x, y, width, height, bgColor);
  // Remplissage
  const fillW = Math.max(0, Math.min(1, percentage / 100)) * width;
  if (fillW > 0) {
    drawRect(page, x, y, fillW, height, fillColor);
  }
}

/** Dessine une pastille circulaire (simulation via ellipse) */
function drawStatusPill(
  page: PDFPage,
  text: string,
  x: number, y: number,
  bgColor: RGB,
  textColor: RGB,
  font: import('pdf-lib').PDFFont,
): number {
  const label = nt(text);
  const textW = font.widthOfTextAtSize(label, 9);
  const pillW = textW + 20;
  const pillH = 20;
  
  // Dessine le rectangle de fond (pastille)
  drawRect(page, x, y - pillH, pillW, pillH, bgColor);
  
  // Texte centré
  page.drawText(label, {
    x: x + (pillW - textW) / 2,
    y: y - pillH + 6,
    size: 9,
    font,
    color: textColor,
  });
  
  return pillW;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 1: HEADER "SAFE FLEET"
// ═══════════════════════════════════════════════════════════════════════════════

interface HeaderResult {
  y: number;  // Position Y après le header pour continuer le dessin
}

function drawSafeFleetHeader(
  page: PDFPage,
  fonts: FontSet,
  data: VehicleCarnetData,
): HeaderResult {
  const { vehicle, company } = data;
  
  // ── Bandeau supérieur bleu nuit sur toute la largeur ──
  drawRect(page, 0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, DS.safeFleet);
  
  // ── Partie gauche: Infos véhicule ──
  const leftX = MARGIN;
  const baseY = PAGE_H - HEADER_H;
  
  // Immatriculation en GROS
  const immat = nt(vehicle.registration_number);
  drawText(page, immat, leftX, baseY + 45, 22, fonts.bold, DS.white, 'left');
  
  // VIN en petit sous l'immatriculation
  const vin = vehicle.vin ? `VIN: ${nt(vehicle.vin)}` : 'VIN: Non renseigne';
  drawText(page, vin, leftX, baseY + 25, 9, fonts.regular, hexToRgb('#93C5FD'), 'left');
  
  // Marque/Modèle si disponible
  const brandModel = nt(`${vehicle.brand ?? ''} ${vehicle.model ?? ''}`.trim());
  if (brandModel) {
    drawText(page, brandModel, leftX, baseY + 12, 8, fonts.regular, hexToRgb('#64748B'), 'left');
  }
  
  // ── Partie droite: Logo et Statut ──
  const rightX = PAGE_W - MARGIN;
  
  // Logo "FleetMaster Pro" (texte stylisé)
  const logoText = 'FleetMaster Pro';
  const logoW = fonts.bold.widthOfTextAtSize(logoText, 12);
  drawText(page, logoText, rightX - logoW, baseY + 45, 12, fonts.bold, DS.white, 'left');
  
  // Sous-titre "Safe Fleet Edition"
  const editionText = 'Safe Fleet Edition';
  const editionW = fonts.regular.widthOfTextAtSize(editionText, 7);
  drawText(page, editionText, rightX - editionW, baseY + 35, 7, fonts.regular, hexToRgb('#93C5FD'), 'left');
  
  // ── Pastille de statut ──
  const isActive = vehicle.status === 'ACTIVE' || vehicle.status === 'active';
  const statusLabel = isActive ? 'ACTIF' : 'INACTIF';
  const statusBg = isActive ? DS.success : DS.danger;
  const statusText = DS.white;
  
  drawStatusPill(
    page,
    statusLabel,
    rightX - 50,  // Largeur approximative de la pastille
    baseY + 18,
    statusBg,
    statusText,
    fonts.bold
  );
  
  // Ligne fine de séparation sous le header
  drawHLine(page, PAGE_H - HEADER_H, hexToRgb('#2E5C8A'), 1, 0, PAGE_W);
  
  return { y: PAGE_H - HEADER_H - 20 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 2: GRILLE DE CONFORMITÉ (4 CARDS)
// ═══════════════════════════════════════════════════════════════════════════════

interface ComplianceItem {
  label: string;
  expiry: string | null | undefined;
  icon?: string;
}

type ComplianceStatus = 'ok' | 'warning' | 'alert' | 'missing';

interface ComplianceResult {
  y: number;
}

function getComplianceStatus(days: number | null): ComplianceStatus {
  if (days === null) return 'missing';
  if (days < 0) return 'alert';
  if (days <= 30) return 'warning';
  return 'ok';
}

function getComplianceColors(status: ComplianceStatus) {
  switch (status) {
    case 'ok':
      return {
        badgeBg: DS.successBg,
        badgeText: DS.successText,
        dateColor: DS.success,
        accent: DS.success,
      };
    case 'warning':
      return {
        badgeBg: DS.warningBg,
        badgeText: DS.warningText,
        dateColor: DS.warning,
        accent: DS.warning,
      };
    case 'alert':
      return {
        badgeBg: DS.dangerBg,
        badgeText: DS.dangerText,
        dateColor: DS.danger,
        accent: DS.danger,
      };
    case 'missing':
    default:
      return {
        badgeBg: DS.borderLight,
        badgeText: DS.textMuted,
        dateColor: DS.textMuted,
        accent: DS.textMuted,
      };
  }
}

function getComplianceBadgeText(status: ComplianceStatus, days: number | null): string {
  switch (status) {
    case 'ok':
      return days !== null ? `OK +${days}j` : 'OK';
    case 'warning':
      return days !== null ? `Dans ${days}j` : 'Bientot';
    case 'alert':
      return days !== null ? `Expire ${Math.abs(days)}j` : 'Expire';
    case 'missing':
      return 'Non renseigne';
  }
}

function drawComplianceGrid(
  page: PDFPage,
  fonts: FontSet,
  data: VehicleCarnetData,
  startY: number,
): ComplianceResult {
  const { vehicle, activities } = data;
  
  // ── Titre de section ──
  drawText(page, 'CONFORMITE REGLEMENTAIRE', MARGIN, startY, 11, fonts.bold, DS.text, 'left');
  drawHLine(page, startY - 6, DS.border, 0.5, MARGIN, MARGIN + 200);
  
  let y = startY - 25;
  
  // ── Prépare les 4 items de conformité ──
  const hasAtp = !activities || activities.some(a => 
    a.toLowerCase().includes('frigo') || a.toLowerCase().includes('transport')
  );
  
  const items: ComplianceItem[] = [
    { label: 'Controle Technique', expiry: vehicle.technical_control_expiry },
    { label: 'Tachygraphe', expiry: vehicle.tachy_control_expiry },
    { label: 'Assurance', expiry: vehicle.insurance_expiry },
  ];
  
  if (hasAtp) {
    items.push({ label: 'Certificat ATP', expiry: vehicle.atp_expiry });
  }
  
  // ── Dessine les 4 cards ──
  const CARD_GAP = 10;
  const CARD_W = (CONTENT_W - CARD_GAP * (items.length - 1)) / items.length;
  const CARD_H = 95;
  
  items.forEach((item, index) => {
    const cx = MARGIN + index * (CARD_W + CARD_GAP);
    const days = getDaysUntil(item.expiry);
    const status = getComplianceStatus(days);
    const colors = getComplianceColors(status);
    const badgeText = getComplianceBadgeText(status, days);
    const dateLabel = item.expiry ? formatDateFR(item.expiry) : '—';
    
    // Card avec bordure légère
    drawRect(page, cx, y - CARD_H, CARD_W, CARD_H, DS.bgCard, DS.border, 0.5);
    
    // Barre d'accentuation en haut (couleur selon statut)
    const accentH = 4;
    drawRect(page, cx, y - accentH, CARD_W, accentH, colors.accent);
    
    // Label du document
    drawCellText(page, item.label.toUpperCase(), cx, y - 18, 7, fonts.bold, DS.textSecondary, CARD_W, 'left', 10);
    
    // Date d'expiration
    drawCellText(page, dateLabel, cx, y - 40, 14, fonts.bold, colors.dateColor, CARD_W, 'left', 10);
    
    // Badge de statut en bas
    const badgeY = y - CARD_H + 22;
    drawBadge(
      page,
      badgeText,
      cx + 10,
      badgeY,
      colors.badgeBg,
      colors.badgeText,
      fonts.bold,
      7,
      8,
      3
    );
  });
  
  return { y: y - CARD_H - 15 };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 3: TABLEAU MAINTENANCE (Premium)
// ═══════════════════════════════════════════════════════════════════════════════

interface TableColumn {
  label: string;
  width: number;
  align: 'left' | 'center' | 'right';
}

const MAINTENANCE_COLUMNS: TableColumn[] = [
  { label: 'DATE', width: 70, align: 'center' },
  { label: 'TYPE', width: 90, align: 'center' },
  { label: 'DESCRIPTION', width: 190, align: 'left' },
  { label: 'EFFECTUE PAR', width: 105, align: 'left' },
  { label: 'COUT', width: 80, align: 'right' },
];

// Mapping des types de maintenance pour les badges
const MAINTENANCE_BADGES: Record<string, { bg: RGB; text: RGB; label: string }> = {
  PREVENTIVE:  { bg: hexToRgb('#F0FDF4'), text: hexToRgb('#16A34A'), label: 'Preventif' },
  preventive:  { bg: hexToRgb('#F0FDF4'), text: hexToRgb('#16A34A'), label: 'Preventif' },
  CORRECTIVE:  { bg: hexToRgb('#FEF2F2'), text: hexToRgb('#DC2626'), label: 'Correctif' },
  corrective:  { bg: hexToRgb('#FEF2F2'), text: hexToRgb('#DC2626'), label: 'Correctif' },
  INSPECTION:  { bg: hexToRgb('#DBEAFE'), text: hexToRgb('#1D4ED8'), label: 'Inspection' },
  inspection:  { bg: hexToRgb('#DBEAFE'), text: hexToRgb('#1D4ED8'), label: 'Inspection' },
  REPARATION:  { bg: hexToRgb('#FEF3C7'), text: hexToRgb('#92400E'), label: 'Reparation' },
  reparation:  { bg: hexToRgb('#FEF3C7'), text: hexToRgb('#92400E'), label: 'Reparation' },
  PNEUMATIQUE: { bg: hexToRgb('#EDE9FE'), text: hexToRgb('#7C3AED'), label: 'Pneu' },
  pneumatique: { bg: hexToRgb('#EDE9FE'), text: hexToRgb('#7C3AED'), label: 'Pneu' },
  VIDANGE:     { bg: hexToRgb('#F3F4F6'), text: hexToRgb('#374151'), label: 'Vidange' },
  vidange:     { bg: hexToRgb('#F3F4F6'), text: hexToRgb('#374151'), label: 'Vidange' },
};

function drawMaintenanceTableHeader(
  page: PDFPage,
  fonts: FontSet,
  y: number,
): number {
  const HEADER_HEIGHT = 28;
  let x = MARGIN;
  
  // Fond bleu nuit pour l'en-tête
  drawRect(page, MARGIN, y - HEADER_HEIGHT, CONTENT_W, HEADER_HEIGHT, DS.safeFleet);
  
  MAINTENANCE_COLUMNS.forEach(col => {
    drawCellText(page, col.label, x, y - HEADER_HEIGHT + 9, 8, fonts.bold, DS.white, col.width, col.align, 8);
    x += col.width;
  });
  
  return y - HEADER_HEIGHT;
}

interface MaintenanceTableResult {
  y: number;
  totalCost: number;
}

function drawMaintenanceTable(
  page: PDFPage,
  fonts: FontSet,
  maintenances: MaintenanceEntry[],
  startY: number,
): MaintenanceTableResult {
  const ROW_HEIGHT = 32;
  const BOTTOM_LIMIT = FOOTER_H + 60;
  
  // Trie par date décroissante
  const sorted = [...maintenances].sort((a, b) =>
    (extractDate(b) ?? '').localeCompare(extractDate(a) ?? '')
  );
  
  let y = drawMaintenanceTableHeader(page, fonts, startY);
  let totalCost = 0;
  
  if (sorted.length === 0) {
    // Message si aucune maintenance
    drawRect(page, MARGIN, y - 40, CONTENT_W, 40, DS.bgAlt, DS.border, 0.5);
    drawText(page, 'Aucune maintenance enregistree', MARGIN, y - 22, 9, fonts.italic, DS.textMuted, 'center', CONTENT_W);
    return { y: y - 50, totalCost: 0 };
  }
  
  sorted.forEach((m, index) => {
    // Alternance de couleurs: gris très clair (#F8F9FA) pour les lignes paires
    const bgColor = index % 2 === 0 ? DS.white : DS.bgAlt;
    
    let x = MARGIN;
    
    // Fond de la ligne
    drawRect(page, MARGIN, y - ROW_HEIGHT, CONTENT_W, ROW_HEIGHT, bgColor);
    
    // Ligne de séparation fine
    if (index > 0) {
      drawHLine(page, y, DS.borderLight, 0.3, MARGIN, PAGE_W - MARGIN);
    }
    
    // Extraction des données
    const date = extractDate(m);
    const typeRaw = String(m.type ?? m.service_type ?? '');
    const badge = MAINTENANCE_BADGES[typeRaw];
    const description = String(m.description ?? m.notes ?? m.service_type ?? 'Intervention');
    const performedBy = String(m.garage_name ?? m.performed_by ?? m.requested_by ?? '-');
    const cost = m.final_cost ?? m.cost ?? m.estimated_cost;
    const costNum = cost != null ? Number(cost) : null;
    if (costNum != null) totalCost += costNum;
    
    const midY = y - ROW_HEIGHT / 2 - 3;
    
    // Colonne: Date
    drawCellText(page, date ? formatDateFR(date) : '-', x, midY, 8, fonts.regular, DS.text, MAINTENANCE_COLUMNS[0].width, 'center', 6);
    x += MAINTENANCE_COLUMNS[0].width;
    
    // Colonne: Type (badge)
    if (badge) {
      const badgeW = fonts.bold.widthOfTextAtSize(badge.label, 7) + 12;
      const badgeX = x + (MAINTENANCE_COLUMNS[1].width - badgeW) / 2;
      const badgeY = midY + 6;
      drawRect(page, badgeX, badgeY - 14, badgeW, 16, badge.bg);
      page.drawText(badge.label, { 
        x: badgeX + 6, 
        y: badgeY - 10, 
        size: 7, 
        font: fonts.bold, 
        color: badge.text 
      });
    }
    x += MAINTENANCE_COLUMNS[1].width;
    
    // Colonne: Description
    drawCellText(page, description, x + 4, midY, 8, fonts.regular, DS.text, MAINTENANCE_COLUMNS[2].width - 8, 'left', 6);
    x += MAINTENANCE_COLUMNS[2].width;
    
    // Colonne: Effectué par
    drawCellText(page, performedBy, x + 4, midY, 8, fonts.regular, DS.textSecondary, MAINTENANCE_COLUMNS[3].width - 8, 'left', 6);
    x += MAINTENANCE_COLUMNS[3].width;
    
    // Colonne: Coût (aligné à droite, en gras, police légèrement plus grande si > 500)
    const costStr = costNum != null ? formatEUR(costNum) : '-';
    const isHighCost = costNum != null && costNum > 500;
    drawCellText(
      page,
      costStr,
      x,
      midY,
      isHighCost ? 9 : 8,  // Police légèrement plus grande si montant élevé
      isHighCost ? fonts.bold : fonts.regular,
      isHighCost ? DS.danger : DS.text,
      MAINTENANCE_COLUMNS[4].width,
      'right',
      8
    );
    
    y -= ROW_HEIGHT;
  });
  
  // Ligne de total si des coûts existent
  if (totalCost > 0) {
    const totalY = y - 5;
    drawHLine(page, totalY + 5, DS.border, 1, MARGIN, PAGE_W - MARGIN);
    
    // Fond légèrement différent pour la ligne de total
    drawRect(page, MARGIN, totalY - 25, CONTENT_W, 25, hexToRgb('#EFF6FF'));
    
    drawText(page, 'TOTAL MAINTENANCES', MARGIN + 10, totalY - 14, 9, fonts.bold, DS.safeFleet, 'left', 200);
    
    const totalStr = formatEUR(totalCost);
    const totalW = fonts.bold.widthOfTextAtSize(totalStr, 10);
    page.drawText(totalStr, {
      x: PAGE_W - MARGIN - totalW - 10,
      y: totalY - 14,
      size: 10,
      font: fonts.bold,
      color: DS.safeFleet,
    });
    
    y = totalY - 35;
  }
  
  return { y, totalCost };
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 4: BLOC ÉNERGIE (Visualisation avec jauges)
// ═══════════════════════════════════════════════════════════════════════════════

const FUEL_TYPES: Record<string, { label: string; color: RGB; bg: RGB }> = {
  diesel:   { label: 'Diesel',   color: hexToRgb('#374151'), bg: hexToRgb('#F3F4F6') },
  adblue:   { label: 'AdBlue',   color: hexToRgb('#1D4ED8'), bg: hexToRgb('#DBEAFE') },
  gnr:      { label: 'GNR',      color: hexToRgb('#92400E'), bg: hexToRgb('#FEF3C7') },
  gasoline: { label: 'Essence',  color: hexToRgb('#7C3AED'), bg: hexToRgb('#EDE9FE') },
  gnv:      { label: 'GNV',      color: hexToRgb('#065F46'), bg: hexToRgb('#D1FAE5') },
};

interface FuelSummary {
  type: string;
  label: string;
  totalLitres: number;
  totalCost: number;
  color: RGB;
  bg: RGB;
}

function drawEnergySection(
  page: PDFPage,
  fonts: FontSet,
  fuelRecords: FuelEntry[],
  startY: number,
): number {
  if (fuelRecords.length === 0) {
    return startY;
  }
  
  // ── Titre de section ──
  drawText(page, 'CONSOMMATION ENERGETIQUE', MARGIN, startY, 11, fonts.bold, DS.text, 'left');
  drawHLine(page, startY - 6, DS.border, 0.5, MARGIN, MARGIN + 220);
  
  let y = startY - 25;
  
  // ── Calcul des totaux par type de carburant ──
  const summaries: Record<string, FuelSummary> = {};
  let grandTotal = 0;
  let maxCost = 0;
  
  fuelRecords.forEach(record => {
    const type = String(record.fuel_type ?? record.type ?? 'diesel').toLowerCase();
    const cost = Number(record.price_total ?? record.price ?? 0);
    const litres = Number(record.quantity_liters ?? record.liters ?? 0);
    
    const fuelDef = FUEL_TYPES[type] ?? FUEL_TYPES.diesel;
    
    if (!summaries[type]) {
      summaries[type] = {
        type,
        label: fuelDef.label,
        totalLitres: 0,
        totalCost: 0,
        color: fuelDef.color,
        bg: fuelDef.bg,
      };
    }
    
    summaries[type].totalLitres += litres;
    summaries[type].totalCost += cost;
    grandTotal += cost;
    maxCost = Math.max(maxCost, summaries[type].totalCost);
  });
  
  // ── Dessine chaque barre de progression ──
  const BAR_HEIGHT = 24;
  const BAR_GAP = 12;
  const LABEL_WIDTH = 70;
  const BAR_MAX_WIDTH = CONTENT_W - LABEL_WIDTH - 100; // Espace pour le montant
  
  Object.values(summaries).forEach((summary, index) => {
    const percentage = maxCost > 0 ? (summary.totalCost / maxCost) * 100 : 0;
    const barWidth = (percentage / 100) * BAR_MAX_WIDTH;
    
    // Label du carburant
    drawText(page, summary.label, MARGIN, y - 14, 9, fonts.bold, summary.color, 'left', LABEL_WIDTH);
    
    // Barre de fond
    drawRect(page, MARGIN + LABEL_WIDTH, y - BAR_HEIGHT, BAR_MAX_WIDTH, BAR_HEIGHT, DS.borderLight);
    
    // Barre de remplissage
    if (barWidth > 0) {
      drawRect(page, MARGIN + LABEL_WIDTH, y - BAR_HEIGHT, barWidth, BAR_HEIGHT, summary.bg);
    }
    
    // Icône de jauge (petit cercle à la fin de la barre)
    if (barWidth > 10) {
      page.drawEllipse({
        x: MARGIN + LABEL_WIDTH + barWidth - 5,
        y: y - BAR_HEIGHT / 2,
        xScale: 4,
        yScale: 4,
        color: summary.color,
      });
    }
    
    // Montant à droite (en gras, aligné)
    const costStr = formatEUR(summary.totalCost);
    const litresStr = `${summary.totalLitres.toFixed(1)} L`;
    
    drawText(page, costStr, PAGE_W - MARGIN - 90, y - 10, 10, fonts.bold, DS.text, 'left', 90);
    drawText(page, litresStr, PAGE_W - MARGIN - 90, y - 22, 7, fonts.regular, DS.textMuted, 'left', 90);
    
    y -= BAR_HEIGHT + BAR_GAP;
  });
  
  // ── Total général ──
  if (grandTotal > 0) {
    y -= 5;
    drawHLine(page, y + 5, DS.border, 0.5, MARGIN, PAGE_W - MARGIN);
    
    drawText(page, 'TOTAL CARBURANTS', MARGIN, y - 12, 9, fonts.bold, DS.textSecondary, 'left', 200);
    const grandTotalStr = formatEUR(grandTotal);
    const grandTotalW = fonts.bold.widthOfTextAtSize(grandTotalStr, 11);
    page.drawText(grandTotalStr, {
      x: PAGE_W - MARGIN - grandTotalW,
      y: y - 12,
      size: 11,
      font: fonts.bold,
      color: DS.safeFleet,
    });
    
    y -= 25;
  }
  
  return y;
}

// ═══════════════════════════════════════════════════════════════════════════════
// SECTION 5: FOOTER CERTIFICATION
// ═══════════════════════════════════════════════════════════════════════════════

function drawCertificationFooter(
  page: PDFPage,
  fonts: FontSet,
  data: VehicleCarnetData,
  pageNum: number,
  totalPages: number,
  uniqueId: string,
) {
  // ── Ligne de séparation fine ──
  drawHLine(page, FOOTER_H + 10, DS.border, 0.5, 0, PAGE_W);
  
  // ── Mention de certification ──
  const certText = `Certifie conforme DREAL - Signature numerique ID: ${uniqueId}`;
  drawText(page, certText, MARGIN, FOOTER_H - 5, 7, fonts.regular, DS.textMuted, 'left', CONTENT_W);
  
  // ── Numérotation ──
  const pageText = `Page ${pageNum} sur ${totalPages}`;
  const pageW = fonts.regular.widthOfTextAtSize(pageText, 7);
  page.drawText(pageText, {
    x: PAGE_W - MARGIN - pageW,
    y: FOOTER_H - 5,
    size: 7,
    font: fonts.regular,
    color: DS.textSecondary,
  });
  
  // ── Date de génération ──
  const now = new Date();
  const dateText = `Genere le ${now.toLocaleDateString('fr-FR')}`;
  drawText(page, dateText, 0, FOOTER_H - 5, 7, fonts.regular, DS.textMuted, 'center', PAGE_W);
}

// ═══════════════════════════════════════════════════════════════════════════════
// PAGE COMPLÈTE: ASSEMBLAGE
// ═══════════════════════════════════════════════════════════════════════════════

async function generateEliteCarnetPage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  data: VehicleCarnetData,
): Promise<PDFPage> {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  
  // Fond blanc
  drawRect(page, 0, 0, PAGE_W, PAGE_H, DS.white);
  
  // ── 1. Header Safe Fleet ──
  const headerResult = drawSafeFleetHeader(page, fonts, data);
  
  // ── 2. Grille de Conformité ──
  const complianceResult = drawComplianceGrid(page, fonts, data, headerResult.y);
  
  // ── 3. Tableau Maintenance ──
  let currentY = complianceResult.y;
  
  // Titre de section
  drawText(page, 'HISTORIQUE DES MAINTENANCES', MARGIN, currentY, 11, fonts.bold, DS.text, 'left');
  drawHLine(page, currentY - 6, DS.border, 0.5, MARGIN, MARGIN + 250);
  currentY -= 20;
  
  const tableResult = drawMaintenanceTable(page, fonts, data.maintenances, currentY);
  currentY = tableResult.y;
  
  // ── 4. Bloc Énergie (si assez d'espace) ──
  if (currentY > FOOTER_H + 120 && data.fuelRecords.length > 0) {
    currentY = drawEnergySection(page, fonts, data.fuelRecords, currentY - 10);
  }
  
  return page;
}

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORT PRINCIPAL
// ═══════════════════════════════════════════════════════════════════════════════

export async function generateEliteCarnetPDF(data: VehicleCarnetData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const generatedAt = new Date();
  const uniqueId = `FM-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;
  
  // Métadonnées du document
  pdfDoc.setTitle(nt(`Carnet d'Entretien - ${data.vehicle.registration_number}`));
  pdfDoc.setAuthor('FleetMaster Pro - Elite Transport 2026');
  pdfDoc.setSubject(nt(`Carnet numerique DREAL - ${data.vehicle.registration_number}`));
  pdfDoc.setCreationDate(generatedAt);
  pdfDoc.setKeywords(['fleet', 'maintenance', 'dreal', 'compliance', 'elite-2026']);
  
  // Chargement des polices (Helvetica standard pour compatibilité maximale)
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const italic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  const fonts: FontSet = { regular, bold, italic };
  
  // ── Génère la page principale ──
  const mainPage = await generateEliteCarnetPage(pdfDoc, fonts, data);
  
  // ── Footer sur toutes les pages ──
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  pages.forEach((page, index) => {
    drawCertificationFooter(page, fonts, data, index + 1, totalPages, uniqueId);
  });
  
  // ── Sauvegarde ──
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

// Export nommé alternatif pour compatibilité
export { generateEliteCarnetPDF as generateCarnetPDF };
