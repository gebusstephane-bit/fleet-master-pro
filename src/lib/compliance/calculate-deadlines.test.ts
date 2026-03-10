/**
 * Tests unitaires pour le calcul des échéances de conformité
 * VALIDE: Zero régression sur véhicules legacy + Nouvelles fonctionnalités ADR/Frigo
 */

import {
  ComplianceDeadline,
  VehicleComplianceData,
  getDeadlineStatus,
  calculateADRDeadlines,
  calculateFrigoDeadlines,
  _testExports,
} from './calculate-deadlines';

const { parseDateSafe, sortDeadlinesByPriority, mapLegacyToComplianceDeadlines } = _testExports;

// ============================================
// FIXTURES
// ============================================

const mockVehicleBase: VehicleComplianceData = {
  id: 'v-test-123',
  company_id: 'c-test-456',
  type: 'POIDS_LOURD',
  technical_control_date: '2024-03-01',
  technical_control_expiry: '2025-03-01',
  tachy_control_date: '2024-03-01',
  tachy_control_expiry: '2026-03-01',
  atp_date: null,
  atp_expiry: null,
};

const mockVehicleFrigo: VehicleComplianceData = {
  ...mockVehicleBase,
  type: 'POIDS_LOURD_FRIGO',
  atp_date: '2024-03-01',
  atp_expiry: '2029-03-01', // 5 ans en legacy
};

const mockVehicleVL: VehicleComplianceData = {
  ...mockVehicleBase,
  type: 'VOITURE',
  tachy_control_date: null,
  tachy_control_expiry: null,
};

// ============================================
// TESTS: UTILITAIRES
// ============================================

describe('parseDateSafe', () => {
  it('should parse valid ISO date string', () => {
    const result = parseDateSafe('2024-03-15');
    expect(result).toBeInstanceOf(Date);
    expect(result?.getFullYear()).toBe(2024);
  });

  it('should return null for null input', () => {
    expect(parseDateSafe(null)).toBeNull();
  });

  it('should return null for undefined input', () => {
    expect(parseDateSafe(undefined)).toBeNull();
  });

  it('should return null for invalid date string', () => {
    expect(parseDateSafe('invalid')).toBeNull();
  });
});

describe('getDeadlineStatus', () => {
  it('should return EXPIRED for negative days', () => {
    expect(getDeadlineStatus(-1)).toBe('EXPIRED');
    expect(getDeadlineStatus(-30)).toBe('EXPIRED');
  });

  it('should return CRITICAL for 7 days or less', () => {
    expect(getDeadlineStatus(0)).toBe('CRITICAL');
    expect(getDeadlineStatus(7)).toBe('CRITICAL');
  });

  it('should return WARNING for days within reminder threshold', () => {
    expect(getDeadlineStatus(8)).toBe('WARNING');
    expect(getDeadlineStatus(30)).toBe('WARNING');
  });

  it('should return OK for days beyond reminder threshold', () => {
    expect(getDeadlineStatus(31)).toBe('OK');
    expect(getDeadlineStatus(365)).toBe('OK');
  });

  it('should respect custom reminder days', () => {
    expect(getDeadlineStatus(14, 14)).toBe('WARNING');
    expect(getDeadlineStatus(15, 14)).toBe('OK');
  });
});

describe('sortDeadlinesByPriority', () => {
  it('should sort EXPIRED before WARNING before OK', () => {
    const deadlines: ComplianceDeadline[] = [
      { documentCode: 'OK', documentName: 'OK', expiryDate: '2025-01-01', daysLeft: 100, status: 'OK', isMandatory: true, equipmentList: null, lastDate: null, frequencyMonths: 12 },
      { documentCode: 'EXPIRED', documentName: 'EXPIRED', expiryDate: '2024-01-01', daysLeft: -10, status: 'EXPIRED', isMandatory: true, equipmentList: null, lastDate: null, frequencyMonths: 12 },
      { documentCode: 'WARNING', documentName: 'WARNING', expiryDate: '2024-04-01', daysLeft: 20, status: 'WARNING', isMandatory: true, equipmentList: null, lastDate: null, frequencyMonths: 12 },
    ];

    const sorted = sortDeadlinesByPriority(deadlines);
    expect(sorted[0].documentCode).toBe('EXPIRED');
    expect(sorted[1].documentCode).toBe('WARNING');
    expect(sorted[2].documentCode).toBe('OK');
  });
});

// ============================================
// TESTS: LEGACY COMPATIBILITY (ZERO RÉGRESSION)
// ============================================

describe('mapLegacyToComplianceDeadlines - ZERO RÉGRESSION', () => {
  
  describe('Véhicule POIDS_LOURD (Legacy)', () => {
    it('should calculate CT +1 year for PL', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleBase);
      const ct = deadlines.find(d => d.documentCode === 'CT_PL' || d.documentCode === 'CT');
      
      expect(ct).toBeDefined();
      expect(ct?.frequencyMonths).toBe(12);
    });

    it('should calculate TACHY +2 years for PL', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleBase);
      const tachy = deadlines.find(d => d.documentCode === 'TACHY');
      
      expect(tachy).toBeDefined();
      expect(tachy?.frequencyMonths).toBe(24);
    });

    it('should NOT include ATP for PL standard', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleBase);
      const atp = deadlines.find(d => d.documentCode === 'ATP');
      
      expect(atp).toBeUndefined();
    });
  });

  describe('Véhicule POIDS_LOURD_FRIGO (Legacy)', () => {
    it('should calculate CT +1 year for PL Frigo', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleFrigo);
      const ct = deadlines.find(d => d.documentCode === 'CT_PL' || d.documentCode === 'CT');
      
      expect(ct).toBeDefined();
      expect(ct?.frequencyMonths).toBe(12);
    });

    it('should calculate TACHY +2 years for PL Frigo', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleFrigo);
      const tachy = deadlines.find(d => d.documentCode === 'TACHY');
      
      expect(tachy).toBeDefined();
      expect(tachy?.frequencyMonths).toBe(24);
    });

    it('should include ATP +5 years (60 months) for PL Frigo', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleFrigo);
      const atp = deadlines.find(d => d.documentCode === 'ATP');
      
      expect(atp).toBeDefined();
      expect(atp?.frequencyMonths).toBe(60); // Legacy: 5 ans
    });
  });

  describe('Véhicule VOITURE (Legacy)', () => {
    it('should calculate CT +2 years for VL', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleVL);
      const ct = deadlines.find(d => d.documentCode === 'CT_VL' || d.documentCode === 'CT');
      
      expect(ct).toBeDefined();
      expect(ct?.frequencyMonths).toBe(24);
    });

    it('should NOT include TACHY for VL', () => {
      const deadlines = mapLegacyToComplianceDeadlines(mockVehicleVL);
      const tachy = deadlines.find(d => d.documentCode === 'TACHY');
      
      expect(tachy).toBeUndefined();
    });
  });
});

// ============================================
// TESTS: NOUVEAU SYSTÈME ADR
// ============================================

describe('calculateADRDeadlines - Nouveau système', () => {
  it('should return CT, TACHY, ADR_CERT, ADR_EQUIPEMENT for ADR vehicle', () => {
    const deadlines = calculateADRDeadlines(mockVehicleBase);
    
    const codes = deadlines.map(d => d.documentCode);
    expect(codes).toContain('CT');
    expect(codes).toContain('TACHY');
    expect(codes).toContain('ADR_CERT');
    expect(codes).toContain('ADR_EQUIPEMENT');
  });

  it('should calculate ADR_CERT with 12 months frequency', () => {
    const deadlines = calculateADRDeadlines(mockVehicleBase);
    const adrCert = deadlines.find(d => d.documentCode === 'ADR_CERT');
    
    expect(adrCert).toBeDefined();
    expect(adrCert?.frequencyMonths).toBe(12);
    expect(adrCert?.documentName).toBe('Agrément ADR Véhicule');
  });

  it('should include equipment list for ADR_EQUIPEMENT', () => {
    const deadlines = calculateADRDeadlines(mockVehicleBase);
    const adrEquip = deadlines.find(d => d.documentCode === 'ADR_EQUIPEMENT');
    
    expect(adrEquip).toBeDefined();
    expect(adrEquip?.equipmentList).not.toBeNull();
    expect(adrEquip?.equipmentList).toContain('Valise ADR complète');
    expect(adrEquip?.equipmentList).toContain('Panneaux orange (2)');
  });

  it('should use provided lastCertDate for ADR_CERT calculation', () => {
    const lastCertDate = '2024-01-15';
    const deadlines = calculateADRDeadlines(mockVehicleBase, lastCertDate);
    const adrCert = deadlines.find(d => d.documentCode === 'ADR_CERT');
    
    expect(adrCert?.lastDate).toBe(lastCertDate);
    // La date d'expiration devrait être environ 2025-01-15 (12 mois après)
    expect(adrCert?.expiryDate).toContain('2025-01-');
  });
});

// ============================================
// TESTS: NOUVEAU SYSTÈME FRIGO
// ============================================

describe('calculateFrigoDeadlines - Nouveau système', () => {
  it('should return CT, TACHY, ATP, ETALONNAGE for PL Frigo', () => {
    const deadlines = calculateFrigoDeadlines(mockVehicleFrigo);
    
    const codes = deadlines.map(d => d.documentCode);
    expect(codes).toContain('CT');
    expect(codes).toContain('TACHY');
    expect(codes).toContain('ATP');
    expect(codes).toContain('ETALONNAGE');
  });

  it('should calculate ATP with 36 months frequency (nouveau système)', () => {
    const deadlines = calculateFrigoDeadlines(mockVehicleFrigo);
    const atp = deadlines.find(d => d.documentCode === 'ATP');
    
    expect(atp).toBeDefined();
    expect(atp?.frequencyMonths).toBe(36); // Nouveau: 3 ans
  });

  it('should calculate ETALONNAGE with 12 months frequency', () => {
    const deadlines = calculateFrigoDeadlines(mockVehicleFrigo);
    const etalonnage = deadlines.find(d => d.documentCode === 'ETALONNAGE');
    
    expect(etalonnage).toBeDefined();
    expect(etalonnage?.frequencyMonths).toBe(12);
    expect(etalonnage?.documentName).toBe('Étalonnage température');
  });

  it('should include equipment list for ETALONNAGE', () => {
    const deadlines = calculateFrigoDeadlines(mockVehicleFrigo);
    const etalonnage = deadlines.find(d => d.documentCode === 'ETALONNAGE');
    
    expect(etalonnage?.equipmentList).not.toBeNull();
    expect(etalonnage?.equipmentList).toContain('Sondes de température');
    expect(etalonnage?.equipmentList).toContain('Enregistreur');
  });

  it('should NOT include TACHY for REMORQUE_FRIGO (sans moteur)', () => {
    const remorqueFrigo: VehicleComplianceData = {
      ...mockVehicleFrigo,
      type: 'REMORQUE_FRIGO',
      tachy_control_date: null,
      tachy_control_expiry: null,
    };
    
    const deadlines = calculateFrigoDeadlines(remorqueFrigo);
    const tachy = deadlines.find(d => d.documentCode === 'TACHY');
    
    expect(tachy).toBeUndefined();
  });
});

// ============================================
// TESTS: INTÉGRATION
// ============================================

describe('Intégration - Comportement hybride', () => {
  it('should handle vehicle with all dates null gracefully', () => {
    const emptyVehicle: VehicleComplianceData = {
      id: 'v-empty',
      company_id: 'c-test',
      type: 'POIDS_LOURD',
      technical_control_date: null,
      technical_control_expiry: null,
      tachy_control_date: null,
      tachy_control_expiry: null,
      atp_date: null,
      atp_expiry: null,
    };

    const deadlines = mapLegacyToComplianceDeadlines(emptyVehicle);
    
    // Devrait quand même retourner des échéances calculées à partir d'aujourd'hui
    expect(deadlines.length).toBeGreaterThan(0);
    expect(deadlines[0].expiryDate).toBeDefined();
  });

  it('should correctly determine status based on daysLeft', () => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    const vehicleWithExpiredCT: VehicleComplianceData = {
      ...mockVehicleBase,
      technical_control_expiry: yesterday.toISOString().split('T')[0],
    };

    const deadlines = mapLegacyToComplianceDeadlines(vehicleWithExpiredCT);
    const ct = deadlines.find(d => d.documentCode.includes('CT'));
    
    expect(ct?.status).toBe('EXPIRED');
    expect(ct?.daysLeft).toBeLessThan(0);
  });
});
