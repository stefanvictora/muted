import test from 'node:test';
import assert from 'node:assert/strict';
import { createCoordinator } from '../extension/services/coordinator.js';
import { defaultState } from '../extension/core/schema.js';
import { browserDouble } from './browser-double.js';

test('Ersteinrichtung wartet auf echte Freigabe; schnelle Schaltungen bleiben seriell und dauerhaft', async () => {
  const {api,model,sender}=browserDouble();
  const worker=createCoordinator(api,()=>1000);
  await worker.start();
  assert.equal(model.trusted,true);
  assert.equal(model.scripts.length,0);
  assert.equal((await worker.handle({type:'status'},sender)).state.mode,'global');
  await worker.handle({type:'mode',mode:'global'},sender);
  assert.equal(model.scripts.length,0);
  model.origins=['http://*/*','https://*/*'];
  await worker.handle({type:'grants'},sender);
  assert.equal(model.scripts.length,1);
  model.latency=5;
  await Promise.all([worker.handle({type:'enabled',value:false},sender),worker.handle({type:'enabled',value:true},sender),worker.handle({type:'enabled',value:false},sender)]);
  assert.equal((await worker.handle({type:'status'},sender)).state.enabled,false);
  assert.equal(model.scripts.length,0);
  await createCoordinator(api,()=>2000).start();
  assert.equal(model.db.state.enabled,false);
});

test('Controller darf einen neueren aktiven Zustand beim Ausschalten nicht als Erfolg bestätigen', async () => {
  const {api,model,sender}=browserDouble(defaultState());
  model.origins=['http://*/*','https://*/*'];model.tabs=[{id:1,url:'https://reddit.com/'}];
  const worker=createCoordinator(api,()=>1000);await worker.start();
  api.scripting.executeScript=async()=>[{frameId:0,result:{applied:true,reason:'stale'}}];
  const status=await worker.handle({type:'enabled',value:false},sender);
  assert.equal(status.pages[1].reason,'reload');
});

test('Nicht bestätigte Bereinigung nach Rechteentzug verlangt Neuladen', async () => {
  const {api,model,sender}=browserDouble(defaultState());
  model.origins=['http://*/*','https://*/*'];model.tabs=[{id:1,url:'https://reddit.com/'}];
  const worker=createCoordinator(api,()=>1000);await worker.refresh();
  model.origins=[];api.tabs.sendMessage=async()=>({applied:true});
  await worker.refresh();
  const status=await worker.handle({type:'status'},sender);
  assert.equal(status.pages[1].reason,'reload');
});

test('Rechteverlust macht alte Dokumentantworten ungültig und entfernt Registrierung', async () => {
  const {api,model}=browserDouble(defaultState()); model.origins=['http://*/*','https://*/*'];
  const worker=createCoordinator(api,()=>1000); await worker.start();
  const sender={id:'test-id',frameId:0,tab:{id:1},url:'https://reddit.com/'};
  const before=await worker.document({type:'document'},sender);
  model.origins=[]; await worker.refresh();
  const after=await worker.document({type:'document'},sender);
  assert.equal(after.active,false);
  assert.ok(after.revision>before.revision);
  assert.equal(model.scripts.length,0);
  assert.equal(model.badge,'!');
  assert.equal(model.title,'Local Grayscale · Aktion erforderlich');
});

test('Beschädigtes Schema und fehlender sicherer Speicher stoppen Injektion ohne stilles Zurücksetzen', async () => {
  const corrupt={...defaultState(),schemaVersion:99};
  const {api,model,sender}=browserDouble(corrupt);
  model.scripts=[{id:'local-grayscale'}];
  const worker=createCoordinator(api,()=>1000); await worker.start();
  const status=await worker.handle({type:'status'},sender);
  assert.equal(Boolean(status.error),true);
  assert.equal(model.badge,'!');
  assert.equal(model.scripts.length,0);
  assert.deepEqual(model.db.state,corrupt);
  await assert.rejects(worker.handle({type:'enabled',value:true},sender));
  await worker.handle({type:'recover'},sender);
  assert.equal(model.db.state.enabled,false);
  assert.equal(model.db.state.mode,'selected');
  const broken=browserDouble(); broken.model.failAccess=true;
  const failed=createCoordinator(broken.api); await failed.start();
  assert.equal(Boolean((await failed.handle({type:'status'},broken.sender)).error),true);
  assert.equal(broken.model.scripts.length,0);
  assert.equal(broken.model.badge,'!');
  assert.equal(broken.model.db.state,undefined);
});

test('Neue Dokumente bekommen nur vom eigenen Top-Level-Controller eine geprüfte Entscheidung', async () => {
  const {api,model}=browserDouble({...defaultState(),mode:'selected',grayscaleSites:['reddit.com']});
  const worker=createCoordinator(api,()=>1000); await worker.start();
  const sender={id:'test-id',url:'https://reddit.com/',tab:{id:1},frameId:0};
  assert.equal((await worker.document({type:'document'},sender)).active,false);
  model.origins=['http://*/*','https://*/*'];
  await worker.refresh();
  assert.equal((await worker.document({type:'document'},sender)).active,true);
  await assert.rejects(worker.document({type:'document'},{...sender,frameId:1}));
  await assert.rejects(worker.document({type:'document'},{...sender,id:'other'}));
  await assert.rejects(worker.document({type:'document',active:true},sender));
});

test('Offene Tabs werden abgeglichen, Einzelfehler isoliert und beim Moduswechsel entfärbt', async () => {
  const {api,model,sender}=browserDouble(defaultState());
  model.origins=['http://*/*','https://*/*'];
  model.tabs=[{id:1,url:'https://reddit.com/'},{id:2,url:'https://example.com/'},{id:3,url:'edge://extensions/'}];
  model.failTab=2;
  const worker=createCoordinator(api,()=>1000); await worker.refresh();
  assert.equal(model.applications.some(a=>a.active && a.expectedUrl==='https://reddit.com/'),true);
  const status=await worker.handle({type:'status'},sender);
  assert.equal(status.pages[1].reason,'active');
  assert.equal(status.pages[2].reason,'reload');
  model.applications=[];
  await worker.handle({type:'mode',mode:'selected'},sender);
  assert.equal(model.applications.some(a=>!a.active && a.expectedUrl==='https://reddit.com/'),true);
  assert.deepEqual(model.origins,['http://*/*','https://*/*']);
  assert.equal(model.scripts.length,0);
});

test('Listen und Import bleiben atomar und behalten den ausgeschalteten Zustand', async () => {
  const {api,model,sender}=browserDouble({...defaultState(),mode:'selected',enabled:false,pauseUntil:null});
  const worker=createCoordinator(api,()=>1000); await worker.start();
  const imported={formatVersion:1,mode:'global',colorExceptions:['color.de'],grayscaleSites:['reddit.com','old.reddit.com']};
  const before=structuredClone(model.db.state);
  await assert.rejects(worker.handle({type:'import',text:'{"formatVersion":9}'},sender));
  assert.deepEqual(model.db.state,before);
  model.origins=['http://*/*','https://*/*'];
  await worker.handle({type:'import',text:JSON.stringify(imported)},sender);
  assert.equal(model.db.state.enabled,false);
  assert.deepEqual(model.db.state.grayscaleSites,['old.reddit.com','reddit.com']);
  await worker.handle({type:'mode',mode:'selected'},sender);
  await worker.handle({type:'remove',list:'grayscaleSites',domain:'reddit.com'},sender);
  assert.deepEqual(model.db.state.grayscaleSites,['old.reddit.com']);
  assert.deepEqual(model.origins,['http://*/*','https://*/*']);
  await worker.handle({type:'add',list:'colorExceptions',domain:'NEW.de.'},sender);
  assert.deepEqual(model.db.state.colorExceptions,['color.de','new.de']);
});

test('Pause nutzt absolute Zeit, wird nach Neustart rekonstruiert und alte Alarme schalten nie ein', async () => {
  let clock=1000;
  const {api,model,sender}=browserDouble(defaultState());
  model.origins=['http://*/*','https://*/*'];
  let worker=createCoordinator(api,()=>clock);
  await worker.handle({type:'pause',minutes:5},sender);
  assert.equal(model.db.state.pauseUntil,301000);
  assert.equal(model.scripts.length,0);
  model.alarms.clear(); clock=2000;
  worker=createCoordinator(api,()=>clock); await worker.start();
  assert.equal(model.alarms.get('local-grayscale-pause').scheduledTime,301000);
  await worker.handle({type:'pause',minutes:15},sender);
  assert.equal(model.db.state.pauseUntil,902000);
  clock=500; await worker.refresh();
  assert.equal(model.db.state.pauseUntil,902000);
  clock=903000; await worker.refresh();
  assert.equal(model.db.state.pauseUntil,null);
  assert.equal(model.scripts.length,1);
  await worker.handle({type:'pause',minutes:30},sender);
  await worker.handle({type:'enabled',value:false},sender);
  await worker.refresh();
  assert.equal(model.db.state.enabled,false);
  assert.equal(model.db.state.pauseUntil,null);
  assert.equal(model.alarms.size,0);
  await assert.rejects(worker.handle({type:'pause',minutes:5},sender));
});

test('Manipulierte Nachrichten und fremde Sender verändern nichts', async () => {
  const {api,model,sender}=browserDouble();
  const worker=createCoordinator(api,()=>1000);
  await worker.start();
  const before=structuredClone(model.db.state);
  for(const foreign of [{...sender,id:'other'}, {...sender,url:'https://example.com'}, {...sender,url:'chrome-extension://test-id/other.html'}, {...sender,tab:{id:1},url:'https://example.com'}, {...sender,origin:'https://example.com'}]) {
    await assert.rejects(worker.handle({type:'enabled',value:false},foreign));
  }
  for(const message of [{type:'enabled',value:'yes'}, {type:'enabled',value:false,script:'evil'}, {type:'run',file:'evil.js'}, {type:'status',extra:true}, null]) {
    await assert.rejects(worker.handle(message,sender));
  }
  assert.deepEqual(model.db.state,before);
});

test('Eigene Optionsseite darf auch als Browser-Tab Einstellungen ändern', async () => {
  const {api,sender}=browserDouble(); const worker=createCoordinator(api);
  const result=await worker.handle({type:'enabled',value:false},{...sender,url:'chrome-extension://test-id/options/options.html',tab:{id:7},frameId:0});
  assert.equal(result.state.enabled,false);
});
