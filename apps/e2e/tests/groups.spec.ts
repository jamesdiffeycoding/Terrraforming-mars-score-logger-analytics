import { test, expect, Page } from '@playwright/test';
import { createCognitoTestUser, deleteCognitoTestUser } from './helpers/cognito';

const TEST_EMAIL = `e2e-groups-${Date.now()}@example.com`;
const TEST_PASSWORD = 'TestPass123!';

async function login(page: Page) {
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(TEST_EMAIL);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/\/groups/);
}

test.beforeAll(async () => {
  await createCognitoTestUser(TEST_EMAIL, TEST_PASSWORD);
});

test.afterAll(async () => {
  await deleteCognitoTestUser(TEST_EMAIL);
});

test.describe('Groups', () => {
  test('create a new group and see it in the list', async ({ page }) => {
    await login(page);

    await page.getByRole('link', { name: /new group|create/i }).click();
    await expect(page).toHaveURL(/\/groups\/new/);

    await page.getByLabel(/name/i).fill('My E2E Group');
    await page.getByRole('button', { name: /create/i }).click();

    await expect(page).toHaveURL(/\/groups\/.+/);
    await expect(page.getByText('My E2E Group')).toBeVisible();
  });

  test('group detail shows members tab with owner', async ({ page }) => {
    await login(page);

    // Navigate to the first group
    const groupLink = page.getByRole('link').filter({ hasText: /My E2E Group/ }).first();
    await groupLink.click();

    await expect(page.getByRole('button', { name: /members/i })).toBeVisible();
    await expect(page.getByText(/owner/i)).toBeVisible();
  });

  test('games tab shows empty state and record game button', async ({ page }) => {
    await login(page);

    const groupLink = page.getByRole('link').filter({ hasText: /My E2E Group/ }).first();
    await groupLink.click();

    await page.getByRole('button', { name: /games/i }).click();
    await expect(page.getByText(/no games recorded/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /record game/i })).toBeVisible();
  });
});
