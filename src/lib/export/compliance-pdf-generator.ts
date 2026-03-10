/**
 * Rapport de Conformité PDF — FleetMaster Pro v2
 * Design professionnel 4 pages pour inspections DREAL
 */

import { PDFDocument, PDFPage } from 'pdf-lib';
import { formatDateFR } from './formatters';
import { getDocumentsForActivities, DocumentConfig } from '@/lib/compliance-activities-config';
import { loadFonts, FontSet } from '@/lib/pdf/pdf-fonts';
import { C, StatusType, getScoreColor } from '@/lib/pdf/pdf-colors';
import {
  PAGE_W, PAGE_H, MARGIN, SIDEBAR_W, CONTENT_X, CONTENT_W,
  nt, rect, hLine, txt, txtCell, drawWrappedText,
  drawProgressBar,
  drawSectionHeader, drawPageBrand, drawPageFooter,
  drawDocStatusCell, drawDriverStatusBadge,
} from '@/lib/pdf/pdf-helpers';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface VehicleCompliancePDF {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  technical_control_expiry: string | null;
  tachy_control_expiry: string | null;
  atp_expiry: string | null;
  insurance_expiry: string | null;
  adr_certificate_expiry?: string | null;
  adr_equipment_expiry?: string | null;
}

export interface DriverCompliancePDF {
  id: string;
  first_name: string;
  last_name: string;
  license_type?: string | null;
  license_expiry: string | null;
  driver_card_expiry: string | null;
  fcos_expiry: string | null;
  cqc_expiry: string | null;
  cqc_expiry_date: string | null;
  medical_certificate_expiry: string | null;
  adr_certificate_expiry: string | null;
}

export interface CompliancePDFData {
  company: {
    name: string;
    siret?: string | null;
    address?: string | null;
    city?: string | null;
    postal_code?: string | null;
    phone?: string | null;
    email?: string | null;
    activity?: string | null;
    naf_code?: string | null;
  };
  vehicles: VehicleCompliancePDF[];
  drivers: DriverCompliancePDF[];
  generatedAt: Date;
  period: 'current' | '30days' | '60days';
  activities?: string[];
  primaryActivity?: string;
}

// ─── Document status ──────────────────────────────────────────────────────────
function getDocStatus(expiry: string | null | undefined): {
  status: StatusType;
  days: number | null;
  dateLabel: string;
  daysLabel: string;
} {
  if (!expiry) return { status: 'missing', days: null, dateLabel: '', daysLabel: 'Non renseigne' };

  const expiryDate = new Date(expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);

  const days = Math.ceil((expiryDate.getTime() - today.getTime()) / 86400000);
  const dateLabel = formatDateFR(expiry);

  if (days < 0) return { status: 'expired', days, dateLabel, daysLabel: `Exp. ${Math.abs(days)}j` };
  if (days <= 30) return { status: 'expired', days, dateLabel, daysLabel: `${days}j restants` };
  if (days <= 60) return { status: 'warning', days, dateLabel, daysLabel: `${days}j restants` };
  return { status: 'valid', days, dateLabel, daysLabel: `${days}j restants` };
}

function getDriverGlobalStatus(d: DriverCompliancePDF): 'CONFORME' | 'ATTENTION' | 'NON_CONFORME' {
  const cqcDate = d.fcos_expiry && d.cqc_expiry
    ? (new Date(d.fcos_expiry) < new Date(d.cqc_expiry) ? d.fcos_expiry : d.cqc_expiry)
    : d.fcos_expiry || d.cqc_expiry || d.cqc_expiry_date || null;

  const statuses = [
    getDocStatus(d.license_expiry).status,
    getDocStatus(d.medical_certificate_expiry).status,
    getDocStatus(cqcDate).status,
  ];

  if (statuses.includes('expired') || statuses.includes('missing')) return 'NON_CONFORME';
  if (statuses.includes('warning')) return 'ATTENTION';
  return 'CONFORME';
}

// ─── Score & stats ────────────────────────────────────────────────────────────
function calculateGlobalScore(data: CompliancePDFData): number {
  let total = 0;
  let valid = 0;

  data.vehicles.forEach(v => {
    [v.technical_control_expiry, v.tachy_control_expiry, v.atp_expiry, v.insurance_expiry].forEach(d => {
      if (d) { total++; const s = getDocStatus(d).status; if (s === 'valid') valid++; else if (s === 'warning') valid += 0.5; }
    });
  });

  data.drivers.forEach(d => {
    const cqcDate = d.fcos_expiry && d.cqc_expiry
      ? (new Date(d.fcos_expiry) < new Date(d.cqc_expiry) ? d.fcos_expiry : d.cqc_expiry)
      : d.fcos_expiry || d.cqc_expiry || d.cqc_expiry_date || null;

    [d.license_expiry, d.medical_certificate_expiry, cqcDate].forEach(date => {
      if (date) { total++; const s = getDocStatus(date).status; if (s === 'valid') valid++; else if (s === 'warning') valid += 0.5; }
    });
    if (d.adr_certificate_expiry) {
      total++; const s = getDocStatus(d.adr_certificate_expiry).status;
      if (s === 'valid') valid++; else if (s === 'warning') valid += 0.5;
    }
  });

  return total > 0 ? Math.round((valid / total) * 100) : 100;
}

function calculateStats(data: CompliancePDFData) {
  let validV = 0, warnV = 0, expV = 0;
  let validD = 0, warnD = 0, expD = 0;
  let totalDocs = 0, missingDocs = 0;

  data.vehicles.forEach(v => {
    const allDocs = [v.technical_control_expiry, v.tachy_control_expiry, v.atp_expiry, v.insurance_expiry,
      v.adr_certificate_expiry, v.adr_equipment_expiry].filter(x => x !== undefined);
    totalDocs += allDocs.length;
    missingDocs += allDocs.filter(d => !d).length;
    const statuses = allDocs.filter(Boolean).map(d => getDocStatus(d as string).status);
    if (statuses.includes('expired')) expV++;
    else if (statuses.includes('warning')) warnV++;
    else if (statuses.length > 0) validV++;
  });

  data.drivers.forEach(d => {
    const allDocs = [d.license_expiry, d.medical_certificate_expiry, d.fcos_expiry, d.adr_certificate_expiry];
    totalDocs += allDocs.length;
    missingDocs += allDocs.filter(x => !x).length;
    const gs = getDriverGlobalStatus(d);
    if (gs === 'CONFORME') validD++;
    else if (gs === 'ATTENTION') warnD++;
    else expD++;
  });

  return { validV, warnV, expV, validD, warnD, expD, totalDocs, missingDocs };
}

function generateDocHash(data: CompliancePDFData): string {
  const str = data.company.name + data.generatedAt.toISOString() + data.vehicles.length + data.drivers.length;
  let hash = 0;
  for (let i = 0; i < str.length; i++) { hash = (hash * 31 + str.charCodeAt(i)) >>> 0; }
  return hash.toString(16).toUpperCase().padStart(8, '0');
}

// ─── Nouvelle page blanche ────────────────────────────────────────────────────
function newPage(pdfDoc: PDFDocument): PDFPage {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.white });
  return page;
}

// ─── PAGE 1: COUVERTURE ───────────────────────────────────────────────────────
function drawCoverPage(page: PDFPage, fonts: FontSet, data: CompliancePDFData, score: number) {
  const stats = calculateStats(data);

  // ── Bandeau latéral gauche
  rect(page, 0, 0, SIDEBAR_W, PAGE_H, C.primary);

  // ── Header pleine largeur (140pt)
  const HEADER_H = 140;
  rect(page, 0, PAGE_H - HEADER_H, PAGE_W, HEADER_H, C.primary);

  // Logo
  txt(page, 'FleetMaster Pro', CONTENT_X, PAGE_H - 45, 22, fonts.bold, C.white);
  txt(page, 'Gestion de flotte professionnelle', CONTENT_X, PAGE_H - 65, 10, fonts.regular, C.primaryBg);

  // Badge "DOCUMENT CONFIDENTIEL"
  const confLabel = 'DOCUMENT CONFIDENTIEL';
  const confW = fonts.bold.widthOfTextAtSize(confLabel, 8) + 20;
  rect(page, PAGE_W - MARGIN - confW, PAGE_H - 70, confW, 20, C.primaryLight);
  txtCell(page, confLabel, PAGE_W - MARGIN - confW, PAGE_H - 56, 8, fonts.bold, C.white, confW, 'center', 0);

  // ── Titre principal (centré sur toute la largeur de page)
  let y = PAGE_H - HEADER_H - 30;
  txt(page, 'RAPPORT DE CONFORMITE REGLEMENTAIRE', 0, y, 20, fonts.bold, C.primary, 'center', PAGE_W);
  y -= 22;
  txt(page, 'Transport routier - Vehicules & Conducteurs', 0, y, 12, fonts.regular, C.neutral, 'center', PAGE_W);
  y -= 18;
  hLine(page, y, C.border, 1, MARGIN, PAGE_W - MARGIN);
  y -= 20;

  // ── Carte entreprise
  const cardH = 100;
  rect(page, CONTENT_X, y - cardH, CONTENT_W, cardH, C.neutralBg, C.border);
  rect(page, CONTENT_X, y - cardH, 4, cardH, C.primary);

  const cx = CONTENT_X + 16;
  txt(page, nt(data.company.name), cx, y - 18, 16, fonts.bold, C.primary);

  if (data.company.siret) {
    txt(page, `SIRET : ${nt(data.company.siret)}`, cx, y - 36, 9, fonts.regular, C.neutral);
  }

  const actLabel = data.company.activity
    ? `${nt(data.company.activity)}${data.company.naf_code ? ` - Code NAF ${nt(data.company.naf_code)}` : ''}`
    : 'Transport routier de marchandises';
  txt(page, actLabel, cx, y - 50, 9, fonts.regular, C.textSecondary);

  const addr = [data.company.address, data.company.postal_code, data.company.city].filter(Boolean).join(' ');
  if (addr) txt(page, nt(addr), cx, y - 64, 9, fonts.regular, C.textSecondary);

  const contact = [data.company.phone, data.company.email].filter(Boolean).join('  |  ');
  if (contact) txt(page, nt(contact), cx, y - 78, 9, fonts.regular, C.textSecondary);

  // Période en haut à droite de la carte
  const periodLabels: Record<string, string> = {
    current: 'Etat actuel',
    '30days': 'Echeances 30 jours',
    '60days': 'Echeances 60 jours',
  };
  txt(page, nt(periodLabels[data.period] || ''), PAGE_W - MARGIN - 120, y - 18, 8, fonts.regular, C.neutral, 'right', 120);

  y -= cardH + 20;

  // ── Score de conformité global (tout centré sur PAGE_W)
  // IMPORTANT: pdf-lib y = baseline. À 52pt, les glyphes montent ~37pt au-dessus.
  // On place d'abord le label, puis on descend suffisamment avant le score.
  const scoreColor = getScoreColor(score);
  txt(page, 'SCORE DE CONFORMITE GLOBAL', 0, y, 9, fonts.regular, C.neutral, 'center', PAGE_W);
  y -= 54; // 54pt de gap = 9pt label + 8pt espace + 37pt cap-height du score → pas de chevauchement

  // Grand chiffre du score (baseline à y)
  const scoreStr = `${score}%`;
  txt(page, scoreStr, 0, y, 52, fonts.bold, scoreColor, 'center', PAGE_W);
  y -= 24; // descend sous la ligne de base + descender

  // Barre de progression (centrée sur PAGE_W, 360pt de large)
  const barW = 360;
  const barX = (PAGE_W - barW) / 2;
  drawProgressBar(page, barX, y, barW, 10, score, scoreColor);
  y -= 18;

  // Mention qualitative
  const qualLabel = score >= 90
    ? 'Flotte conforme - Aucune action critique requise'
    : score >= 70
      ? 'Attention requise - Des documents arrivent a echeance'
      : 'Situation critique - Actions immediates necessaires';
  txt(page, qualLabel, 0, y, 9, fonts.regular, scoreColor, 'center', PAGE_W);
  y -= 22;

  // ── Grille récapitulatif (3 colonnes, centrée sur PAGE_W)
  hLine(page, y, C.border, 0.5, MARGIN, PAGE_W - MARGIN);
  y -= 16;

  const cardW = 155;
  const cardSpacing = 10;
  const gridStartX = (PAGE_W - (cardW * 3 + cardSpacing * 2)) / 2;

  const summaryCards = [
    {
      title: 'VEHICULES',
      total: data.vehicles.length,
      valid: stats.validV,
      warning: stats.warnV,
      expired: stats.expV,
    },
    {
      title: 'CONDUCTEURS',
      total: data.drivers.length,
      valid: stats.validD,
      warning: stats.warnD,
      expired: stats.expD,
    },
    {
      title: 'DOCUMENTS',
      total: stats.totalDocs,
      valid: stats.totalDocs - stats.missingDocs,
      warning: 0,
      expired: stats.missingDocs,
      lastLabel: 'Manquants',
    },
  ];

  const cardInnerH = 88;
  summaryCards.forEach((card, i) => {
    const cx2 = gridStartX + i * (cardW + cardSpacing);
    rect(page, cx2, y - cardInnerH, cardW, cardInnerH, C.neutralBg, C.border);

    // Titre (8pt) — baseline à y-12, cap à y-4 (sous le bord sup de la carte y)
    txt(page, card.title, cx2 + 10, y - 12, 8, fonts.bold, C.primary, 'left', cardW - 16);

    // Grand chiffre (20pt) — baseline à y-34, cap à y-34+14=y-20 (espace de 8pt sous titre cap y-4) ✓
    const numStr = String(card.total);
    const numW = fonts.bold.widthOfTextAtSize(numStr, 20);
    txt(page, numStr, cx2 + 10, y - 34, 20, fonts.bold, C.text, 'left', cardW - 16);
    // "total" aligné verticalement au milieu du grand chiffre
    txt(page, 'total', cx2 + 10 + numW + 4, y - 28, 8, fonts.regular, C.neutral);

    // Lignes de stats — à partir de y-52, espacement 14pt
    const rows = [
      { label: 'Conformes', value: card.valid, color: C.success },
      { label: 'A renouveler', value: card.warning, color: C.warning },
      { label: card.lastLabel ?? 'Expires', value: card.expired, color: C.danger },
    ];
    rows.forEach((row, ri) => {
      const ry = y - 52 - ri * 14;
      rect(page, cx2 + 10, ry - 1, 7, 7, row.color);
      txt(page, `${row.value} ${row.label}`, cx2 + 22, ry, 7, fonts.regular, C.text, 'left', cardW - 34);
    });
  });

  y -= cardInnerH + 8;
}

// ─── PAGE 2: VÉHICULES ────────────────────────────────────────────────────────
function drawVehiclesPages(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  vehicles: VehicleCompliancePDF[],
  startPageNum: number,
  documentConfigs: DocumentConfig[],
): number {
  if (vehicles.length === 0) return startPageNum;

  const ROW_H = 32;
  const HDR_H = 28;
  const SECTION_HDR_H = 52;
  const BOTTOM = 58;

  let page = newPage(pdfDoc);
  let pn = startPageNum;

  drawPageBrand(page, fonts);

  const sectionY = PAGE_H - 22;
  const tableStartY = drawSectionHeader(
    page, fonts,
    'ETAT DES VEHICULES',
    'Detail des documents reglementaires par vehicule',
    sectionY, SECTION_HDR_H,
  ) - 8;

  let y = tableStartY;

  // Colonnes dynamiques
  const vehColW = 110;
  const availW = PAGE_W - MARGIN * 2 - vehColW;
  const docColW = Math.floor(availW / documentConfigs.length);
  const colWidths = [vehColW, ...documentConfigs.map(() => docColW)];
  const headers = ['VEHICULE', ...documentConfigs.map(d => d.shortLabel)];

  function drawTableHeader(pg: PDFPage, startY: number) {
    let x = MARGIN;
    headers.forEach((h, i) => {
      rect(pg, x, startY - HDR_H, colWidths[i], HDR_H, C.primary);
      txtCell(pg, h, x, startY - HDR_H + 10, 7, fonts.bold, C.white, colWidths[i], 'center');
      x += colWidths[i];
    });
    return startY - HDR_H;
  }

  y = drawTableHeader(page, y);

  const getDocValue = (v: VehicleCompliancePDF, key: DocumentConfig['key']): string | null => {
    const map: Record<string, string | null | undefined> = {
      technical_control_expiry: v.technical_control_expiry,
      tachy_control_expiry: v.tachy_control_expiry,
      atp_expiry: v.atp_expiry,
      insurance_expiry: v.insurance_expiry,
      adr_certificate_expiry: v.adr_certificate_expiry,
      adr_equipment_expiry: v.adr_equipment_expiry,
    };
    return map[key] ?? null;
  };

  vehicles.forEach((v, idx) => {
    if (y - ROW_H < BOTTOM) {
      page = newPage(pdfDoc);
      pn++;
      drawPageBrand(page, fonts);
      y = PAGE_H - 22;
      y = drawSectionHeader(page, fonts, 'ETAT DES VEHICULES (SUITE)', '', y, SECTION_HDR_H) - 8;
      y = drawTableHeader(page, y);
    }

    const bg = idx % 2 === 0 ? C.white : C.neutralBg;
    const statuses = documentConfigs.map(doc => getDocStatus(getDocValue(v, doc.key)).status);
    let rowAccent = C.success;
    if (statuses.includes('expired')) rowAccent = C.danger;
    else if (statuses.includes('warning')) rowAccent = C.warning;
    else if (statuses.includes('missing')) rowAccent = C.neutral;

    // Fond de ligne
    let x = MARGIN;
    colWidths.forEach(w => {
      rect(page, x, y - ROW_H, w, ROW_H, bg, C.border, 0.3);
      x += w;
    });

    // Barre d'accentuation gauche (3px)
    rect(page, MARGIN, y - ROW_H, 3, ROW_H, rowAccent);

    // Colonne véhicule
    rect(page, MARGIN, y - ROW_H, vehColW, ROW_H, C.primaryBg, C.border, 0.3);
    rect(page, MARGIN, y - ROW_H, 3, ROW_H, C.primary);
    txt(page, nt(v.immatriculation), MARGIN + 8, y - 13, 9, fonts.bold, C.primary, 'left', vehColW - 10);
    txt(page, nt(`${v.marque} ${v.modele}`.trim()), MARGIN + 8, y - 24, 7, fonts.regular, C.neutral, 'left', vehColW - 10);

    // Cellules documents
    x = MARGIN + vehColW;
    documentConfigs.forEach((docCfg, di) => {
      const docVal = getDocValue(v, docCfg.key);
      const docInfo = getDocStatus(docVal);
      drawDocStatusCell(
        page, fonts,
        docInfo.status, docInfo.dateLabel, docInfo.daysLabel,
        x, y, colWidths[di + 1], ROW_H,
      );
      x += colWidths[di + 1];
    });

    y -= ROW_H;
  });

  // Légende (centrée sur PAGE_W)
  if (y - 24 > BOTTOM) {
    y -= 12;
    const legendItems = [
      { label: 'Conforme (> 60j)', color: C.success },
      { label: 'A renouveler (<= 60j)', color: C.warning },
      { label: 'Expire', color: C.danger },
      { label: 'Non renseigne', color: C.neutralLight },
    ];
    const ITEM_GAP = 24;
    const SWATCH = 8;
    const SWATCH_TEXT_GAP = 5;
    const totalW = legendItems.reduce((acc, item) => {
      return acc + SWATCH + SWATCH_TEXT_GAP + fonts.regular.widthOfTextAtSize(nt(item.label), 7) + ITEM_GAP;
    }, 0) - ITEM_GAP;
    let lx = (PAGE_W - totalW) / 2;
    legendItems.forEach(item => {
      rect(page, lx, y - 5, SWATCH, SWATCH, item.color);
      const lw = fonts.regular.widthOfTextAtSize(nt(item.label), 7);
      txt(page, item.label, lx + SWATCH + SWATCH_TEXT_GAP, y - 4, 7, fonts.regular, C.neutral);
      lx += SWATCH + SWATCH_TEXT_GAP + lw + ITEM_GAP;
    });
  }

  return pn;
}

// ─── PAGE 3: CONDUCTEURS ──────────────────────────────────────────────────────
function drawDriversPages(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  drivers: DriverCompliancePDF[],
  startPageNum: number,
): number {
  if (drivers.length === 0) return startPageNum;

  const ROW_H = 30;
  const HDR_H = 28;
  const SECTION_HDR_H = 52;
  const BOTTOM = 80;

  let page = newPage(pdfDoc);
  let pn = startPageNum + 1;

  drawPageBrand(page, fonts);

  const sectionY = PAGE_H - 22;
  let y = drawSectionHeader(
    page, fonts,
    'ETAT DES CONDUCTEURS',
    'Documents reglementaires - Format DREAL',
    sectionY, SECTION_HDR_H,
  ) - 8;

  // Colonnes
  const colW = [110, 80, 80, 90, 70, 75];
  const headers = ['CONDUCTEUR', 'PERMIS', 'VISITE MED.', 'CQC (FCO)', 'ADR', 'STATUT'];

  function drawTableHeader(pg: PDFPage, startY: number) {
    let x = MARGIN;
    headers.forEach((h, i) => {
      rect(pg, x, startY - HDR_H, colW[i], HDR_H, C.primary);
      txtCell(pg, h, x, startY - HDR_H + 10, 7, fonts.bold, C.white, colW[i], 'center');
      x += colW[i];
    });
    return startY - HDR_H;
  }

  y = drawTableHeader(page, y);

  drivers.forEach((d, idx) => {
    if (y - ROW_H < BOTTOM) {
      page = newPage(pdfDoc);
      pn++;
      drawPageBrand(page, fonts);
      y = PAGE_H - 22;
      y = drawSectionHeader(page, fonts, 'ETAT DES CONDUCTEURS (SUITE)', '', y, SECTION_HDR_H) - 8;
      y = drawTableHeader(page, y);
    }

    const cqcDate = d.fcos_expiry && d.cqc_expiry
      ? (new Date(d.fcos_expiry) < new Date(d.cqc_expiry) ? d.fcos_expiry : d.cqc_expiry)
      : d.fcos_expiry || d.cqc_expiry || d.cqc_expiry_date || null;

    const globalStatus = getDriverGlobalStatus(d);
    const bg = idx % 2 === 0 ? C.white : C.neutralBg;
    const accentColor = globalStatus === 'CONFORME' ? C.success : globalStatus === 'ATTENTION' ? C.warning : C.danger;

    // Fond de ligne
    let x = MARGIN;
    colW.forEach(w => {
      rect(page, x, y - ROW_H, w, ROW_H, bg, C.border, 0.3);
      x += w;
    });
    rect(page, MARGIN, y - ROW_H, 3, ROW_H, accentColor);

    // Colonne conducteur
    rect(page, MARGIN, y - ROW_H, colW[0], ROW_H, C.primaryBg, C.border, 0.3);
    rect(page, MARGIN, y - ROW_H, 3, ROW_H, C.primary);
    txt(page, nt(`${d.first_name} ${d.last_name}`), MARGIN + 8, y - 11, 8, fonts.bold, C.primary, 'left', colW[0] - 10);
    txt(page, nt(d.license_type || 'Conducteur'), MARGIN + 8, y - 22, 7, fonts.regular, C.neutral, 'left', colW[0] - 10);

    // Documents
    const docDates = [
      d.license_expiry,
      d.medical_certificate_expiry,
      cqcDate,
      d.adr_certificate_expiry,
    ];

    x = MARGIN + colW[0];
    docDates.forEach((docDate, di) => {
      const info = getDocStatus(docDate);
      drawDocStatusCell(page, fonts, info.status, info.dateLabel, info.daysLabel, x, y, colW[di + 1], ROW_H);
      x += colW[di + 1];
    });

    // Statut global
    drawDriverStatusBadge(page, fonts, globalStatus, x, y, colW[5], ROW_H);

    y -= ROW_H;
  });

  // Encart informatif FCO/FIMO
  const infoH = 44;
  if (y - infoH > BOTTOM) {
    y -= 12;
    rect(page, MARGIN, y - infoH, CONTENT_W + SIDEBAR_W - 5, infoH, C.infoBg, C.border, 0.5);
    rect(page, MARGIN, y - infoH, 4, infoH, C.info);
    drawWrappedText(
      page,
      'i Les conducteurs effectuant des transports routiers professionnels doivent etre titulaires d\'une CQC (FCO initiale + recyclages quinquennaux). Toute expiration entraine une interdiction d\'exercice immediate.',
      MARGIN + 12, y - 10,
      CONTENT_W + SIDEBAR_W - 26,
      13,
      fonts.regular, 8, C.infoText,
    );
  }

  return pn;
}

// ─── PAGE 4: PLAN D'ACTIONS ───────────────────────────────────────────────────
function drawActionsPage(
  pdfDoc: PDFDocument,
  fonts: FontSet,
  data: CompliancePDFData,
  startPageNum: number,
  documentConfigs: DocumentConfig[],
): number {
  // Clés des documents requis pour les véhicules selon l'activité
  const requiredVehicleDocKeys = new Set(documentConfigs.map(d => d.key));
  // ADR conducteur requis uniquement si l'activité inclut de l'ADR
  const requiresDriverADR = (data.activities ?? []).some(
    a => a === 'ADR_COLIS' || a === 'ADR_CITERNE',
  );
  const page = newPage(pdfDoc);
  const pn = startPageNum + 1;

  drawPageBrand(page, fonts);
  const sectionY = PAGE_H - 22;
  let y = drawSectionHeader(
    page, fonts,
    'PLAN D\'ACTIONS & CONFORMITE',
    'Actions requises et points de vigilance',
    sectionY, 52,
  ) - 12;

  // Collecter actions critiques et préventives
  interface ActionItem { entity: string; type: string; doc: string; date: string | null; days: number | null; status: StatusType }
  const critical: ActionItem[] = [];
  const preventive: ActionItem[] = [];
  const missing: Array<{ entity: string; type: string; fields: string[] }> = [];

  type VehicleDocDef = { key: DocumentConfig['key']; label: string; getVal: (v: VehicleCompliancePDF) => string | null | undefined };
  const ALL_VEHICLE_DOCS: VehicleDocDef[] = [
    { key: 'technical_control_expiry', label: 'Controle technique', getVal: (v) => v.technical_control_expiry },
    { key: 'tachy_control_expiry',     label: 'Tachygraphe',        getVal: (v) => v.tachy_control_expiry },
    { key: 'atp_expiry',               label: 'ATP',                getVal: (v) => v.atp_expiry },
    { key: 'insurance_expiry',         label: 'Assurance',          getVal: (v) => v.insurance_expiry },
    { key: 'adr_certificate_expiry',   label: 'Certificat ADR',     getVal: (v) => v.adr_certificate_expiry },
    { key: 'adr_equipment_expiry',     label: 'Equipement ADR',     getVal: (v) => v.adr_equipment_expiry },
  ];

  data.vehicles.forEach(v => {
    const missingFields: string[] = [];
    ALL_VEHICLE_DOCS.forEach(doc => {
      const val = doc.getVal(v) ?? null;
      const info = getDocStatus(val);
      if (info.status === 'expired') {
        critical.push({ entity: v.immatriculation, type: 'Vehicule', doc: doc.label, date: val, days: info.days, status: 'expired' });
      } else if (info.status === 'warning') {
        preventive.push({ entity: v.immatriculation, type: 'Vehicule', doc: doc.label, date: val, days: info.days, status: 'warning' });
      } else if (info.status === 'missing' && requiredVehicleDocKeys.has(doc.key)) {
        missingFields.push(doc.label);
      }
    });
    if (missingFields.length > 0) missing.push({ entity: v.immatriculation, type: 'Vehicule', fields: missingFields });
  });

  data.drivers.forEach(d => {
    const missingFields: string[] = [];
    const cqcDate = d.fcos_expiry && d.cqc_expiry
      ? (new Date(d.fcos_expiry) < new Date(d.cqc_expiry) ? d.fcos_expiry : d.cqc_expiry)
      : d.fcos_expiry || d.cqc_expiry || d.cqc_expiry_date || null;

    const driverDocs = [
      { label: 'Permis',          val: d.license_expiry,               required: true },
      { label: 'Visite medicale', val: d.medical_certificate_expiry,   required: true },
      { label: 'CQC / FCO',       val: cqcDate,                        required: true },
      { label: 'ADR',             val: d.adr_certificate_expiry,       required: requiresDriverADR },
    ];
    const name = `${d.first_name} ${d.last_name}`;
    driverDocs.forEach(doc => {
      const info = getDocStatus(doc.val);
      if (info.status === 'expired') {
        critical.push({ entity: name, type: 'Conducteur', doc: doc.label, date: doc.val, days: info.days, status: 'expired' });
      } else if (info.status === 'warning') {
        preventive.push({ entity: name, type: 'Conducteur', doc: doc.label, date: doc.val, days: info.days, status: 'warning' });
      } else if (info.status === 'missing' && doc.required) {
        missingFields.push(doc.label);
      }
    });
    if (missingFields.length > 0) missing.push({ entity: name, type: 'Conducteur', fields: missingFields });
  });

  critical.sort((a, b) => (a.days ?? -999) - (b.days ?? -999));
  preventive.sort((a, b) => (a.days ?? 999) - (b.days ?? 999));

  const ROW_H = 24;
  const BOTTOM = 110;

  // ── Sous-section 1: Actions critiques
  if (critical.length > 0) {
    if (y - 32 < BOTTOM) { y = PAGE_H - 60; }
    rect(page, MARGIN, y - 32, CONTENT_W + SIDEBAR_W - 5, 32, C.dangerBg);
    rect(page, MARGIN, y - 32, 4, 32, C.danger);
    txt(page, 'ACTIONS IMMEDIATES - Documents expires', MARGIN + 12, y - 12, 11, fonts.bold, C.dangerText);
    txt(page, `${critical.length} document(s) expire(s) - Action requise immediatement`, MARGIN + 12, y - 25, 8, fonts.regular, C.dangerText);
    y -= 36;

    // En-têtes mini-tableau — total = 535pt (PAGE_W 595 - 2×MARGIN 30)
    const actionColW = [65, 110, 130, 90, 140];
    const actionHdrs = ['TYPE', 'ENTITE', 'DOCUMENT', 'ECHEANCE', 'SITUATION'];
    let x = MARGIN;
    actionHdrs.forEach((h, i) => {
      rect(page, x, y - 20, actionColW[i], 20, C.danger);
      txtCell(page, h, x, y - 5, 7, fonts.bold, C.white, actionColW[i], 'center');
      x += actionColW[i];
    });
    y -= 20;

    critical.forEach((a, idx) => {
      if (y - ROW_H < BOTTOM) return;
      const bg = idx % 2 === 0 ? C.white : C.dangerBg;
      x = MARGIN;
      actionColW.forEach(w => { rect(page, x, y - ROW_H, w, ROW_H, bg, C.dangerBorder, 0.3); x += w; });
      x = MARGIN;
      txtCell(page, a.type, x, y - ROW_H / 2 - 3, 8, fonts.regular, C.dangerText, actionColW[0], 'center');
      x += actionColW[0];
      txtCell(page, nt(a.entity), x, y - ROW_H / 2 - 3, 8, fonts.bold, C.text, actionColW[1]);
      x += actionColW[1];
      txtCell(page, nt(a.doc), x, y - ROW_H / 2 - 3, 8, fonts.regular, C.text, actionColW[2]);
      x += actionColW[2];
      txtCell(page, a.date ? formatDateFR(a.date) : 'N/A', x, y - ROW_H / 2 - 3, 8, fonts.regular, C.dangerText, actionColW[3], 'center');
      x += actionColW[3];
      const daysStr = a.days !== null && a.days < 0 ? `Exp. depuis ${Math.abs(a.days)}j` : 'URGENT';
      // Badge centré dans la cellule
      const badgeW = actionColW[4] - 20;
      const badgeH = ROW_H - 8;
      const badgeX = x + 10;
      const badgeY = y - ROW_H + 4;
      rect(page, badgeX, badgeY, badgeW, badgeH, C.dangerBg, C.dangerBorder, 0.5);
      txtCell(page, daysStr, badgeX, badgeY + badgeH / 2 - 1, 8, fonts.bold, C.dangerText, badgeW, 'center');
      y -= ROW_H;
    });
    y -= 12;
  }

  // ── Sous-section 2: Actions préventives
  if (preventive.length > 0 && y - 32 > BOTTOM) {
    rect(page, MARGIN, y - 32, CONTENT_W + SIDEBAR_W - 5, 32, C.warningBg);
    rect(page, MARGIN, y - 32, 4, 32, C.warning);
    txt(page, 'ACTIONS PREVENTIVES - Renouvellements a planifier', MARGIN + 12, y - 12, 11, fonts.bold, C.warningText);
    txt(page, `${preventive.length} document(s) expirant dans les 60 jours`, MARGIN + 12, y - 25, 8, fonts.regular, C.warningText);
    y -= 36;

    // Total = 535pt (PAGE_W 595 - 2×MARGIN 30 = 535)
    const colW2 = [55, 80, 100, 75, 165, 60];
    const hdrs2 = ['TYPE', 'ENTITE', 'DOCUMENT', 'ECHEANCE', 'ACTION RECOMMANDEE', 'JOURS'];
    let x = MARGIN;
    hdrs2.forEach((h, i) => {
      rect(page, x, y - 20, colW2[i], 20, C.warning);
      txtCell(page, h, x, y - 5, 7, fonts.bold, C.white, colW2[i], 'center');
      x += colW2[i];
    });
    y -= 20;

    preventive.forEach((a, idx) => {
      if (y - ROW_H < BOTTOM) return;
      const bg = idx % 2 === 0 ? C.white : C.warningBg;
      x = MARGIN;
      colW2.forEach(w => { rect(page, x, y - ROW_H, w, ROW_H, bg, C.warningBorder, 0.3); x += w; });
      x = MARGIN;
      txtCell(page, a.type, x, y - ROW_H / 2 - 3, 8, fonts.regular, C.warningText, colW2[0], 'center');
      x += colW2[0];
      txtCell(page, nt(a.entity), x, y - ROW_H / 2 - 3, 8, fonts.bold, C.text, colW2[1]);
      x += colW2[1];
      txtCell(page, nt(a.doc), x, y - ROW_H / 2 - 3, 8, fonts.regular, C.text, colW2[2]);
      x += colW2[2];
      txtCell(page, a.date ? formatDateFR(a.date) : 'N/A', x, y - ROW_H / 2 - 3, 8, fonts.regular, C.text, colW2[3], 'center');
      x += colW2[3];
      txtCell(page, `Planifier renouvellement`, x, y - ROW_H / 2 - 3, 7, fonts.regular, C.text, colW2[4]);
      x += colW2[4];
      txtCell(page, a.days !== null ? `${a.days}j` : '-', x, y - ROW_H / 2 - 3, 8, fonts.bold, C.warningText, colW2[5], 'center');
      y -= ROW_H;
    });
    y -= 12;
  }

  // ── Sous-section 3: Données manquantes
  if (missing.length > 0 && y - 32 > BOTTOM) {
    rect(page, MARGIN, y - 28, CONTENT_W + SIDEBAR_W - 5, 28, C.infoBg);
    rect(page, MARGIN, y - 28, 4, 28, C.info);
    txt(page, 'DONNEES MANQUANTES - A completer dans FleetMaster Pro', MARGIN + 12, y - 10, 10, fonts.bold, C.infoText);
    txt(page, 'Connectez-vous sur app.fleetmaster.fr pour completer votre dossier', MARGIN + 12, y - 22, 8, fonts.regular, C.infoText);
    y -= 32;

    // Deux colonnes fixes: entité (180pt) | documents manquants (reste)
    const MISS_COL1 = 180;
    const MISS_ROW_H = 20;
    const MISS_TOTAL_W = PAGE_W - MARGIN * 2;
    const MISS_COL2 = MISS_TOTAL_W - MISS_COL1;
    missing.slice(0, 6).forEach((m, idx) => {
      if (y - MISS_ROW_H < BOTTOM) return;
      const bg = idx % 2 === 0 ? C.white : C.infoBg;
      rect(page, MARGIN, y - MISS_ROW_H, MISS_TOTAL_W, MISS_ROW_H, bg, C.border, 0.3);
      // Colonne 1 : type + immatriculation (tronqué si trop long)
      txtCell(page, `${m.type}  ${nt(m.entity)}`, MARGIN, y - MISS_ROW_H / 2 - 3, 8, fonts.bold, C.text, MISS_COL1, 'left', 8);
      // Séparateur vertical léger
      page.drawLine({ start: { x: MARGIN + MISS_COL1, y: y - MISS_ROW_H + 3 }, end: { x: MARGIN + MISS_COL1, y: y - 3 }, thickness: 0.3, color: C.border });
      // Colonne 2 : champs manquants
      txtCell(page, nt(m.fields.join(', ')), MARGIN + MISS_COL1, y - MISS_ROW_H / 2 - 3, 7, fonts.regular, C.neutral, MISS_COL2, 'left', 8);
      y -= MISS_ROW_H;
    });
    y -= 8;
  }

  // ── Bloc signature / validation (ancré à position fixe en bas de page)
  const SIG_Y = 108;  // pt depuis le bas
  const SIG_H = 56;
  const SIG_TOTAL_W = PAGE_W - MARGIN * 2;
  const SIG_LEFT_W = SIG_TOTAL_W / 2;
  const SIG_RIGHT_W = SIG_TOTAL_W - SIG_LEFT_W;
  const SIG_DIV_X = MARGIN + SIG_LEFT_W;

  rect(page, MARGIN, SIG_Y, SIG_TOTAL_W, SIG_H, C.neutralBg, C.border);
  // Séparateur vertical centré
  hLine(page, SIG_Y + SIG_H / 2, C.border, 0.5, SIG_DIV_X, SIG_DIV_X);
  page.drawLine({ start: { x: SIG_DIV_X, y: SIG_Y }, end: { x: SIG_DIV_X, y: SIG_Y + SIG_H }, thickness: 0.5, color: C.border });

  // Colonne gauche : informations document
  txt(page, 'Rapport valide par FleetMaster Pro', MARGIN + 10, SIG_Y + SIG_H - 14, 9, fonts.bold, C.primary);
  txt(page, `Genere le ${data.generatedAt.toLocaleDateString('fr-FR')}`, MARGIN + 10, SIG_Y + SIG_H - 28, 8, fonts.regular, C.text);
  txt(page, `Document ID : ${generateDocHash(data)}`, MARGIN + 10, SIG_Y + SIG_H - 42, 8, fonts.regular, C.neutral);

  // Colonne droite : zone signature
  const sigLineY = SIG_Y + 22;
  hLine(page, sigLineY, C.neutralLight, 0.5, SIG_DIV_X + 12, MARGIN + SIG_TOTAL_W - 12);
  txt(page, 'Signature & cachet entreprise', SIG_DIV_X, SIG_Y + 10, 8, fonts.regular, C.neutralLight, 'center', SIG_RIGHT_W);

  // ── Note légale (juste sous le bloc signature, BIEN AU-DESSUS du footer standard à y=38)
  // Le footer standard (drawPageFooter) dessine à y=38 (ligne) et y=24 (textes).
  // Cette zone est à y≈100→80 : aucun conflit.
  hLine(page, SIG_Y - 4, C.border, 0.3, MARGIN, PAGE_W - MARGIN);
  drawWrappedText(
    page,
    'Ce document a ete genere automatiquement par FleetMaster Pro. Il constitue un etat de conformite a la date de generation et ne saurait se substituer a un audit reglementaire professionnel.',
    MARGIN, SIG_Y - 9, PAGE_W - MARGIN * 2, 9, fonts.regular, 6, C.neutralLight,
  );

  return pn;
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────
export async function generateCompliancePDF(data: CompliancePDFData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(nt(`Rapport de Conformite - ${data.company.name}`));
  pdfDoc.setAuthor('FleetMaster Pro');
  pdfDoc.setSubject('Rapport de conformite reglementaire');
  pdfDoc.setCreationDate(data.generatedAt);
  pdfDoc.setKeywords(['conformite', 'DREAL', 'transport', 'flotte']);

  const fonts = await loadFonts(pdfDoc);

  const score = calculateGlobalScore(data);

  const activities = data.activities?.map(activity => ({ activity })) ?? [];
  const documentConfigs = getDocumentsForActivities(activities);

  // Page 1: Couverture
  const coverPage = newPage(pdfDoc);
  drawCoverPage(coverPage, fonts, data, score);

  let lastPage = 1;

  // Pages 2+: Véhicules
  lastPage = drawVehiclesPages(pdfDoc, fonts, data.vehicles, lastPage, documentConfigs);

  // Pages 3+: Conducteurs
  lastPage = drawDriversPages(pdfDoc, fonts, data.drivers, lastPage);

  // Page 4: Actions
  lastPage = drawActionsPage(pdfDoc, fonts, data, lastPage, documentConfigs);

  // Mettre à jour tous les footers avec le total de pages correct
  const pages = pdfDoc.getPages();
  const total = pages.length;
  pages.forEach((pg, idx) => {
    drawPageFooter(pg, fonts, idx + 1, total, data.generatedAt);
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes) as unknown as Buffer;
}
