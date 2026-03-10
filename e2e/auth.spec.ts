/**
 * Tests E2E — Flux d'authentification
 *
 * Couvre :
 * - Inscription avec email valide (formulaire 3 étapes) → /onboarding
 * - Inscription avec email déjà existant → message d'erreur
 * - Connexion valide → /dashboard
 * - Connexion invalide → message d'erreur
 *
 * Prérequis :
 * - Variables d'env : NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
 * - Pour le test de login valide : E2E_TEST_EMAIL et E2E_TEST_PASSWORD dans .env.test
 */

import { test, expect, request, type Page } from '@playwright/test';
import { TEST_USERS, generateTestEmail } from './fixtures/test-data';

// ---------------------------------------------------------------------------
// Credentials de test pour le login valide
// Priorité : variables d'env explicites > TEST_USERS hardcodés
// ---------------------------------------------------------------------------
const E2E_EMAIL = process.env.E2E_TEST_EMAIL ?? TEST_USERS.companyA.email;
const E2E_PASSWORD = process.env.E2E_TEST_PASSWORD ?? TEST_USERS.companyA.password;
const HAS_LOGIN_CREDS = Boolean(process.env.E2E_TEST_EMAIL && process.env.E2E_TEST_PASSWORD);

const BASE_URL =
  process.env.PLAYWRIGHT_TEST_BASE_URL ?? 'http://localhost:3000';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Supprime les éléments fixes en bas de page (CookieBanner, CTA flottant…)
 * qui interceptent les pointer events sur les boutons du formulaire.
 */
async function removeFixedOverlays(page: Page) {
  await page.evaluate(() => {
    document
      .querySelectorAll('div.fixed.bottom-0, div[class*="fixed bottom-0"]')
      .forEach((el) => el.remove());
  });
}

/** Clique en forçant l'action (bypass vérification de stabilité CSS). */
async function forceClick(page: Page, selector: string) {
  await page.locator(selector).waitFor({ state: 'visible' });
  await page.locator(selector).click({ force: true });
}

/** Génère un SIRET de test unique à 14 chiffres basé sur le timestamp. */
function generateTestSiret(): string {
  // Date.now() retourne 13 chiffres en 2026 → on préfixe d'un '0'
  return ('0' + Date.now()).slice(-14);
}

/** Remplit et valide l'étape 1 du formulaire d'inscription. */
async function fillRegisterStep1(page: Page, opts: { email: string; siret?: string }) {
  await page.fill('#companyName', 'Fleet E2E Corp');
  // SIRET unique par run pour éviter la contrainte unique companies_siret_key
  await page.fill('#siret', opts.siret ?? `${Date.now()}`.padEnd(14, '0').slice(0, 14));
  await page.fill('#firstName', 'E2E');
  await page.fill('#lastName', 'Test');
  await page.fill('#email', opts.email);
  await page.fill('#phone', '0600000001');
  await removeFixedOverlays(page);
  // Bouton "Suivant" étape 1 (type="button", pas submit)
  await forceClick(page, 'button:has-text("Suivant")');
}

/** Remplit et valide l'étape 2 du formulaire d'inscription. */
async function fillRegisterStep2(page: Page, password = 'TestPassword123!') {
  await page.fill('#password', password);
  await page.fill('#confirmPassword', password);
  await removeFixedOverlays(page);
  await forceClick(page, 'button:has-text("Suivant")');
}

/** Coche les CGU et soumet l'étape 3. */
async function submitRegisterStep3(page: Page) {
  await page.locator('#acceptTerms').click({ force: true });
  await removeFixedOverlays(page);
  await forceClick(page, 'button:has-text("Créer mon compte")');
}

/**
 * Locator du message d'erreur dans un formulaire.
 * Cible le composant shadcn <Alert> (role="alert") scopé au <form>
 * pour ne pas matcher d'autres alertes de la page.
 */
function formErrorLocator(page: Page) {
  return page.locator('form [role="alert"]').first();
}

/**
 * Appelle la route de cleanup E2E pour supprimer les données créées par un test.
 * Logge la réponse pour faciliter le diagnostic.
 */
async function cleanupTestUser(email: string) {
  console.log('[TEST] Appel cleanup pour email:', email);
  try {
    const ctx = await request.newContext({ baseURL: BASE_URL });
    const res = await ctx.post('/api/e2e/cleanup', { data: { email } });
    const body = await res.json().catch(() => null);
    console.log('[TEST] Réponse cleanup:', res.status(), body);
    await ctx.dispose();
  } catch (err) {
    // Cleanup best-effort : ne pas faire échouer le test si la route est indisponible
    console.error('[TEST] Cleanup exception:', err);
  }
}

// ---------------------------------------------------------------------------
// Inscription
// ---------------------------------------------------------------------------

test.describe('Inscription', () => {
  // Email et SIRET uniques par run — stockés pour le cleanup afterAll
  let createdEmail = '';

  test.afterAll(async () => {
    if (createdEmail) {
      await cleanupTestUser(createdEmail);
    }
  });

  test('email valide → redirection vers /onboarding', async ({ page }) => {
    test.setTimeout(60_000);

    // Email ET SIRET uniques : évite les contraintes unique en DB entre les runs
    createdEmail = generateTestEmail();
    const siret = generateTestSiret();

    await page.goto('/register');
    await expect(page).toHaveURL(/.*register/);

    await fillRegisterStep1(page, { email: createdEmail, siret });
    await fillRegisterStep2(page);
    await submitRegisterStep3(page);

    // RegisterForm.tsx : router.push('/onboarding') après succès
    await page.waitForURL(/.*onboarding.*/, { timeout: 30_000 });
    await expect(page).toHaveURL(/.*onboarding.*/);
  });

  test("email déjà existant → message d'erreur affiché", async ({ page }) => {
    // Utilise un email existant connu ; l'API retourne 409 avec
    // { error: 'Un compte existe déjà avec cet email' }
    const existingEmail = TEST_USERS.companyA.email;

    await page.goto('/register');

    await fillRegisterStep1(page, { email: existingEmail, siret: generateTestSiret() });
    await fillRegisterStep2(page);
    await submitRegisterStep3(page);

    // RegisterForm.tsx affiche le message via shadcn <Alert><AlertDescription>
    await expect(formErrorLocator(page)).toBeVisible({ timeout: 10_000 });
    await expect(formErrorLocator(page)).toContainText(/déjà|existe|taken|email|abonnement|erreur/i);

    // Pas de redirection : on reste sur /register
    await expect(page).toHaveURL(/.*register/);
  });
});

// ---------------------------------------------------------------------------
// Connexion
// ---------------------------------------------------------------------------

test.describe('Connexion', () => {
  test('credentials valides → accès au dashboard', async ({ page }) => {
    test.skip(
      !HAS_LOGIN_CREDS,
      'Skippé : définir E2E_TEST_EMAIL et E2E_TEST_PASSWORD dans .env.test'
    );

    await page.goto('/login');

    await page.fill('#email', E2E_EMAIL);
    await page.fill('#password', E2E_PASSWORD);
    await removeFixedOverlays(page);
    await page.locator('button[type="submit"]').waitFor({ state: 'visible' });
    await page.locator('button[type="submit"]').click({ force: true });

    // LoginForm : window.location.assign('/dashboard') après succès
    await page.waitForURL(/.*dashboard.*|.*driver-app.*/, { timeout: 30_000 });
    expect(page.url()).toMatch(/dashboard|driver-app/);
  });

  test("credentials invalides → message d'erreur affiché", async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', 'nobody@invalid-domain-e2e.com');
    await page.fill('#password', 'WrongPassword999!');
    await removeFixedOverlays(page);
    await page.locator('button[type="submit"]').waitFor({ state: 'visible' });
    await page.locator('button[type="submit"]').click({ force: true });

    // LoginForm : 'Invalid login credentials' → "Email ou mot de passe incorrect"
    // Affiché via <Alert className="bg-red-500/10 ..."><AlertDescription>
    await expect(formErrorLocator(page)).toBeVisible({ timeout: 10_000 });
    await expect(formErrorLocator(page)).toContainText(/incorrect|invalide|erreur|invalid/i);

    // Reste sur /login
    await expect(page).toHaveURL(/.*login/);
  });

  test('email invalide → erreur de validation Zod côté client', async ({ page }) => {
    await page.goto('/login');

    // L'input est type="email" : le navigateur bloquerait la soumission avec sa
    // propre validation HTML5 avant que Zod/RHF ne tourne.
    // On ajoute novalidate au formulaire pour laisser React Hook Form gérer seul.
    await page.evaluate(() => {
      document.querySelector('form')?.setAttribute('novalidate', '');
    });

    await page.fill('#email', 'not-an-email');
    await page.fill('#password', 'SomePassword1!');
    await removeFixedOverlays(page);
    await page.locator('button[type="submit"]').waitFor({ state: 'visible' });
    await page.locator('button[type="submit"]').click({ force: true });

    // login-form.tsx l.152 : <p className="text-sm text-red-400">{errors.email.message}</p>
    // Zod schema : z.string().email('Adresse email invalide')
    await expect(
      page.locator('p.text-sm.text-red-400').first()
    ).toBeVisible({ timeout: 5_000 });

    await expect(page).toHaveURL(/.*login/);
  });
});
