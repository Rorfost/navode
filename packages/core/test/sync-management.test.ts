import { describe, expect, it } from 'vitest';
import { canReplaceLocalData, createRestorePlan, normalizeDeviceLabel } from '../src';

describe('sync management safeguards', () => {
  it('normalizes a human-readable device label', () => {
    expect(normalizeDeviceLabel('  Work   laptop  ')).toBe('Work laptop');
    expect(() => normalizeDeviceLabel(' ')).toThrow('Device names');
  });

  it('requires an explicit confirmation before local replacement', () => {
    expect(createRestorePlan('backup-1', '2026-09-20T00:00:00.000Z')).toMatchObject({
      backupId: 'backup-1',
      requiresConfirmation: true,
    });
    expect(canReplaceLocalData('replace')).toBe(false);
    expect(canReplaceLocalData('REPLACE_LOCAL_DATA')).toBe(true);
  });
});
