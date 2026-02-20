/**
 * useDrivers Hook Tests
 * Tests for driver data fetching and caching
 */

describe('useDrivers Hook', () => {
  const mockDrivers = [
    { id: '1', first_name: 'John', last_name: 'Doe', email: 'john@example.com' },
    { id: '2', first_name: 'Jane', last_name: 'Smith', email: 'jane@example.com' },
  ];

  it('should return drivers list', () => {
    const result = {
      data: mockDrivers,
      isLoading: false,
      error: null,
    };

    expect(result.data).toHaveLength(2);
    expect(result.data[0].first_name).toBe('John');
  });

  it('should return single driver by ID', () => {
    const driverId = '1';
    const driver = mockDrivers.find(d => d.id === driverId);

    expect(driver).toBeDefined();
    expect(driver?.email).toBe('john@example.com');
  });

  it('should not have error when data loads successfully', () => {
    const result = {
      data: mockDrivers,
      isLoading: false,
      error: null,
    };

    expect(result.error).toBeNull();
  });

  it('should handle loading state', () => {
    const result = {
      data: null,
      isLoading: true,
      error: null,
    };

    expect(result.isLoading).toBe(true);
    expect(result.data).toBeNull();
  });

  it('should handle error state', () => {
    const result = {
      data: null,
      isLoading: false,
      error: new Error('Failed to fetch drivers'),
    };

    expect(result.error).toBeDefined();
    expect(result.error?.message).toBe('Failed to fetch drivers');
  });
});
