import { connect } from './cdp.mjs';
import { resolve } from 'node:path';
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import assert from 'node:assert/strict';

const port=Number(process.argv[2]||9333), name=process.argv[3]||'chrome';
const cdp=await connect(port);
const report={browser:cdp.info.Browser,checks:[],errors:[]};
try {
  for(const extension of (await cdp.send('Extensions.getExtensions')).extensions) {
    if(extension.path.toLowerCase()===resolve('extension').toLowerCase()) await cdp.send('Extensions.uninstall',{id:extension.id});
  }
  const {id}=await cdp.send('Extensions.loadUnpacked',{path:resolve('extension')});
  report.extension=id;
  const {targetId}=await cdp.send('Target.createTarget',{url:`chrome-extension://${id}/options/options.html`});
  const session=await cdp.attach(targetId);
  await new Promise(resolve=>setTimeout(resolve,300));
  await cdp.send('Runtime.enable',{},session);
  await cdp.send('Network.enable',{},session);
  const external=[];
  cdp.on(event=>{
    if(event.sessionId===session && event.method==='Runtime.exceptionThrown') report.errors.push(event.params.exceptionDetails.text);
    if(event.sessionId===session && event.method==='Network.requestWillBeSent' && /^https?:/.test(event.params.request.url)) external.push(event.params.request.url);
  });
  await cdp.evaluate(session,`new Promise(resolve=>{const check=()=>document.querySelector('#status')?.textContent ? resolve(true):setTimeout(check,25);check();})`);
  const status=await cdp.evaluate(session,`chrome.runtime.sendMessage({type:'status'})`);
  assert.equal(status.ok,true); assert.equal(status.value.state.mode,'global'); assert.equal(status.value.grants.global,false);
  report.checks.push('Manifest/Worker/Options laden; keine Hosts ohne Freigabe');
  const before=await cdp.evaluate(session,`chrome.scripting.getRegisteredContentScripts()`);
  assert.equal(before.length,0);
  const ui=await cdp.evaluate(session,`({error:document.querySelector('#error').textContent,access:document.querySelector('#status').textContent,overflow:document.documentElement.scrollWidth>innerWidth})`);
  assert.equal(ui.error,''); assert.equal(ui.overflow,false);
  report.checks.push('Options initialisiert ohne Laufzeitfehler und horizontalen Überlauf');
  // Exercise real UI controls, including user activation, without touching normal browser profiles.
  await cdp.evaluate(session,`document.querySelector('#mode').value='selected';document.querySelector('#mode').dispatchEvent(new Event('change'));document.querySelector('#apply-mode').click()`,true);
  await cdp.evaluate(session,`new Promise(resolve=>{const check=()=>document.querySelector('#apply-mode').disabled?setTimeout(check,25):resolve(true);check();})`);
  await cdp.evaluate(session,`document.querySelector('#gray-input').value='LOCALHOST';document.querySelector('#gray-add').click()`,true);
  await cdp.evaluate(session,`new Promise(resolve=>{const check=()=>document.querySelector('#gray-add').disabled?setTimeout(check,25):resolve(true);check();})`);
  const selected=await cdp.evaluate(session,`chrome.runtime.sendMessage({type:'status'})`);
  assert.equal(selected.value.state.mode,'selected'); assert.deepEqual(selected.value.state.grayscaleSites,['localhost']);
  report.checks.push('Moduswechsel und Domain hinzufügen über echte Options-UI');
  await cdp.evaluate(session,`document.querySelector('#gray-input').value='https://invalid.example/a';document.querySelector('#gray-add').click()`,true);
  await cdp.evaluate(session,`new Promise(resolve=>{const check=()=>document.querySelector('#gray-add').disabled?setTimeout(check,25):resolve(true);check();})`);
  assert.equal(await cdp.evaluate(session,`document.querySelector('#error').textContent`),await cdp.evaluate(session,`chrome.i18n.getMessage('error_invalid_domain')`));
  report.checks.push('Ungültige Domain erzeugt sichtbaren Fehler');
  await mkdir('.test-artifacts',{recursive:true});
  const portable={formatVersion:1,mode:'selected',colorExceptions:['EXAMPLE.com'],grayscaleSites:['localhost']};
  await writeFile(`.test-artifacts/${name}-import.json`,JSON.stringify(portable));
  await cdp.send('DOM.enable',{},session);
  const {root}=await cdp.send('DOM.getDocument',{},session);
  const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:'#import-file'},session);
  await cdp.send('DOM.setFileInputFiles',{nodeId,files:[resolve(`.test-artifacts/${name}-import.json`)]},session);
  await cdp.evaluate(session,`new Promise(resolve=>{const check=()=>document.querySelector('#preview-area').hidden?setTimeout(check,25):resolve(true);check();})`);
  const beforeImport=await cdp.evaluate(session,`chrome.runtime.sendMessage({type:'status'})`);
  assert.deepEqual(beforeImport.value.state.colorExceptions,[]);
  await cdp.evaluate(session,`document.querySelector('#import-apply').click()`,true);
  await cdp.evaluate(session,`new Promise(resolve=>{const check=()=>document.querySelector('#preview-area').hidden?resolve(true):setTimeout(check,25);check();})`);
  assert.deepEqual((await cdp.evaluate(session,`chrome.runtime.sendMessage({type:'status'})`)).value.state.colorExceptions,['example.com']);
  report.checks.push('Echter Dateiimport: Vorschau ändert nichts; Bestätigung übernimmt normalisierte Listen');
  const downloadPath=resolve(`.test-artifacts/${name}-downloads-${Date.now()}`);
  await mkdir(downloadPath,{recursive:true});
  await cdp.send('Browser.setDownloadBehavior',{behavior:'allow',downloadPath,eventsEnabled:true});
  const downloaded=new Promise((resolve,reject)=>{
    const timeout=setTimeout(()=>reject(new Error('Export-Download fehlt')),5000);
    cdp.on(event=>{if(event.method==='Browser.downloadProgress' && event.params.state==='completed'){clearTimeout(timeout);resolve();}});
  });
  await cdp.evaluate(session,`document.querySelector('#export').click()`,true);
  await downloaded;
  assert.deepEqual(JSON.parse(await readFile(resolve(downloadPath,'muted.json'),'utf8')),{...portable,colorExceptions:['example.com']});
  report.checks.push('Blob-Export unter unveränderter strenger CSP; genau die portablen Felder');
  await cdp.send('Emulation.setDeviceMetricsOverride',{width:900,height:1000,deviceScaleFactor:1,mobile:false},session);
  const screenshot=await cdp.send('Page.captureScreenshot',{format:'png',captureBeyondViewport:true},session);
  await writeFile(`.test-artifacts/${name}-options.png`,Buffer.from(screenshot.data,'base64'));
  assert.equal(external.length,0); report.checks.push('Keine externen Requests im beobachteten Options-Kontext');
  report.permissionPrompt='Noch nicht geprüft';
  console.log(JSON.stringify(report,null,2));
} catch(error) {report.errors.push(error.message);console.error(error);process.exitCode=1;}
finally {await writeFile(`.test-artifacts/${name}-report.json`,JSON.stringify(report,null,2));cdp.close();}
