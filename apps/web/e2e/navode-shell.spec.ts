import { expect, test } from '@playwright/test';

test('renders the command shell', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Navode' })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'What do you want to do?' })).toBeFocused();
});
