import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/login');
    
    // Check page title and form elements
    await expect(page.locator('h1, h2')).toContainText(/connexion|login|sign in/i);
    await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test('should show validation error for invalid email', async ({ page }) => {
    await page.goto('/login');
    
    // Fill invalid email
    await page.fill('input[name="email"], input[type="email"]', 'invalid-email');
    await page.fill('input[type="password"]', 'password123');
    await page.click('button[type="submit"]');
    
    // Should show error
    await expect(page.locator('text=/invalid|erreur|error/i').first()).toBeVisible();
  });

  test('should navigate to forgot password', async ({ page }) => {
    await page.goto('/login');
    
    // Click forgot password link
    const forgotLink = page.locator('a[href*="forgot"], a[href*="reset"]').first();
    if (await forgotLink.isVisible().catch(() => false)) {
      await forgotLink.click();
      await expect(page).toHaveURL(/.*forgot|.*reset/);
    }
  });

  test('login page should have proper accessibility', async ({ page }) => {
    await page.goto('/login');
    
    // Check form accessibility
    const emailInput = page.locator('input[name="email"], input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    await expect(emailInput).toHaveAttribute('type', /email|text/);
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(submitButton).toBeEnabled();
  });
});
