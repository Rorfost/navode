import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve('apps/extension/dist/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3 || manifest.chrome_url_overrides?.newtab !== 'index.html') {
  throw new Error('Extension manifest must be Manifest V3 and override the new-tab page.');
}

await access(resolve('apps/extension/dist/index.html'));
console.log('Extension manifest and new-tab entry verified.');
