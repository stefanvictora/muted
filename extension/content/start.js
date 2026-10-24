(() => {
  const expectedUrl = location.href;
  chrome.runtime.sendMessage({type:'document'}).then(result => {
    if (result?.ok && location.href === expectedUrl) globalThis.__localGrayscaleV1?.set(result.value);
  }).catch(() => { /* A suspended/reloaded extension never authorizes a new filter. */ });
})();
