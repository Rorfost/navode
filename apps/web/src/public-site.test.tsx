import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublicSite } from './public-site';

describe('public web pages', () => {
  it('provides feature, privacy, support, and companion navigation from the landing page', () => {
    render(<PublicSite page="home" />);

    expect(screen.getByRole('heading', { name: /new tab that knows/i })).toBeVisible();
    expect(screen.getByRole('link', { name: 'Privacy' }).getAttribute('href')).toBe('/privacy');
    expect(screen.getByRole('link', { name: 'Support' }).getAttribute('href')).toBe('/support');
    expect(screen.getByRole('link', { name: /open companion/i }).getAttribute('href')).toBe('/app');
  });

  it('states the local-only V1 privacy behavior accurately', () => {
    render(<PublicSite page="privacy" />);

    expect(screen.getByRole('heading', { name: /your navode data stays local/i })).toBeVisible();
    expect(screen.getByText(/no analytics, telemetry, advertising identifiers, user accounts/i)).toBeVisible();
    expect(screen.getByRole('link', { name: 'support@rorfost.com' })).toHaveAttribute('href', 'mailto:support@rorfost.com');
  });
});
