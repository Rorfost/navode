import { createHash } from 'node:crypto';
import { mkdir, readdir, readFile, writeFile } from 'node:fs/promises';
import { relative, resolve, sep } from 'node:path';

const extensionRoot = resolve('apps/extension/dist');
const manifestPath = resolve(extensionRoot, 'manifest.json');
const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
const artifactDirectory = resolve('artifacts');
const artifactName = `navode-${manifest.version}.zip`;
const artifactPath = resolve(artifactDirectory, artifactName);
const checksumPath = `${artifactPath}.sha256`;
const requiredIconSizes = ['16', '32', '48', '128'];
const CRC32_TABLE = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  return value >>> 0;
});

const entries = await collectFiles(extensionRoot);
if (!entries.some((entry) => entry.name === 'manifest.json')) {
  throw new Error('Extension package must contain manifest.json at its root.');
}

if (!manifest.icons || typeof manifest.icons !== 'object') {
  throw new Error(
    'Cannot package a release without final production icons (16, 32, 48, and 128 pixels).',
  );
}
const iconPaths = requiredIconSizes.map((size) => {
  const iconPath = manifest.icons[size];
  if (typeof iconPath !== 'string' || !iconPath.trim()) {
    throw new Error(`Manifest is missing the required ${size}-pixel production icon.`);
  }
  return iconPath;
});
const runtimeFiles = new Set(entries.map((entry) => entry.name));
for (const iconPath of iconPaths) {
  if (!runtimeFiles.has(iconPath)) {
    throw new Error(`Manifest icon is absent from the production build: ${iconPath}`);
  }
}

for (const entry of entries) {
  if (/(^|\/)(?:\.env(?:\..*)?|node_modules|src|test|tests|docs|\.git)(?:\/|$)/i.test(entry.name)) {
    throw new Error(`Extension package contains a non-runtime file: ${entry.name}`);
  }
}

const archive = createStoredZip(entries);
await mkdir(artifactDirectory, { recursive: true });
await writeFile(artifactPath, archive);
const checksum = createHash('sha256').update(archive).digest('hex');
await writeFile(checksumPath, `${checksum}  ${artifactName}\n`, 'utf8');
console.log(`Created ${relative(process.cwd(), artifactPath)} (${archive.byteLength} bytes).`);
console.log(`SHA-256: ${checksum}`);

async function collectFiles(directory) {
  const directoryEntries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of directoryEntries.sort((left, right) => left.name.localeCompare(right.name))) {
    const absolutePath = resolve(directory, entry.name);
    if (entry.isDirectory()) {
      const nested = await collectFiles(absolutePath);
      for (const child of nested) files.push(child);
    } else if (entry.isFile()) {
      const name = relative(extensionRoot, absolutePath).split(sep).join('/');
      files.push({ data: await readFile(absolutePath), name });
    }
  }
  return files;
}

function createStoredZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const name = Buffer.from(entry.name, 'utf8');
    const checksum = crc32(entry.data);
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0);
    localHeader.writeUInt16LE(20, 4);
    localHeader.writeUInt32LE(checksum, 14);
    localHeader.writeUInt32LE(entry.data.byteLength, 18);
    localHeader.writeUInt32LE(entry.data.byteLength, 22);
    localHeader.writeUInt16LE(name.byteLength, 26);
    localParts.push(localHeader, name, entry.data);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0);
    centralHeader.writeUInt16LE(20, 4);
    centralHeader.writeUInt16LE(20, 6);
    centralHeader.writeUInt32LE(checksum, 16);
    centralHeader.writeUInt32LE(entry.data.byteLength, 20);
    centralHeader.writeUInt32LE(entry.data.byteLength, 24);
    centralHeader.writeUInt16LE(name.byteLength, 28);
    centralHeader.writeUInt32LE(offset, 42);
    centralParts.push(centralHeader, name);
    offset += localHeader.byteLength + name.byteLength + entry.data.byteLength;
  }

  const centralDirectory = Buffer.concat(centralParts);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralDirectory.byteLength, 12);
  end.writeUInt32LE(offset, 16);
  return Buffer.concat([...localParts, centralDirectory, end]);
}

function crc32(data) {
  let checksum = 0xffffffff;
  for (const byte of data) checksum = CRC32_TABLE[(checksum ^ byte) & 0xff] ^ (checksum >>> 8);
  return (checksum ^ 0xffffffff) >>> 0;
}
