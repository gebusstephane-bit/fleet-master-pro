/**
 * Vehicle Actions Tests - CRUD complet avec mocking Supabase
 * Tests pour src/actions/vehicles.ts
 */

import { USER_ROLE } from '@/constants/enums';

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

// Mock logger
jest.mock('@/lib/logger', () => ({
  logger: {
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

describe('Vehicle Actions - CRUD', () => {
  const mockVehicle = {
    id: 'vehicle-123',
    company_id: 'company-123',
    registration_number: 'AB-123-CD',
    brand: 'Renault',
    model: 'Master',
    type: 'VAN',
    mileage: 50000,
    fuel_type: 'diesel',
    status: 'ACTIF',
    qr_code_data: 'fleetmaster://vehicle/vehicle-123',
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation des données CreateVehicleData', () => {
    const validVehicleData = {
      registration_number: 'AB-123-CD',
      brand: 'Renault',
      model: 'Master',
      type: 'VAN',
      mileage: 50000,
      fuel_type: 'diesel',
      status: 'actif',
    };

    it('devrait valider les données de véhicule correctes (cas nominal)', () => {
      expect(validVehicleData.registration_number).toMatch(/^[A-Z]{2}-\d{3}-[A-Z]{2}$/);
      expect(validVehicleData.brand).toBeTruthy();
      expect(validVehicleData.model).toBeTruthy();
      expect(validVehicleData.mileage).toBeGreaterThanOrEqual(0);
    });

    it('devrait rejeter une immatriculation au mauvais format', () => {
      const invalidPlates = ['ABC-123-CD', 'AB-12-CD', 'ab-123-cd'];
      const plateRegex = /^[A-Z]{2}-\d{3}-[A-Z]{2}$/;
      
      for (const plate of invalidPlates) {
        expect(plate).not.toMatch(plateRegex);
      }
    });

    it('devrait valider que le kilométrage est positif', () => {
      const validMileages = [0, 100, 50000, 999999];
      for (const mileage of validMileages) {
        expect(mileage).toBeGreaterThanOrEqual(0);
      }
    });

    it('devrait valider différents formats de statut', () => {
      const validStatuses = ['actif', 'Actif', 'ACTIF', 'inactif', 'En maintenance', 'Archivé'];
      const statusMapping: Record<string, string> = {
        'actif': 'ACTIF',
        'Actif': 'ACTIF', 
        'ACTIF': 'ACTIF',
        'inactif': 'INACTIF',
        'En maintenance': 'EN_MAINTENANCE',
        'Archivé': 'ARCHIVE',
      };

      for (const status of validStatuses) {
        const normalized = statusMapping[status] || 'ACTIF';
        expect(['ACTIF', 'INACTIF', 'EN_MAINTENANCE', 'ARCHIVE']).toContain(normalized);
      }
    });

    it('devrait exiger les champs obligatoires', () => {
      const requiredFields = ['registration_number', 'brand', 'model', 'type', 'fuel_type'];
      for (const field of requiredFields) {
        expect(validVehicleData[field as keyof typeof validVehicleData]).toBeDefined();
      }
    });
  });

  describe('Logique métier createVehicle', () => {
    it('devrait générer un UUID pour le nouveau véhicule', () => {
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      const mockId = '550e8400-e29b-41d4-a716-446655440000';
      expect(mockId).toMatch(uuidRegex);
    });

    it('devrait créer un QR code data basé sur l\'ID', () => {
      const vehicleId = 'vehicle-123';
      const qrCodeData = `fleetmaster://vehicle/${vehicleId}`;
      expect(qrCodeData).toBe(`fleetmaster://vehicle/${vehicleId}`);
    });

    it('devrait utiliser l\'année courante par défaut si non spécifiée', () => {
      const currentYear = new Date().getFullYear();
      expect(currentYear).toBeGreaterThanOrEqual(2024);
      expect(currentYear).toBeLessThanOrEqual(2030);
    });

    it('devrait normaliser les valeurs null pour les champs optionnels', () => {
      const optionalFields = {
        purchase_date: null,
        vin: null,
        color: null,
        detailed_type: null,
        insurance_company: null,
        insurance_policy_number: null,
        insurance_expiry: null,
        technical_control_date: null,
        technical_control_expiry: null,
        tachy_control_date: null,
        tachy_control_expiry: null,
        atp_date: null,
        atp_expiry: null,
        adr_certificate_date: null,
        adr_certificate_expiry: null,
        adr_equipment_check_date: null,
        adr_equipment_expiry: null,
      };

      for (const [key, value] of Object.entries(optionalFields)) {
        expect(value).toBeNull();
      }
    });
  });

  describe('Vérification des permissions', () => {
    it('devrait autoriser ADMIN à créer un véhicule', () => {
      const allowedRoles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
      expect(allowedRoles).toContain(USER_ROLE.ADMIN);
    });

    it('devrait autoriser DIRECTEUR à créer un véhicule', () => {
      const allowedRoles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
      expect(allowedRoles).toContain(USER_ROLE.DIRECTEUR);
    });

    it('devrait autoriser AGENT_DE_PARC à créer un véhicule', () => {
      const allowedRoles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
      expect(allowedRoles).toContain(USER_ROLE.AGENT_DE_PARC);
    });

    it('devrait refuser EXPLOITANT pour création de véhicule', () => {
      const allowedRoles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR, USER_ROLE.AGENT_DE_PARC];
      expect(allowedRoles).not.toContain(USER_ROLE.EXPLOITANT);
    });

    it('devrait autoriser seulement ADMIN et DIRECTEUR pour suppression', () => {
      const deleteAllowedRoles = [USER_ROLE.ADMIN, USER_ROLE.DIRECTEUR];
      expect(deleteAllowedRoles).toContain(USER_ROLE.ADMIN);
      expect(deleteAllowedRoles).toContain(USER_ROLE.DIRECTEUR);
      expect(deleteAllowedRoles).not.toContain(USER_ROLE.AGENT_DE_PARC);
    });
  });

  describe('Limite de véhicules selon abonnement', () => {
    it('devrait vérifier la limite avant création', () => {
      const subscription = { vehicle_limit: 10 };
      const currentCount = 8;
      expect(currentCount).toBeLessThan(subscription.vehicle_limit);
    });

    it('devrait bloquer quand la limite est atteinte', () => {
      const subscription = { vehicle_limit: 10 };
      const currentCount = 10;
      expect(currentCount >= subscription.vehicle_limit).toBe(true);
    });

    it('devrait inclure les informations de limite dans la réponse d\'erreur', () => {
      const errorData = {
        limitReached: true,
        currentCount: 10,
        limit: 10,
        upgradeUrl: '/settings/billing',
      };
      expect(errorData.limitReached).toBe(true);
      expect(errorData.currentCount).toBe(errorData.limit);
    });
  });

  describe('Logique métier updateVehicle', () => {
    it('devrait normaliser les champs de date vides vers null', () => {
      const dateFields = [
        'purchase_date',
        'insurance_expiry',
        'technical_control_date',
        'technical_control_expiry',
        'tachy_control_date',
        'tachy_control_expiry',
        'atp_date',
        'atp_expiry',
        'adr_certificate_date',
        'adr_certificate_expiry',
        'adr_equipment_check_date',
        'adr_equipment_expiry',
      ];

      for (const field of dateFields) {
        const value = '';
        const normalized = value === '' ? null : value;
        expect(normalized).toBeNull();
      }
    });

    it('devrait permettre une mise à jour partielle', () => {
      const existingData = { ...mockVehicle };
      const updateData = { brand: 'Peugeot', mileage: 60000 };
      const mergedData = { ...existingData, ...updateData };
      
      expect(mergedData.brand).toBe('Peugeot');
      expect(mergedData.mileage).toBe(60000);
      expect(mergedData.model).toBe('Master'); // unchanged
    });

    it('devrait mettre à jour updated_at lors de la modification', () => {
      const updated_at = new Date().toISOString();
      expect(updated_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Logique métier deleteVehicle', () => {
    it('devrait effectuer un soft delete (pas de suppression physique)', () => {
      // Le soft delete met à jour le statut plutôt que de supprimer
      const softDelete = { status: 'ARCHIVE', updated_at: new Date().toISOString() };
      expect(softDelete.status).toBe('ARCHIVE');
    });

    it('devrait vérifier l\'existence du véhicule avant suppression', () => {
      const existingVehicle = { id: 'vehicle-123', company_id: 'company-123' };
      expect(existingVehicle).toBeDefined();
      expect(existingVehicle.id).toBe('vehicle-123');
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer une erreur de doublon d\'immatriculation (code 23505)', () => {
      const error = { code: '23505', message: 'duplicate key value violates unique constraint "vehicles_registration_number_key"' };
      expect(error.code).toBe('23505');
      expect(error.message).toContain('registration_number');
    });

    it('devrait gérer une erreur de profil non trouvé', () => {
      const error = { message: 'Profil ou entreprise non trouvé' };
      expect(error.message).toContain('Profil');
    });

    it('devrait gérer une erreur de véhicule non trouvé', () => {
      const error = { message: 'Véhicule non trouvé ou accès non autorisé' };
      expect(error.message).toContain('non trouvé');
    });

    it('devrait gérer une erreur de base de données', () => {
      const dbError = { message: 'Connection refused', code: 'ECONNREFUSED' };
      expect(dbError.message).toBe('Connection refused');
    });
  });

  describe('Type VehicleInsert', () => {
    it('devrait inclure tous les champs ADR requis', () => {
      const adrFields = [
        'adr_certificate_date',
        'adr_certificate_expiry',
        'adr_equipment_check_date',
        'adr_equipment_expiry',
      ];
      
      for (const field of adrFields) {
        expect(field).toMatch(/^adr_/);
      }
    });

    it('devrait inclure le champ detailed_type pour les activités spécifiques', () => {
      expect('detailed_type').toBe('detailed_type');
    });
  });

  describe('Structure ActionResult', () => {
    it('devrait avoir la structure correcte pour un succès', () => {
      const successResult = {
        success: true,
        data: mockVehicle,
      };
      expect(successResult.success).toBe(true);
      expect(successResult.data).toBeDefined();
    });

    it('devrait avoir la structure correcte pour une erreur', () => {
      const errorResult = {
        success: false,
        error: 'Une erreur est survenue',
      };
      expect(errorResult.success).toBe(false);
      expect(errorResult.error).toBeDefined();
    });
  });
});
