import { expect, test } from '@playwright/test';

test('renders the public landing page and privacy navigation', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /new tab that knows/i })).toBeVisible();
  await page.getByRole('link', { name: 'Privacy' }).first().click();
  await expect(page).toHaveURL(/\/privacy$/);
  await expect(page.getByRole('heading', { name: /your navode data stays local/i })).toBeVisible();
});

test('executes a GitHub search alias without storing the search terms', async ({ page }) => {
  await page.goto('/app');
  await page.getByRole('button', { name: 'Skip for now' }).click();
  const command = page.getByRole('combobox', { name: 'What do you want to do?' });
  await command.fill('gh navode');
  await expect(page.getByRole('option', { name: /search github/i })).toBeVisible();
  await command.press('Enter');

  await expect
    .poll(() =>
      page.evaluate(
        () =>
          JSON.parse(window.localStorage.getItem('navode.settings') ?? '{}').recentExecutions?.[0]
            ?.label,
      ),
    )
    .toBe('Search GitHub');
  await expect
    .poll(() => page.evaluate(() => window.localStorage.getItem('navode.settings') ?? ''))
    .not.toContain('navode');
});
