// Development-only helper. Never included in the installable extension.
export async function connect(port) {
  const info = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  const socket = new WebSocket(info.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });
  let next = 0;
  const pending = new Map(),
    listeners = [];
  socket.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id) {
      const p = pending.get(data.id);
      if (!p) return;
      pending.delete(data.id);
      clearTimeout(p.timer);
      data.error ? p.reject(new Error(JSON.stringify(data.error))) : p.resolve(data.result);
    } else listeners.forEach((fn) => fn(data));
  };
  function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
      const id = ++next;
      const timer = setTimeout(() => {
        pending.delete(id);
        reject(new Error(`CDP timeout: ${method}`));
      }, 12000);
      pending.set(id, { resolve, reject, timer });
      socket.send(JSON.stringify({ id, method, params, sessionId }));
    });
  }
  async function attach(targetId) {
    return (await send('Target.attachToTarget', { targetId, flatten: true })).sessionId;
  }
  async function evaluate(sessionId, expression, userGesture = false) {
    const result = await send(
      'Runtime.evaluate',
      { expression, awaitPromise: true, returnByValue: true, userGesture },
      sessionId,
    );
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
    return result.result.value;
  }
  return {
    info,
    send,
    attach,
    evaluate,
    on: (fn) => listeners.push(fn),
    close: () => socket.close(),
  };
}
