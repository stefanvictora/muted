// Isolated diagnosis fixture: fixed test-only hosts replace the native grant dialog.
// Production manifests, release snapshots and personal browser profiles are untouched.
import { connect } from './cdp.mjs';
import { createServer } from 'node:http';
import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const port=Number(process.argv[2]||9336);
const stalled=process.argv.includes('--stalled');
const frozen=process.argv.includes('--frozen');
const fixture=resolve('.test-artifacts/responsiveness-fixture/extension');
await mkdir(fixture,{recursive:true});await cp('extension',fixture,{recursive:true});
const manifest=JSON.parse(await readFile(resolve(fixture,'manifest.json'),'utf8'));
manifest.name='Local Grayscale – Diagnosefixture';
manifest.host_permissions=['http://*/*','https://*/*'];
await writeFile(resolve(fixture,'manifest.json'),JSON.stringify(manifest));
const server=createServer((req,res)=>{
  if(req.url==='/never.png') return; // Intentionally keep document loading, not a slow extension API double.
  res.setHeader('Content-Type','text/html');
  res.end(`<html><body style="background:tomato">${req.url}${req.url==='/slow'?'<img src="/never.png">':''}</body></html>`);
});
await new Promise(resolve=>server.listen(9341,'127.0.0.1',resolve));
const cdp=await connect(port), targets=[];
const report={browser:cdp.info.Browser,stalled,frozen,checks:[],errors:[],scope:'Isoliertes Testmanifest mit festen Hosts; keine native Zustimmung simuliert.'};
let extensionId, sleeping;
async function open(url) {const {targetId}=await cdp.send('Target.createTarget',{url});targets.push(targetId);const session=await cdp.attach(targetId);await new Promise(r=>setTimeout(r,150));return session;}
try {
  for(const extension of (await cdp.send('Extensions.getExtensions')).extensions) if(extension.path.toLowerCase()===fixture.toLowerCase()) await cdp.send('Extensions.uninstall',{id:extension.id});
  if(stalled) await open('http://127.0.0.1:9341/slow');
  if(frozen) {
    sleeping=await open('http://127.0.0.1:9341/sleeping');
    await cdp.send('Page.setWebLifecycleState',{state:'frozen'},sleeping);
  }
  const ready=await open('http://127.0.0.1:9341/ready');
  extensionId=(await cdp.send('Extensions.loadUnpacked',{path:fixture})).id;
  const options=await open(`chrome-extension://${extensionId}/options/options.html`);
  const before=Date.now();
  const result=await cdp.evaluate(options,`Promise.race([chrome.runtime.sendMessage({type:'status'}),new Promise(resolve=>setTimeout(()=>resolve({timeout:true}),2500))])`);
  report.statusMs=Date.now()-before;
  assert.equal(result.timeout,undefined,'Popup bleibt bei Bitte warten: Worker antwortet nicht binnen 2,5 Sekunden.');
  assert.equal(result.ok,true);
  report.checks.push('Worker-Status antwortet');
  const fresh=await open('http://127.0.0.1:9341/fresh');
  const filtered=await cdp.evaluate(fresh,`new Promise(resolve=>{const end=Date.now()+2500;const check=()=>{const gray=getComputedStyle(document.documentElement).filter==='grayscale(1)';if(gray || Date.now()>end)resolve(gray);else setTimeout(check,20);};check();})`);
  assert.equal(filtered,true,'Neue Seite wird nicht grau.');
  assert.equal(await cdp.evaluate(ready,`getComputedStyle(document.documentElement).filter`),'grayscale(1)');
  report.checks.push('Vorhandene und neue Seite grau');
  const off=await cdp.evaluate(options,`chrome.runtime.sendMessage({type:'enabled',value:false})`);
  assert.equal(off.ok,true);
  assert.equal(await cdp.evaluate(ready,`getComputedStyle(document.documentElement).filter`),'none');
  if(sleeping) {
    await cdp.send('Page.setWebLifecycleState',{state:'active'},sleeping);
    assert.equal(await cdp.evaluate(sleeping,`getComputedStyle(document.documentElement).filter`),'none');
    report.checks.push('Aufwachen nach Ausschalten aktiviert keinen alten Filter');
  }
  assert.equal((await cdp.evaluate(options,`chrome.runtime.sendMessage({type:'enabled',value:true})`)).ok,true);
  assert.equal(await cdp.evaluate(ready,`getComputedStyle(document.documentElement).filter`),'grayscale(1)');
  assert.equal((await cdp.evaluate(options,`chrome.runtime.sendMessage({type:'pause',minutes:5})`)).ok,true);
  assert.equal(await cdp.evaluate(ready,`getComputedStyle(document.documentElement).filter`),'none');
  assert.equal((await cdp.evaluate(options,`chrome.runtime.sendMessage({type:'resume'})`)).ok,true);
  assert.equal(await cdp.evaluate(ready,`getComputedStyle(document.documentElement).filter`),'grayscale(1)');
  report.checks.push('Ausschalten, Einschalten, Pause und Fortsetzen im echten Browser');
  console.log(JSON.stringify(report,null,2));
} catch(error) {report.errors.push(error.message);console.error(error.message);process.exitCode=1;}
finally {
  await writeFile(`.test-artifacts/responsiveness-${port}-${frozen?'frozen':stalled?'stalled':'ready'}.json`,JSON.stringify(report,null,2));
  for(const targetId of targets) await cdp.send('Target.closeTarget',{targetId}).catch(()=>{});
  if(extensionId) await cdp.send('Extensions.uninstall',{id:extensionId}).catch(()=>{});
  cdp.close();server.closeAllConnections();server.close();
}
