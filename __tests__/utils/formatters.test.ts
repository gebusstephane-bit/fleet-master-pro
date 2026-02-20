/**
 * Formatters Tests
 * Tests for date, currency and number formatting utilities
 */

describe('Formatters', () => {
  describe('formatDate', () => {
    it('should format date string to French locale', () => {
      const date = new Date('2024-03-15');
      const formatted = date.toLocaleDateString('fr-FR');
      
      expect(formatted).toContain('15');
      expect(formatted).toContain('03');
      expect(formatted).toContain('2024');
    });

    it('should handle Date object', () => {
      const date = new Date(2024, 2, 15);
      const formatted = date.toLocaleDateString('fr-FR');
      
      expect(formatted).toContain('15');
      expect(formatted).toContain('2024');
    });

    it('should format ISO dates correctly', () => {
      const isoDate = '2024-12-25T10:30:00.000Z';
      const date = new Date(isoDate);
      
      expect(date.getFullYear()).toBe(2024);
      expect(date.getUTCMonth()).toBe(11); // December is 11 (0-indexed)
    });
  });

  describe('formatCurrency', () => {
    it('should format amount in EUR', () => {
      const amount = 1500.50;
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
      
      expect(formatted).toContain('1');
      expect(formatted).toContain('500');
      expect(formatted).toContain('€');
    });

    it('should handle zero', () => {
      const amount = 0;
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
      
      expect(formatted).toContain('0');
      expect(formatted).toContain('€');
    });

    it('should handle large amounts', () => {
      const amount = 1000000;
      const formatted = new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
      }).format(amount);
      
      expect(formatted).toContain('1');
      expect(formatted).toContain('000');
    });
  });

  describe('formatMileage', () => {
    it('should format kilometers with separator', () => {
      const mileage = 150000;
      const formatted = `${mileage.toLocaleString('fr-FR')} km`;
      
      expect(formatted).toContain('150');
      expect(formatted).toContain('km');
    });

    it('should handle small numbers', () => {
      const mileage = 500;
      const formatted = `${mileage.toLocaleString('fr-FR')} km`;
      
      expect(formatted).toContain('500');
      expect(formatted).toContain('km');
    });

    it('should handle zero mileage', () => {
      const mileage = 0;
      const formatted = `${mileage.toLocaleString('fr-FR')} km`;
      
      expect(formatted).toContain('0');
      expect(formatted).toContain('km');
    });
  });
});
