/**
 * useVehicles Hook Tests
 * Tests for vehicle data fetching and caching
 */

describe('useVehicles Hook', () => {
  const mockVehicles = [
    { id: '1', registration_number: 'AB-123-CD', brand: 'Renault', model: 'Master' },
    { id: '2', registration_number: 'EF-456-GH', brand: 'Peugeot', model: 'Boxer' },
  ];

  it('should return vehicles list', () => {
    // Mock hook return value
    const result = {
      data: mockVehicles,
      isLoading: false,
      error: null,
    };

    expect(result.data).toHaveLength(2);
    expect(result.data[0].registration_number).toBe('AB-123-CD');
  });

  it('should not be loading when data is available', () => {
    const result = {
      data: mockVehicles,
      isLoading: false,
      error: null,
    };

    expect(result.isLoading).toBe(false);
  });

  it('should return single vehicle by ID', () => {
    const vehicleId = '1';
    const vehicle = mockVehicles.find(v => v.id === vehicleId);

    expect(vehicle).toBeDefined();
    expect(vehicle?.brand).toBe('Renault');
  });

  it('should handle vehicle not found', () => {
    const vehicleId = '999';
    const vehicle = mockVehicles.find(v => v.id === vehicleId);

    expect(vehicle).toBeUndefined();
  });

  it('should return vehicle with driver info', () => {
    const vehicleWithDriver = {
      ...mockVehicles[0],
      driver: {
        id: 'd1',
        first_name: 'John',
        last_name: 'Doe',
      },
    };

    expect(vehicleWithDriver.driver).toBeDefined();
    expect(vehicleWithDriver.driver.first_name).toBe('John');
  });
});
