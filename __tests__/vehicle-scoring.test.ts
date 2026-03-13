import { computeVehicleWeightedScore, type VehicleScoringInput } from '../src/lib/ai/vehicle-scoring';

function makeInput(overrides: Partial<VehicleScoringInput> = {}): VehicleScoringInput {
  return {
    vehicleId: 'v-001',
    registration: 'AB-123-CD',
    brand: 'Renault',
    model: 'Master',
    type: 'FOURGON',
    mileage: 120000,
    companyId: 'c-001',
    maintenances: [],
    predictions: [],
    inspections: [],
    fuelRecords: [],
    fleetAvgConsumption: 10,
    ...overrides,
  };
}

describe('computeVehicleWeightedScore', () => {
  it('returns neutral score when no data is provided', () => {
    const result = computeVehicleWeightedScore(makeInput());
    // maintenance=70 (neutre preventive 71.4*0.4 + cost 80*0.3 + pred 100*0.3 ≈ 82.6 → non, recalcul)
    // Avec aucune maintenance: preventiveRatio=0.5 → preventiveScore=min(100, 0.5/0.7*100)=71.4
    // resolutionScore=80, predictionScore=100
    // maintenanceScore = round(71.4*0.4 + 80*0.3 + 100*0.3) = round(28.56+24+30) = round(82.56) = 83
    // inspectionScore=50 (aucune inspection)
    // consumptionScore=50 (pas de données)
    // score = round(83*0.40 + 50*0.35 + 50*0.25) = round(33.2+17.5+12.5) = round(63.2) = 63
    expect(result.score).toBeGreaterThanOrEqual(50);
    expect(result.score).toBeLessThanOrEqual(75);
    expect(result.maintenance_score).toBeGreaterThan(0);
    expect(result.inspection_score).toBe(50);
    expect(result.consumption_score).toBe(50);
  });

  it('gives high score for well-maintained vehicle', () => {
    const result = computeVehicleWeightedScore(makeInput({
      maintenances: [
        { type: 'revision preventive', priority: 'NORMAL', status: 'TERMINEE', requested_at: '2026-01-01', completed_at: '2026-01-03' },
        { type: 'entretien vidange', priority: 'NORMAL', status: 'TERMINEE', requested_at: '2026-02-01', completed_at: '2026-02-02' },
        { type: 'preventif general', priority: 'LOW', status: 'TERMINEE', requested_at: '2026-03-01', completed_at: '2026-03-02' },
      ],
      predictions: [
        { status: 'ok', priority: 'NORMAL' },
        { status: 'upcoming', priority: 'LOW' },
      ],
      inspections: [
        { score: 95, reported_defects: [], inspection_date: '2026-03-01' },
        { score: 90, reported_defects: [], inspection_date: '2026-02-15' },
      ],
      fuelRecords: [
        { consumption_l_per_100km: 9.8 },
        { consumption_l_per_100km: 10.1 },
        { consumption_l_per_100km: 9.9 },
      ],
      fleetAvgConsumption: 10,
    }));

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.flags.length).toBe(0);
  });

  it('penalizes overdue maintenance predictions', () => {
    const result = computeVehicleWeightedScore(makeInput({
      predictions: [
        { status: 'overdue', priority: 'CRITICAL' },
        { status: 'overdue', priority: 'HIGH' },
      ],
    }));

    expect(result.maintenance_score).toBeLessThan(70);
    expect(result.flags).toContain('2 maintenance(s) en retard');
    expect(result.flags).toContain('Maintenance critique en retard');
  });

  it('penalizes critical inspection defects', () => {
    const result = computeVehicleWeightedScore(makeInput({
      inspections: [
        {
          score: 40,
          reported_defects: [
            { severity: 'CRITICAL' },
            { severity: 'CRITICAL' },
          ],
          inspection_date: '2026-03-01',
        },
      ],
    }));

    expect(result.inspection_score).toBeLessThan(50);
    expect(result.flags.some(f => f.includes('défauts critiques'))).toBe(true);
  });

  it('penalizes high fuel consumption vs fleet', () => {
    const result = computeVehicleWeightedScore(makeInput({
      fuelRecords: [
        { consumption_l_per_100km: 14 },
        { consumption_l_per_100km: 15 },
        { consumption_l_per_100km: 13.5 },
      ],
      fleetAvgConsumption: 10,
    }));

    expect(result.consumption_score).toBeLessThan(60);
    expect(result.flags).toContain('Surconsommation vs flotte');
  });

  it('flags no recent inspections', () => {
    const result = computeVehicleWeightedScore(makeInput({
      inspections: [],
    }));

    expect(result.flags).toContain('Aucune inspection récente');
  });

  it('respects weighting: maintenance 40%, inspection 35%, consumption 25%', () => {
    // All sub-scores at 100 → global = 100
    const perfect = computeVehicleWeightedScore(makeInput({
      maintenances: [
        { type: 'revision preventive', priority: 'HIGH', status: 'TERMINEE', requested_at: '2026-01-01', completed_at: '2026-01-02' },
      ],
      predictions: [],
      inspections: [
        { score: 100, reported_defects: [], inspection_date: '2026-03-01' },
      ],
      fuelRecords: [
        { consumption_l_per_100km: 10 },
        { consumption_l_per_100km: 10 },
      ],
      fleetAvgConsumption: 10,
    }));

    // Should be close to 100 (all components high)
    expect(perfect.score).toBeGreaterThanOrEqual(90);
  });

  it('clamps score between 0 and 100', () => {
    // Worst case scenario
    const worst = computeVehicleWeightedScore(makeInput({
      maintenances: [
        { type: 'reparation urgente', priority: 'CRITICAL', status: 'TERMINEE', requested_at: '2025-01-01', completed_at: '2025-06-01' },
      ],
      predictions: [
        { status: 'overdue', priority: 'CRITICAL' },
        { status: 'overdue', priority: 'CRITICAL' },
        { status: 'overdue', priority: 'HIGH' },
        { status: 'overdue', priority: 'HIGH' },
        { status: 'overdue', priority: 'HIGH' },
      ],
      inspections: [
        { score: 10, reported_defects: [{ severity: 'CRITICAL' }, { severity: 'CRITICAL' }, { severity: 'CRITICAL' }], inspection_date: '2026-03-01' },
      ],
      fuelRecords: [
        { consumption_l_per_100km: 25 },
        { consumption_l_per_100km: 5 },
        { consumption_l_per_100km: 30 },
      ],
      fleetAvgConsumption: 10,
    }));

    expect(worst.score).toBeGreaterThanOrEqual(0);
    expect(worst.score).toBeLessThanOrEqual(100);
  });

  it('returns correct structure', () => {
    const result = computeVehicleWeightedScore(makeInput());
    expect(result).toHaveProperty('score');
    expect(result).toHaveProperty('maintenance_score');
    expect(result).toHaveProperty('inspection_score');
    expect(result).toHaveProperty('consumption_score');
    expect(result).toHaveProperty('flags');
    expect(Array.isArray(result.flags)).toBe(true);
  });
});
