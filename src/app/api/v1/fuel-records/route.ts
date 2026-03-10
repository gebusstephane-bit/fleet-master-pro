import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { withApiAuth, apiSuccess, apiError } from '@/lib/api-auth';
import { z } from 'zod';

const querySchema = z.object({
  vehicle_id: z.string().uuid().optional(),
  date_from: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  date_to: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  page: z.coerce.number().int().min(1).default(1),
  per_page: z.coerce.number().int().min(1).max(200).default(20),
});

const createFuelSchema = z.object({
  vehicle_id: z.string().uuid(),
  driver_id: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  quantity_liters: z.number().positive(),
  price_total: z.number().positive(),
  price_per_liter: z.number().positive().optional(),
  mileage_at_fill: z.number().int().min(0),
  fuel_type: z.string().min(1),
  station_name: z.string().optional(),
  notes: z.string().optional(),
});

/**
 * GET /api/v1/fuel-records
 * List fuel records with optional filters.
 */
export async function GET(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  const { searchParams } = new URL(request.url);
  const parsed = querySchema.safeParse({
    vehicle_id: searchParams.get('vehicle_id') ?? undefined,
    date_from: searchParams.get('date_from') ?? undefined,
    date_to: searchParams.get('date_to') ?? undefined,
    page: searchParams.get('page') ?? 1,
    per_page: searchParams.get('per_page') ?? 20,
  });
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 400, rateLimitHeaders);
  }

  const { vehicle_id, date_from, date_to, page, per_page } = parsed.data;
  const offset = (page - 1) * per_page;
  const supabase = createAdminClient();

  let query = supabase
    .from('fuel_records')
    .select('*', { count: 'exact' })
    .eq('company_id', auth.companyId)
    .order('date', { ascending: false })
    .range(offset, offset + per_page - 1);

  if (vehicle_id) query = query.eq('vehicle_id', vehicle_id);
  if (date_from) query = query.gte('date', date_from);
  if (date_to) query = query.lte('date', date_to);

  const { data, error, count } = await query;
  if (error) return apiError(error.message, 500, rateLimitHeaders);

  const total = count ?? 0;
  return apiSuccess(data ?? [], { total, page, per_page }, rateLimitHeaders);
}

/**
 * POST /api/v1/fuel-records
 * Add a new fuel record.
 */
export async function POST(request: NextRequest) {
  const guard = await withApiAuth(request);
  if (!guard.ok) return guard.response;
  const { auth, rateLimitHeaders } = guard;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return apiError('Invalid JSON body', 400, rateLimitHeaders);
  }

  const parsed = createFuelSchema.safeParse(body);
  if (!parsed.success) {
    return apiError(parsed.error.issues[0].message, 422, rateLimitHeaders);
  }

  const supabase = createAdminClient();

  // Verify vehicle belongs to this company
  const { data: vehicle } = await supabase
    .from('vehicles')
    .select('id')
    .eq('id', parsed.data.vehicle_id)
    .eq('company_id', auth.companyId)
    .single();

  if (!vehicle) return apiError('Vehicle not found or not in your company', 404, rateLimitHeaders);

  const { data, error } = await supabase
    .from('fuel_records')
    .insert({ ...parsed.data, company_id: auth.companyId })
    .select()
    .single();

  if (error) return apiError(error.message, 500, rateLimitHeaders);
  return apiSuccess(data, null, rateLimitHeaders);
}
