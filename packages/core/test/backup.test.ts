import {
  DEFAULT_NAVODE_SETTINGS,
  NAVODE_STORAGE_SCHEMA_VERSION,
  parseNavodeBackup,
  serializeNavodeBackup,
} from '../src/index';

describe('Navode backup format', () => {
  it('round-trips a versioned backup without changing local data', () => {
    const source = {
      ...DEFAULT_NAVODE_SETTINGS,
      scratchpad: { content: 'Prepare release notes.' },
      todayItems: [{ id: 'today-1', title: 'Ship backup flow', completed: false }],
    };
    const result = parseNavodeBackup(serializeNavodeBackup(source, '2026-01-01T00:00:00.000Z'));

    expect(result).toMatchObject({
      success: true,
      backup: { exportedAt: '2026-01-01T00:00:00.000Z', data: source },
    });
  });

  it('rejects unsafe or malformed imports before a replacement can occur', () => {
    const result = parseNavodeBackup(JSON.stringify({
      schemaVersion: 1,
      exportedAt: '2026-01-01T00:00:00.000Z',
      data: { schemaVersion: NAVODE_STORAGE_SCHEMA_VERSION, quickLinks: [{ id: 'unsafe', name: 'Unsafe', url: 'javascript:alert(1)' }] },
    }));

    expect(result).toEqual(expect.objectContaining({ success: false }));
    if (!result.success) expect(result.errors.join(' ')).toContain('must use an http or https URL');
  });

  it('reports JSON errors clearly', () => {
    expect(parseNavodeBackup('{not json')).toEqual({ errors: ['This file is not valid JSON.'], success: false });
  });
});
