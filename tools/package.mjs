import { mkdir, cp, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve, join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createManifest, verifyPackage } from './integrity.mjs';

const root = resolve('.');
const version = JSON.parse(await readFile(join(root, 'extension/manifest.json'), 'utf8')).version;
if (!/^\d+\.\d+\.\d+$/.test(version)) throw new Error('Ungültige Paketversion.');
const checks = spawnSync(process.execPath, ['--test'], { stdio: 'inherit', windowsHide: true });
if (checks.status !== 0) throw new Error('Tests fehlgeschlagen; kein Paket erstellt.');
const stamp = new Date()
  .toISOString()
  .replace(/[-:]/g, '')
  .replace(/\.\d+Z$/, 'Z');
const name = `muted-${version}-${stamp}`;
const base = join(root, 'releases');
await mkdir(base, { recursive: true });
const destination = join(base, name);
await mkdir(destination); // Never overwrite an existing snapshot.
await mkdir(join(destination, 'docs'));
for (const path of [
  'extension',
  'docs/INSTALLATION.md',
  'docs/SECURITY.md',
  'docs/DEVELOPMENT.md',
  'docs/images',
  'README.md',
  'CHANGELOG.txt',
  'LICENSE',
])
  await cp(join(root, path), join(destination, path), {
    recursive: true,
    errorOnExist: true,
    force: false,
  });
const manifest = await createManifest(destination, version);
await writeFile(join(destination, 'release-manifest.txt'), manifest, { flag: 'wx' });
await writeFile(join(root, 'release-manifest.txt'), manifest);
await verifyPackage(destination);
console.log(`Installierbar: ${join(destination, 'extension')}`);
if (process.argv.includes('--zip')) {
  const zip = join(base, `${name}.zip`);
  const result = spawnSync(
    'powershell.exe',
    [
      '-NoProfile',
      '-NonInteractive',
      '-Command',
      "$ErrorActionPreference='Stop'; Add-Type -AssemblyName System.IO.Compression.FileSystem; [System.IO.Compression.ZipFile]::CreateFromDirectory($env:LG_PACKAGE_SOURCE, $env:LG_PACKAGE_ZIP)",
    ],
    {
      stdio: 'inherit',
      windowsHide: true,
      env: { ...process.env, LG_PACKAGE_SOURCE: destination, LG_PACKAGE_ZIP: zip },
    },
  );
  if (result.status !== 0)
    throw new Error('Archivierung fehlgeschlagen; unveränderte Paketdateien bleiben erhalten.');
  const digest = createHash('sha256')
    .update(await readFile(zip))
    .digest('hex');
  await writeFile(`${zip}.sha256`, `${digest}  ${name}.zip\n`, { flag: 'wx' });
  console.log(`Archiv: ${zip}\nArchiv-SHA-256: ${digest}`);
}
