import { describe, expect, it } from 'vitest';
import { DEFAULT_NAVODE_SETTINGS, canStartInitialSync, createSyncUploadPreview } from '../src';

describe('sync enrollment', () => {
  it('previews the upload before an explicit first sync', () => {
    expect(createSyncUploadPreview(DEFAULT_NAVODE_SETTINGS)).toMatchObject({
      excluded: ['scratchpad', 'recentExecutions'],
      requiresConfirmation: true,
    });
    expect(canStartInitialSync('start')).toBe(false);
    expect(canStartInitialSync('START_INITIAL_SYNC')).toBe(true);
  });
});
