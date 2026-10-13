const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { createLiveRefresh } = require('./live-refresh.cjs');
const turn = () => new Promise(resolve => setImmediate(resolve));
function harness() {
  const timers = new Map();
  const changes = new Set();
  let stateListener;
  let cleanup;
  const appState = { currentState: 'active', addEventListener: (_event, listener) => {
    stateListener = listener; return { remove() { stateListener = null; } };
  } };
  const context = { createLiveRefresh, AppState: appState, Platform: { OS: 'android' }, console,
    useRef: value => ({ current: value }), useEffect: effect => effect(), useCallback: callback => callback,
    useFocusEffect: effect => { cleanup = effect(); },
    setInterval: (callback, delay) => { const key = Symbol(); timers.set(key, { callback, delay }); return key; },
    clearInterval: key => timers.delete(key),
    subscribeTaskChanges: listener => { changes.add(listener); return () => changes.delete(listener); },
    module: { exports: {} },
  };
  const source = fs.readFileSync(require.resolve('../hooks/use-live-refresh.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')
    + '\nmodule.exports = { useLiveRefresh };';
  vm.runInNewContext(source, context);
  return { mount: context.module.exports.useLiveRefresh, timers, changes,
    state(value) { appState.currentState = value; stateListener?.(value); },
    leave() { cleanup?.(); } };
}
test('personal pages load on entry and resume without periodic network polling', async () => {
  const h = harness(); const calls = [];
  h.mount(silent => calls.push(silent)); await turn();
  assert.deepEqual(calls, [false]);
  assert.equal(h.timers.size, 0); assert.equal(h.changes.size, 0);
  h.state('background'); await turn(); assert.equal(calls.length, 1);
  h.state('active'); await turn(); assert.deepEqual(calls, [false, true]);
  h.leave(); h.state('active'); await turn(); assert.equal(calls.length, 2);
});
test('shared data polls only while the page is focused and app is active', async () => {
  const h = harness(); let calls = 0;
  h.mount(() => { calls++; }, { interval: 15000 }); await turn();
  assert.equal(calls, 1); assert.equal(h.timers.size, 1);
  const timer = [...h.timers.values()][0]; assert.equal(timer.delay, 15000);
  h.state('background'); timer.callback(); await turn(); assert.equal(calls, 1);
  h.state('active'); await turn(); assert.equal(calls, 2);
  timer.callback(); await turn(); assert.equal(calls, 3);
  h.leave(); assert.equal(h.timers.size, 0);
  timer.callback(); await turn(); assert.equal(calls, 3);
});
test('only pages that depend on task changes subscribe to local task events', async () => {
  const h = harness(); let calls = 0;
  h.mount(() => { calls++; }, { listenToTaskChanges: true }); await turn();
  assert.equal(h.changes.size, 1); assert.equal(h.timers.size, 0);
  for (const listener of h.changes) listener(); await turn(); assert.equal(calls, 2);
  h.leave(); assert.equal(h.changes.size, 0);
});
