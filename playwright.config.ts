import { defineConfig, devices } from '@playwright/test';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Charger les variables d'environnement de test
const envPath = path.resolve(__dirname, '.env.test');
dotenv.config({ path: envPath });
dotenv.config(); // Fallback sur .env

/**
 * Playwright configuration for FleetMaster Pro E2E tests
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: !process.env.CI, // Séquentiel en CI pour éviter les conflits
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
    process.env.CI ? ['github'] : ['null'],
  ],
  timeout: 60000, // 60s par test
  expect: {
    timeout: 10000, // 10s pour les assertions
  },
  
  use: {
    baseURL: process.env.PLAYWRIGHT_TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'on-first-retry',
    
    // Action timeouts
    actionTimeout: 15000,
    navigationTimeout: 30000,
    
    // Viewport par défaut
    viewport: { width: 1280, height: 720 },
    
    // Permissions
    permissions: ['geolocation'],
  },

  projects: [
    // Tests critiques - Chromium uniquement (rapide)
    {
      name: 'critical-chromium',
      testMatch: /critical-flows.spec.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    
    // Tests de base - Multi-navigateurs
    {
      name: 'chromium',
      testIgnore: /critical-flows.spec.ts/,
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      testIgnore: /critical-flows.spec.ts/,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      testIgnore: /critical-flows.spec.ts/,
      use: { ...devices['Desktop Safari'] },
    },
    
    // Tests mobiles (optionnel)
    {
      name: 'Mobile Chrome',
      testIgnore: /critical-flows.spec.ts/,
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      testIgnore: /critical-flows.spec.ts/,
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
  
  // Répertoire de sortie
  outputDir: 'test-results/',
});
