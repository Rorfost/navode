import { access, readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const manifestPath = resolve('apps/extension/dist/manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));

if (manifest.manifest_version !== 3 || manifest.chrome_url_overrides?.newtab !== 'index.html') {
  throw new Error('Extension manifest must be Manifest V3 and override the new-tab page.');
}

if (JSON.stringify(manifest.permissions) !== JSON.stringify(['storage'])) {
  throw new Error(
    'Extension permissions must remain limited to storage for local-first persistence.',
  );
}

if (
  manifest.optional_permissions ||
  manifest.host_permissions ||
  manifest.optional_host_permissions ||
  manifest.content_scripts
) {
  throw new Error(
    'Extension must not declare optional, host, or content-script permissions for V1.',
  );
}

if (manifest.content_security_policy?.extension_pages !== "script-src 'self'; object-src 'self'") {
  throw new Error(
    'Extension pages must retain the MV3-compatible self-only content security policy.',
  );
}

const indexPath = resolve('apps/extension/dist/index.html');
await access(indexPath);
const indexHtml = await readFile(indexPath, 'utf8');
if (/<script[^>]+src=["']https?:/i.test(indexHtml)) {
  throw new Error('Extension HTML must not load remote executable scripts.');
}
const files = await readdir(resolve('apps/extension/dist/assets'));
const scripts = files.filter((file) => file.endsWith('.js'));
const code = await Promise.all(
  scripts.map((file) => readFile(resolve('apps/extension/dist/assets', file), 'utf8')),
);
if (code.some((source) => /\beval\s*\(|\bnew\s+Function\s*\(/.test(source))) {
  throw new Error('Extension bundle must not contain eval or dynamic function execution.');
}

const bundleBytes = code.reduce((total, source) => total + Buffer.byteLength(source), 0);
if (bundleBytes > 750_000)
  throw new Error(
    `Extension JavaScript bundle exceeds the 750 KB release budget (${bundleBytes} bytes).`,
  );
console.log(
  `Extension policy and new-tab entry verified. JavaScript bundle: ${bundleBytes} bytes.`,
);
