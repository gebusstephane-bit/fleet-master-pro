import { NextResponse } from 'next/server';
import { getOpenApiSpec } from '@/lib/openapi/spec';

/**
 * GET /api/docs
 * Returns the OpenAPI 3.0 specification in JSON format.
 * Compatible with Swagger UI, Redoc, and other OpenAPI tooling.
 */
export async function GET() {
  return NextResponse.json(getOpenApiSpec(), {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
