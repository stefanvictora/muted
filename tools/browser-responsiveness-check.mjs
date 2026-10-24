// Isolated diagnosis fixture: fixed test-only hosts replace the native grant dialog.
// Production manifests, release snapshots and personal browser profiles are untouched.
import { connect } from './cdp.mjs';
import { createServer } from 'node:http';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const port = Number(process.argv[2] || 9336);
const stalled = process.argv.includes('--stalled');
const frozen = process.argv.includes('--frozen');
const fixture = resolve('.test-artifacts/responsiveness-fixture/extension');
await mkdir(fixture, { recursive: true });
await cp('extension', fixture, { recursive: true });
const manifest = JSON.parse(await readFile(resolve(fixture, 'manifest.json'), 'utf8'));
manifest.name = 'Muted – Diagnosefixture';
manifest.host_permissions = ['http://*/*', 'https://*/*'];
await writeFile(resolve(fixture, 'manifest.json'), JSON.stringify(manifest));
const server = createServer((req, res) => {
  if (req.url === '/never.png') return; // Intentionally keep document loading, not a slow extension API double.
  res.setHeader('Content-Type', 'text/html');
  res.end(
    `<html><body style="background:tomato">${req.url}${req.url === '/slow' ? '<img src="/never.png">' : ''}</body></html>`,
  );
});
await new Promise((resolve) => server.listen(9341, '127.0.0.1', resolve));
const cdp = await connect(port),
  targets = [];
const report = {
  browser: cdp.info.Browser,
  stalled,
  frozen,
  checks: [],
  errors: [],
  scope: 'Isoliertes Testmanifest mit festen Hosts; keine native Zustimmung simuliert.',
};
let extensionId, sleeping;
async function open(url) {
  const { targetId } = await cdp.send('Target.createTarget', { url });
  targets.push(targetId);
  const session = await cdp.attach(targetId);
  await new Promise((r) => setTimeout(r, 150));
  return session;
}
try {
  for (const extension of (await cdp.send('Extensions.getExtensions')).extensions)
    if (extension.path.toLowerCase() === fixture.toLowerCase())
      await cdp.send('Extensions.uninstall', { id: extension.id });
  if (stalled) await open('http://127.0.0.1:9341/slow');
  if (frozen) {
    sleeping = await open('http://127.0.0.1:9341/sleeping');
    await cdp.send('Page.setWebLifecycleState', { state: 'frozen' }, sleeping);
  }
  const ready = await open('http://127.0.0.1:9341/ready');
  extensionId = (await cdp.send('Extensions.loadUnpacked', { path: fixture })).id;
  const options = await open(`chrome-extension://${extensionId}/options/options.html`);
  const before = Date.now();
  const result = await cdp.evaluate(
    options,
    `Promise.race([chrome.runtime.sendMessage({type:'status'}),new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),2500))])`,
  );
  report.statusMs = Date.now() - before;
  assert.equal(
    result.timeout,
    undefined,
    'Popup bleibt bei Bitte warten: Worker antwortet nicht binnen 2,5 Sekunden.',
  );
  assert.equal(result.ok, true);
  report.checks.push('Worker-Status antwortet');
  const fresh = await open('http://127.0.0.1:9341/fresh');
  const filtered = await cdp.evaluate(
    fresh,
    `new Promise(resolve=>{const end=Date.now()+2500;const check=()=>{const gray=getComputedStyle(document.documentElement).filter==='grayscale(1)';if(gray || Date.now()>end)resolve(gray);else setTimeout(check,20);};check();})`,
  );
  assert.equal(filtered, true, 'Neue Seite wird nicht grau.');
  const existing = await cdp.evaluate(
    ready,
    `new Promise(resolve=>{const end=Date.now()+3000;const check=()=>{const gray=getComputedStyle(document.documentElement).filter==='grayscale(1)';if(gray || Date.now()>end)resolve(gray);else setTimeout(check,20);};check();})`,
  );
  assert.equal(existing, true, 'Vorhandene Seite wird nach asynchronem Abgleich grau.');
  report.checks.push('Vorhandene und neue Seite grau');
  const off = await cdp.evaluate(
    options,
    `chrome.runtime.sendMessage({type:'enabled',value:false})`,
  );
  assert.equal(off.ok, true);
  assert.equal(
    await cdp.evaluate(ready, `getComputedStyle(document.documentElement).filter`),
    'none',
  );
  if (sleeping) {
    await cdp.send('Page.setWebLifecycleState', { state: 'active' }, sleeping);
    assert.equal(
      await cdp.evaluate(sleeping, `getComputedStyle(document.documentElement).filter`),
      'none',
    );
    report.checks.push('Aufwachen nach Ausschalten aktiviert keinen alten Filter');
  }
  assert.equal(
    (await cdp.evaluate(options, `chrome.runtime.sendMessage({type:'enabled',value:true})`)).ok,
    true,
  );
  assert.equal(
    await cdp.evaluate(ready, `getComputedStyle(document.documentElement).filter`),
    'grayscale(1)',
  );
  assert.equal(
    (await cdp.evaluate(options, `chrome.runtime.sendMessage({type:'pause',minutes:5})`)).ok,
    true,
  );
  assert.equal(
    await cdp.evaluate(ready, `getComputedStyle(document.documentElement).filter`),
    'none',
  );
  assert.equal(
    (await cdp.evaluate(options, `chrome.runtime.sendMessage({type:'resume'})`)).ok,
    true,
  );
  assert.equal(
    await cdp.evaluate(ready, `getComputedStyle(document.documentElement).filter`),
    'grayscale(1)',
  );
  report.checks.push('Ausschalten, Einschalten, Pause und Fortsetzen im echten Browser');
  // Exercise selected mode through the real options UI with the same broad grant.
  const other = await open('http://localhost:9341/other');
  await cdp.evaluate(
    options,
    `document.querySelector('#mode').value='selected';document.querySelector('#apply-mode').click()`,
    true,
  );
  await cdp.evaluate(
    options,
    `new Promise(resolve=>{const check=()=>document.querySelector('#apply-mode').disabled?setTimeout(check,20):resolve();check();})`,
  );
  await cdp.evaluate(
    options,
    `document.querySelector('#gray-input').value='127.0.0.1';document.querySelector('#gray-add').click()`,
    true,
  );
  await cdp.evaluate(
    options,
    `new Promise(resolve=>{const check=()=>document.querySelector('#gray-add').disabled?setTimeout(check,20):resolve();check();})`,
  );
  assert.equal(
    await cdp.evaluate(ready, `getComputedStyle(document.documentElement).filter`),
    'grayscale(1)',
  );
  assert.equal(
    await cdp.evaluate(other, `getComputedStyle(document.documentElement).filter`),
    'none',
  );
  const ui = await cdp.evaluate(
    options,
    `({error:document.querySelector('#error').textContent,setup:document.querySelector('#setup').hidden,access:!!document.querySelector('#access-details'),colorHidden:document.querySelector('#color-section').hidden,grayHidden:document.querySelector('#gray-section').hidden})`,
  );
  assert.deepEqual(ui, {
    error: '',
    setup: true,
    access: false,
    colorHidden: true,
    grayHidden: false,
  });
  await cdp.evaluate(options, `document.querySelector('#gray-list button').click()`, true);
  await cdp.evaluate(
    options,
    `new Promise(resolve=>{const check=()=>document.querySelector('#gray-add').disabled?setTimeout(check,20):resolve();check();})`,
  );
  assert.equal(
    await cdp.evaluate(ready, `getComputedStyle(document.documentElement).filter`),
    'none',
  );
  assert.equal(
    await cdp.evaluate(
      options,
      `chrome.permissions.contains({origins:['http://*/*','https://*/*']})`,
    ),
    true,
  );
  report.checks.push(
    'Ausgewählte Liste filtert nur passende Hosts; Entfernen behält Vollzugriff; aufgeräumte Settings ohne Rechteblock',
  );
  // The popup listens for worker notifications even while a different UI acts.
  const popup = await open(`chrome-extension://${extensionId}/popup/popup.html`);
  await cdp.evaluate(
    popup,
    `new Promise(resolve=>{const check=()=>document.querySelector('#enabled').disabled?setTimeout(check,20):resolve();check();})`,
  );
  await cdp.evaluate(options, `chrome.runtime.sendMessage({type:'enabled',value:false})`);
  assert.equal(
    await cdp.evaluate(
      popup,
      `new Promise(resolve=>{const end=Date.now()+2000;const check=()=>{const off=!document.querySelector('#enabled').checked;if(off || Date.now()>end)resolve(off);else setTimeout(check,20);};check();})`,
    ),
    true,
  );
  await cdp.evaluate(
    popup,
    `globalThis.statusReads=0;const send=chrome.runtime.sendMessage.bind(chrome.runtime);chrome.runtime.sendMessage=(message,...rest)=>{if(message?.type==='status')statusReads++;return send(message,...rest);};`,
  );
  await new Promise((resolve) => setTimeout(resolve, 700));
  assert.equal(await cdp.evaluate(popup, `statusReads`), 0);
  report.checks.push(
    'Popup übernimmt Änderung aus anderem Fenster per Nachricht; im Ruhezustand keine Statusabfragen',
  );
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.errors.push(error.stack);
  console.error(error.stack);
  process.exitCode = 1;
} finally {
  await writeFile(
    `.test-artifacts/responsiveness-${port}-${frozen ? 'frozen' : stalled ? 'stalled' : 'ready'}.json`,
    JSON.stringify(report, null, 2),
  );
  for (const targetId of targets)
    await cdp.send('Target.closeTarget', { targetId }).catch(() => {});
  if (extensionId) await cdp.send('Extensions.uninstall', { id: extensionId }).catch(() => {});
  cdp.close();
  server.closeAllConnections();
  server.close();
}
