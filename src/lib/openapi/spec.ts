/**
 * OpenAPI 3.0 specification — FleetMaster Pro public API
 * Delegates to the canonical swagger.ts definition.
 */

import { getSwaggerSpec } from '@/lib/swagger';

export function getOpenApiSpec() {
  return getSwaggerSpec();
}
