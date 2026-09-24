import { describe, expect, it } from 'vitest';
import manifest from '../public/manifest.json';

describe('extension manifest policy', () => {
  it('keeps required permissions local-first and requests provider or saved-health origins only when needed', () => {
    const completeManifest: Record<string, unknown> = manifest;
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe('2.2.0');
    expect(manifest.chrome_url_overrides.newtab).toBe('index.html');
    expect(manifest.icons).toEqual({
      '16': 'branding/icon-16.png',
      '32': 'branding/icon-32.png',
      '48': 'branding/icon-48.png',
      '128': 'branding/icon-128.png',
    });
    expect(manifest.permissions).toEqual(['storage']);
    expect(completeManifest.optional_permissions).toEqual(['identity']);
    expect(completeManifest.host_permissions).toBeUndefined();
    expect(completeManifest.optional_host_permissions).toEqual([
      'https://api.github.com/*',
      'https://www.googleapis.com/*',
      'https://codeforces.com/*',
      'http://*/*',
      'https://*/*',
    ]);
    expect(completeManifest.content_scripts).toBeUndefined();
    expect(manifest.content_security_policy.extension_pages).toBe(
      "script-src 'self'; object-src 'self'",
    );
  });
});
