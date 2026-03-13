'use server';

import { z } from 'zod';
import { authActionClient } from '@/lib/safe-action';
import { createClient } from '@/lib/supabase/server';

export const getCriticalVehicles = authActionClient
  .schema(z.object({
    limit: z.number().int().min(1).max(10).default(3),
  }))
  .action(async ({ ctx, parsedInput }) => {
    const companyId = ctx.user.company_id;
    if (!companyId) return [];

    const { limit } = parsedInput as { limit: number };

    const supabase = await createClient();

    // ai_global_score columns not in generated types — use select('*') + cast
    const { data, error } = await (supabase as any)
      .from('vehicles')
      .select('id, registration_number, type, ai_global_score, ai_score_summary, ai_score_updated_at')
      .eq('company_id', companyId)
      .eq('status', 'ACTIF')
      .is('deleted_at', null)
      .not('ai_global_score', 'is', null)
      .order('ai_global_score', { ascending: true })
      .limit(limit);

    if (error || !data) return [];

    return (data as any[]).map((v: any) => ({
      id: v.id as string,
      registration_number: v.registration_number as string,
      type: v.type as string,
      ai_global_score: v.ai_global_score as number,
      ai_score_summary: (v.ai_score_summary as string) || null,
      ai_score_updated_at: (v.ai_score_updated_at as string) || null,
    }));
  });
