/**
 * OpenAPI 3.0 specification for FleetMaster Pro public API
 */

export function getOpenApiSpec() {
  return {
    openapi: '3.0.0',
    info: {
      title: 'FleetMaster Pro API',
      version: '1.0.0',
      description:
        'API publique pour intégrer FleetMaster Pro avec vos systèmes TMS/ERP. Authentification via clé API.',
      contact: {
        name: 'Support FleetMaster Pro',
        url: 'https://fleetmaster.pro',
      },
    },
    servers: [
      {
        url: '/api/v1',
        description: 'API v1',
      },
    ],
    components: {
      securitySchemes: {
        ApiKeyAuth: {
          type: 'apiKey',
          in: 'header',
          name: 'x-api-key',
          description: 'Clé API générée depuis Paramètres → Intégrations',
        },
      },
      schemas: {
        Vehicle: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            registration_number: { type: 'string', example: 'AA-123-BB' },
            brand: { type: 'string', example: 'Renault' },
            model: { type: 'string', example: 'Master' },
            type: { type: 'string', example: 'FOURGON' },
            status: {
              type: 'string',
              enum: ['ACTIF', 'EN_MAINTENANCE', 'INACTIF', 'HORS_SERVICE'],
            },
            mileage: { type: 'integer', example: 45000 },
            fuel_type: { type: 'string', example: 'DIESEL' },
            year: { type: 'integer', example: 2022 },
            vin: { type: 'string' },
            created_at: { type: 'string', format: 'date-time' },
          },
        },
        Error: {
          type: 'object',
          properties: {
            error: { type: 'string' },
            message: { type: 'string' },
          },
        },
        Pagination: {
          type: 'object',
          properties: {
            total: { type: 'integer' },
            page: { type: 'integer' },
            pageSize: { type: 'integer' },
            pages: { type: 'integer' },
          },
        },
      },
    },
    security: [{ ApiKeyAuth: [] }],
    paths: {
      '/vehicles': {
        get: {
          summary: 'Lister les véhicules',
          description: 'Retourne la liste de tous les véhicules de la flotte.',
          tags: ['Véhicules'],
          parameters: [
            {
              name: 'status',
              in: 'query',
              schema: {
                type: 'string',
                enum: ['ACTIF', 'EN_MAINTENANCE', 'INACTIF', 'HORS_SERVICE'],
              },
              description: 'Filtrer par statut',
            },
            {
              name: 'page',
              in: 'query',
              schema: { type: 'integer', default: 1 },
            },
            {
              name: 'pageSize',
              in: 'query',
              schema: { type: 'integer', default: 50, maximum: 200 },
            },
          ],
          responses: {
            '200': {
              description: 'Liste des véhicules',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: {
                        type: 'array',
                        items: { $ref: '#/components/schemas/Vehicle' },
                      },
                      pagination: { $ref: '#/components/schemas/Pagination' },
                    },
                  },
                },
              },
            },
            '401': {
              description: 'Clé API manquante ou invalide',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
      '/vehicles/{id}': {
        get: {
          summary: 'Obtenir un véhicule',
          description: 'Retourne les détails d\'un véhicule par son identifiant.',
          tags: ['Véhicules'],
          parameters: [
            {
              name: 'id',
              in: 'path',
              required: true,
              schema: { type: 'string', format: 'uuid' },
            },
          ],
          responses: {
            '200': {
              description: 'Détails du véhicule',
              content: {
                'application/json': {
                  schema: {
                    type: 'object',
                    properties: {
                      data: { $ref: '#/components/schemas/Vehicle' },
                    },
                  },
                },
              },
            },
            '404': {
              description: 'Véhicule non trouvé',
              content: {
                'application/json': {
                  schema: { $ref: '#/components/schemas/Error' },
                },
              },
            },
          },
        },
      },
    },
  };
}
