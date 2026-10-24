(() => {
  if (globalThis.__localGrayscaleV1 || self !== top) return;
  const className = 'local-grayscale-v1-active';
  let revision = -1, active = false, observer = null, waiting = null, timer = null;
  function stop() {
    active = false;
    observer?.disconnect();
    observer = null;
    waiting?.disconnect();
    waiting = null;
    clearTimeout(timer);
    timer = null;
    document.documentElement?.classList.remove(className);
  }
  function apply() {
    if (document.contentType === 'application/pdf') return {applied:false,reason:'unsupported'};
    const root = document.documentElement;
    if (!root) {
      active = true;
      waiting = new MutationObserver(() => {
        if (!active || !document.documentElement) return;
        waiting?.disconnect(); waiting=null; clearTimeout(timer); timer=null;
        apply();
      });
      waiting.observe(document,{childList:true});
      timer = setTimeout(() => { waiting?.disconnect(); waiting=null; timer=null; },2000);
      return {applied:false,reason:'pending'};
    }
    active = true;
    root.classList.add(className);
    observer = new MutationObserver(() => {
      if (active && !root.classList.contains(className)) root.classList.add(className);
    });
    observer.observe(root,{attributes:true,attributeFilter:['class']});
    return {applied:true,reason:'active'};
  }
  const controller = {
    set(config) {
      if (!Number.isSafeInteger(config.revision) || config.revision < revision) return {applied:active,reason:'stale'};
      if (config.expectedUrl !== location.href) return {applied:active,reason:'navigated'};
      revision = config.revision;
      stop();
      return config.active ? apply() : {applied:false,reason:'inactive'};
    }
  };
  globalThis.__localGrayscaleV1 = controller;
  chrome.runtime.onMessage.addListener((message,sender,respond) => {
    if (sender.id !== chrome.runtime.id || message?.type !== 'deactivate' || !Number.isSafeInteger(message.revision)) return;
    if (message.revision >= revision) { revision=message.revision; stop(); }
    respond({applied:active});
  });
})();
