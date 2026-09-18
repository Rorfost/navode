import { DEFAULT_NAVODE_SETTINGS, NAVODE_SETTINGS_STORAGE_KEY } from '@navode/core';
import { afterEach, describe, expect, it } from 'vitest';
import { loadWebSettings, saveWebSettings } from './settings';

afterEach(() => window.localStorage.clear());

describe('web settings persistence', () => {
  it('persists and restores the theme preference locally', () => {
    expect(saveWebSettings({ ...DEFAULT_NAVODE_SETTINGS, theme: 'light' })).toBe(true);

    expect(loadWebSettings().theme).toBe('light');
  });

  it('falls back safely when stored JSON is malformed', () => {
    window.localStorage.setItem(NAVODE_SETTINGS_STORAGE_KEY, '{bad json');

    expect(loadWebSettings()).toEqual(DEFAULT_NAVODE_SETTINGS);
  });
});
