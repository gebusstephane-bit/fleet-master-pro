import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  status: z.string().optional(),
  priority: z.enum(['LOW', 'NORMAL', 'HIGH', 'CRITICAL']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(20),
});

/**
 * GET /api/v1/maintenance
 * List maintenance records with optional filters.
 */
export async function GET(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    vehicle_id: searchParams.get('vehicle_id') ?? undefined,
    status: searchParams.get('status') ?? undefined,
    priority: searchParams.get('priority') ?? undefined,
    page: searchParams.get('page') ?? 1,
    per_page: searchParams.get('per_page') ?? 20,
  });
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400, rateLimitHeaders);
  }

  const { vehicle_id, status, priority, page, per_page } = parsed.data;
  const offset = (page - 1) * per_page;
  const supabase = createAdminClient();

  const select = [
    'id', 'vehicle_id', 'type', 'description', 'priority', 'status',
    'requested_at', 'scheduled_date', 'completed_at', 'service_date',
    'estimated_cost', 'final_cost', 'garage_name', 'mileage_at_maintenance',
    'next_service_date', 'created_at', 'updated_at',
  ].join(', ');

  let query = supabase
    .from('maintenance_records')
    .select(select, { count: 'exact' })
    .eq('company_id', auth.companyId)
    .order('requested_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
  if (status) query = query.eq('status', status);
  if (priority) query = query.eq('priority', priority);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500, rateLimitHeaders);

  const total = count ?? 0;
  return apiSuccess(data ?? [], { total, page, per_page }, rateLimitHeaders);
}
