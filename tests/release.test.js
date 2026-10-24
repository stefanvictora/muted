import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { createManifest, verifyPackage } from '../tools/integrity.mjs';

test('Hashprüfung erkennt Änderungen, fehlende und zusätzliche Runtime-Dateien', async () => {
  const root=resolve('.test-artifacts',`integrity-${randomUUID()}`);
  await mkdir(resolve(root,'extension'),{recursive:true});
  await writeFile(resolve(root,'extension/a.js'),'hello');
  const manifest=await createManifest(root,'0.1.0');
  assert.match(manifest,/2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824  extension\/a\.js/);
  await writeFile(resolve(root,'release-manifest.txt'),manifest);
  assert.equal((await verifyPackage(root)).files,1);
  await writeFile(resolve(root,'extension/a.js'),'tampered');
  await assert.rejects(verifyPackage(root),/Hash/);
  await writeFile(resolve(root,'extension/a.js'),'hello');
  await writeFile(resolve(root,'extension/unexpected.js'),'extra');
  await assert.rejects(verifyPackage(root),/Dateiliste/);
  await writeFile(resolve(root,'release-manifest.txt'),manifest.replace('extension/a.js','extension/missing.js'));
  await assert.rejects(verifyPackage(root));
});
