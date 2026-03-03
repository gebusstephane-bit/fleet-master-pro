import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';
import { z } from 'zod';

const querySchema = z.object({
  status: z.enum(['active', 'inactive', 'on_leave', 'suspended', 'terminated']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(20),
});

/**
 * GET /api/v1/drivers
 * List drivers with pagination and optional status filter.
 */
export async function GET(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    status: searchParams.get('status') ?? undefined,
    page: searchParams.get('page') ?? 1,
    per_page: searchParams.get('per_page') ?? 20,
  });
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400, rateLimitHeaders);
  }

  const { status, page, per_page } = parsed.data;
  const offset = (page - 1) * per_page;
  const supabase = createAdminClient();

  // Exclude sensitive personal fields from the public API
  const select = [
    'id', 'company_id', 'first_name', 'last_name', 'email', 'phone',
    'status', 'license_type', 'license_expiry', 'hire_date',
    'current_vehicle_id', 'is_active', 'created_at', 'updated_at',
  ].join(', ');

  let query = supabase
    .from('drivers')
    .select(select, { count: 'exact' })
    .eq('company_id', auth.companyId)
    .order('last_name', { ascending: true })
    .range(offset, offset + per_page - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500, rateLimitHeaders);

  const total = count ?? 0;
  return apiSuccess(data ?? [], { total, page, per_page }, rateLimitHeaders);
}
