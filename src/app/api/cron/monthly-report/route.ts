/**
 * CRON JOB — Rapport mensuel automatique par email
 *
 * Exécution : 1er de chaque mois à 8h00 (configuré dans vercel.json)
 * Planification: "0 8 1 * *"
 *
 * Sécurité : header x-cron-secret ou query param ?secret=
 *
 * Logique :
 *   1. Récupère toutes les entreprises avec monthly_report_enabled = true
 *   2. Vérifie l'anti-doublon (monthly_report_logs)
 *   3. Collecte les données du mois écoulé
 *   4. Envoie l'email aux destinataires configurés
 *   5. Loggue l'envoi
 *
 * Test local :
 *   GET http://localhost:3000/api/cron/monthly-report?secret=VOTRE_CRON_SECRET
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email';
import { logger } from '@/lib/logger';
import { monthlyReportTemplate, monthlyReportText } from '@/lib/email/templates/monthly-report';
import type { MonthlyFleetReport } from '@/lib/email/templates/monthly-report';

// ============================================================
// CONFIGURATION
// ============================================================

const CRON_SECRET = process.env.CRON_SECRET;

// Rôles qui reçoivent le rapport
const RECIPIENT_ROLES_MAP: Record<string, ('ADMIN' | 'DIRECTEUR')[]> = {
  'ADMIN': ['ADMIN'],
  'ADMIN_AND_DIRECTORS': ['ADMIN', 'DIRECTEUR'],
};

// ============================================================
// UTILITAIRES
// ============================================================

/**
 * Retourne la période précédente (mois écoulé)
 * Format: "Janvier 2026"
 */
function getPreviousMonthPeriod(): { period: string; yearMonth: string; startDate: string; endDate: string } {
  const now = new Date();
  const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  
  const months = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
  ];
  
  const period = `${months[prevMonth.getMonth()]} ${prevMonth.getFullYear()}`;
  const yearMonth = `${prevMonth.getFullYear()}-${String(prevMonth.getMonth() + 1).padStart(2, '0')}`;
  
  // Dates pour les requêtes SQL
  const startDate = `${yearMonth}-01`;
  const lastDay = new Date(prevMonth.getFullYear(), prevMonth.getMonth() + 1, 0).getDate();
  const endDate = `${yearMonth}-${String(lastDay).padStart(2, '0')}`;
  
  return { period, yearMonth, startDate, endDate };
}

/**
 * Calcule le score de conformité (0-100)
 */
function calculateComplianceScore(expired: number, expiringSoon: number, totalVehicles: number): number {
  if (totalVehicles === 0) return 100;
  
  // Pénalités
  const expiredPenalty = expired * 15; // -15 points par document expiré
  const expiringPenalty = expiringSoon * 5; // -5 points par document expirant
  
  const score = Math.max(0, 100 - expiredPenalty - expiringPenalty);
  return Math.round(score);
}

/**
 * Détermine le grade d'inspection (A+, A, B+, B, C, D)
 */
function calculateInspectionGrade(avgScore: number | null): string {
  if (!avgScore) return 'N/A';
  if (avgScore >= 95) return 'A+';
  if (avgScore >= 90) return 'A';
  if (avgScore >= 85) return 'B+';
  if (avgScore >= 80) return 'B';
  if (avgScore >= 70) return 'C';
  return 'D';
}

// ============================================================
// COLLECTE DES DONNÉES
// ============================================================

interface CompanyData {
  id: string;
  name: string;
  monthly_report_enabled: boolean;
  monthly_report_day: number;
  monthly_report_recipients: string;
}

async function collectReportData(
  supabase: ReturnType<typeof createAdminClient>,
  company: CompanyData,
  startDate: string,
  endDate: string
): Promise<MonthlyFleetReport | null> {
  try {
    // 1. Données de la flotte
    const { data: vehicles, error: vehiclesError } = await supabase
      .from('vehicles')
      .select('id, status, mileage')
      .eq('company_id', company.id);

    if (vehiclesError) throw vehiclesError;

    const totalVehicles = vehicles?.length || 0;
    const activeVehicles = vehicles?.filter(v => v.status === 'ACTIF').length || 0;
    const totalKm = vehicles?.reduce((sum, v) => sum + (v.mileage || 0), 0) || 0;

    // 2. Documents (conformité)
    const { data: expiredDocs } = await supabase
      .from('vehicles')
      .select('id')
      .eq('company_id', company.id)
      .or('technical_control_expiry.lt.' + endDate + ',tachy_control_expiry.lt.' + endDate + ',atp_expiry.lt.' + endDate);

    const { data: expiringDocs } = await supabase
      .from('vehicles')
      .select('id')
      .eq('company_id', company.id)
      .or(`and(technical_control_expiry.gte.${endDate},technical_control_expiry.lte.${getFutureDate(60)}),and(tachy_control_expiry.gte.${endDate},tachy_control_expiry.lte.${getFutureDate(60)}),and(atp_expiry.gte.${endDate},atp_expiry.lte.${getFutureDate(60)})`);

    const expired = expiredDocs?.length || 0;
    const expiringSoon = expiringDocs?.length || 0;
    const complianceScore = calculateComplianceScore(expired, expiringSoon, totalVehicles);

    // 3. Données carburant
    const { data: fuelData, error: fuelError } = await supabase
      .from('fuel_records')
      .select('*')
      .eq('company_id', company.id)
      .gte('date', startDate)
      .lte('date', endDate);

    if (fuelError) {
      logger.error(`[monthly-report] Fuel data error for ${company.name}:`, fuelError);
    }

    logger.info(`[monthly-report] Fuel records for ${company.name}:`, { 
      count: fuelData?.length || 0, 
      period: `${startDate} to ${endDate}` 
    });

    // La colonne est 'quantity_liters' dans ta base
    const totalLiters = (fuelData as any[])?.reduce((sum, r) => {
      const qty = parseFloat(r.quantity_liters) || parseFloat(r.quantity) || parseFloat(r.liters) || parseFloat(r.volume) || 0;
      return sum + qty;
    }, 0) || 0;
    
    const totalFuelCost = (fuelData as any[])?.reduce((sum, r) => {
      const cost = parseFloat(r.total_price) || parseFloat(r.price_total) || parseFloat(r.cost) || parseFloat(r.amount) || 0;
      return sum + cost;
    }, 0) || 0;
    
    // Calculer les km parcourus via les pleins (MAX - MIN mileage par véhicule)
    const kmByVehicle = new Map<string, { min: number; max: number }>();
    (fuelData as any[])?.forEach(f => {
      if (f.vehicle_id && f.mileage_at_fill) {
        const mileage = parseFloat(f.mileage_at_fill);
        if (!isNaN(mileage)) {
          const current = kmByVehicle.get(f.vehicle_id);
          if (!current) {
            kmByVehicle.set(f.vehicle_id, { min: mileage, max: mileage });
          } else {
            current.min = Math.min(current.min, mileage);
            current.max = Math.max(current.max, mileage);
          }
        }
      }
    });
    
    const totalKmDriven = Array.from(kmByVehicle.values()).reduce((sum, v) => sum + (v.max - v.min), 0);
    const avgConsumptionReal = totalKmDriven > 0 ? (totalLiters / totalKmDriven) * 100 : 0;
    const costPerKm = totalKmDriven > 0 ? totalFuelCost / totalKmDriven : 0;
    
    logger.info(`[monthly-report] Fuel totals for ${company.name}:`, { 
      totalLiters, 
      totalFuelCost,
      totalKmDriven,
      avgConsumptionReal: avgConsumptionReal.toFixed(1),
      costPerKm: costPerKm.toFixed(2),
      vehiclesWithData: kmByVehicle.size
    });
    
    // Consommation moyenne (simplifiée)
    const avgConsumption = totalKm > 0 ? (totalLiters / totalKm) * 100 : 0;
    
    // Anomalies carburant
    const { count: anomaliesCount } = await supabase
      .from('fuel_records')
      .select('*', { count: 'exact', head: true })
      .eq('company_id', company.id)
      .or('is_anomaly.eq.true,anomaly_score.gt.0')
      .gte('date', startDate)
      .lte('date', endDate);

    // 4. Maintenances - pas de service_date, utiliser requested_at ou created_at
    const { data: maintenances, error: maintError } = await supabase
      .from('maintenance_records')
      .select('id, vehicle_id, status, final_cost, cost, requested_at, created_at')
      .eq('company_id', company.id)
      .gte('requested_at', startDate)
      .lte('requested_at', endDate + 'T23:59:59');

    if (maintError) {
      logger.error(`[monthly-report] Maintenance data error for ${company.name}:`, maintError);
    }

    logger.info(`[monthly-report] Maintenance records for ${company.name}:`, { 
      count: maintenances?.length || 0, 
      period: `${startDate} to ${endDate}` 
    });

    const completedCount = (maintenances as any[])?.filter(m => m.status === 'completed' || m.status === 'TERMINEE' || m.status === 'COMPLETED').length || 0;
    const pendingCount = (maintenances as any[])?.filter(m => ['RDV_PRIS', 'VALIDEE_DIRECTEUR', 'EN_COURS', 'EN_ATTENTE', 'PLANIFIEE', 'PENDING'].includes(m.status)).length || 0;
    const totalMaintenanceCost = (maintenances as any[])?.reduce((sum, m) => sum + (parseFloat(m.final_cost) || parseFloat(m.cost) || parseFloat(m.estimated_cost) || 0), 0) || 0;
    
    logger.info(`[monthly-report] Maintenance totals for ${company.name}:`, { 
      completedCount, 
      pendingCount,
      totalMaintenanceCost,
      sample: maintenances?.[0]
    });

    // 5. Inspections
    const { data: inspections, error: inspectionsError } = await supabase
      .from('inspections')
      .select('*')
      .eq('company_id', company.id)
      .gte('created_at', startDate + 'T00:00:00')
      .lte('created_at', endDate + 'T23:59:59');

    if (inspectionsError) {
      logger.error(`[monthly-report] Inspections error for ${company.name}:`, inspectionsError);
    }

    // DEBUG: Vérifier TOUTES les inspections de l'entreprise
    const { data: allInspections } = await supabase
      .from('inspections')
      .select('id, created_at, status, company_id')
      .eq('company_id', company.id)
      .limit(5);

    // DEBUG: Requête sans filtre de date pour voir si ça marche
    const { data: allInspectionsNoDate } = await supabase
      .from('inspections')
      .select('*')
      .eq('company_id', company.id);

    logger.info(`[monthly-report] Inspections for ${company.name} (company_id: ${company.id}):`, { 
      count: inspections?.length || 0, 
      completed: (inspections as any[])?.filter(i => i.status === 'COMPLETED').length || 0,
      period: `${startDate} to ${endDate}`,
      allInspectionsCount: allInspectionsNoDate?.length || 0,
      allInspectionsSample: allInspectionsNoDate?.slice(0, 2).map(i => ({ 
        id: i.id, 
        created_at: i.created_at, 
        status: i.status 
      }))
    });

    const completedInspections = (inspections as any[])?.filter(i => i.status === 'completed' || i.status === 'COMPLETED' || i.status === 'CLOSED') || [];
    const avgInspectionScore = completedInspections.length 
      ? completedInspections.reduce((sum, i) => sum + (parseFloat(i.score) || parseFloat(i.global_score) || parseFloat(i.total_score) || 0), 0) / completedInspections.length 
      : null;
    
    const defectsCount = completedInspections.reduce((sum, i) => {
      const defects = i.defects;
      if (Array.isArray(defects)) return sum + defects.length;
      if (typeof defects === 'object' && defects !== null) return sum + Object.keys(defects).length;
      return sum;
    }, 0);
    
    const criticalDefects = completedInspections.reduce((sum, i) => {
      const defects = i.defects;
      if (Array.isArray(defects)) return sum + defects.filter((d: any) => d.severity === 'CRITICAL' || d.severity === 'critical').length;
      return sum;
    }, 0);

    // 6. Top 3 véhicules les plus coûteux
    const vehicleCosts = new Map<string, number>();
    
    // Coûts maintenance (UTILISER vehicle_id PAS id !)
    (maintenances as any[])?.forEach(m => {
      if (m.vehicle_id) {
        const current = vehicleCosts.get(m.vehicle_id) || 0;
        const cost = parseFloat(m.final_cost) || parseFloat(m.cost) || parseFloat(m.estimated_cost) || 0;
        vehicleCosts.set(m.vehicle_id, current + cost);
      }
    });
    
    // Coûts carburant
    (fuelData as any[])?.forEach(f => {
      if (f.vehicle_id) {
        const current = vehicleCosts.get(f.vehicle_id) || 0;
        const cost = parseFloat(f.price_total) || parseFloat(f.total_price) || parseFloat(f.cost) || 0;
        vehicleCosts.set(f.vehicle_id, current + cost);
      }
    });

    // Récupérer les infos des véhicules
    const topCostVehicleIds = Array.from(vehicleCosts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([id]) => id);

    // Logger pour debug
    logger.info(`[monthly-report] Vehicle costs for ${company.name}:`, {
      vehicleCount: vehicleCosts.size,
      topIds: topCostVehicleIds,
      costs: Array.from(vehicleCosts.entries()).map(([id, cost]) => ({ id, cost }))
    });

    let topCostVehicles: { vehicle: string; totalCost: number }[] = [];
    
    if (topCostVehicleIds.length > 0) {
      const { data: topVehicles, error: vehiclesError } = await supabase
        .from('vehicles')
        .select('id, registration_number, brand, model')
        .in('id', topCostVehicleIds);

      if (vehiclesError) {
        logger.error(`[monthly-report] Error fetching top vehicles for ${company.name}:`, vehiclesError);
      }

      topCostVehicles = topCostVehicleIds.map(id => {
        const vehicle = topVehicles?.find(v => v.id === id);
        const cost = vehicleCosts.get(id) || 0;
        return {
          vehicle: vehicle 
            ? `${vehicle.brand} ${vehicle.model} (${vehicle.registration_number})`
            : `Véhicule ${id.slice(0, 8)}...`,
          totalCost: cost,
        };
      }).filter(v => v.totalCost > 0); // Ne garder que ceux avec un coût > 0
    }

    // 7. Documents à renouveler le mois prochain
    const nextMonthStart = new Date();
    const nextMonthEnd = new Date(nextMonthStart.getFullYear(), nextMonthStart.getMonth() + 2, 0);
    
    const { data: docsToRenew } = await supabase
      .from('vehicles')
      .select('id, registration_number, brand, model, technical_control_expiry, tachy_control_expiry, atp_expiry')
      .eq('company_id', company.id)
      .or(`and(technical_control_expiry.gte.${formatDate(nextMonthStart)},technical_control_expiry.lte.${formatDate(nextMonthEnd)}),and(tachy_control_expiry.gte.${formatDate(nextMonthStart)},tachy_control_expiry.lte.${formatDate(nextMonthEnd)}),and(atp_expiry.gte.${formatDate(nextMonthStart)},atp_expiry.lte.${formatDate(nextMonthEnd)})`)
      .limit(10);

    const documentsToRenew = docsToRenew?.flatMap(v => {
      const docs = [];
      if (v.technical_control_expiry && isInNextMonth(v.technical_control_expiry)) {
        docs.push({
          vehicle: `${v.brand} ${v.model}`,
          documentType: 'Contrôle Technique',
          expiryDate: v.technical_control_expiry,
        });
      }
      if (v.tachy_control_expiry && isInNextMonth(v.tachy_control_expiry)) {
        docs.push({
          vehicle: `${v.brand} ${v.model}`,
          documentType: 'Tachygraphe',
          expiryDate: v.tachy_control_expiry,
        });
      }
      if (v.atp_expiry && isInNextMonth(v.atp_expiry)) {
        docs.push({
          vehicle: `${v.brand} ${v.model}`,
          documentType: 'Certificat ATP',
          expiryDate: v.atp_expiry,
        });
      }
      return docs;
    }) || [];

    // 8. Actions urgentes
    const urgentActions: string[] = [];
    if (expired > 0) urgentActions.push(`${expired} document(s) expiré(s) — action immédiate requise`);
    if (expiringSoon > 0) urgentActions.push(`${expiringSoon} document(s) à renouveler ce mois`);
    if (pendingCount > 0) urgentActions.push(`${pendingCount} maintenance(s) en cours — suivi nécessaire`);
    if (criticalDefects > 0) urgentActions.push(`${criticalDefects} défaut(s) critique(s) détecté(s) lors des inspections`);

    return {
      period: `${getPreviousMonthPeriod().period}`,
      company: { id: company.id, name: company.name },
      fleet: { totalVehicles, activeVehicles, totalKm, totalKmDriven },
      compliance: { score: complianceScore, expired, expiringSoon },
      fuel: { 
        totalLiters, 
        totalCost: totalFuelCost, 
        avgConsumption, 
        avgConsumptionReal: avgConsumptionReal > 0 ? avgConsumptionReal : undefined,
        costPerKm: costPerKm > 0 ? costPerKm : undefined,
        anomaliesCount: anomaliesCount || 0 
      },
      maintenance: { completedCount, totalCost: totalMaintenanceCost, pendingCount },
      inspections: {
        count: completedInspections.length,
        avgScore: calculateInspectionGrade(avgInspectionScore),
        defectsCount,
        criticalDefects,
      },
      topCostVehicles,
      urgentActions,
      documentsToRenew: documentsToRenew.slice(0, 5),
    };
  } catch (error) {
    logger.error(`[monthly-report] Error collecting data for company ${company.id}`, { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

// Helper pour formater les dates
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Helper pour obtenir une date future
function getFutureDate(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return formatDate(date);
}

// Helper pour vérifier si une date est dans le mois prochain
function isInNextMonth(dateStr: string): boolean {
  const date = new Date(dateStr);
  const now = new Date();
  const nextMonth = now.getMonth() + 1;
  const year = now.getFullYear() + (nextMonth > 11 ? 1 : 0);
  const month = nextMonth % 12;
  return date.getMonth() === month && date.getFullYear() === year;
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

export async function GET(request: NextRequest) {
  // ── Authentification ──────────────────────────────────────
  const secret =
    request.headers.get('x-cron-secret') ||
    request.nextUrl.searchParams.get('secret');

  if (!CRON_SECRET || secret !== CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminClient();
  const { period, yearMonth, startDate, endDate } = getPreviousMonthPeriod();

  const stats = {
    companies_processed: 0,
    companies_skipped: 0,
    emails_sent: 0,
    emails_failed: 0,
    already_sent: 0,
  };

  logger.info(`[monthly-report] Starting cron for period: ${period}`);

  try {
    // ── 1. Récupérer les entreprises actives ───────────────────
    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, monthly_report_enabled, monthly_report_day, monthly_report_recipients')
      .eq('monthly_report_enabled', true);

    if (companiesError) {
      logger.error('[monthly-report] Failed to fetch companies', { error: companiesError.message });
      return NextResponse.json({ error: 'Failed to fetch companies' }, { status: 500 });
    }

    if (!companies || companies.length === 0) {
      logger.info('[monthly-report] No companies with monthly report enabled');
      return NextResponse.json({ success: true, message: 'No companies to process', ...stats });
    }

    logger.info(`[monthly-report] Found ${companies.length} companies to process`);

    // ── 2. Traiter chaque entreprise ───────────────────────────
    for (const company of companies) {
      // Vérifier l'anti-doublon
      const { data: existingLog } = await supabase
        .from('monthly_report_logs')
        .select('id')
        .eq('company_id', company.id)
        .eq('period', yearMonth)
        .maybeSingle();

      if (existingLog) {
        logger.info(`[monthly-report] Already sent for ${company.name} — ${period}`);
        stats.already_sent++;
        continue;
      }

      // Collecter les données
      const reportData = await collectReportData(supabase, company as CompanyData, startDate, endDate);
      
      if (!reportData) {
        logger.error(`[monthly-report] Failed to collect data for ${company.name}`);
        stats.companies_skipped++;
        continue;
      }

      // ── 3. Récupérer les destinataires ───────────────────────
      const roles = RECIPIENT_ROLES_MAP[company.monthly_report_recipients || 'ADMIN'] || ['ADMIN'];
      
      const { data: recipients, error: recipientsError } = await supabase
        .from('profiles')
        .select('email, first_name, last_name')
        .eq('company_id', company.id)
        .in('role', roles)
        .eq('is_active', true)
        .not('email', 'is', null);

      if (recipientsError || !recipients || recipients.length === 0) {
        logger.warn(`[monthly-report] No recipients found for ${company.name}`);
        
        // Logger quand même pour éviter de réessayer
        await supabase.from('monthly_report_logs').insert({
          company_id: company.id,
          period: yearMonth,
          status: 'skipped',
          error_message: 'No recipients found',
          recipient_count: 0,
        });
        
        stats.companies_skipped++;
        continue;
      }

      // ── 4. Envoyer les emails ─────────────────────────────────
      const emailContent = monthlyReportTemplate(reportData);
      const emailText = monthlyReportText(reportData);
      
      let successCount = 0;
      let failCount = 0;

      for (const recipient of recipients) {
        try {
          await sendEmail({
            to: recipient.email,
            subject: `📊 Rapport Mensuel FleetMaster — ${period}`,
            html: emailContent,
            text: emailText,
          });
          
          successCount++;
          logger.info(`[monthly-report] Email sent to ${recipient.email} for ${company.name}`);
        } catch (error) {
          failCount++;
          logger.error(`[monthly-report] Failed to send to ${recipient.email}`, { 
            error: error instanceof Error ? error.message : String(error) 
          });
        }
      }

      // ── 5. Logger l'envoi ────────────────────────────────────
      await supabase.from('monthly_report_logs').insert({
        company_id: company.id,
        period: yearMonth,
        status: failCount > 0 && successCount === 0 ? 'failed' : 'sent',
        error_message: failCount > 0 ? `${failCount} emails failed` : null,
        recipient_count: successCount,
      });

      stats.emails_sent += successCount;
      stats.emails_failed += failCount;
      stats.companies_processed++;
    }

    logger.info('[monthly-report] Cron completed', stats);

    return NextResponse.json({
      success: true,
      timestamp: new Date().toISOString(),
      period,
      ...stats,
    });
  } catch (error) {
    logger.error('[monthly-report] Cron fatal error', { 
      error: error instanceof Error ? error.message : String(error) 
    });
    
    return NextResponse.json(
      { error: 'Cron job failed', details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
