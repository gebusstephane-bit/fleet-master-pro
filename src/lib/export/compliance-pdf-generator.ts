/**
 * Compliance Report PDF Generator — pdf-lib (pure JS, no native deps)
 * Produces an official compliance report for DREAL audits
 * A4 Portrait format with professional layout
 */

import { PDFDocument, rgb, StandardFonts, RGB, PDFPage, PDFFont } from 'pdf-lib';
import { formatDateFR } from './formatters';

// ─── WinAnsi normalizer ───────────────────────────────────────────────────────
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

// ─── Color palette (print-friendly) ──────────────────────────────────────────
const C = {
  blue:       rgb(0.11, 0.38, 0.68),  // #1C61AD corporate blue
  blueDark:   rgb(0.07, 0.25, 0.50),  // #124080
  blueLight:  rgb(0.90, 0.93, 0.97),  // #E6EEF8
  white:      rgb(1, 1, 1),
  black:      rgb(0.09, 0.09, 0.11),  // #171719
  gray:       rgb(0.42, 0.42, 0.47),  // #6B6B78
  grayLight:  rgb(0.96, 0.96, 0.97),  // #F5F5F8
  border:     rgb(0.80, 0.80, 0.85),  // #CCCCD9
  green:      rgb(0.13, 0.77, 0.37),  // #22c55e
  red:        rgb(0.94, 0.27, 0.27),  // #ef4444
  orange:     rgb(0.98, 0.45, 0.09),  // #f97316
};

// ─── A4 Portrait dimensions ──────────────────────────────────────────────────
const PAGE_W = 595.28;
const PAGE_H = 841.89;
const MARGIN = 40;
const CONTENT_W = PAGE_W - MARGIN * 2;

// ─── Types ───────────────────────────────────────────────────────────────────
export interface VehicleCompliancePDF {
  id: string;
  immatriculation: string;
  marque: string;
  modele: string;
  technical_control_expiry: string | null;
  tachy_control_expiry: string | null;
  atp_expiry: string | null;
  insurance_expiry: string | null;
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
  };
  vehicles: VehicleCompliancePDF[];
  drivers: DriverCompliancePDF[];
  generatedAt: Date;
  period: 'current' | '30days' | '60days';
}

interface Fonts { regular: PDFFont; bold: PDFFont; }

// ─── Document status helper ──────────────────────────────────────────────────
function getDocStatus(expiry: string | null | undefined): { status: 'valid' | 'warning' | 'expired' | 'missing'; days: number | null; label: string } {
  if (!expiry) return { status: 'missing', days: null, label: 'Non renseigne' };
  
  const expiryDate = new Date(expiry);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  expiryDate.setHours(0, 0, 0, 0);
  
  const diffTime = expiryDate.getTime() - today.getTime();
  const days = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (days < 0) return { status: 'expired', days, label: `Expire depuis ${Math.abs(days)}j` };
  if (days <= 30) return { status: 'expired', days, label: `${days}j restants` };
  if (days <= 60) return { status: 'warning', days, label: `${days}j restants` };
  return { status: 'valid', days, label: `${days}j restants` };
}

function getStatusColor(status: 'valid' | 'warning' | 'expired' | 'missing'): RGB {
  switch (status) {
    case 'valid': return C.green;
    case 'warning': return C.orange;
    case 'expired': return C.red;
    default: return C.gray;
  }
}

// ─── Primitive helpers ───────────────────────────────────────────────────────
function newPage(pdfDoc: PDFDocument): PDFPage {
  const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_W, height: PAGE_H, color: C.white });
  return page;
}

function hLine(page: PDFPage, y: number, color: RGB = C.border, thickness = 0.5, x0 = MARGIN, x1 = PAGE_W - MARGIN) {
  page.drawLine({ start: { x: x0, y }, end: { x: x1, y }, thickness, color });
}

function rect(page: PDFPage, x: number, y: number, w: number, h: number, fill: RGB, border?: RGB) {
  page.drawRectangle({ x, y, width: w, height: h, color: fill, borderColor: border, borderWidth: border ? 0.5 : 0 });
}

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
  if (align === 'right') dx = x + maxWidth - tw - pad;
  page.drawText(s, { x: dx, y, size, font, color });
}

// ─── Calculate compliance score ──────────────────────────────────────────────
function calculateGlobalScore(data: CompliancePDFData): number {
  let totalDocs = 0;
  let validDocs = 0;
  
  // Vehicle documents
  data.vehicles.forEach(v => {
    ['technical_control_expiry', 'tachy_control_expiry', 'atp_expiry', 'insurance_expiry'].forEach(key => {
      const date = v[key as keyof VehicleCompliancePDF] as string | null;
      if (date) {
        totalDocs++;
        const status = getDocStatus(date);
        if (status.status === 'valid') validDocs++;
        else if (status.status === 'warning') validDocs += 0.5;
      }
    });
  });
  
  // Driver documents (format DREAL : uniquement les documents obligatoires)
  data.drivers.forEach(d => {
    // Calculer la date CQC/FCO fusionnée (la plus restrictive)
    const fcosDate = d.fcos_expiry;
    const cqcDate = d.cqc_expiry || d.cqc_expiry_date;
    let cqcFcoDate: string | null = null;
    if (fcosDate && cqcDate) {
      cqcFcoDate = new Date(fcosDate) < new Date(cqcDate) ? fcosDate : cqcDate;
    } else {
      cqcFcoDate = fcosDate || cqcDate || null;
    }
    
    ['license_expiry', 'medical_certificate_expiry', 'adr_certificate_expiry'].forEach(key => {
      const date = d[key as keyof DriverCompliancePDF] as string | null;
      if (date) {
        totalDocs++;
        const status = getDocStatus(date);
        if (status.status === 'valid') validDocs++;
        else if (status.status === 'warning') validDocs += 0.5;
      }
    });
    // CQC/FCO fusionné
    if (cqcFcoDate) {
      totalDocs++;
      const status = getDocStatus(cqcFcoDate);
      if (status.status === 'valid') validDocs++;
      else if (status.status === 'warning') validDocs += 0.5;
    }
  });
  
  return totalDocs > 0 ? Math.round((validDocs / totalDocs) * 100) : 100;
}

// ─── Calculate summary stats ─────────────────────────────────────────────────
function calculateSummary(data: CompliancePDFData) {
  let validVehicles = 0;
  let warningVehicles = 0;
  let expiredVehicles = 0;
  let validDrivers = 0;
  let warningDrivers = 0;
  let expiredDrivers = 0;
  
  data.vehicles.forEach(v => {
    const docs = [
      getDocStatus(v.technical_control_expiry).status,
      getDocStatus(v.tachy_control_expiry).status,
      getDocStatus(v.atp_expiry).status,
      getDocStatus(v.insurance_expiry).status,
    ].filter(s => s !== 'missing');
    
    if (docs.some(s => s === 'expired')) expiredVehicles++;
    else if (docs.some(s => s === 'warning')) warningVehicles++;
    else if (docs.length > 0) validVehicles++;
  });
  
  data.drivers.forEach(d => {
    const docs = [
      getDocStatus(d.license_expiry).status,
      getDocStatus(d.driver_card_expiry).status,
      getDocStatus(d.fcos_expiry).status,
      getDocStatus(d.medical_certificate_expiry).status,
    ].filter(s => s !== 'missing');
    
    if (docs.some(s => s === 'expired')) expiredDrivers++;
    else if (docs.some(s => s === 'warning')) warningDrivers++;
    else if (docs.length > 0) validDrivers++;
  });
  
  return {
    validVehicles, warningVehicles, expiredVehicles,
    validDrivers, warningDrivers, expiredDrivers,
  };
}

// ─── Draw page footer ────────────────────────────────────────────────────────
function drawFooter(page: PDFPage, fonts: Fonts, pageNum: number, totalPages: number) {
  hLine(page, 50, C.border);
  const footerText = nt('Document genere par FleetMaster Pro — www.fleetmaster.fr — Confidentiel');
  txt(page, footerText, MARGIN, 30, 8, fonts.regular, C.gray);
  const pageText = nt(`Page ${pageNum} / ${totalPages}`);
  const pw = fonts.regular.widthOfTextAtSize(pageText, 8);
  txt(page, pageText, PAGE_W - MARGIN - pw - 6, 30, 8, fonts.regular, C.gray, 'left', pw + 6);
}

// ─── PAGE 1: COVER & SUMMARY ─────────────────────────────────────────────────
function drawCoverAndSummary(page: PDFPage, fonts: Fonts, data: CompliancePDFData, score: number) {
  const { company, generatedAt, period } = data;
  
  // Top blue header
  rect(page, 0, PAGE_H - 100, PAGE_W, 100, C.blue);
  txt(page, 'FleetMaster Pro', MARGIN, PAGE_H - 45, 24, fonts.bold, C.white);
  txt(page, 'Systeme de gestion de flotte professionnelle', MARGIN, PAGE_H - 68, 10, fonts.regular, C.blueLight);
  
  // Official document badge
  const badge = 'DOCUMENT OFFICIEL';
  const badgeW = fonts.bold.widthOfTextAtSize(badge, 9) + 20;
  rect(page, PAGE_W - MARGIN - badgeW, PAGE_H - 65, badgeW, 24, C.blueDark);
  txt(page, badge, PAGE_W - MARGIN - badgeW + 2, PAGE_H - 55, 9, fonts.bold, C.white, 'center', badgeW - 4);
  
  // Main title
  const titleY = PAGE_H - 140;
  txt(page, 'RAPPORT DE CONFORMITE REGLEMENTAIRE', MARGIN, titleY, 20, fonts.bold, C.black);
  txt(page, 'Flotte de vehicules — Transport routier', MARGIN, titleY - 28, 12, fonts.regular, C.gray);
  rect(page, MARGIN, titleY - 40, 80, 3, C.blue);
  
  // Company info box
  const infoY = titleY - 70;
  rect(page, MARGIN, infoY - 110, CONTENT_W, 110, C.grayLight, C.border);
  rect(page, MARGIN, infoY - 110, 5, 110, C.blue);
  
  txt(page, 'ENTREPRISE', MARGIN + 14, infoY - 20, 8, fonts.bold, C.gray);
  txt(page, nt(company.name), MARGIN + 14, infoY - 40, 14, fonts.bold, C.black);
  
  if (company.siret) {
    txt(page, nt(`SIRET: ${company.siret}`), MARGIN + 14, infoY - 58, 9, fonts.regular, C.gray);
  }
  
  const address = [company.address, company.postal_code, company.city].filter(Boolean).join(' ');
  if (address) {
    txt(page, nt(address), MARGIN + 14, infoY - 74, 9, fonts.regular, C.gray);
  }
  
  // Report date and period
  const periodLabels: Record<string, string> = {
    current: 'Etat au',
    '30days': 'Echeances dans les 30 jours',
    '60days': 'Echeances dans les 60 jours',
  };
  
  txt(page, nt(`${periodLabels[period]} ${formatDateFR(generatedAt)}`), MARGIN + 14, infoY - 95, 9, fonts.regular, C.gray);
  
  // Score circle (simplified as a square with rounded corners representation)
  const scoreX = PAGE_W - MARGIN - 120;
  const scoreY = infoY - 20;
  rect(page, scoreX, scoreY - 80, 100, 80, C.blueLight, C.blue);
  txt(page, 'SCORE GLOBAL', scoreX + 2, scoreY - 20, 8, fonts.bold, C.gray, 'center', 96);
  txt(page, `${score}%`, scoreX + 2, scoreY - 55, 28, fonts.bold, score >= 80 ? C.green : score >= 50 ? C.orange : C.red, 'center', 96);
  
  // Summary section
  const summaryY = infoY - 140;
  txt(page, 'RECAPITULATIF EXECUTIF', MARGIN, summaryY, 12, fonts.bold, C.black);
  hLine(page, summaryY - 10, C.border);
  
  const summary = calculateSummary(data);
  
  // Summary table header
  const tableY = summaryY - 35;
  const col1W = 200;
  const col2W = 100;
  const col3W = 100;
  
  rect(page, MARGIN, tableY - 25, col1W, 25, C.blue);
  rect(page, MARGIN + col1W, tableY - 25, col2W, 25, C.blue);
  rect(page, MARGIN + col1W + col2W, tableY - 25, col3W, 25, C.blue);
  
  txt(page, 'STATUT', MARGIN + 10, tableY - 14, 8, fonts.bold, C.white);
  txt(page, 'VEHICULES', MARGIN + col1W + 10, tableY - 14, 8, fonts.bold, C.white, 'center', col2W - 20);
  txt(page, 'CONDUCTEURS', MARGIN + col1W + col2W + 10, tableY - 14, 8, fonts.bold, C.white, 'center', col3W - 20);
  
  // Summary rows
  const rows = [
    { label: 'Documents valides', v: summary.validVehicles, d: summary.validDrivers, color: C.green },
    { label: 'A renouveler (< 60j)', v: summary.warningVehicles, d: summary.warningDrivers, color: C.orange },
    { label: 'Expires ou manquants', v: summary.expiredVehicles, d: summary.expiredDrivers, color: C.red },
  ];
  
  let rowY = tableY - 25;
  rows.forEach((row, idx) => {
    const bg = idx % 2 === 0 ? C.white : C.grayLight;
    rect(page, MARGIN, rowY - 22, col1W, 22, bg, C.border);
    rect(page, MARGIN + col1W, rowY - 22, col2W, 22, bg, C.border);
    rect(page, MARGIN + col1W + col2W, rowY - 22, col3W, 22, bg, C.border);
    
    // Status indicator
    rect(page, MARGIN + 8, rowY - 14, 8, 8, row.color);
    txt(page, row.label, MARGIN + 22, rowY - 12, 9, fonts.regular, C.black);
    txt(page, String(row.v), MARGIN + col1W + 10, rowY - 12, 9, fonts.bold, C.black, 'center', col2W - 20);
    txt(page, String(row.d), MARGIN + col1W + col2W + 10, rowY - 12, 9, fonts.bold, C.black, 'center', col3W - 20);
    
    rowY -= 22;
  });
}

// ─── PAGE 2+: VEHICLES SECTION ───────────────────────────────────────────────
function drawVehiclesSection(
  pdfDoc: PDFDocument, fonts: Fonts, vehicles: VehicleCompliancePDF[], startPageNum: number
): number {
  if (vehicles.length === 0) return startPageNum;
  
  const ROW_H = 28;
  const HDR_H = 30;
  const BOTTOM = 60;
  
  let page = newPage(pdfDoc);
  let pn = startPageNum;
  
  // Header
  txt(page, 'ETAT DES VEHICULES', MARGIN, PAGE_H - 40, 14, fonts.bold, C.black);
  hLine(page, PAGE_H - 55, C.blue, 2);
  
  let y = PAGE_H - 80;
  
  // Column widths
  const colW = [
    120,  // Immatriculation
    90,   // CT
    90,   // Tachygraphe
    90,   // ATP
    85,   // Assurance
  ];
  
  // Table header
  const headers = ['VEHICULE', 'CONTROLE TECH.', 'TACHYGRAPHE', 'ATP', 'ASSURANCE'];
  let x = MARGIN;
  headers.forEach((h, i) => {
    rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
    txt(page, h, x + 8, y - HDR_H + 11, 7, fonts.bold, C.white);
    x += colW[i];
  });
  y -= HDR_H;
  
  vehicles.forEach((v, idx) => {
    if (y - ROW_H < BOTTOM) {
      drawFooter(page, fonts, pn, 0);
      page = newPage(pdfDoc);
      pn++;
      txt(page, 'ETAT DES VEHICULES (SUITE)', MARGIN, PAGE_H - 40, 14, fonts.bold, C.black);
      hLine(page, PAGE_H - 55, C.blue, 2);
      y = PAGE_H - 80;
      
      // Redraw headers
      x = MARGIN;
      headers.forEach((h, i) => {
        rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
        txt(page, h, x + 8, y - HDR_H + 11, 7, fonts.bold, C.white);
        x += colW[i];
      });
      y -= HDR_H;
    }
    
    const bg = idx % 2 === 0 ? C.white : C.grayLight;
    
    // Determine row color based on most critical document
    const statuses = [
      getDocStatus(v.technical_control_expiry).status,
      getDocStatus(v.tachy_control_expiry).status,
      getDocStatus(v.atp_expiry).status,
      getDocStatus(v.insurance_expiry).status,
    ];
    let rowColor = C.green;
    if (statuses.includes('expired')) rowColor = C.red;
    else if (statuses.includes('warning')) rowColor = C.orange;
    else if (statuses.includes('missing')) rowColor = C.gray;
    
    // Row background with light tint
    x = MARGIN;
    colW.forEach((w, i) => {
      rect(page, x, y - ROW_H, w, ROW_H, bg, C.border);
      x += w;
    });
    
    // Left status bar
    rect(page, MARGIN, y - ROW_H, 4, ROW_H, rowColor);
    
    // Vehicle info
    x = MARGIN + 8;
    txt(page, nt(v.immatriculation), x, y - 12, 9, fonts.bold, C.black);
    txt(page, nt(`${v.marque || ''} ${v.modele || ''}`.trim()), x, y - 22, 7, fonts.regular, C.gray);
    x += colW[0];
    
    // Documents
    const docs = [
      { date: v.technical_control_expiry, label: 'CT' },
      { date: v.tachy_control_expiry, label: 'Tachy' },
      { date: v.atp_expiry, label: 'ATP' },
      { date: v.insurance_expiry, label: 'Assur.' },
    ];
    
    docs.forEach((doc) => {
      const status = getDocStatus(doc.date);
      const color = getStatusColor(status.status);
      
      if (doc.date) {
        txt(page, formatDateFR(doc.date), x + 8, y - 12, 8, fonts.regular, C.black);
      } else {
        txt(page, 'N/A', x + 8, y - 12, 8, fonts.regular, C.gray);
      }
      
      // Status dot
      rect(page, x + 8, y - 22, 6, 6, color);
      txt(page, status.label, x + 18, y - 22, 6, fonts.regular, C.gray);
      
      x += colW[docs.indexOf(doc) + 1] || 90;
    });
    
    y -= ROW_H;
  });
  
  drawFooter(page, fonts, pn, 0);
  return pn;
}

// ─── PAGE: DRIVERS SECTION (FORMAT DREAL) ────────────────────────────────────
function drawDriversSection(
  pdfDoc: PDFDocument, fonts: Fonts, drivers: DriverCompliancePDF[], startPageNum: number
): number {
  if (drivers.length === 0) return startPageNum;
  
  const ROW_H = 28;
  const HDR_H = 30;
  const BOTTOM = 60;
  
  let page = newPage(pdfDoc);
  let pn = startPageNum + 1;
  
  // Header
  txt(page, 'ETAT DES CONDUCTEURS', MARGIN, PAGE_H - 40, 14, fonts.bold, C.black);
  hLine(page, PAGE_H - 55, C.blue, 2);
  
  let y = PAGE_H - 80;
  
  // Column widths (format DREAL : 5 colonnes + statut)
  const colW = [
    110,  // Nom
    90,   // Permis
    90,   // Visite medicale
    90,   // CQC (FCO)
    90,   // ADR
    70,   // Statut Global
  ];
  
  // Table header (format DREAL)
  const headers = ['CONDUCTEUR', 'PERMIS', 'VISITE MED.', 'CQC (FCO)', 'ADR', 'STATUT'];
  let x = MARGIN;
  headers.forEach((h, i) => {
    rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
    txt(page, h, x + 8, y - HDR_H + 11, 7, fonts.bold, C.white);
    x += colW[i];
  });
  y -= HDR_H;
  
  drivers.forEach((d, idx) => {
    if (y - ROW_H < BOTTOM) {
      drawFooter(page, fonts, pn, 0);
      page = newPage(pdfDoc);
      pn++;
      txt(page, 'ETAT DES CONDUCTEURS (SUITE)', MARGIN, PAGE_H - 40, 14, fonts.bold, C.black);
      hLine(page, PAGE_H - 55, C.blue, 2);
      y = PAGE_H - 80;
      
      // Redraw headers
      x = MARGIN;
      headers.forEach((h, i) => {
        rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
        txt(page, h, x + 8, y - HDR_H + 11, 7, fonts.bold, C.white);
        x += colW[i];
      });
      y -= HDR_H;
    }
    
    const bg = idx % 2 === 0 ? C.white : C.grayLight;
    
    // Calculer la date CQC/FCO fusionnée
    const fcosDate = d.fcos_expiry;
    const cqcDate = d.cqc_expiry || d.cqc_expiry_date;
    let cqcFcoDate: string | null = null;
    if (fcosDate && cqcDate) {
      cqcFcoDate = new Date(fcosDate) < new Date(cqcDate) ? fcosDate : cqcDate;
    } else {
      cqcFcoDate = fcosDate || cqcDate || null;
    }
    
    // Determine row color and global status (DREAL : binaire)
    const statuses = [
      getDocStatus(d.license_expiry).status,
      getDocStatus(d.medical_certificate_expiry).status,
      getDocStatus(cqcFcoDate).status,
      getDocStatus(d.adr_certificate_expiry).status,
    ];
    
    const hasExpired = statuses.includes('expired');
    const hasMissing = statuses.includes('missing');
    const isCompliant = !hasExpired && !hasMissing;
    
    let rowColor = C.green;
    if (hasExpired) rowColor = C.red;
    else if (hasMissing) rowColor = C.gray;
    
    // Row background
    x = MARGIN;
    colW.forEach((w, i) => {
      rect(page, x, y - ROW_H, w, ROW_H, bg, C.border);
      x += w;
    });
    
    // Left status bar
    rect(page, MARGIN, y - ROW_H, 4, ROW_H, rowColor);
    
    // Driver info
    x = MARGIN + 8;
    txt(page, nt(`${d.first_name} ${d.last_name}`), x, y - 12, 9, fonts.bold, C.black);
    txt(page, 'Conducteur', x, y - 22, 7, fonts.regular, C.gray);
    x += colW[0];
    
    // Documents (format DREAL)
    const docs = [
      { date: d.license_expiry, label: 'Permis', type: d.license_type },
      { date: d.medical_certificate_expiry, label: 'Visite' },
      { date: cqcFcoDate, label: 'CQC/FCO' },
      { date: d.adr_certificate_expiry, label: 'ADR' },
    ];
    
    docs.forEach((doc) => {
      const status = getDocStatus(doc.date);
      const color = getStatusColor(status.status);
      
      if (doc.date) {
        txt(page, formatDateFR(doc.date), x + 8, y - 12, 8, fonts.regular, C.black);
      } else {
        txt(page, 'N/A', x + 8, y - 12, 8, fonts.regular, C.gray);
      }
      
      // Status dot
      rect(page, x + 8, y - 22, 6, 6, color);
      
      let label = status.label;
      if ('type' in doc && doc.type) {
        label = doc.type;
      }
      txt(page, label, x + 18, y - 22, 6, fonts.regular, C.gray);
      
      x += colW[docs.indexOf(doc) + 1] || 90;
    });
    
    // Statut Global (DREAL : binaire)
    const statusBg = isCompliant ? C.green : C.red;
    rect(page, x + 8, y - 20, 54, 16, statusBg);
    txt(page, isCompliant ? 'CONFORME' : 'NON CONFORME', x + 12, y - 14, 6, fonts.bold, C.white);
    
    y -= ROW_H;
  });
  
  drawFooter(page, fonts, pn, 0);
  return pn;
}

// ─── PAGE: RECOMMENDED ACTIONS ───────────────────────────────────────────────
function drawActionsSection(
  pdfDoc: PDFDocument, fonts: Fonts, data: CompliancePDFData, startPageNum: number
): number {
  // Collect all urgent actions
  const actions: Array<{ type: 'vehicle' | 'driver'; name: string; doc: string; date: string | null; urgency: number }> = [];
  
  data.vehicles.forEach(v => {
    const docs = [
      { key: 'technical_control_expiry', label: 'Controle technique' },
      { key: 'tachy_control_expiry', label: 'Tachygraphe' },
      { key: 'atp_expiry', label: 'ATP' },
      { key: 'insurance_expiry', label: 'Assurance' },
    ];
    
    docs.forEach(doc => {
      const date = v[doc.key as keyof VehicleCompliancePDF] as string | null;
      const status = getDocStatus(date);
      if (status.status === 'expired' || status.status === 'warning') {
        actions.push({
          type: 'vehicle',
          name: v.immatriculation,
          doc: doc.label,
          date,
          urgency: status.days !== null ? status.days : -999,
        });
      }
    });
  });
  
  data.drivers.forEach(d => {
    // Calculer la date CQC/FCO fusionnée
    const fcosDate = d.fcos_expiry;
    const cqcDate = d.cqc_expiry || d.cqc_expiry_date;
    let cqcFcoDate: string | null = null;
    if (fcosDate && cqcDate) {
      cqcFcoDate = new Date(fcosDate) < new Date(cqcDate) ? fcosDate : cqcDate;
    } else {
      cqcFcoDate = fcosDate || cqcDate || null;
    }
    
    const docs = [
      { key: 'license_expiry', label: 'Permis', date: d.license_expiry },
      { key: 'medical_certificate_expiry', label: 'Visite medicale', date: d.medical_certificate_expiry },
      { key: 'cqc_fco', label: 'CQC (FCO)', date: cqcFcoDate },
      { key: 'adr_certificate_expiry', label: 'ADR', date: d.adr_certificate_expiry },
    ];
    
    docs.forEach(doc => {
      const status = getDocStatus(doc.date);
      if (status.status === 'expired' || status.status === 'warning') {
        actions.push({
          type: 'driver',
          name: `${d.first_name} ${d.last_name}`,
          doc: doc.label,
          date: doc.date,
          urgency: status.days !== null ? status.days : -999,
        });
      }
    });
  });
  
  // Sort by urgency (most urgent first)
  actions.sort((a, b) => a.urgency - b.urgency);
  
  if (actions.length === 0) {
    // Create empty actions page with "all good" message
    const page = newPage(pdfDoc);
    txt(page, 'ACTIONS RECOMMANDEES', MARGIN, PAGE_H - 40, 14, fonts.bold, C.black);
    hLine(page, PAGE_H - 55, C.blue, 2);
    
    rect(page, MARGIN, PAGE_H - 150, CONTENT_W, 60, C.green, C.green);
    txt(page, '✓', MARGIN + 20, PAGE_H - 115, 24, fonts.bold, C.white);
    txt(page, 'Aucune action urgente requise', MARGIN + 50, PAGE_H - 115, 12, fonts.bold, C.white);
    txt(page, 'Tous les documents sont a jour pour les 60 prochains jours.', MARGIN + 50, PAGE_H - 135, 9, fonts.regular, C.white);
    
    drawFooter(page, fonts, startPageNum + 1, 0);
    return startPageNum + 1;
  }
  
  const ROW_H = 26;
  const HDR_H = 28;
  const BOTTOM = 60;
  
  let page = newPage(pdfDoc);
  let pn = startPageNum + 1;
  
  // Header
  txt(page, 'ACTIONS RECOMMANDEES', MARGIN, PAGE_H - 40, 14, fonts.bold, C.black);
  hLine(page, PAGE_H - 55, C.blue, 2);
  txt(page, `Documents a renouveler dans les 60 jours (${actions.length} action${actions.length > 1 ? 's' : ''})`, MARGIN, PAGE_H - 70, 9, fonts.regular, C.gray);
  
  let y = PAGE_H - 100;
  
  // Column widths
  const colW = [
    30,   // Urgence indicator
    140,  // Nom
    140,  // Document
    100,  // Echeance
    95,   // Statut
  ];
  
  // Table header
  const headers = ['', 'CONCERNE', 'DOCUMENT', 'ECHEANCE', 'STATUT'];
  let x = MARGIN;
  headers.forEach((h, i) => {
    if (i === 0) {
      rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
    } else {
      rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
      txt(page, h, x + 8, y - HDR_H + 10, 7, fonts.bold, C.white);
    }
    x += colW[i];
  });
  y -= HDR_H;
  
  actions.forEach((action, idx) => {
    if (y - ROW_H < BOTTOM) {
      drawFooter(page, fonts, pn, 0);
      page = newPage(pdfDoc);
      pn++;
      txt(page, 'ACTIONS RECOMMANDEES (SUITE)', MARGIN, PAGE_H - 40, 14, fonts.bold, C.black);
      hLine(page, PAGE_H - 55, C.blue, 2);
      y = PAGE_H - 80;
      
      // Redraw headers
      x = MARGIN;
      headers.forEach((h, i) => {
        if (i > 0) {
          rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
          txt(page, h, x + 8, y - HDR_H + 10, 7, fonts.bold, C.white);
        } else {
          rect(page, x, y - HDR_H, colW[i], HDR_H, C.blue);
        }
        x += colW[i];
      });
      y -= HDR_H;
    }
    
    const bg = idx % 2 === 0 ? C.white : C.grayLight;
    const status = getDocStatus(action.date);
    const color = getStatusColor(status.status);
    
    // Row background
    x = MARGIN;
    colW.forEach((w, i) => {
      rect(page, x, y - ROW_H, w, ROW_H, bg, C.border);
      x += w;
    });
    
    // Urgency number
    x = MARGIN;
    rect(page, x, y - ROW_H, colW[0], ROW_H, color);
    const num = idx + 1;
    txt(page, String(num), x + 2, y - 16, 10, fonts.bold, C.white, 'center', colW[0] - 4);
    x += colW[0];
    
    // Name
    txt(page, nt(action.name), x + 8, y - 10, 9, fonts.bold, C.black);
    txt(page, action.type === 'vehicle' ? 'Vehicule' : 'Conducteur', x + 8, y - 19, 7, fonts.regular, C.gray);
    x += colW[1];
    
    // Document
    txt(page, nt(action.doc), x + 8, y - 14, 9, fonts.regular, C.black);
    x += colW[2];
    
    // Date
    txt(page, action.date ? formatDateFR(action.date) : 'N/A', x + 8, y - 14, 8, fonts.regular, C.black);
    x += colW[3];
    
    // Status badge
    const statusLabel = status.status === 'expired' ? 'URGENT' : 'A RENOUVELER';
    rect(page, x + 8, y - 20, 80, 16, color);
    txt(page, statusLabel, x + 12, y - 14, 7, fonts.bold, C.white);
    
    y -= ROW_H;
  });
  
  drawFooter(page, fonts, pn, 0);
  return pn;
}

// ─── MAIN EXPORT ─────────────────────────────────────────────────────────────
export async function generateCompliancePDF(data: CompliancePDFData): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  pdfDoc.setTitle(nt(`Rapport de Conformite - ${data.company.name}`));
  pdfDoc.setAuthor('FleetMaster Pro');
  pdfDoc.setSubject('Rapport de conformite reglementaire');
  pdfDoc.setCreationDate(data.generatedAt);
  pdfDoc.setKeywords(['conformite', 'DREAL', 'transport', 'flotte']);
  
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fonts: Fonts = { regular, bold };
  
  // Calculate global score
  const score = calculateGlobalScore(data);
  
  // Page 1: Cover + Summary
  const coverPage = newPage(pdfDoc);
  drawCoverAndSummary(coverPage, fonts, data, score);
  
  // Count pages for footer
  let lastPage = 1;
  
  // Page 2+: Vehicles
  lastPage = drawVehiclesSection(pdfDoc, fonts, data.vehicles, lastPage);
  
  // Page: Drivers
  lastPage = drawDriversSection(pdfDoc, fonts, data.drivers, lastPage);
  
  // Page: Actions
  lastPage = drawActionsSection(pdfDoc, fonts, data, lastPage);
  
  // Update all footers with correct page count
  const pages = pdfDoc.getPages();
  pages.forEach((page, idx) => {
    drawFooter(page, fonts, idx + 1, pages.length);
  });
  
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes) as unknown as Buffer;
}
