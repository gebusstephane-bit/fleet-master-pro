/**
 * Budget Guard — Contrôle des coûts IA par tenant et global
 * Empêche les dépassements de budget OpenAI (gpt-4o-mini)
 */

import { createAdminClient } from '@/lib/supabase/server';
import * as Sentry from '@sentry/nextjs';
import { logger } from '@/lib/logger';

// Tarifs gpt-4o-mini (€)
const COST_PER_INPUT_TOKEN = 0.00000015;
const COST_PER_OUTPUT_TOKEN = 0.0000006;

// Limites mensuelles par plan (appels/mois)
const PLAN_AI_LIMITS: Record<string, number> = {
  ESSENTIAL: 10,
  PRO: 200,
  UNLIMITED: 2000,
};

// Budget global mensuel (tous tenants confondus)
const GLOBAL_BUDGET_EUR = parseFloat(process.env.BUDGET_MENSUEL_EUR || '500');

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

/**
 * Vérifie si un tenant peut encore appeler l'IA ce mois.
 * Retourne false = bloquer silencieusement.
 */
export async function canCallAI(companyId: string, callType?: string): Promise<boolean> {
  try {
    const admin = createAdminClient();
    const month = currentMonth();

    // 1. Vérifier le budget global
    const globalOk = await checkGlobalBudget(admin);
    if (!globalOk) return false;

    // 2. Récupérer le plan du tenant
    const { data: sub } = await admin
      .from('subscriptions')
      .select('plan')
      .eq('company_id', companyId)
      .maybeSingle();

    const plan = (sub as any)?.plan?.toUpperCase() || 'ESSENTIAL';
    const limit = PLAN_AI_LIMITS[plan] ?? PLAN_AI_LIMITS.ESSENTIAL;

    // 3. Vérifier l'usage du tenant ce mois
    // @ts-ignore — table ai_usage_budget pas dans les types générés
    const { data: usage } = await admin
      .from('ai_usage_budget' as never)
      .select('calls_count')
      .eq('company_id', companyId)
      .eq('month', month)
      .maybeSingle();

    const currentCalls = (usage as any)?.calls_count || 0;

    if (currentCalls >= limit) {
      logger.info('[AI Budget] Tenant limit reached', {
        companyId: companyId.substring(0, 8),
        plan,
        calls: currentCalls,
        limit,
      });
      return false;
    }

    return true;
  } catch (error) {
    logger.error('[AI Budget] canCallAI check failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    // Fail-open: allow the call if budget check fails
    return true;
  }
}

/**
 * Incrémente les compteurs après un appel IA réussi.
 * UPSERT dans ai_usage_budget.
 */
export async function trackAICall(
  companyId: string,
  inputTokens: number,
  outputTokens: number
): Promise<void> {
  try {
    const admin = createAdminClient();
    const month = currentMonth();
    const cost = inputTokens * COST_PER_INPUT_TOKEN + outputTokens * COST_PER_OUTPUT_TOKEN;

    // UPSERT: increment if exists, insert if not
    // @ts-ignore — table ai_usage_budget pas dans les types générés
    const { data: existing } = await admin
      .from('ai_usage_budget' as never)
      .select('id, calls_count, tokens_used, estimated_cost_eur')
      .eq('company_id', companyId)
      .eq('month', month)
      .maybeSingle();

    if ((existing as any)?.id) {
      const ex = existing as any;
      // @ts-ignore
      await admin
        .from('ai_usage_budget' as never)
        .update({
          calls_count: ex.calls_count + 1,
          tokens_used: ex.tokens_used + inputTokens + outputTokens,
          estimated_cost_eur: parseFloat(ex.estimated_cost_eur) + cost,
          updated_at: new Date().toISOString(),
        } as never)
        .eq('id', ex.id);
    } else {
      // @ts-ignore
      await admin
        .from('ai_usage_budget' as never)
        .insert({
          company_id: companyId,
          month,
          calls_count: 1,
          tokens_used: inputTokens + outputTokens,
          estimated_cost_eur: cost,
        } as never);
    }
  } catch (error) {
    // Non-bloquant — ne pas fail si le tracking échoue
    logger.error('[AI Budget] trackAICall failed', {
      error: error instanceof Error ? error.message : String(error),
    });
  }
}

/**
 * Vérifie le budget global mensuel (tous tenants).
 * Si >80% → warning Sentry. Si >100% → bloquer.
 */
async function checkGlobalBudget(admin: ReturnType<typeof createAdminClient>): Promise<boolean> {
  try {
    const month = currentMonth();

    // @ts-ignore
    const { data: rows } = await admin
      .from('ai_usage_budget' as never)
      .select('estimated_cost_eur')
      .eq('month', month);

    const totalCost = (rows as any[] || []).reduce(
      (sum: number, r: any) => sum + parseFloat(r.estimated_cost_eur || 0),
      0
    );

    if (totalCost >= GLOBAL_BUDGET_EUR) {
      Sentry.captureMessage('[AI Budget] Global monthly budget EXCEEDED', {
        level: 'error',
        extra: { totalCost, budget: GLOBAL_BUDGET_EUR, month },
      });
      return false;
    }

    if (totalCost >= GLOBAL_BUDGET_EUR * 0.8) {
      Sentry.captureMessage('[AI Budget] Global budget >80%', {
        level: 'warning',
        extra: { totalCost, budget: GLOBAL_BUDGET_EUR, month },
      });
    }

    return true;
  } catch {
    // Fail-open
    return true;
  }
}

/**
 * Retourne le budget global du mois en cours (pour monitoring).
 */
export async function getGlobalBudget(): Promise<{
  totalCost: number;
  budgetLimit: number;
  percentUsed: number;
  blocked: boolean;
}> {
  try {
    const admin = createAdminClient();
    const month = currentMonth();

    // @ts-ignore
    const { data: rows } = await admin
      .from('ai_usage_budget' as never)
      .select('estimated_cost_eur')
      .eq('month', month);

    const totalCost = (rows as any[] || []).reduce(
      (sum: number, r: any) => sum + parseFloat(r.estimated_cost_eur || 0),
      0
    );

    return {
      totalCost: Math.round(totalCost * 100) / 100,
      budgetLimit: GLOBAL_BUDGET_EUR,
      percentUsed: Math.round((totalCost / GLOBAL_BUDGET_EUR) * 100),
      blocked: totalCost >= GLOBAL_BUDGET_EUR,
    };
  } catch {
    return {
      totalCost: 0,
      budgetLimit: GLOBAL_BUDGET_EUR,
      percentUsed: 0,
      blocked: false,
    };
  }
}
