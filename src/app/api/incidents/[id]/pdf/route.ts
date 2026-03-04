/**
 * GET /api/incidents/[id]/pdf
 * Génère un rapport de sinistre PDF avec pdf-lib
 */

import { NextRequest, NextResponse } from 'next/server';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

// Type pour l'incident avec jointures
type IncidentWithRelations = Database['public']['Tables']['incidents']['Row'] & {
  vehicles: { registration_number: string; brand: string; model: string; type: string } | null;
  drivers: { first_name: string; last_name: string; phone: string | null; license_number: string } | null;
  incident_documents: { file_name: string | null; document_type: string | null; created_at: string }[];
};

// WinAnsi normalizer (obligatoire avec pdf-lib)
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

const INCIDENT_TYPE_LABELS: Record<string, string> = {
  'accident_materiel': 'Accident materiel',
  'accident_corporel': 'Accident corporel',
  vol: 'Vol',
  vandalisme: 'Vandalisme',
  incendie: 'Incendie',
  panne_grave: 'Panne grave',
  autre: 'Autre',
};

const SEVERITY_LABELS: Record<string, string> = {
  mineur: 'Mineur',
  moyen: 'Moyen',
  grave: 'Grave',
  tres_grave: 'Tres grave',
};

const CLAIM_STATUS_LABELS: Record<string, string> = {
  'non_declare': 'Non declare',
  'declare': 'Declare',
  'en_instruction': 'En instruction',
  'accepte': 'Accepte',
  'refuse': 'Refuse',
  'regle': 'Regle',
};

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();

    // Auth check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // Fetch incident
    const { data: incident, error } = await supabase
      .from('incidents')
      .select(`
        *,
        vehicles (registration_number, brand, model, type),
        drivers (first_name, last_name, phone, license_number),
        incident_documents (file_name, document_type, created_at)
      `)
      .eq('id', params.id)
      .single();

    if (error || !incident) {
      return NextResponse.json({ error: 'Sinistre introuvable' }, { status: 404 });
    }

    // ---- Génération PDF ----
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const W = 595.28; // A4 width
    const H = 841.89; // A4 height
    const margin = 40;
    const colRight = W / 2 + 10;

    const page = pdfDoc.addPage([W, H]);

    // Colors
    const cBlue = rgb(0.11, 0.38, 0.68);
    const cGray = rgb(0.35, 0.35, 0.35);
    const cLightGray = rgb(0.92, 0.92, 0.92);
    const cDark = rgb(0.1, 0.1, 0.1);
    const cRed = rgb(0.8, 0.1, 0.1);

    let y = H - 40;

    // ---- En-tête ----
    page.drawRectangle({ x: 0, y: H - 70, width: W, height: 70, color: cBlue });
    page.drawText('RAPPORT DE SINISTRE', { x: margin, y: H - 30, size: 16, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('FleetMaster Pro', { x: margin, y: H - 48, size: 10, font, color: rgb(0.8, 0.9, 1) });

    // Numéro de sinistre
    const incidentNum = nt(incident.incident_number ?? `INC-${params.id.slice(0, 8).toUpperCase()}`);
    page.drawText(incidentNum, {
      x: W - margin - fontBold.widthOfTextAtSize(incidentNum, 14),
      y: H - 42,
      size: 14,
      font: fontBold,
      color: rgb(1, 1, 1),
    });

    y = H - 90;

    // ---- Statut ----
    const statusColor = incident.status === 'clôturé' ? rgb(0.1, 0.6, 0.3)
      : incident.status === 'en_cours' ? rgb(0.9, 0.6, 0.1)
      : cBlue;
    page.drawRectangle({ x: margin, y: y - 4, width: 80, height: 18, color: statusColor, opacity: 0.15 });
    page.drawText(nt(incident.status?.toUpperCase() ?? 'OUVERT'), {
      x: margin + 4, y: y, size: 9, font: fontBold, color: statusColor,
    });

    y -= 30;

    // ---- Section helper ----
    const drawSection = (title: string, yPos: number) => {
      page.drawRectangle({ x: margin, y: yPos - 4, width: W - margin * 2, height: 18, color: cLightGray });
      page.drawText(title, { x: margin + 6, y: yPos, size: 10, font: fontBold, color: cBlue });
      return yPos - 22;
    };

    const drawRow = (label: string, value: string, x: number, yPos: number, maxWidth = 220) => {
      page.drawText(nt(label) + ' :', { x, y: yPos, size: 9, font, color: cGray });
      page.drawText(nt(value) || '-', { x: x + 100, y: yPos, size: 9, font: fontBold, color: cDark });
      return yPos - 16;
    };

    // ---- INCIDENT ----
    y = drawSection('DETAILS DE L\'INCIDENT', y);

    const dateStr = incident.incident_date
      ? new Date(incident.incident_date).toLocaleDateString('fr-FR', {
          day: '2-digit', month: 'long', year: 'numeric',
          hour: '2-digit', minute: '2-digit'
        })
      : '-';

    y = drawRow('Date', dateStr, margin, y);
    y = drawRow('Type', INCIDENT_TYPE_LABELS[incident.incident_type?.replace(/é/g, 'e').replace(/è/g, 'e') ?? ''] ?? nt(incident.incident_type), margin, y);
    y = drawRow('Gravite', SEVERITY_LABELS[incident.severity?.replace(/_/g, '_') ?? ''] ?? nt(incident.severity ?? '-'), margin, y);
    y = drawRow('Lieu', nt(incident.location_description ?? '-'), margin, y);

    if (incident.circumstances) {
      page.drawText('Circonstances :', { x: margin, y, size: 9, font, color: cGray });
      y -= 14;
      // Découper le texte long en lignes
      const words = nt(incident.circumstances).split(' ');
      let line = '';
      for (const word of words) {
        if (font.widthOfTextAtSize(line + ' ' + word, 9) > W - margin * 2 - 10) {
          page.drawText(line, { x: margin + 10, y, size: 9, font, color: cDark });
          y -= 13;
          line = word;
        } else {
          line = line ? line + ' ' + word : word;
        }
      }
      if (line) {
        page.drawText(line, { x: margin + 10, y, size: 9, font, color: cDark });
        y -= 13;
      }
    }

    y -= 10;

    // ---- VEHICULE & CONDUCTEUR ----
    y = drawSection('VEHICULE & CONDUCTEUR', y);

    if (incident.vehicles) {
      y = drawRow('Immatriculation', nt(incident.vehicles.registration_number), margin, y);
      y = drawRow('Vehicule', nt(`${incident.vehicles.brand} ${incident.vehicles.model}`), margin, y);
    }
    if (incident.drivers) {
      y = drawRow('Conducteur', nt(`${incident.drivers.first_name} ${incident.drivers.last_name}`), margin, y);
      if (incident.drivers.phone) {
        y = drawRow('Telephone', nt(incident.drivers.phone), margin, y);
      }
    }

    // Tiers impliqué
    if (incident.third_party_involved && incident.third_party_info) {
      y -= 6;
      page.drawText('Tiers implique', { x: margin, y, size: 9, font: fontBold, color: cRed });
      y -= 14;
      const tp = incident.third_party_info as any;
      if (tp.name) y = drawRow('Nom tiers', nt(tp.name), margin + 10, y);
      if (tp.plate) y = drawRow('Plaque tiers', nt(tp.plate), margin + 10, y);
      if (tp.insurance) y = drawRow('Assurance tiers', nt(tp.insurance), margin + 10, y);
    }

    y -= 10;

    // ---- ASSURANCE ----
    y = drawSection('SUIVI ASSURANCE', y);

    y = drawRow('Compagnie', nt(incident.insurance_company ?? '-'), margin, y);
    y = drawRow('N° de police', nt(incident.insurance_policy_number ?? '-'), margin, y);
    y = drawRow('N° sinistre', nt(incident.claim_number ?? '-'), margin, y);
    y = drawRow('Date declaration',
      incident.claim_date ? new Date(incident.claim_date).toLocaleDateString('fr-FR') : '-',
      margin, y);
    y = drawRow('Statut', CLAIM_STATUS_LABELS[incident.claim_status?.replace(/[éèê]/g, 'e').replace(/[àâ]/g, 'a')] ?? nt(incident.claim_status ?? '-'), margin, y);

    if (incident.estimated_damage != null) {
      y = drawRow('Dommages estimes',
        incident.estimated_damage.toLocaleString('fr-FR') + ' EUR',
        margin, y);
    }
    if (incident.final_settlement != null) {
      y = drawRow('Reglement final',
        incident.final_settlement.toLocaleString('fr-FR') + ' EUR',
        margin, y);
    }

    y -= 10;

    // ---- DOCUMENTS ----
    const incidentTyped = incident as unknown as IncidentWithRelations;
    if (incidentTyped.incident_documents?.length > 0) {
      y = drawSection('DOCUMENTS JOINTS', y);
      for (const doc of incidentTyped.incident_documents) {
        page.drawText('  - ' + nt(doc.file_name ?? 'Document') + (doc.document_type ? ` (${nt(doc.document_type)})` : ''),
          { x: margin + 10, y, size: 9, font, color: cGray });
        y -= 13;
      }
    }

    // ---- Notes ----
    if (incident.notes) {
      y -= 10;
      y = drawSection('NOTES DE SUIVI', y);
      const noteWords = nt(incident.notes).split(' ');
      let noteLine = '';
      for (const word of noteWords) {
        if (font.widthOfTextAtSize(noteLine + ' ' + word, 9) > W - margin * 2 - 10) {
          page.drawText(noteLine, { x: margin + 10, y, size: 9, font, color: cDark });
          y -= 13;
          noteLine = word;
        } else {
          noteLine = noteLine ? noteLine + ' ' + word : word;
        }
      }
      if (noteLine) {
        page.drawText(noteLine, { x: margin + 10, y, size: 9, font, color: cDark });
      }
    }

    // ---- Pied de page ----
    page.drawLine({ start: { x: margin, y: 40 }, end: { x: W - margin, y: 40 }, thickness: 0.5, color: cLightGray });
    const generatedOn = `Document genere le ${new Date().toLocaleDateString('fr-FR')} — FleetMaster Pro`;
    page.drawText(generatedOn, { x: margin, y: 26, size: 8, font, color: cGray });

    const pdfBytes = await pdfDoc.save();

    return new NextResponse(pdfBytes as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="sinistre-${nt(incident.incident_number ?? params.id)}.pdf"`,
        'Cache-Control': 'no-store',
      },
    });
  } catch (err) {
    console.error('[PDF incident]', err);
    return NextResponse.json({ error: 'Erreur génération PDF' }, { status: 500 });
  }
}
