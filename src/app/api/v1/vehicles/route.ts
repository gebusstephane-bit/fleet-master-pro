import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';
import { planHasFeature } from '@/lib/plans';
import { dispatchWebhook } from '@/lib/webhooks/send';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const querySchema = z.object({
  status: z.enum(['ACTIF', 'INACTIF', 'EN_MAINTENANCE', 'ARCHIVE']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(20),
});

const createVehicleSchema = z.object({
  registration_number: z.string().min(1),
  brand: z.string().min(1),
  model: z.string().min(1),
  year: z.number().int().min(1900).max(2100),
  type: z.string().min(1),
  fuel_type: z.enum(['diesel', 'gasoline', 'electric', 'hybrid', 'lpg']),
  vin: z.string().optional(),
  color: z.string().optional(),
  mileage: z.number().min(0).optional(),
  status: z.enum(['ACTIF', 'INACTIF', 'EN_MAINTENANCE', 'ARCHIVE']).optional(),
});

/**
 * GET /api/v1/vehicles
 * List vehicles with pagination and optional status filter.
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

  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('company_id', auth.companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (status) query = query.eq('status', status);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500, rateLimitHeaders);

  const total = count ?? 0;
  return apiSuccess(data ?? [], { total, page, per_page }, rateLimitHeaders);
}

/**
 * POST /api/v1/vehicles
 * Create a new vehicle.
 * Vérifie :
 * 1. Le plan a accès à l'API (UNLIMITED uniquement)
 * 2. La limite de véhicules n'est pas atteinte
 */
export async function POST(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  // 1. Vérifier que le plan a accès à l'API (UNLIMITED uniquement)
  if (!planHasFeature(auth.plan, 'api_access')) {
    return apiError(
      'API access not available on your plan. Upgrade to UNLIMITED to use the API.',
      403,
      rateLimitHeaders
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400, rateLimitHeaders);
  }

  const parsed = createVehicleSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 422, rateLimitHeaders);
  }

  const supabase = createAdminClient();

  // 2. Vérifier la limite de véhicules
  const { data: subscription, error: subError } = await supabase
    .from('subscriptions')
    .select('vehicle_limit')
    .eq('company_id', auth.companyId)
    .single();

  if (subError) {
    return apiError('Failed to verify subscription limits', 500, rateLimitHeaders);
  }

  // Compter les véhicules actuels
  const { count: vehicleCount, error: countError } = await supabase
    .from('vehicles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', auth.companyId);

  if (countError) {
    return apiError('Failed to count vehicles', 500, rateLimitHeaders);
  }

  // Vérifier si la limite est atteinte
  if (vehicleCount !== null && vehicleCount >= (subscription?.vehicle_limit || 0)) {
    return apiError(
      `Vehicle limit reached (${vehicleCount}/${subscription?.vehicle_limit}). Upgrade your plan to add more vehicles.`,
      403,
      rateLimitHeaders
    );
  }

  const { data, error } = await supabase
    .from('vehicles')
    .insert({ ...parsed.data, company_id: auth.companyId })
    .select()
    .single();

  if (error) return apiError(error.message, 500, rateLimitHeaders);

  // Webhook fire-and-forget — ne bloque pas la response API
  dispatchWebhook(auth.companyId, 'vehicle.created', data).catch((err) =>
    console.error('Webhook dispatch failed:', err)
  );

  return apiSuccess(data, null, rateLimitHeaders);
}
