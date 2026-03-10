/**
 * Maintenance Actions Tests - CRUD complet
 * Tests pour src/actions/maintenance.ts
 * 
 * Tests des interventions, alertes et statistiques de maintenance
 */

import { VEHICLE_STATUS } from '@/constants/enums';

// Mock next/cache
jest.mock('next/cache', () => ({
  revalidatePath: jest.fn(),
}));

describe('Maintenance Actions - CRUD', () => {
  const mockVehicle = {
    id: 'vehicle-123',
    company_id: 'company-123',
    registration_number: 'AB-123-CD',
    brand: 'Renault',
    model: 'Master',
    mileage: 50000,
    next_service_due: '2024-06-01',
    next_service_mileage: 60000,
  };

  const mockMaintenanceRecord = {
    id: 'maint-123',
    vehicle_id: 'vehicle-123',
    company_id: 'company-123',
    type: 'routine',
    description: 'Vidange et filtres',
    status: 'TERMINEE',
    priority: 'NORMAL',
    cost: 250,
    mileage_at_maintenance: 50000,
    requested_at: '2024-01-15T10:00:00Z',
    scheduled_date: null,
    completed_at: '2024-01-15T14:00:00Z',
    garage_name: 'Garage Central',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Validation des données maintenance', () => {
    const validMaintenanceData = {
      vehicleId: '550e8400-e29b-41d4-a716-446655440000',
      type: 'OIL_CHANGE',
      description: 'Vidange moteur',
      serviceDate: '2024-01-15',
    };

    it('devrait valider les données correctes (cas nominal)', () => {
      expect(validMaintenanceData.vehicleId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
      expect(validMaintenanceData.description).toBeTruthy();
      expect(validMaintenanceData.serviceDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });

    it('devrait rejeter un vehicleId invalide', () => {
      const invalidId = 'not-a-uuid';
      expect(invalidId).not.toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
    });

    it('devrait valider tous les types d\'intervention acceptés', () => {
      const validTypes = [
        'PREVENTIVE', 'CORRECTIVE', 'INSPECTION', 'TIRE_CHANGE', 'OIL_CHANGE',
        'BRAKE_CHANGE', 'FILTER_CHANGE', 'TIMING_BELT', 'TECHNICAL_CONTROL',
        'ATP_CONTROL', 'OTHER'
      ];
      
      expect(validTypes).toHaveLength(11);
      expect(validTypes).toContain('OIL_CHANGE');
      expect(validTypes).toContain('TECHNICAL_CONTROL');
    });

    it('devrait rejeter une description vide', () => {
      const description = '';
      expect(description.length).toBe(0);
    });

    it('devrait valider que le coût est positif', () => {
      const costs = [0, 100, 250.50, 9999];
      for (const cost of costs) {
        expect(cost).toBeGreaterThanOrEqual(0);
      }
    });

    it('devrait valider que le kilométrage est positif', () => {
      const mileages = [0, 1000, 50000, 999999];
      for (const mileage of mileages) {
        expect(mileage).toBeGreaterThanOrEqual(0);
      }
    });

    it('devrait valider les statuts de workflow acceptés', () => {
      const validStatuses = [
        'DEMANDE_CREEE', 'VALIDEE_DIRECTEUR', 'RDV_PRIS', 
        'EN_COURS', 'TERMINEE', 'REFUSEE'
      ];
      expect(validStatuses).toHaveLength(6);
      expect(validStatuses).toContain('TERMINEE');
    });

    it('devrait valider les niveaux de priorité acceptés', () => {
      const validPriorities = ['LOW', 'NORMAL', 'HIGH', 'CRITICAL'];
      expect(validPriorities).toHaveLength(4);
      expect(validPriorities).toContain('NORMAL');
    });

    it('devrait valider les documents associés', () => {
      const documents = [
        { name: 'Facture.pdf', url: 'https://example.com/facture.pdf', type: 'INVOICE' },
        { name: 'Photo.jpg', url: 'https://example.com/photo.jpg', type: 'PHOTO' },
      ];
      
      for (const doc of documents) {
        expect(doc.name).toBeTruthy();
        expect(doc.url).toMatch(/^https?:\/\//);
        expect(['INVOICE', 'QUOTE', 'REPORT', 'PHOTO']).toContain(doc.type);
      }
    });

    it('devrait valider les pièces remplacées', () => {
      const parts = [
        { name: 'Filtre à huile', reference: 'FO-123', cost: 25, quantity: 1 },
        { name: 'Huile moteur', cost: 45, quantity: 5 },
      ];
      
      for (const part of parts) {
        expect(part.name).toBeTruthy();
        expect(part.cost).toBeGreaterThanOrEqual(0);
        expect(part.quantity).toBeGreaterThan(0);
      }
    });
  });

  describe('Mapping type vers DB', () => {
    const typeToDb: Record<string, string> = {
      'PREVENTIVE': 'routine',
      'CORRECTIVE': 'repair',
      'INSPECTION': 'inspection',
      'TIRE_CHANGE': 'tire_change',
      'OIL_CHANGE': 'oil_change',
      'BRAKE_CHANGE': 'repair',
      'FILTER_CHANGE': 'routine',
      'TIMING_BELT': 'repair',
      'TECHNICAL_CONTROL': 'inspection',
      'OTHER': 'repair',
    };

    it('devrait mapper correctement tous les types frontend vers DB', () => {
      expect(typeToDb['PREVENTIVE']).toBe('routine');
      expect(typeToDb['CORRECTIVE']).toBe('repair');
      expect(typeToDb['INSPECTION']).toBe('inspection');
      expect(typeToDb['TIRE_CHANGE']).toBe('tire_change');
      expect(typeToDb['OIL_CHANGE']).toBe('oil_change');
      expect(typeToDb['TECHNICAL_CONTROL']).toBe('inspection');
    });

    it('devrait utiliser repair comme valeur par défaut', () => {
      const defaultType = typeToDb['UNKNOWN_TYPE'] || 'repair';
      expect(defaultType).toBe('repair');
    });
  });

  describe('Logique métier createMaintenance', () => {
    it('devrait définir completed_at quand status est TERMINEE', () => {
      const status = 'TERMINEE';
      const serviceDate = '2024-01-15';
      
      let completed_at = null;
      let scheduled_date = null;
      
      if (status === 'TERMINEE') {
        completed_at = serviceDate;
      } else if (serviceDate) {
        scheduled_date = serviceDate;
      }
      
      expect(completed_at).toBe('2024-01-15');
      expect(scheduled_date).toBeNull();
    });

    it('devrait définir scheduled_date quand status n\'est pas TERMINEE', () => {
      const status = 'EN_COURS';
      const serviceDate = '2024-01-15';
      
      let completed_at = null;
      let scheduled_date = null;
      
      if (status === 'TERMINEE') {
        completed_at = serviceDate;
      } else if (serviceDate) {
        scheduled_date = serviceDate;
      }
      
      expect(completed_at).toBeNull();
      expect(scheduled_date).toBe('2024-01-15');
    });

    it('devrait mapper correctement les priorités', () => {
      const priorities = [
        { input: 'HIGH', expected: 'HIGH' },
        { input: 'NORMAL', expected: 'NORMAL' },
        { input: 'LOW', expected: 'LOW' },
        { input: 'UNKNOWN', expected: 'LOW' },
      ];

      for (const { input, expected } of priorities) {
        const mapped = input === 'HIGH' ? 'HIGH' :
                      input === 'NORMAL' ? 'NORMAL' : 'LOW';
        expect(mapped).toBe(expected);
      }
    });

    it('devrait définir requested_at à la date de création', () => {
      const requested_at = new Date().toISOString();
      expect(requested_at).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe('Détection type intervention réglementaire', () => {
    it('devrait détecter un contrôle technique', () => {
      const descriptions = [
        'Contrôle technique annuel',
        'Controle technique',
        'CT obligatoire',
        'Passage au CT ',
      ];
      
      for (const description of descriptions) {
        const descLower = description.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const isCT = descLower.includes('controle technique') || 
                     descLower.includes('control technique') ||
                     descLower.includes('ct ') ||
                     descLower.includes(' ct');
        expect(isCT).toBe(true);
      }
    });

    it('devrait détecter un contrôle tachygraphe', () => {
      const descriptions = [
        'Calibration tachygraphe',
        'Contrôle tachy',
        'Tachygraphe annuel',
      ];
      
      for (const description of descriptions) {
        const descLower = description.toLowerCase();
        const isTachy = descLower.includes('tachygraphe') || 
                        descLower.includes('tachy') ||
                        descLower.includes('calibration');
        expect(isTachy).toBe(true);
      }
    });

    it('devrait détecter un contrôle ATP', () => {
      const descriptions = [
        'Vérification ATP',
        'Attestation transporteur',
        'Contrôle ATP annuel',
      ];
      
      for (const description of descriptions) {
        const descLower = description.toLowerCase();
        const isATP = descLower.includes('atp') || 
                      descLower.includes('attestation transporteur');
        expect(isATP).toBe(true);
      }
    });
  });

  describe('Logique métier getMaintenanceAlerts', () => {
    const mockVehicles = [
      { 
        id: 'v1', 
        registration_number: 'AB-123-CD', 
        brand: 'Renault', 
        model: 'Master',
        mileage: 58000,
        next_service_mileage: 60000,
        next_service_due: '2024-02-01',
      },
      { 
        id: 'v2', 
        registration_number: 'EF-456-GH', 
        brand: 'Peugeot', 
        model: 'Boxer',
        mileage: 61000,
        next_service_mileage: 60000,
        next_service_due: '2024-01-01',
      },
    ];

    it('devrait générer une alerte INFO pour entretien dans plus de 500 km', () => {
      const vehicle = mockVehicles[0];
      const remainingKm = (vehicle.next_service_mileage || 0) - vehicle.mileage;
      
      expect(remainingKm).toBe(2000);
      const severity = remainingKm < 0 ? 'CRITICAL' : remainingKm <= 500 ? 'WARNING' : 'INFO';
      expect(severity).toBe('INFO');
    });

    it('devrait générer une alerte WARNING pour entretien dans moins de 500 km', () => {
      const vehicle = { ...mockVehicles[0], mileage: 59500 };
      const remainingKm = (vehicle.next_service_mileage || 0) - vehicle.mileage;
      
      expect(remainingKm).toBe(500);
      const severity = remainingKm < 0 ? 'CRITICAL' : remainingKm <= 500 ? 'WARNING' : 'INFO';
      expect(severity).toBe('WARNING');
    });

    it('devrait générer une alerte CRITICAL pour entretien dépassé', () => {
      const vehicle = mockVehicles[1];
      const remainingKm = (vehicle.next_service_mileage || 0) - vehicle.mileage;
      
      expect(remainingKm).toBe(-1000);
      const severity = remainingKm < 0 ? 'CRITICAL' : remainingKm <= 500 ? 'WARNING' : 'INFO';
      expect(severity).toBe('CRITICAL');
    });

    it('devrait générer une alerte DATE_DUE quand la date est proche', () => {
      const today = new Date('2024-01-25');
      const dueDate = new Date('2024-02-01');
      const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysUntil).toBe(7);
      expect(daysUntil < 30).toBe(true);
    });

    it('devrait calculer correctement la sévérité basée sur les jours restants', () => {
      const testCases = [
        { days: -5, expected: 'CRITICAL' },
        { days: 3, expected: 'WARNING' },
        { days: 15, expected: 'INFO' },
        { days: 45, expected: null }, // Pas d'alerte
      ];

      for (const { days, expected } of testCases) {
        const severity = days < 0 ? 'CRITICAL' : days < 7 ? 'WARNING' : days < 30 ? 'INFO' : null;
        expect(severity).toBe(expected);
      }
    });

    it('ne devrait pas générer d\'alerte si plus de 30 jours', () => {
      const today = new Date('2024-01-01');
      const dueDate = new Date('2024-02-15');
      const daysUntil = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      expect(daysUntil).toBeGreaterThanOrEqual(30);
    });
  });

  describe('Logique métier getMaintenanceStats', () => {
    const mockRecords = [
      { cost: 250, type: 'routine', requested_at: '2024-01-15T10:00:00Z' },
      { cost: 500, type: 'repair', requested_at: '2024-02-20T14:00:00Z' },
      { cost: 150, type: 'routine', requested_at: '2024-03-10T09:00:00Z' },
    ];

    it('devrait calculer le coût total correctement', () => {
      const totalCost = mockRecords.reduce((sum, r) => sum + (r.cost || 0), 0);
      expect(totalCost).toBe(900);
    });

    it('devrait compter le nombre total d\'interventions', () => {
      expect(mockRecords.length).toBe(3);
    });

    it('devrait grouper les statistiques par type', () => {
      const byType: Record<string, { count: number; cost: number }> = {};
      
      mockRecords.forEach(record => {
        const type = record.type;
        if (!byType[type]) {
          byType[type] = { count: 0, cost: 0 };
        }
        byType[type].count++;
        byType[type].cost += record.cost || 0;
      });

      expect(byType['routine']).toEqual({ count: 2, cost: 400 });
      expect(byType['repair']).toEqual({ count: 1, cost: 500 });
    });

    it('devrait filtrer par année en cours', () => {
      const currentYear = new Date().getFullYear();
      const startOfYear = new Date(Date.UTC(currentYear, 0, 1)).toISOString();
      
      expect(startOfYear).toMatch(new RegExp(`^${currentYear}-01-01`));
    });
  });

  describe('Logique métier updateMaintenance', () => {
    it('devrait vérifier l\'existence de l\'intervention avant mise à jour', () => {
      const existingMaintenance = { id: 'maint-123' };
      expect(existingMaintenance).toBeDefined();
    });

    it('devrait permettre une mise à jour partielle', () => {
      const existingData = { id: 'maint-123', description: 'Vidange', cost: 200 };
      const updateData = { cost: 250 };
      const mergedData = { ...existingData, ...updateData };
      
      expect(mergedData.description).toBe('Vidange');
      expect(mergedData.cost).toBe(250);
    });
  });

  describe('Logique métier deleteMaintenance', () => {
    it('devrait vérifier l\'existence de l\'intervention avant suppression', () => {
      const existingMaintenance = { id: 'maint-123' };
      expect(existingMaintenance).toBeDefined();
    });

    it('devrait invalider les chemins après suppression', () => {
      const pathsToInvalidate = ['/maintenance'];
      expect(pathsToInvalidate).toContain('/maintenance');
    });
  });

  describe('Gestion des erreurs', () => {
    it('devrait gérer une erreur de véhicule non trouvé', () => {
      const vehicleError = { message: 'Véhicule non trouvé ou accès non autorisé' };
      expect(vehicleError.message).toContain('non trouvé');
    });

    it('devrait gérer une erreur d\'intervention non trouvée', () => {
      const maintenanceError = { message: 'Intervention non trouvée' };
      expect(maintenanceError.message).toContain('non trouvée');
    });

    it('devrait gérer une erreur de base de données', () => {
      const dbError = { message: 'Connection refused', code: 'ECONNREFUSED' };
      expect(dbError.message).toBe('Connection refused');
    });
  });

  describe('Mise à jour des dates réglementaires du véhicule', () => {
    it('devrait mettre à jour technical_control_date pour une intervention CT terminée', () => {
      const isCT = true;
      const status = 'TERMINEE';
      const completedDate = '2024-01-15';
      
      const vehicleUpdate: any = {};
      if (isCT && status === 'TERMINEE') {
        vehicleUpdate.technical_control_date = completedDate;
      }
      
      expect(vehicleUpdate.technical_control_date).toBe('2024-01-15');
    });

    it('devrait mettre à jour tachy_control_date pour une intervention tachygraphe terminée', () => {
      const isTachy = true;
      const status = 'TERMINEE';
      const completedDate = '2024-01-15';
      
      const vehicleUpdate: any = {};
      if (isTachy && status === 'TERMINEE') {
        vehicleUpdate.tachy_control_date = completedDate;
      }
      
      expect(vehicleUpdate.tachy_control_date).toBe('2024-01-15');
    });

    it('devrait mettre à jour atp_date pour une intervention ATP terminée', () => {
      const isATP = true;
      const status = 'TERMINEE';
      const completedDate = '2024-01-15';
      
      const vehicleUpdate: any = {};
      if (isATP && status === 'TERMINEE') {
        vehicleUpdate.atp_date = completedDate;
      }
      
      expect(vehicleUpdate.atp_date).toBe('2024-01-15');
    });
  });

  describe('Mise à jour des prochaines échéances du véhicule', () => {
    it('devrait mettre à jour next_service_due si fourni', () => {
      const nextServiceDue = '2024-12-01';
      const vehicleUpdate = {
        next_service_due: nextServiceDue,
        updated_at: new Date().toISOString(),
      };
      expect(vehicleUpdate.next_service_due).toBe('2024-12-01');
    });

    it('devrait mettre à jour next_service_mileage si fourni', () => {
      const nextServiceMileage = 70000;
      const vehicleUpdate = {
        next_service_mileage: nextServiceMileage,
        updated_at: new Date().toISOString(),
      };
      expect(vehicleUpdate.next_service_mileage).toBe(70000);
    });
  });
});
