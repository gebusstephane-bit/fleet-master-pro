/**
 * Données de test pour les tests E2E
 * 
 * Ces utilisateurs doivent être créés manuellement dans Supabase Auth
 * avant de lancer les tests E2E.
 * 
 * Instructions de création:
 * 1. Créer les utilisateurs dans Supabase Auth
 * 2. Les associer à des entreprises distinctes
 * 3. Vérifier que les entreprises ont un abonnement actif
 */

export interface TestUser {
  email: string;
  password: string;
  companyId?: string;
  role?: string;
}

// ============================================
// UTILISATEURS DE TEST PRÉDÉFINIS
// ============================================

export const TEST_USERS = {
  // Super admin (accès complet)
  superadmin: {
    email: 'superadmin@test.fleetmaster.local',
    password: 'SuperAdmin123!',
    role: 'SUPERADMIN',
  } as TestUser,
  
  // Company A - utilisateur admin
  companyA: {
    email: 'company-a@test.fleetmaster.local',
    password: 'CompanyA123!',
    companyId: 'company-a-test-id',
    role: 'ADMIN',
  } as TestUser,
  
  // Company B - utilisateur admin (entreprise différente)
  companyB: {
    email: 'company-b@test.fleetmaster.local',
    password: 'CompanyB123!',
    companyId: 'company-b-test-id',
    role: 'ADMIN',
  } as TestUser,
  
  // Company A - utilisateur standard
  companyAUser: {
    email: 'user-a@test.fleetmaster.local',
    password: 'UserA123!',
    companyId: 'company-a-test-id',
    role: 'USER',
  } as TestUser,
} as const;

// ============================================
// DONNÉES DE TEST POUR VÉHICULES
// ============================================

export const TEST_VEHICLES = {
  valid: {
    brand: 'Renault',
    model: 'Master',
    type: 'Camion',
    mileage: 50000,
  },
  withInspection: {
    brand: 'Peugeot',
    model: 'Boxer',
    type: 'Camion',
    mileage: 75000,
    technicalInspectionDate: '2026-12-31',
  },
  withExpiredInspection: {
    brand: 'Citroën',
    model: 'Jumper',
    type: 'Camion',
    mileage: 100000,
    technicalInspectionDate: '2024-01-01', // Expiré
  },
} as const;

// ============================================
// DONNÉES DE TEST POUR CONDUCTEURS
// ============================================

export const TEST_DRIVERS = {
  valid: {
    firstName: 'Jean',
    lastName: 'Dupont',
    email: 'jean.dupont@test.com',
    phone: '0612345678',
  },
  withLicense: {
    firstName: 'Marie',
    lastName: 'Martin',
    email: 'marie.martin@test.com',
    phone: '0687654321',
    licenseNumber: '1234567890',
    licenseExpiry: '2027-06-15',
  },
} as const;

// ============================================
// UTILITAIRES
// ============================================

/**
 * Génère un email unique pour les tests d'inscription
 */
export function generateTestEmail(): string {
  const timestamp = Date.now();
  const random = Math.floor(Math.random() * 10000);
  return `test-${timestamp}-${random}@fleetmaster-e2e.local`;
}

/**
 * Génère une immatriculation unique
 */
export function generateTestPlate(): string {
  const timestamp = Date.now().toString().slice(-6);
  return `TEST-${timestamp}`;
}

/**
 * Vérifie que tous les utilisateurs de test sont configurés
 * À utiliser dans les tests beforeAll pour valider l'environnement
 */
export function validateTestEnvironment(): { valid: boolean; missing: string[] } {
  const required = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  return {
    valid: missing.length === 0,
    missing,
  };
}

// ============================================
// SÉLECTEURS CSS COMMUNS (pour robustesse)
// ============================================

export const SELECTORS = {
  // Auth
  emailInput: 'input[name="email"], input[type="email"]',
  passwordInput: 'input[type="password"]',
  submitButton: 'button[type="submit"]',
  
  // Navigation
  navLink: (text: string) => `nav a:has-text("${text}"), header a:has-text("${text}")`,
  
  // Formulaires véhicule
  brandInput: 'input[name="brand"], input[name="marque"]',
  modelInput: 'input[name="model"], input[name="modele"]',
  plateInput: 'input[name="registration_number"], input[name="licensePlate"], input[name="immatriculation"]',
  mileageInput: 'input[name="mileage"], input[name="kilometrage"]',
  typeSelect: 'select[name="type"], input[name="type"]',
  
  // Formulaires conducteur
  firstNameInput: 'input[name="firstName"], input[name="first_name"]',
  lastNameInput: 'input[name="lastName"], input[name="last_name"]',
  phoneInput: 'input[name="phone"], input[name="telephone"]',
  
  // Listes
  dataTable: 'table, [role="table"], .data-table',
  dataRow: 'tr, [role="row"]',
  
  // Notifications
  alert: '[role="alert"], .alert, .notification',
  successMessage: 'text=/succès|success|créé|created/i',
  errorMessage: 'text=/erreur|error|échoué|failed/i',
} as const;

// ============================================
// CONFIGURATION DES TESTS
// ============================================

export const TEST_CONFIG = {
  // Timeouts
  defaultTimeout: 30000,
  navigationTimeout: 10000,
  actionTimeout: 5000,
  
  // Retries
  retries: process.env.CI ? 2 : 1,
  
  // Base URL
  baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
  
  // Stripe Test Mode
  stripeTestCard: {
    number: '4242424242424242',
    expiry: '12/30',
    cvc: '123',
  },
  
  // Indicators
  isCI: !!process.env.CI,
  isDevelopment: process.env.NODE_ENV === 'development',
} as const;
