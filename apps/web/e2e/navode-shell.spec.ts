import { expect, test } from '@playwright/test';

test('renders the command shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Navode' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What do you want to do?' })).toBeFocused();
});

test('executes a GitHub search alias from the command bar', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  await page.getByRole('textbox', { name: 'What do you want to do?' }).fill('gh navode');

  const popup = page.waitForEvent('popup');
  await page.getByRole('textbox', { name: 'What do you want to do?' }).press('Enter');

  await expect(await popup).toHaveURL('https://github.com/search?q=navode');
});
