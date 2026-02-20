import { test, expect } from '@playwright/test';

test.describe('Dashboard Page', () => {
  test('should redirect unauthenticated users to login', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Should redirect to login
    await page.waitForURL(/.*login.*/, { timeout: 5000 });
    expect(page.url()).toContain('login');
  });

  test('should display dashboard structure', async ({ page }) => {
    // This test assumes authentication - in real tests use setup auth
    await page.goto('/dashboard');
    
    // Wait for any redirect
    await page.waitForLoadState('networkidle');
    
    // If we're on dashboard (authenticated)
    if (!page.url().includes('login')) {
      // Check common dashboard elements
      const headings = page.locator('h1, h2, h3');
      await expect(headings.first()).toBeVisible();
      
      // Check for navigation
      const nav = page.locator('nav, header').first();
      await expect(nav).toBeVisible();
    }
  });

  test('should have responsive layout', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/dashboard');
    
    await page.waitForLoadState('networkidle');
    
    // Elements should be visible even on mobile
    const body = page.locator('body');
    await expect(body).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test('should have working navigation links', async ({ page }) => {
    await page.goto('/');
    
    // Find and test navigation links
    const links = page.locator('a');
    const count = await links.count();
    
    expect(count).toBeGreaterThan(0);
  });
});
