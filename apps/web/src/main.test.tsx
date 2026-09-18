import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { DEFAULT_NAVODE_SETTINGS, type NavodeSettings } from '@navode/core';
import { NavodeShell } from '@navode/ui';
import { describe, expect, it, vi } from 'vitest';

function renderShell(settings: NavodeSettings = { ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true }) {
  const onCommand = vi.fn();
  const onSettingsChange = vi.fn();
  const onWorkspaceLaunch = vi.fn();
  render(
    <NavodeShell
      onCommand={onCommand}
      onSettingsChange={onSettingsChange}
      onWorkspaceLaunch={onWorkspaceLaunch}
      settings={settings}
    />,
  );
  return { onCommand, onSettingsChange, onWorkspaceLaunch };
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
    const settingsButton = screen.getByRole('button', { name: 'Open settings' });
    fireEvent.click(settingsButton);
    const dialog = screen.getByRole('dialog', { name: 'Navode settings' });

    await waitFor(() => expect(dialog).toHaveFocus());
    fireEvent.keyDown(dialog, { key: 'Escape' });

    expect(screen.queryByRole('dialog', { name: 'Navode settings' })).not.toBeInTheDocument();
    expect(settingsButton).toHaveFocus();
  });

  it('announces a safe recovery notice without preventing keyboard command use', () => {
    render(
      <NavodeShell
        onSettingsChange={vi.fn()}
        settings={{ ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true }}
        startupNotice="Navode is using safe defaults."
      />,
    );

    expect(screen.getByRole('alert')).toHaveTextContent('Navode is using safe defaults.');
    expect(screen.getByRole('combobox', { name: 'What do you want to do?' })).toBeEnabled();
  });

  it('adds a validated quick link through the management dialog', async () => {
    const settings = { ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true, quickLinks: [] };
    const { onSettingsChange } = renderShell(settings);

    fireEvent.click(screen.getAllByRole('button', { name: 'Manage' })[0]!);
    const dialog = await screen.findByRole('dialog', { name: 'Quick links' });
    fireEvent.change(within(dialog).getByLabelText('Name'), { target: { value: 'Docs' } });
    fireEvent.change(within(dialog).getByLabelText('URL'), { target: { value: 'https://example.com/docs' } });
    fireEvent.click(within(dialog).getByRole('button', { name: 'Add link' }));

    expect(onSettingsChange).toHaveBeenCalledWith(expect.objectContaining({
      quickLinks: [expect.objectContaining({ name: 'Docs', url: 'https://example.com/docs' })],
    }));
  });

  it('confirms the number of tabs before launching a workspace', () => {
    const settings = {
      ...DEFAULT_NAVODE_SETTINGS,
      onboardingCompleted: true,
      workspaces: [{ id: 'morning', name: 'Morning', order: 0, showOnHome: true, items: [{ id: 'docs', label: 'Docs', url: 'https://example.com/docs' }] }],
    };
    const { onWorkspaceLaunch } = renderShell(settings);

    fireEvent.click(screen.getByRole('button', { name: 'Launch' }));
    expect(screen.getByRole('dialog', { name: 'Launch workspace' })).toHaveTextContent('This will open 1 tab');
    fireEvent.click(screen.getByRole('button', { name: 'Open workspace' }));

    expect(onWorkspaceLaunch).toHaveBeenCalledWith(settings.workspaces[0]);
  });

  it('autosaves scratchpad content through the shared settings model', async () => {
    const settings = { ...DEFAULT_NAVODE_SETTINGS, onboardingCompleted: true };
    const { onSettingsChange } = renderShell(settings);

    fireEvent.click(screen.getByRole('button', { name: 'Note' }));
    fireEvent.change(await screen.findByLabelText('Note'), { target: { value: 'Call the project team.' } });

    expect(onSettingsChange).toHaveBeenLastCalledWith({
      ...settings,
      scratchpad: { content: 'Call the project team.' },
    });
  });

  it('searches and copies snippets with clear feedback', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'clipboard', { configurable: true, value: { writeText } });
    const settings = {
      ...DEFAULT_NAVODE_SETTINGS,
      onboardingCompleted: true,
      snippets: [{ id: 'reply', title: 'Reply', content: 'Thank you!', tags: ['email'], alias: 'thanks' }],
    };
    renderShell(settings);

    fireEvent.click(screen.getByRole('button', { name: 'Snippets' }));
    fireEvent.change(await screen.findByLabelText('Search snippets'), { target: { value: 'email' } });
    fireEvent.click(screen.getByRole('button', { name: 'Copy Reply' }));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith('Thank you!'));
    expect(screen.getByRole('status')).toHaveTextContent('Copied Reply.');
  });
});
