import { connect } from './cdp.mjs';
import { createServer } from 'node:http';
import { readFile, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const port=Number(process.argv[2]||9333), name=process.argv[3]||'chrome';
const server=createServer(async(req,res)=>{
  res.setHeader('Content-Type','text/html; charset=utf-8');
  res.end(req.url==='/frame'?'<body style="background:#ef6542">Cross-Origin-Frame ohne Extension-Code</body>':await readFile('tools/fixture.html'));
});
await new Promise(resolve=>server.listen(9340,resolve));
const cdp=await connect(port), report={browser:cdp.info.Browser,checks:[],errors:[],scope:'Controller/CSS über echten activeTab-Testzugriff; keine dauerhaften Hostrechte erteilt'};
try {
  const extension=(await cdp.send('Extensions.getExtensions')).extensions.find(e=>e.name==='Local Grayscale');
  const optionsTarget=await cdp.send('Target.createTarget',{url:`chrome-extension://${extension.id}/options/options.html`});
  const popup=await cdp.attach(optionsTarget.targetId);
  await new Promise(resolve=>setTimeout(resolve,300));
  await cdp.evaluate(popup,`new Promise(resolve=>{const check=()=>document.querySelector('#access')?.textContent?resolve(true):setTimeout(check,25);check();})`);
  const url=`http://localhost:9340/?test=${name}-${Date.now()}`;
  const {targetId}=await cdp.send('Target.createTarget',{url});
  const page=await cdp.attach(targetId);
  await new Promise(resolve=>setTimeout(resolve,300));
  await cdp.send('Page.enable',{},page);
  await cdp.send('Target.activateTarget',{targetId});
  const tabTargets=(await cdp.send('Target.getTargets',{filter:[{type:'tab',exclude:false}]})).targetInfos;
  const tabTarget=tabTargets.find(t=>t.url===url);
  assert.ok(tabTarget,'Browser-Tab vorhanden');
  await cdp.send('Extensions.triggerAction',{id:extension.id,targetId:tabTarget.targetId});
  const tabId=await cdp.evaluate(popup,`chrome.tabs.query({}).then(t=>t.find(t=>t.url===${JSON.stringify(url)}).id)`);
  const status=await cdp.evaluate(popup,`chrome.runtime.sendMessage({type:'status'})`);
  assert.equal(status.value.pages[tabId].reason,'permission');
  report.checks.push('Action gewährt temporären Testzugriff; activeTab wird nicht als Dauerfreigabe verwendet');
  const original=await cdp.evaluate(page,`getComputedStyle(document.documentElement).filter`);
  await cdp.evaluate(popup,`(async()=>{const target={tabId:${tabId},frameIds:[0]};await chrome.scripting.insertCSS({target,files:['content/filter.css'],origin:'AUTHOR'});await chrome.scripting.executeScript({target,files:['content/controller.js']});await chrome.scripting.executeScript({target,files:['content/controller.js']});return chrome.scripting.executeScript({target,func:()=>globalThis.__localGrayscaleV1.set({active:true,expectedUrl:location.href,revision:99999})});})()`);
  assert.equal(await cdp.evaluate(page,`getComputedStyle(document.documentElement).filter`),'grayscale(1)');
  report.checks.push('Echte isolierte Injektion, doppelte Controller-Datei und CSS ergeben grayscale(1)');
  await cdp.evaluate(page,`document.documentElement.className='page-overwrite'`);
  assert.equal(await cdp.evaluate(page,`getComputedStyle(document.documentElement).filter`),'grayscale(1)');
  report.checks.push('Wurzelklasse wird nach Überschreiben wiederhergestellt');
  const gray=await cdp.send('Page.captureScreenshot',{format:'png'},page);
  await writeFile(`.test-artifacts/${name}-grayscale.png`,Buffer.from(gray.data,'base64'));
  await cdp.evaluate(popup,`chrome.scripting.executeScript({target:{tabId:${tabId},frameIds:[0]},func:()=>globalThis.__localGrayscaleV1.set({active:false,expectedUrl:location.href,revision:100000})})`);
  assert.equal(await cdp.evaluate(page,`getComputedStyle(document.documentElement).filter`),original);
  await cdp.evaluate(page,`document.documentElement.className='again'`);
  assert.equal(await cdp.evaluate(page,`getComputedStyle(document.documentElement).filter`),original);
  report.checks.push('Abschalten stellt ursprünglichen Seitenfilter wieder her; Beobachter bleibt aus');
  assert.deepEqual((await cdp.evaluate(popup,`chrome.permissions.getAll()`)).origins,[]);
  report.checks.push('Keine dauerhaften Hostfreigaben durch Testaktion');
  await cdp.send('Target.closeTarget',{targetId});
  console.log(JSON.stringify(report,null,2));
} catch(error) {report.errors.push(error.message);console.error(error);process.exitCode=1;}
finally {await writeFile(`.test-artifacts/${name}-render-report.json`,JSON.stringify(report,null,2));cdp.close();server.closeAllConnections();server.close();}
