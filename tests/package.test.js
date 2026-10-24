import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';

test('Paket fordert ausschließlich optionale HTTP-Hosts an und enthält nur lokale Runtime-Dateien', async () => {
  const root=new URL('../extension/',import.meta.url);
  const manifest=JSON.parse(await readFile(new URL('manifest.json',root)));
  assert.equal(manifest.manifest_version,3);
  assert.deepEqual(manifest.permissions,['storage','scripting','activeTab','alarms']);
  assert.deepEqual(manifest.optional_host_permissions,['http://*/*','https://*/*']);
  for(const key of ['host_permissions','content_scripts','update_url','externally_connectable','web_accessible_resources']) assert.equal(key in manifest,false,key);
  assert.equal(manifest.incognito,'not_allowed');
  assert.match(manifest.content_security_policy.extension_pages,/connect-src 'none'/);
  async function audit(dir) {
    for (const entry of await readdir(dir,{withFileTypes:true})) {
      const path=new URL(entry.name+(entry.isDirectory()?'/':''),dir);
      if(entry.isDirectory()) await audit(path);
      else if (/\.(js|html|css)$/.test(entry.name)) {
        const source=await readFile(path,'utf8');
        assert.doesNotMatch(source,/\b(?:fetch|XMLHttpRequest|WebSocket|RTCPeerConnection|eval)\s*\(|sendBeacon\s*\(|innerHTML\s*=|document\.write\s*\(/,path.pathname);
        assert.doesNotMatch(source,/<script[^>]+src=["']https?:|@import\s|https?:\/\/[^\s]+\.(?:js|css)["']/,path.pathname);
      }
    }
  }
  await audit(root);
  for(const path of [manifest.background.service_worker,manifest.action.default_popup,manifest.options_ui.page]) await readFile(new URL(path,root));
});
