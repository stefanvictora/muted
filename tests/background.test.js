import test from 'node:test';
import assert from 'node:assert/strict';
import { installBackground } from '../extension/background.js';
import { browserDouble } from './browser-double.js';
import { defaultState } from '../extension/core/schema.js';

test('Worker registriert Nachrichten synchron und beantwortet erst nach sicherer Initialisierung', async () => {
  const {api,model,sender}=browserDouble();
  installBackground(api);
  const response=await new Promise(resolve=>api.runtime.onMessage.emit({type:'status'},sender,resolve));
  assert.equal(response.ok,true);
  assert.equal(model.trusted,true);
  assert.equal(model.badge,'!');
  const denied=await new Promise(resolve=>api.runtime.onMessage.emit({type:'enabled',value:false},{id:'other'},resolve));
  assert.equal(denied.ok,false);
});

test('Schlafende Tabs werden nicht geweckt; beim Aktivieren erfolgt ein neuer Filterabgleich', async () => {
  const {api,model}=browserDouble(defaultState());
  model.origins=['http://*/*','https://*/*'];model.tabs=[{id:1,url:'https://sleeping.example/',frozen:true}];
  let activate;
  api.tabs.onActivated={addListener:fn=>{activate=fn;}};
  const worker=installBackground(api);await worker.start();
  assert.equal(model.applications.length,0);
  assert.equal(typeof activate,'function');
  model.tabs[0].frozen=false;activate({tabId:1,windowId:1});
  for(let i=0;i<20 && !model.applications.length;i++) await new Promise(resolve=>setImmediate(resolve));
  assert.equal(model.applications.some(config=>config.active),true);
});
