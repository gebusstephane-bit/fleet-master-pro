/**
 * API Route pour la génération du Rapport de Conformité PDF
 * GET /api/reports/compliance?type=full|vehicles|drivers&period=current|30days|60days
 */

import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { generateCompliancePDF, CompliancePDFData } from '@/lib/export/compliance-pdf-generator';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Types de rapport supportés
type ReportType = 'full' | 'vehicles' | 'drivers';
type PeriodType = 'current' | '30days' | '60days';

// Vérifier l'accès (Admin, Directeur, Agent de parc uniquement)
const ALLOWED_ROLES = ['ADMIN', 'DIRECTEUR', 'AGENT_DE_PARC'];

/**
 * GET /api/reports/compliance
 * Génère un PDF de conformité réglementaire
 */
export async function GET(request: NextRequest) {
  try {
    // ─── Authentification ─────────────────────────────────────────────────────
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      logger.error('[API Compliance Report] Non authentifié', { error: authError?.message });
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    // ─── Récupérer le profil utilisateur ──────────────────────────────────────
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('company_id, role, first_name, last_name')
      .eq('id', user.id)
      .single();

    if (profileError || !profile?.company_id) {
      logger.error('[API Compliance Report] Profil non trouvé', { error: profileError?.message });
      return NextResponse.json({ error: 'Profil non trouvé' }, { status: 404 });
    }

    // ─── Vérifier les autorisations ───────────────────────────────────────────
    if (!ALLOWED_ROLES.includes(profile.role || '')) {
      logger.warn('[API Compliance Report] Accès refusé', { 
        userId: user.id, 
        role: profile.role,
        allowedRoles: ALLOWED_ROLES 
      });
      return NextResponse.json(
        { error: 'Accès refusé. Rôle requis : Admin, Directeur ou Agent de parc' },
        { status: 403 }
      );
    }

    const companyId = profile.company_id;

    // ─── Parse query params ───────────────────────────────────────────────────
    const { searchParams } = new URL(request.url);
    const type = (searchParams.get('type') as ReportType) || 'full';
    const period = (searchParams.get('period') as PeriodType) || 'current';

    // Validation des paramètres
    const validTypes: ReportType[] = ['full', 'vehicles', 'drivers'];
    const validPeriods: PeriodType[] = ['current', '30days', '60days'];

    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Type invalide. Valeurs acceptées: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    if (!validPeriods.includes(period)) {
      return NextResponse.json(
        { error: `Période invalide. Valeurs acceptées: ${validPeriods.join(', ')}` },
        { status: 400 }
      );
    }

    logger.info('[API Compliance Report] Génération du rapport', {
      userId: user.id,
      companyId,
      type,
      period,
    });

    // ─── Récupérer les informations de l'entreprise ───────────────────────────
    const adminClient = createAdminClient();
    const { data: company, error: companyError } = await adminClient
      .from('companies')
      .select('name, siret, address, city, postal_code')
      .eq('id', companyId)
      .single();

    if (companyError) {
      logger.error('[API Compliance Report] Erreur entreprise', { error: companyError.message });
      // On continue avec des valeurs par défaut
    }

    // ─── Récupérer les véhicules ──────────────────────────────────────────────
    let vehicles: CompliancePDFData['vehicles'] = [];
    if (type === 'full' || type === 'vehicles') {
      const { data: vehiclesData, error: vehiclesError } = await adminClient
        .from('vehicles')
        .select(`
          id,
          registration_number,
          brand,
          model,
          technical_control_expiry,
          tachy_control_expiry,
          atp_expiry,
          insurance_expiry
        `)
        .eq('company_id', companyId)
        .order('registration_number', { ascending: true });

      if (vehiclesError) {
        logger.error('[API Compliance Report] Erreur véhicules', { error: vehiclesError.message });
      } else {
        vehicles = (vehiclesData || []).map(v => ({
          id: v.id,
          immatriculation: v.registration_number,
          marque: v.brand || '',
          modele: v.model || '',
          technical_control_expiry: v.technical_control_expiry,
          tachy_control_expiry: v.tachy_control_expiry,
          atp_expiry: v.atp_expiry,
          insurance_expiry: v.insurance_expiry,
        }));
      }
    }

    // ─── Récupérer les conducteurs ────────────────────────────────────────────
    let drivers: CompliancePDFData['drivers'] = [];
    if (type === 'full' || type === 'drivers') {
      const { data: driversData, error: driversError } = await adminClient
        .from('drivers')
        .select(`
          id,
          first_name,
          last_name,
          license_type,
          license_expiry,
          driver_card_expiry,
          fcos_expiry,
          medical_certificate_expiry
        `)
        .eq('company_id', companyId)
        .order('last_name', { ascending: true });

      if (driversError) {
        logger.error('[API Compliance Report] Erreur conducteurs', { error: driversError.message });
      } else {
        drivers = (driversData || []).map(d => ({
          id: d.id,
          first_name: d.first_name,
          last_name: d.last_name,
          license_type: d.license_type,
          license_expiry: d.license_expiry,
          driver_card_expiry: d.driver_card_expiry,
          fcos_expiry: d.fcos_expiry,
          medical_certificate_expiry: d.medical_certificate_expiry,
        }));
      }
    }

    // ─── Générer le PDF ───────────────────────────────────────────────────────
    const pdfData: CompliancePDFData = {
      company: {
        name: company?.name || 'Entreprise',
        siret: company?.siret,
        address: company?.address,
        city: company?.city,
        postal_code: company?.postal_code,
      },
      vehicles,
      drivers,
      generatedAt: new Date(),
      period,
    };

    const pdfBuffer = await generateCompliancePDF(pdfData);

    // ─── Retourner le PDF ─────────────────────────────────────────────────────
    const filename = `conformite-flotte-${new Date().toISOString().split('T')[0]}.pdf`;

    // Convertir le Buffer en Uint8Array pour NextResponse
    const pdfUint8Array = new Uint8Array(pdfBuffer);

    return new NextResponse(pdfUint8Array, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
    });

  } catch (error: any) {
    logger.error('[API Compliance Report] Exception', {
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json(
      { error: 'Erreur interne du serveur lors de la génération du PDF' },
      { status: 500 }
    );
  }
}
