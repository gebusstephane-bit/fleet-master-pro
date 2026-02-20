import { z } from 'zod';

// Vehicle validation schema
const vehicleSchema = z.object({
  registrationNumber: z.string()
    .min(1, 'La plaque est requise')
    .regex(/^[A-Z]{2}-\d{3}-[A-Z]{2}$/, 'Format invalide (XX-123-XX)'),
  brand: z.string().min(1, 'La marque est requise'),
  model: z.string().min(1, 'Le modèle est requis'),
  year: z.number().int().min(1900).max(new Date().getFullYear() + 1),
  mileage: z.number().int().min(0),
});

// Driver validation schema
const driverSchema = z.object({
  firstName: z.string().min(2, 'Prénom trop court'),
  lastName: z.string().min(2, 'Nom trop court'),
  email: z.string().email('Email invalide'),
  phone: z.string().regex(/^\+?[\d\s-]{10,}$/, 'Téléphone invalide'),
  licenseNumber: z.string().min(5, 'Numéro de permis invalide'),
});

describe('Validation Schemas', () => {
  describe('Vehicle Schema', () => {
    it('should validate correct vehicle data', () => {
      const validVehicle = {
        registrationNumber: 'AB-123-CD',
        brand: 'Renault',
        model: 'Master',
        year: 2020,
        mileage: 50000,
      };
      
      const result = vehicleSchema.safeParse(validVehicle);
      expect(result.success).toBe(true);
    });

    it('should reject invalid registration format', () => {
      const invalidVehicle = {
        registrationNumber: 'INVALID',
        brand: 'Renault',
        model: 'Master',
        year: 2020,
        mileage: 50000,
      };
      
      const result = vehicleSchema.safeParse(invalidVehicle);
      expect(result.success).toBe(false);
    });

    it('should reject missing required fields', () => {
      const incompleteVehicle = {
        registrationNumber: 'AB-123-CD',
        brand: '',
        model: 'Master',
      };
      
      const result = vehicleSchema.safeParse(incompleteVehicle);
      expect(result.success).toBe(false);
    });
  });

  describe('Driver Schema', () => {
    it('should validate correct driver data', () => {
      const validDriver = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phone: '+33612345678',
        licenseNumber: '123456789',
      };
      
      const result = driverSchema.safeParse(validDriver);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email', () => {
      const invalidDriver = {
        firstName: 'John',
        lastName: 'Doe',
        email: 'not-an-email',
        phone: '+33612345678',
        licenseNumber: '123456789',
      };
      
      const result = driverSchema.safeParse(invalidDriver);
      expect(result.success).toBe(false);
    });

    it('should reject short names', () => {
      const invalidDriver = {
        firstName: 'J',
        lastName: 'Doe',
        email: 'john@example.com',
        phone: '+33612345678',
        licenseNumber: '123456789',
      };
      
      const result = driverSchema.safeParse(invalidDriver);
      expect(result.success).toBe(false);
    });
  });
});
