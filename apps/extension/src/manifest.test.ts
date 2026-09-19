import { describe, expect, it } from 'vitest';
import manifest from '../public/manifest.json';

describe('extension manifest policy', () => {
  it('keeps required permissions local-first and makes GitHub API access optional', () => {
    const completeManifest: Record<string, unknown> = manifest;
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.version).toBe('1.0.0');
    expect(manifest.chrome_url_overrides.newtab).toBe('index.html');
    expect(manifest.permissions).toEqual(['storage']);
    expect(completeManifest.optional_permissions).toEqual(['identity']);
    expect(completeManifest.host_permissions).toBeUndefined();
    expect(completeManifest.optional_host_permissions).toEqual([
      'https://api.github.com/*',
      'https://www.googleapis.com/*',
    ]);
    expect(completeManifest.content_scripts).toBeUndefined();
    expect(manifest.content_security_policy.extension_pages).toBe(
      "script-src 'self'; object-src 'self'",
    );
  });
});
