import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoordinator } from '../extension/services/coordinator.js';
import { defaultState } from '../extension/core/schema.js';
import { registration } from '../extension/core/policy.js';
import { browserDouble } from './browser-double.js';

test('Beide Modi teilen Vollzugriff; Listenwechsel und Import ändern keine Browserrechte', async () => {
  const {api,model,sender}=browserDouble({...defaultState(),colorExceptions:['color.example'],grayscaleSites:['gray.example']});
  model.origins=['http://*/*','https://*/*'];
  model.tabs=[{id:1,url:'https://gray.example/'},{id:2,url:'https://other.example/'}];
  const worker=createCoordinator(api,()=>1000);await worker.start();
  const selected=await worker.handle({type:'mode',mode:'selected'},sender);
  assert.equal(selected.pages[1].applied,true);
  assert.equal(selected.pages[2].wanted,false);
  assert.deepEqual(model.origins,['http://*/*','https://*/*']);
  assert.deepEqual(selected.state.colorExceptions,['color.example']);
  await worker.handle({type:'remove',list:'grayscaleSites',domain:'gray.example'},sender);
  assert.deepEqual(model.origins,['http://*/*','https://*/*']);
  await worker.handle({type:'pause',minutes:5},sender);
  const imported=await worker.handle({type:'import',text:JSON.stringify({formatVersion:1,mode:'global',colorExceptions:['keep.example'],grayscaleSites:['gray.example']})},sender);
  assert.equal(imported.state.pauseUntil,301000);
  assert.deepEqual(model.origins,['http://*/*','https://*/*']);
});

test('Aufwachen des Workers durchsucht keine Tabs; die angefragte Seite erhält trotzdem ihre Entscheidung', async () => {
  const {api,model}=browserDouble(defaultState());
  model.origins=['http://*/*','https://*/*'];
  model.scripts=[registration(defaultState(),{global:true},1000)];
  model.tabs=[{id:1,url:'https://one.example/'},{id:2,url:'https://two.example/'}];
  let queries=0;const query=api.tabs.query;api.tabs.query=(...args)=>{queries++;return query(...args);};
  const worker=createCoordinator(api,()=>1000);await worker.start();
  assert.equal((await worker.document({type:'document'},{id:api.runtime.id,frameId:0,tab:{id:1},url:'https://one.example/'})).active,true);
  assert.equal(queries,0);
  assert.deepEqual(model.applications,[]);
});

test('Eine neu geladene Extension gleicht bei neuer Registrierung vorhandene Seiten ab', async () => {
  const {api,model,sender}=browserDouble(defaultState());
  model.origins=['http://*/*','https://*/*'];model.tabs=[{id:1,url:'https://existing.example/'}];
  const worker=createCoordinator(api,()=>1000);await worker.start();
  assert.equal((await worker.handle({type:'status'},sender)).pages[1]?.applied,true);
});

test('Ein abgeschlossener Abgleich benachrichtigt offene Oberflächen ohne Polling', async () => {
  const {api,model,sender}=browserDouble();
  model.origins=['http://*/*','https://*/*'];model.tabs=[{id:1,url:'https://gray.example/'}];
  const worker=createCoordinator(api,()=>1000);await worker.start();model.notifications.length=0;
  await worker.handle({type:'enabled',value:false},sender);
  assert.ok(model.notifications.some(message=>message.type==='changed'));
  const status=await worker.handle({type:'status'},sender);
  assert.equal(status.applying,false);
  assert.equal(status.pages[1].wanted,false);
  const count=model.notifications.length;
  await worker.handle({type:'status'},sender);
  assert.equal(model.notifications.length,count);
});

test('Status und Dokumententscheidungen verursachen nach Initialisierung keine Browserabfragen oder Schreibzugriffe', async () => {
  const {api,model,sender}=browserDouble({...defaultState(),mode:'selected',grayscaleSites:['gray.example']});
  model.origins=['http://*/*','https://*/*'];
  const worker=createCoordinator(api,()=>1000);await worker.start();
  const calls=[];
  for (const [object,methods] of [[api.storage.local,['set']],[api.tabs,['query']],[api.permissions,['contains','getAll']],
    [api.scripting,['getRegisteredContentScripts','updateContentScripts','executeScript']],[api.alarms,['get','create','clear']]]) {
    for (const method of methods) {const original=object[method];object[method]=(...args)=>{calls.push(method);return original(...args);};}
  }
  for(let i=0;i<3;i++) {
    assert.equal((await worker.handle({type:'status'},sender)).state.mode,'selected');
    assert.equal((await worker.document({type:'document'},{id:api.runtime.id,frameId:0,tab:{id:1},url:'https://gray.example/'})).active,true);
  }
  assert.deepEqual(calls,[]);
});

test('Alte Einstellungen bleiben erhalten; enge Altfreigaben ersetzen keinen Vollzugriff', async () => {
  const old={...defaultState(),mode:'global',enabled:false,pauseUntil:null,
    permissionTransition:{mode:'selected',colorExceptions:['color.example'],grayscaleSites:['gray.example']}};
  const {api,model,sender}=browserDouble(old);
  model.origins=['http://*.gray.example/*','https://*.gray.example/*'];
  const worker=createCoordinator(api,()=>1000);await worker.start();
  const status=await worker.handle({type:'status'},sender);
  assert.equal(status.state.mode,'selected');
  assert.equal(status.state.enabled,false);
  assert.deepEqual(status.state.grayscaleSites,['gray.example']);
  assert.deepEqual(status.state.colorExceptions,['color.example']);
  assert.equal('permissionTransition' in status.state,false);
  assert.deepEqual(model.origins,['http://*.gray.example/*','https://*.gray.example/*']);
  await worker.handle({type:'enabled',value:true},sender);
  const document=()=>worker.document({type:'document'},{id:api.runtime.id,frameId:0,tab:{id:1},url:'https://gray.example/'});
  assert.equal((await document()).active,false);
  assert.equal(model.scripts.length,0);
  model.origins=['http://*/*','https://*/*'];
  await worker.handle({type:'grants'},sender);
  assert.equal((await document()).active,true);
});
