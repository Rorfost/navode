import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { DEFAULT_NAVODE_SETTINGS, type NavodeSettings } from '@navode/core';
import { NavodeShell } from '@navode/ui';
import { describe, expect, it, vi } from 'vitest';

function renderShell(settings: NavodeSettings = { ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true }) {
  const onCommand = vi.fn();
  const onSettingsChange = vi.fn();
  render(<NavodeShell onCommand={onCommand} onSettingsChange={onSettingsChange} settings={settings} />);
  return { onCommand, onSettingsChange };
}

describe('Navode shell', () => {
  it('submits a keyboard-entered command', () => {
    const { onCommand } = renderShell();

    fireEvent.change(screen.getByLabelText('What do you want to do?'), {
      target: { value: 'yt segment tree' },
    });
    fireEvent.submit(screen.getByRole('form', { name: 'Run a Navode command' }));

    expect(onCommand).toHaveBeenCalledWith('yt segment tree');
  });

  it('updates the persisted theme preference from settings', () => {
    const settings = { ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true };
    const { onSettingsChange } = renderShell(settings);

    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    fireEvent.click(screen.getByRole('tab', { name: 'Light' }));

    expect(onSettingsChange).toHaveBeenCalledWith({ ...settings, theme: 'light' });
  });

  it('offers onboarding choices and allows a user to skip them', () => {
    const { onSettingsChange } = renderShell(DEFAULT_NAVODE_SETTINGS);

    expect(screen.getByRole('dialog', { name: 'Welcome to Navode' })).toBeVisible();
    fireEvent.click(screen.getByRole('button', { name: 'YouTube' }));
    fireEvent.click(screen.getByRole('button', { name: 'Skip for now' }));

    expect(onSettingsChange).toHaveBeenCalledWith({
      ...DEFAULT_NAVODE_SETTINGS,
      defaultSearchProvider: 'youtube',
    });
    expect(onSettingsChange).toHaveBeenLastCalledWith({ ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true });
    expect(screen.queryByRole('dialog', { name: 'Welcome to Navode' })).not.toBeInTheDocument();
  });

  it('focuses the command bar with slash and executes the selected result with Enter', () => {
    const { onCommand } = renderShell();
    const commandInput = screen.getByLabelText('What do you want to do?');

    commandInput.blur();
    fireEvent.keyDown(window, { key: '/' });
    expect(commandInput).toHaveFocus();

    fireEvent.change(commandInput, { target: { value: 'graph theory' } });
    fireEvent.keyDown(commandInput, { key: 'ArrowDown' });
    expect(screen.getByRole('option', { name: /search youtube/i })).toHaveAttribute('aria-selected', 'true');
    fireEvent.keyDown(commandInput, { key: 'Enter' });

    expect(onCommand).toHaveBeenCalledWith('yt graph theory');
  });

  it('uses an accessible, focus-managed settings dialog that Escape closes', async () => {
    renderShell();
    fireEvent.click(screen.getByRole('button', { name: 'Open settings' }));
    const dialog = screen.getByRole('dialog', { name: 'Navode settings' });

    await waitFor(() => expect(dialog).toHaveFocus());
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Navode settings' })).not.toBeInTheDocument();
  });
});
