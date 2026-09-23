import { describe, expect, it } from 'vitest';
import {
  parseCapability,
  capabilityAllowsHost,
  NAVODE_PLATFORM_API_VERSION,
} from '../src/capabilities';
import { validateExtensionManifest } from '../src/validator';
import { createLocalPluginEntry } from '../src/registry';
import type { NavodeExtensionManifest } from '../src/extension-manifest';

const VALID_MANIFEST: NavodeExtensionManifest = {
  id: 'com.example.test',
  name: 'Test Plugin',
  publisher: 'Test Publisher',
  version: '1.0.0',
  description: 'A test plugin',
  platformApiVersion: '1',
  capabilities: ['commands'],
  commands: [
    {
      alias: 'test',
      label: 'Test Command',
      description: 'Opens test page',
      url: 'https://example.com',
    },
  ],
};

describe('parseCapability', () => {
  it('parses known static capabilities', () => {
    expect(parseCapability('commands')).toBe('commands');
    expect(parseCapability('widgets')).toBe('widgets');
    expect(parseCapability('workflow-actions')).toBe('workflow-actions');
    expect(parseCapability('project-read')).toBe('project-read');
    expect(parseCapability('calendar-summary-read')).toBe('calendar-summary-read');
    expect(parseCapability('theme')).toBe('theme');
  });

  it('parses valid network capability', () => {
    expect(parseCapability('network:example.com')).toBe('network:example.com');
  });

  it('rejects wildcard network capability', () => {
    expect(parseCapability('network:*.example.com')).toBeNull();
  });

  it('rejects empty network hostname', () => {
    expect(parseCapability('network:')).toBeNull();
  });

  it('returns null for unknown capability', () => {
    expect(parseCapability('unknown')).toBeNull();
    expect(parseCapability('')).toBeNull();
  });
});

describe('capabilityAllowsHost', () => {
  it('returns true when capability matches hostname', () => {
    expect(capabilityAllowsHost('network:example.com', 'example.com')).toBe(true);
  });

  it('returns false when hostname does not match', () => {
    expect(capabilityAllowsHost('network:example.com', 'other.com')).toBe(false);
  });
});

describe('validateExtensionManifest', () => {
  it('validates a correct manifest', () => {
    const result = validateExtensionManifest(VALID_MANIFEST);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.manifest).toBeDefined();
  });

  it('rejects non-object input', () => {
    expect(validateExtensionManifest(null).valid).toBe(false);
    expect(validateExtensionManifest('string').valid).toBe(false);
    expect(validateExtensionManifest(42).valid).toBe(false);
  });

  it('rejects missing required fields', () => {
    const result = validateExtensionManifest({ ...VALID_MANIFEST, id: '' });
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.field === 'id')).toBe(true);
  });

  it('rejects invalid id format', () => {
    const result = validateExtensionManifest({ ...VALID_MANIFEST, id: '123-invalid' });
    expect(result.valid).toBe(false);
  });

  it('rejects invalid semver version', () => {
    const result = validateExtensionManifest({ ...VALID_MANIFEST, version: 'bad' });
    expect(result.valid).toBe(false);
  });

  it('rejects wrong platformApiVersion', () => {
    const result = validateExtensionManifest({ ...VALID_MANIFEST, platformApiVersion: '99' });
    expect(result.valid).toBe(false);
  });

  it('rejects unknown capability', () => {
    const result = validateExtensionManifest({ ...VALID_MANIFEST, capabilities: ['unknown-cap'] });
    expect(result.valid).toBe(false);
  });

  it('rejects commands without commands capability', () => {
    const result = validateExtensionManifest({
      ...VALID_MANIFEST,
      capabilities: ['widgets'],
      commands: [{ alias: 'x', label: 'X', description: 'x', url: 'https://x.com' }],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects command with non-https URL', () => {
    const result = validateExtensionManifest({
      ...VALID_MANIFEST,
      commands: [{ alias: 'bad', label: 'Bad', description: 'bad url', url: 'http://x.com' }],
    });
    expect(result.valid).toBe(false);
  });

  it('rejects theme tokens not in approved list', () => {
    const result = validateExtensionManifest({
      ...VALID_MANIFEST,
      capabilities: ['theme'],
      themes: [
        {
          id: 'dark',
          name: 'Dark',
          tokens: { '--unknown-token': '#fff' } as Record<string, string>,
        },
      ],
    });
    expect(result.valid).toBe(false);
  });

  it('accepts valid theme tokens', () => {
    const result = validateExtensionManifest({
      id: 'com.example.theme',
      name: 'My Theme',
      publisher: 'Test',
      version: '1.0.0',
      description: 'A theme',
      platformApiVersion: NAVODE_PLATFORM_API_VERSION,
      capabilities: ['theme'],
      themes: [
        {
          id: 'ocean',
          name: 'Ocean',
          tokens: { '--background': '#001f3f', '--accent': '#0074D9' },
        },
      ],
    });
    expect(result.valid).toBe(true);
  });
});

describe('createLocalPluginEntry', () => {
  it('creates a registry entry with unverified status', () => {
    const entry = createLocalPluginEntry(VALID_MANIFEST);
    expect(entry.status).toBe('unverified');
    expect(entry.enabled).toBe(false);
    expect(entry.id).toBe(VALID_MANIFEST.id);
    expect(entry.manifest).toBe(VALID_MANIFEST);
  });

  it('sets integrityHash when provided', () => {
    const hash = 'abc123';
    const entry = createLocalPluginEntry(VALID_MANIFEST, hash);
    expect(entry.integrityHash).toBe(hash);
  });
});
