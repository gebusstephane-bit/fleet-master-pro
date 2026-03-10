import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';

/**
 * GET /api/v1/drivers/:id
 * Retrieve a single driver by ID.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const select = [
    'id', 'company_id', 'first_name', 'last_name', 'email', 'phone',
    'status', 'license_number', 'license_type', 'license_expiry',
    'medical_certificate_expiry', 'fimo_expiry', 'fcos_expiry', 'cqc_expiry_date',
    'adr_certificate_expiry', 'adr_classes', 'driver_card_number',
    'driver_card_expiry', 'hire_date', 'contract_type',
    'current_vehicle_id', 'is_active', 'created_at', 'updated_at',
  ].join(', ');

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('drivers')
    .select(select)
    .eq('id', params.id)
    .eq('company_id', auth.companyId)
    .single();

  if (error || !data) return apiError('Driver not found', 404, rateLimitHeaders);
  return apiSuccess(data, null, rateLimitHeaders);
}
