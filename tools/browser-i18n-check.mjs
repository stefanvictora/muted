// Run only against a dedicated browser test profile with extension debugging enabled.
import { connect } from './cdp.mjs';
import { resolve } from 'node:path';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const port=Number(process.argv[2]||9340), expected=process.argv[3]||'en';
const cdp=await connect(port);
const report={browser:cdp.info.Browser,expected,checks:[]};
const directory=resolve('.test-artifacts',`i18n-${port}`);
await mkdir(directory,{recursive:true});
try {
  const {id}=await cdp.send('Extensions.loadUnpacked',{path:resolve('extension')});
  for (const page of ['options','popup']) {
    const {targetId}=await cdp.send('Target.createTarget',{url:`chrome-extension://${id}/${page}/${page}.html`});
    const session=await cdp.attach(targetId);
    await cdp.send('Emulation.setDeviceMetricsOverride',{width:page==='popup'?360:1000,height:900,deviceScaleFactor:1,mobile:false},session);
    await cdp.evaluate(session,`new Promise((resolve,reject)=>{const deadline=Date.now()+5000;const check=()=>{
      if(document.querySelector('#${page==='options'?'status':'setup-heading'}')?.textContent===chrome.i18n.getMessage('${page==='options'?'status_setup':'grant_access'}') && !document.querySelector('#grant').disabled && !document.querySelector('#setup').hidden)return resolve(true);
      if(Date.now()>deadline)return reject(new Error('UI did not initialize'));setTimeout(check,25);
    };check();})`);
    const ui=await cdp.evaluate(session,`({language:document.documentElement.lang,browserLanguage:chrome.i18n.getUILanguage(),error:document.querySelector('#error').textContent,overflow:document.documentElement.scrollWidth>innerWidth,
      mismatches:[...document.querySelectorAll('[data-i18n],[data-i18n-placeholder],[data-i18n-aria-label]')].flatMap(node=>[...node.attributes].filter(a=>a.name.startsWith('data-i18n')).filter(a=>{
        if(['host','status','scope','site'].includes(node.id))return false;
        const actual=a.name==='data-i18n'?node.textContent:node.getAttribute(a.name.slice('data-i18n-'.length));return actual!==chrome.i18n.getMessage(a.value);
      }).map(a=>a.value))})`);
    assert.equal(ui.language,expected);assert.equal(ui.error,'');assert.equal(ui.overflow,false);assert.deepEqual(ui.mismatches,[]);
    report.browserLanguage=ui.browserLanguage;
    if (page==='options') {
      await cdp.evaluate(session,`document.querySelector('#color-input').value='https://invalid.example/path';document.querySelector('#color-add').click()`,true);
      await cdp.evaluate(session,`new Promise((resolve,reject)=>{const deadline=Date.now()+5000;const check=()=>{
        if(document.querySelector('#error').textContent)return resolve(true);if(Date.now()>deadline)return reject(new Error('No validation error'));setTimeout(check,25);
      };check();})`);
      assert.equal(await cdp.evaluate(session,`document.querySelector('#error').textContent`),await cdp.evaluate(session,`chrome.i18n.getMessage('error_invalid_domain')`));
      const response=await cdp.evaluate(session,`chrome.runtime.sendMessage({type:'import',text:'{'})`);
      assert.equal(response.ok,false);
      assert.equal(response.error,await cdp.evaluate(session,`chrome.i18n.getMessage('error_invalid_json')`));
    }
    const shot=await cdp.send('Page.captureScreenshot',{format:'png'},session);
    await writeFile(resolve(directory,`${page}.png`),Buffer.from(shot.data,'base64'));
    report.checks.push(`${page}: localized text, accessible labels, no overflow${page==='options'?', local and worker validation errors':''}`);
    await cdp.send('Target.closeTarget',{targetId});
  }
  await writeFile(resolve(directory,'report.json'),JSON.stringify(report,null,2)+'\n');
  console.log(JSON.stringify(report,null,2));
} finally { cdp.close(); }
