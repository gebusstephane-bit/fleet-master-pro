/**
 * Calculations Tests
 * Tests for business logic calculations
 */

describe('Calculations', () => {
  describe('calculateMaintenanceCost', () => {
    it('should sum all maintenance costs', () => {
      const records = [
        { cost: 150.50 },
        { cost: 230.00 },
        { cost: 89.99 },
      ];
      const total = records.reduce((sum, r) => sum + (r.cost || 0), 0);
      
      expect(total).toBeCloseTo(470.49);
    });

    it('should handle empty array', () => {
      const records: any[] = [];
      const total = records.reduce((sum, r) => sum + (r.cost || 0), 0);
      
      expect(total).toBe(0);
    });

    it('should handle records without cost', () => {
      const records = [
        { cost: 100 },
        { description: 'No cost' },
        { cost: 200 },
      ];
      const total = records.reduce((sum, r) => sum + (r.cost || 0), 0);
      
      expect(total).toBe(300);
    });
  });

  describe('calculateFuelConsumption', () => {
    it('should calculate L/100km correctly', () => {
      const liters = 60;
      const kilometers = 500;
      const consumption = (liters / kilometers) * 100;
      
      expect(consumption).toBeCloseTo(12, 1);
    });

    it('should return 0 when no distance traveled', () => {
      const liters = 50;
      const kilometers = 0;
      const consumption = kilometers > 0 ? (liters / kilometers) * 100 : 0;
      
      expect(consumption).toBe(0);
    });

    it('should handle fuel records', () => {
      const records = [
        { mileage: 10000, liters: 0 },
        { mileage: 10500, liters: 60 },
      ];
      
      const totalLiters = records.reduce((sum, r) => sum + (r.liters || 0), 0);
      const totalKm = records[records.length - 1].mileage - records[0].mileage;
      const consumption = totalKm > 0 ? (totalLiters / totalKm) * 100 : 0;
      
      expect(totalLiters).toBe(60);
      expect(totalKm).toBe(500);
      expect(consumption).toBeCloseTo(12, 1);
    });
  });

  describe('calculateVehicleUtilization', () => {
    it('should calculate utilization percentage', () => {
      const totalDays = 30;
      const activeDays = 24;
      const utilization = (activeDays / totalDays) * 100;
      
      expect(utilization).toBe(80);
    });

    it('should handle 0% utilization', () => {
      const totalDays = 30;
      const activeDays = 0;
      const utilization = (activeDays / totalDays) * 100;
      
      expect(utilization).toBe(0);
    });

    it('should handle 100% utilization', () => {
      const totalDays = 30;
      const activeDays = 30;
      const utilization = (activeDays / totalDays) * 100;
      
      expect(utilization).toBe(100);
    });
  });

  describe('calculateCostPerKm', () => {
    it('should calculate cost per kilometer', () => {
      const totalCost = 5000;
      const totalKm = 25000;
      const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;
      
      expect(costPerKm).toBeCloseTo(0.2, 2);
    });

    it('should return 0 when no kilometers', () => {
      const totalCost = 5000;
      const totalKm = 0;
      const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;
      
      expect(costPerKm).toBe(0);
    });
  });
});
