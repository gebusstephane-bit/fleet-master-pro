/**
 * Fonctions utilitaires de dessin pour le PDF Fleet-Master
 */

import { PDFPage, RGB } from 'pdf-lib';
import { FontSet } from './pdf-fonts';
import { C, StatusType, getStatusColors } from './pdf-colors';

export const PAGE_W = 595;
export const PAGE_H = 842;
export const MARGIN = 30;
export const SIDEBAR_W = 40;
export const CONTENT_X = SIDEBAR_W + 15;
export const CONTENT_W = PAGE_W - CONTENT_X - MARGIN;

// ─── WinAnsi normalizer ──────────────────────────────────────────────────────
// Nécessaire même avec des polices embarquées pour éviter les glyphes manquants
// sur certains viewers PDF
export function nt(text: unknown): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .replace(/[\u00A0\u202F\u2007\u2060]/g, ' ')
    .replace(/[""«»\u201C\u201D]/g, '"')
    .replace(/[\u2018\u2019\u201A]/g, "'")
    .replace(/[—–\u2212]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x00-\xFF]/g, '');
}

// ─── Primitives ──────────────────────────────────────────────────────────────

export function rect(
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

export function hLine(
  page: PDFPage,
  y: number,
  color: RGB = C.border,
  thickness = 0.5,
  x0 = MARGIN,
  x1 = PAGE_W - MARGIN,
) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
}

export function txt(
  page: PDFPage,
  text: string,
  x: number, y: number,
  size: number,
  font: FontSet['regular'],
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

// Texte tronqué pour tenir dans une cellule
export function txtCell(
  page: PDFPage,
  text: string,
  x: number, y: number,
  size: number,
  font: FontSet['regular'],
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
  if (s !== nt(text) && s.length > 1) s = s.slice(0, -3) + '...';

  const w = font.widthOfTextAtSize(s, size);
  let dx = x + padding;
  if (align === 'center') dx = x + (cellW - w) / 2;
  else if (align === 'right') dx = x + cellW - w - padding;
  page.drawText(s, { x: dx, y, size, font, color });
}

// Texte multiligne avec retour automatique
export function drawWrappedText(
  page: PDFPage,
  text: string,
  x: number, y: number,
  maxWidth: number,
  lineHeight: number,
  font: FontSet['regular'],
  size: number,
  color: RGB,
): number {
  const words = nt(text).split(' ').filter(Boolean);
  let line = '';
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(testLine, size) > maxWidth && line) {
      page.drawText(line, { x, y: currentY, size, font, color });
      line = word;
      currentY -= lineHeight;
    } else {
      line = testLine;
    }
  }
  if (line) {
    page.drawText(line, { x, y: currentY, size, font, color });
    currentY -= lineHeight;
  }
  return currentY;
}

// ─── Composants visuels ──────────────────────────────────────────────────────

/** Badge pill de statut (rectangle avec texte centré) */
export function drawBadge(
  page: PDFPage,
  x: number, y: number,
  text: string,
  bgColor: RGB,
  textColor: RGB,
  font: FontSet['regular'],
  fontSize: number,
) {
  const label = nt(text);
  const textW = font.widthOfTextAtSize(label, fontSize);
  const badgeW = textW + 14;
  const badgeH = fontSize + 6;

  rect(page, x, y - badgeH + 2, badgeW, badgeH, bgColor);
  page.drawText(label, { x: x + 7, y: y - badgeH + 6, size: fontSize, font, color: textColor });
  return badgeW;
}

/** Barre de progression horizontale */
export function drawProgressBar(
  page: PDFPage,
  x: number, y: number,
  width: number, height: number,
  percentage: number,
  fillColor: RGB,
) {
  // Fond
  rect(page, x, y, width, height, C.border);
  // Remplissage
  const fillW = Math.max(0, Math.min(1, percentage / 100)) * width;
  if (fillW > 0) {
    rect(page, x, y, fillW, height, fillColor);
  }
}

/** Header de section (bande bleue pleine largeur) */
export function drawSectionHeader(
  page: PDFPage,
  fonts: FontSet,
  title: string,
  subtitle: string,
  yTop: number,
  height = 52,
) {
  rect(page, 0, yTop - height, PAGE_W, height, C.primary);
  txt(page, nt(title), 20, yTop - height + 20, 15, fonts.bold, C.white);
  if (subtitle) {
    txt(page, nt(subtitle), 20, yTop - height + 7, 8, fonts.regular, C.primaryBg);
  }
  return yTop - height;
}

/** Mini header de marque (ligne en haut de chaque page 2+) */
export function drawPageBrand(
  page: PDFPage,
  fonts: FontSet,
) {
  rect(page, 0, PAGE_H - 22, PAGE_W, 22, C.primary);
  txt(page, 'Fleet-Master', 20, PAGE_H - 15, 8, fonts.bold, C.white);
  txt(page, 'Rapport de Conformite Reglementaire', 0, PAGE_H - 15, 8, fonts.regular, C.primaryBg, 'right', PAGE_W - 20);
}

/** Footer de page */
export function drawPageFooter(
  page: PDFPage,
  fonts: FontSet,
  pageNum: number,
  totalPages: number,
  generationDate: Date,
) {
  hLine(page, 38, C.border, 0.5, 0, PAGE_W);

  const dateStr = generationDate.toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
  const timeStr = generationDate.toLocaleTimeString('fr-FR', {
    hour: '2-digit', minute: '2-digit',
  });

  txt(page, `Genere le ${dateStr} a ${timeStr}`, MARGIN, 24, 7, fonts.regular, C.neutralLight);
  txt(page, 'www.fleetmaster.fr', 0, 24, 7, fonts.regular, C.neutralLight, 'center', PAGE_W);
  txt(page, `Page ${pageNum} / ${totalPages}`, 0, 24, 7, fonts.regular, C.neutralLight, 'right', PAGE_W - MARGIN);
}

/** Cellule de statut de document dans un tableau */
export function drawDocStatusCell(
  page: PDFPage,
  fonts: FontSet,
  status: StatusType,
  dateLabel: string,
  daysLabel: string,
  x: number, y: number,
  cellW: number, cellH: number,
) {
  const colors = getStatusColors(status);

  if (status === 'missing') {
    // Tiret centré gris
    rect(page, x, y - cellH, cellW, cellH, C.neutralBg);
    txtCell(page, '-', x, y - cellH / 2 - 3, 9, fonts.regular, C.neutralLight, cellW, 'center');
    return;
  }

  rect(page, x, y - cellH, cellW, cellH, colors.bg);

  // Date
  txtCell(page, dateLabel, x, y - cellH / 2 + 3, 7, fonts.bold, colors.text, cellW, 'center');
  // Jours restants
  txtCell(page, daysLabel, x, y - cellH / 2 - 7, 6, fonts.regular, colors.text, cellW, 'center');
}

/** Statut global conducteur (badge) */
export function drawDriverStatusBadge(
  page: PDFPage,
  fonts: FontSet,
  status: 'CONFORME' | 'ATTENTION' | 'NON_CONFORME',
  x: number, y: number,
  cellW: number, cellH: number,
) {
  const configs = {
    CONFORME:     { bg: C.successBg, text: C.successText, border: C.successBorder, label: 'CONFORME' },
    ATTENTION:    { bg: C.warningBg, text: C.warningText, border: C.warningBorder, label: 'ATTENTION' },
    NON_CONFORME: { bg: C.dangerBg,  text: C.dangerText,  border: C.dangerBorder,  label: 'NON CONFORME' },
  };
  const cfg = configs[status];
  const badgeW = cellW - 14;
  const badgeH = 14;
  const badgeX = x + 7;
  // Center badge vertically in cell: cell bottom = y - cellH, center = y - cellH/2
  const badgeY = y - cellH / 2 - badgeH / 2;

  rect(page, badgeX, badgeY, badgeW, badgeH, cfg.bg, cfg.border, 0.5);
  txtCell(page, cfg.label, badgeX, badgeY + badgeH / 2 - 2, 6, fonts.bold, cfg.text, badgeW, 'center');
}
