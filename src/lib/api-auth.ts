/**
 * API Key Authentication — Fleet-Master
 *
 * Validates x-api-key (or Authorization: Bearer) header against the api_keys table.
 * Applies per-plan rate limiting:
 *   - ESSENTIAL  : 100 req / hour
 *   - PRO        : 1 000 req / hour
 *   - UNLIMITED  : 10 000 req / hour
 */

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface ApiAuthResult {
  companyId: string;
  plan: string;
  rateLimit: number; // requests / hour allowed for this plan
  keyId: string;
}

// ─── Plan-based rate limits ───────────────────────────────────────────────────

const PLAN_LIMITS: Record<string, { limit: number; windowMs: number }> = {
  ESSENTIAL: { limit: 100, windowMs: 60 * 60 * 1000 },
  PRO:       { limit: 1_000, windowMs: 60 * 60 * 1000 },
  UNLIMITED: { limit: 10_000, windowMs: 60 * 60 * 1000 },
};

const DEFAULT_LIMIT = PLAN_LIMITS.ESSENTIAL;

// ─── In-memory sliding-window store (per API key) ────────────────────────────

const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

// Periodic cleanup every 10 min
if (typeof globalThis !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of Array.from(rateLimitStore.entries())) {
      if (now > record.resetTime) rateLimitStore.delete(key);
    }
  }, 10 * 60 * 1000);
}

function checkKeyRateLimit(
  keyId: string,
  plan: string
): { success: boolean; remaining: number; reset: number; retryAfter?: number } {
  const config = PLAN_LIMITS[plan.toUpperCase()] ?? DEFAULT_LIMIT;
  const now = Date.now();
  const record = rateLimitStore.get(keyId);

  if (!record || now > record.resetTime) {
    rateLimitStore.set(keyId, { count: 1, resetTime: now + config.windowMs });
    return { success: true, remaining: config.limit - 1, reset: now + config.windowMs };
  }

  if (record.count >= config.limit) {
    return {
      success: false,
      remaining: 0,
      reset: record.resetTime,
      retryAfter: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count++;
  return { success: true, remaining: config.limit - record.count, reset: record.resetTime };
}

// ─── Main authenticator ───────────────────────────────────────────────────────

/**
 * Authenticates an API request. Returns the auth context or null.
 * Call this at the top of every /api/v1/* route handler.
 */
export async function authenticateApiKey(request: NextRequest): Promise<ApiAuthResult | null> {
  // Accept both x-api-key and Authorization: Bearer
  let apiKey = request.headers.get('x-api-key');
  if (!apiKey) {
    const auth = request.headers.get('authorization') ?? '';
    if (auth.toLowerCase().startsWith('bearer ')) {
      apiKey = auth.slice(7).trim();
    }
  }
  if (!apiKey) return null;

  const supabase = createAdminClient();

  // Validate key and fetch company plan
  const { data, error } = await supabase
    .from('api_keys' as any)
    .select('id, company_id, is_active')
    .eq('key', apiKey)
    .single();

  if (error || !data || !(data as any).is_active) return null;

  const keyId = (data as any).id as string;
  const companyId = (data as any).company_id as string;

  // Get company subscription plan
  const { data: company } = await supabase
    .from('companies')
    .select('subscription_plan')
    .eq('id', companyId)
    .single();

  const plan = (company?.subscription_plan ?? 'ESSENTIAL').toUpperCase();
  const rateLimit = (PLAN_LIMITS[plan] ?? DEFAULT_LIMIT).limit;

  // Update last_used_at asynchronously
  supabase
    .from('api_keys' as any)
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', keyId)
    .then(() => {});

  return { companyId, plan, rateLimit, keyId };
}

// ─── Unified handler: auth + rate limit ──────────────────────────────────────

/**
 * Validates the API key and enforces rate limiting.
 * Returns { auth, rateLimitHeaders } on success, or a NextResponse on failure.
 */
export async function withApiAuth(
  request: NextRequest
): Promise<
  | { ok: true; auth: ApiAuthResult; rateLimitHeaders: Record<string, string> }
  | { ok: false; response: NextResponse }
> {
  // 1. Auth
  const auth = await authenticateApiKey(request);
  if (!auth) {
    return {
      ok: false,
      response: NextResponse.json(
        { data: null, meta: null, error: 'Unauthorized — x-api-key header is required or invalid' },
        { status: 401 }
      ),
    };
  }

  // 2. Rate limit
  const rl = checkKeyRateLimit(auth.keyId, auth.plan);
  const config = PLAN_LIMITS[auth.plan] ?? DEFAULT_LIMIT;

  const rateLimitHeaders: Record<string, string> = {
    'X-RateLimit-Limit': config.limit.toString(),
    'X-RateLimit-Remaining': rl.remaining.toString(),
    'X-RateLimit-Reset': rl.reset.toString(),
    'X-RateLimit-Plan': auth.plan,
  };
  if (rl.retryAfter) rateLimitHeaders['Retry-After'] = rl.retryAfter.toString();

  if (!rl.success) {
    return {
      ok: false,
      response: NextResponse.json(
        {
          data: null,
          meta: null,
          error: `Rate limit exceeded. Retry after ${rl.retryAfter} seconds.`,
        },
        { status: 429, headers: rateLimitHeaders }
      ),
    };
  }

  return { ok: true, auth, rateLimitHeaders };
}

// ─── Standard response helpers ────────────────────────────────────────────────

export function apiSuccess<T>(
  data: T,
  meta: { total: number; page: number; per_page: number } | null,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json({ data, meta, error: null }, { headers });
}

export function apiError(
  message: string,
  status: number,
  headers: Record<string, string> = {}
): NextResponse {
  return NextResponse.json({ data: null, meta: null, error: message }, { status, headers });
}
