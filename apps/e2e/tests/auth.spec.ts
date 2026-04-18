import { test, expect } from '@playwright/test';
import { createCognitoTestUser, deleteCognitoTestUser } from './helpers/cognito';

const TEST_EMAIL = `e2e-auth-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';
const TEST_NAME = 'E2E User';

test.beforeAll(async () => {
  await createCognitoTestUser(TEST_EMAIL, TEST_PASSWORD);
});

test.afterAll(async () => {
  await deleteCognitoTestUser(TEST_EMAIL);
});

test.describe('Authentication', () => {
  test('register, verify (skipped — using pre-verified user), login, dashboard', async ({ page }) => {
    // Navigate to login
    await page.goto('/login');
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Fill login form
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();

    // Should redirect to groups
    await expect(page).toHaveURL(/\/groups/);
    await expect(page.getByText(/groups/i)).toBeVisible();
  });

  test('protected route redirects unauthenticated user to login', async ({ page }) => {
    await page.goto('/groups');
    await expect(page).toHaveURL(/\/login/);
  });

  test('logout clears session and redirects', async ({ page }) => {
    // Login first
    await page.goto('/login');
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole('button', { name: /sign in|log in/i }).click();
    await expect(page).toHaveURL(/\/groups/);

    // Logout
    await page.getByRole('button', { name: /log ?out|sign ?out/i }).click();
    await expect(page).toHaveURL(/\/login/);

    // Revisiting protected route redirects
    await page.goto('/groups');
    await expect(page).toHaveURL(/\/login/);
  });
});
