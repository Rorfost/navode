import { describe, expect, it } from 'vitest';
import manifest from '../public/manifest.json';

describe('extension manifest policy', () => {
  it('uses only the storage permission required for local-first persistence', () => {
    expect(manifest.manifest_version).toBe(3);
    expect(manifest.chrome_url_overrides.newtab).toBe('index.html');
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.optional_permissions).toBeUndefined();
    expect(manifest.host_permissions).toBeUndefined();
    expect(manifest.optional_host_permissions).toBeUndefined();
    expect(manifest.content_scripts).toBeUndefined();
    expect(manifest.content_security_policy.extension_pages).toBe("script-src 'self'; object-src 'self'");
  });
});
