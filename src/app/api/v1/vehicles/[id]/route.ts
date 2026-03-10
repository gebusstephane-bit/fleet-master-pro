import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';

/**
 * GET /api/v1/vehicles/:id
 * Retrieve a single vehicle by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('vehicles')
    .select('*')
    .eq('id', params.id)
    .eq('company_id', auth.companyId)
    .single();

  if (error || !data) return apiError('Vehicle not found', 404, rateLimitHeaders);
  return apiSuccess(data, null, rateLimitHeaders);
}
