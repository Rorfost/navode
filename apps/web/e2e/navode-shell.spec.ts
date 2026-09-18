import { expect, test } from '@playwright/test';

test('renders the public landing page and privacy navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /new tab that knows/i })).toBeVisible();
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: /your navode data stays local/i })).toBeVisible();
});

test('executes a GitHub search alias from the command bar', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('textbox', { name: 'What do you want to do?' }).fill('gh navode');

  const popup = page.waitForEvent('popup');
  await page.getByRole('textbox', { name: 'What do you want to do?' }).press('Enter');

  await expect(await popup).toHaveURL('https://github.com/search?q=navode');
});
