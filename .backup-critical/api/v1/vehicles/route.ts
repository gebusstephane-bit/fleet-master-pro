import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

/**
 * GET /api/v1/vehicles
 * Public API — authenticates via x-api-key header.
 * Returns vehicles for the company associated with the key.
 */
export async function GET(request: NextRequest) {
  const apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'x-api-key header is required' },
      { status: 401 }
    );
  }

  const supabase = createAdminClient();

  // Validate API key and get company_id
  const { data: keyData, error: keyError } = await supabase
    .from('api_keys' as any)
    .select('company_id, is_active')
    .eq('key', apiKey)
    .single();

  if (keyError || !keyData || !(keyData as any).is_active) {
    return NextResponse.json(
      { error: 'Unauthorized', message: 'Invalid or inactive API key' },
      { status: 401 }
    );
  }

  const companyId = (keyData as any).company_id;

  // Parse query params
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50', 10)));
  const offset = (page - 1) * pageSize;

  // Build query
  let query = supabase
    .from('vehicles')
    .select('*', { count: 'exact' })
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (status) {
    query = query.eq('status', status);
  }

  const { data: vehicles, error, count } = await query;

  if (error) {
    return NextResponse.json(
      { error: 'Internal Server Error', message: error.message },
      { status: 500 }
    );
  }

  // Update last_used_at asynchronously (fire and forget)
  supabase
    .from('api_keys' as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq('key', apiKey)
    .then(() => {});

  const total = count ?? 0;

  return NextResponse.json({
    data: vehicles ?? [],
    pagination: {
      total,
      page,
      pageSize,
      pages: Math.ceil(total / pageSize),
    },
  });
}
