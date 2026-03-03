/**
 * OpenAPI 3.0 specification — FleetMaster Pro Public API v1
 */

const BASE_URL =
  process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, '') ?? 'https://app.fleetmaster.fr';

export function getSwaggerSpec() {
  return {
    openapi: '3.0.3',
    info: {
      title: 'FleetMaster Pro API',
      version: '1.0.0',
      description: `
## API publique FleetMaster Pro

Gérez votre flotte programmatiquement : véhicules, conducteurs, carburant, maintenances, conformité et alertes.

### Authentification

Incluez votre clé API dans chaque requête :

\`\`\`
x-api-key: sk_live_xxxxxxxxxxxxxxxx
\`\`\`

Vous pouvez aussi utiliser le header standard :

\`\`\`
Authorization: Bearer sk_live_xxxxxxxxxxxxxxxx
\`\`\`

### Rate limiting

| Plan       | Limite         |
|------------|----------------|
| ESSENTIAL  | 100 req/heure  |
| PRO        | 1 000 req/heure|
| UNLIMITED  | 10 000 req/heure|

Les headers \`X-RateLimit-*\` sont inclus dans chaque réponse.

### Format des réponses

\`\`\`json
{
  "data": [...],
  "meta": { "total": 42, "page": 1, "per_page": 20 },
  "error": null
}
\`\`\`
      `.trim(),
      contact: {
        name: 'Support FleetMaster',
        url: 'https://fleetmaster.fr',
      },
    },
    servers: [
      {
        url: `${BASE_URL}/api/v1`,
        description: 'Production',
      },
    ],
    security: [{ ApiKeyHeader: [] }, { BearerAuth: [] }],
    components: {
      securitySchemes: {
        ApiKeyHeader: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Your FleetMaster API key (sk_live_...)',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          description: 'Authorization: Bearer sk_live_...',
        },
      },
      schemas: {
        Meta: {
          type: 'object',
          properties: {
            total: { type: 'integer', example: 42 },
            page: { type: 'integer', example: 1 },
            per_page: { type: 'integer', example: 20 },
          },
        },
        Error: {
          type: 'object',
          properties: {
            data: { nullable: true, example: null },
            meta: { nullable: true, example: null },
            error: { type: 'string', example: 'Unauthorized — x-api-key header is required' },
          },
        },
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            company_id: { type: 'string', format: 'uuid' },
            registration_number: { type: 'string', example: 'AB-123-CD' },
            brand: { type: 'string', example: 'Renault' },
            model: { type: 'string', example: 'Master' },
            year: { type: 'integer', example: 2022 },
            type: { type: 'string', example: 'FOURGON' },
            fuel_type: {
              type: 'string',
              enum: ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'],
            },
            vin: { type: 'string', nullable: true },
            color: { type: 'string', nullable: true },
            mileage: { type: 'integer', example: 45000 },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'maintenance', 'retired'],
            },
            technical_control_expiry: { type: 'string', format: 'date', nullable: true },
            insurance_expiry: { type: 'string', format: 'date', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
            updated_at: { type: 'string', format: 'date-time' },
          },
        },
        VehicleCreate: {
          type: 'object',
          required: ['registration_number', 'brand', 'model', 'year', 'type', 'fuel_type'],
          properties: {
            registration_number: { type: 'string', example: 'AB-123-CD' },
            brand: { type: 'string', example: 'Renault' },
            model: { type: 'string', example: 'Master' },
            year: { type: 'integer', example: 2022 },
            type: { type: 'string', example: 'FOURGON' },
            fuel_type: {
              type: 'string',
              enum: ['diesel', 'gasoline', 'electric', 'hybrid', 'lpg'],
            },
            vin: { type: 'string' },
            color: { type: 'string' },
            mileage: { type: 'integer' },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'maintenance', 'retired'],
            },
          },
        },
        Driver: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            first_name: { type: 'string' },
            last_name: { type: 'string' },
            email: { type: 'string', format: 'email' },
            phone: { type: 'string', nullable: true },
            status: {
              type: 'string',
              enum: ['active', 'inactive', 'on_leave', 'suspended', 'terminated'],
            },
            license_type: { type: 'string', example: 'C+E' },
            license_expiry: { type: 'string', format: 'date' },
            medical_certificate_expiry: { type: 'string', format: 'date', nullable: true },
            fimo_expiry: { type: 'string', format: 'date', nullable: true },
            cqc_expiry: { type: 'string', format: 'date', nullable: true },
            current_vehicle_id: { type: 'string', format: 'uuid', nullable: true },
            hire_date: { type: 'string', format: 'date', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        FuelRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            vehicle_id: { type: 'string', format: 'uuid' },
            driver_id: { type: 'string', format: 'uuid', nullable: true },
            date: { type: 'string', format: 'date' },
            quantity_liters: { type: 'number', example: 80.5 },
            price_total: { type: 'number', example: 112.70 },
            price_per_liter: { type: 'number', example: 1.40, nullable: true },
            mileage_at_fill: { type: 'integer', example: 45200 },
            fuel_type: { type: 'string', example: 'diesel' },
            station_name: { type: 'string', nullable: true },
            consumption_l_per_100km: { type: 'number', nullable: true },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        FuelRecordCreate: {
          type: 'object',
          required: ['vehicle_id', 'date', 'quantity_liters', 'price_total', 'mileage_at_fill', 'fuel_type'],
          properties: {
            vehicle_id: { type: 'string', format: 'uuid' },
            driver_id: { type: 'string', format: 'uuid' },
            date: { type: 'string', format: 'date' },
            quantity_liters: { type: 'number' },
            price_total: { type: 'number' },
            price_per_liter: { type: 'number' },
            mileage_at_fill: { type: 'integer' },
            fuel_type: { type: 'string' },
            station_name: { type: 'string' },
            notes: { type: 'string' },
          },
        },
        MaintenanceRecord: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            vehicle_id: { type: 'string', format: 'uuid' },
            type: { type: 'string', example: 'VIDANGE' },
            description: { type: 'string' },
            priority: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] },
            status: { type: 'string' },
            requested_at: { type: 'string', format: 'date-time' },
            scheduled_date: { type: 'string', format: 'date', nullable: true },
            completed_at: { type: 'string', format: 'date-time', nullable: true },
            estimated_cost: { type: 'number', nullable: true },
            final_cost: { type: 'number', nullable: true },
            garage_name: { type: 'string', nullable: true },
          },
        },
        Alert: {
          type: 'object',
          properties: {
            id: { type: 'string' },
            type: { type: 'string', example: 'technical_control_expiry' },
            severity: { type: 'string', enum: ['critical', 'high', 'medium'] },
            entity_type: { type: 'string', enum: ['vehicle', 'driver', 'maintenance'] },
            entity_id: { type: 'string', format: 'uuid' },
            entity_name: { type: 'string' },
            message: { type: 'string' },
            due_date: { type: 'string', format: 'date', nullable: true },
            days_remaining: { type: 'integer', nullable: true },
          },
        },
        ComplianceResult: {
          type: 'object',
          properties: {
            summary: {
              type: 'object',
              properties: {
                checked_at: { type: 'string', format: 'date-time' },
                total_vehicles: { type: 'integer' },
                total_drivers: { type: 'integer' },
                total_issues: { type: 'integer' },
                compliance_rate_vehicles: { type: 'integer', description: 'Percentage 0–100' },
                compliance_rate_drivers: { type: 'integer', description: 'Percentage 0–100' },
              },
            },
            vehicles: {
              type: 'object',
              properties: {
                expired: { type: 'integer' },
                expiring_soon: { type: 'integer' },
                issues: { type: 'array', items: { type: 'object' } },
              },
            },
            drivers: {
              type: 'object',
              properties: {
                expired: { type: 'integer' },
                expiring_soon: { type: 'integer' },
                issues: { type: 'array', items: { type: 'object' } },
              },
            },
          },
        },
      },
      responses: {
        Unauthorized: {
          description: 'Missing or invalid API key',
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
        RateLimitExceeded: {
          description: 'Rate limit exceeded',
          headers: {
            'X-RateLimit-Limit': { schema: { type: 'integer' } },
            'X-RateLimit-Remaining': { schema: { type: 'integer' } },
            'Retry-After': { schema: { type: 'integer' } },
          },
          content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } },
        },
      },
    },
    paths: {
      // ─── Vehicles ────────────────────────────────────────────────────────────
      '/vehicles': {
        get: {
          tags: ['Vehicles'],
          summary: 'List vehicles',
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'maintenance', 'retired'] } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'per_page', schema: { type: 'integer', default: 20, maximum: 200 } },
          ],
          responses: {
            200: {
              description: 'OK',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { type: 'array', items: { $ref: '#/components/schemas/Vehicle' } },
                      meta: { $ref: '#/components/schemas/Meta' },
                      error: { nullable: true },
                    },
                  },
                },
              },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            429: { $ref: '#/components/responses/RateLimitExceeded' },
          },
        },
        post: {
          tags: ['Vehicles'],
          summary: 'Create a vehicle',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/VehicleCreate' } } },
          },
          responses: {
            200: {
              description: 'Vehicle created',
              content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Vehicle' }, meta: { nullable: true }, error: { nullable: true } } } } },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      '/vehicles/{id}': {
        get: {
          tags: ['Vehicles'],
          summary: 'Get a vehicle',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Vehicle' }, meta: { nullable: true }, error: { nullable: true } } } } },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      // ─── Drivers ─────────────────────────────────────────────────────────────
      '/drivers': {
        get: {
          tags: ['Drivers'],
          summary: 'List drivers',
          parameters: [
            { in: 'query', name: 'status', schema: { type: 'string', enum: ['active', 'inactive', 'on_leave', 'suspended', 'terminated'] } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'per_page', schema: { type: 'integer', default: 20, maximum: 200 } },
          ],
          responses: {
            200: {
              description: 'OK',
              content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Driver' } }, meta: { $ref: '#/components/schemas/Meta' }, error: { nullable: true } } } } },
            },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      '/drivers/{id}': {
        get: {
          tags: ['Drivers'],
          summary: 'Get a driver',
          parameters: [{ in: 'path', name: 'id', required: true, schema: { type: 'string', format: 'uuid' } }],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/Driver' }, meta: { nullable: true }, error: { nullable: true } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            404: { description: 'Not found', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      // ─── Fuel records ─────────────────────────────────────────────────────────
      '/fuel-records': {
        get: {
          tags: ['Fuel'],
          summary: 'List fuel records',
          parameters: [
            { in: 'query', name: 'vehicle_id', schema: { type: 'string', format: 'uuid' } },
            { in: 'query', name: 'date_from', schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD' },
            { in: 'query', name: 'date_to', schema: { type: 'string', format: 'date' }, description: 'YYYY-MM-DD' },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'per_page', schema: { type: 'integer', default: 20, maximum: 200 } },
          ],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/FuelRecord' } }, meta: { $ref: '#/components/schemas/Meta' }, error: { nullable: true } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
        post: {
          tags: ['Fuel'],
          summary: 'Add a fuel record',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/FuelRecordCreate' } } },
          },
          responses: {
            200: { description: 'Created', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/FuelRecord' }, meta: { nullable: true }, error: { nullable: true } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
            422: { description: 'Validation error', content: { 'application/json': { schema: { $ref: '#/components/schemas/Error' } } } },
          },
        },
      },
      // ─── Maintenance ──────────────────────────────────────────────────────────
      '/maintenance': {
        get: {
          tags: ['Maintenance'],
          summary: 'List maintenance records',
          parameters: [
            { in: 'query', name: 'vehicle_id', schema: { type: 'string', format: 'uuid' } },
            { in: 'query', name: 'status', schema: { type: 'string' } },
            { in: 'query', name: 'priority', schema: { type: 'string', enum: ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'] } },
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'per_page', schema: { type: 'integer', default: 20, maximum: 200 } },
          ],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/MaintenanceRecord' } }, meta: { $ref: '#/components/schemas/Meta' }, error: { nullable: true } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      // ─── Compliance ───────────────────────────────────────────────────────────
      '/compliance': {
        get: {
          tags: ['Compliance'],
          summary: 'Fleet compliance summary',
          description: 'Returns expired and soon-expiring documents for vehicles and drivers (within 30 days).',
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { $ref: '#/components/schemas/ComplianceResult' }, meta: { nullable: true }, error: { nullable: true } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
      // ─── Alerts ───────────────────────────────────────────────────────────────
      '/alerts': {
        get: {
          tags: ['Alerts'],
          summary: 'Active fleet alerts',
          description: 'Expired/soon-expiring docs + overdue maintenance, sorted by severity.',
          parameters: [
            { in: 'query', name: 'page', schema: { type: 'integer', default: 1 } },
            { in: 'query', name: 'per_page', schema: { type: 'integer', default: 20, maximum: 100 } },
          ],
          responses: {
            200: { description: 'OK', content: { 'application/json': { schema: { type: 'object', properties: { data: { type: 'array', items: { $ref: '#/components/schemas/Alert' } }, meta: { $ref: '#/components/schemas/Meta' }, error: { nullable: true } } } } } },
            401: { $ref: '#/components/responses/Unauthorized' },
          },
        },
      },
    },
  };
}
