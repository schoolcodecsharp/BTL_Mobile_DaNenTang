const assert = require('node:assert/strict');
const test = require('node:test');
const { createLiveRefresh } = require('./live-refresh.cjs');
const turn = () => new Promise(resolve => setImmediate(resolve));

test('slow refresh coalesces updates and never overlaps requests', async () => {
  let finish;
  const first = new Promise(resolve => { finish = resolve; });
  const calls = [];
  const runner = createLiveRefresh(async silent => {
    calls.push(silent);
    if (calls.length === 1) await first;
  });
  const pending = runner.request(false);
  await turn();
  runner.request(); runner.request(); runner.request();
  assert.deepEqual(calls, [false]);
  finish(); await pending;
  assert.deepEqual(calls, [false, true]);
});

test('hidden app makes no requests; returning to foreground can retry a failure', async () => {
  let active = false;
  let calls = 0;
  const errors = [];
  const runner = createLiveRefresh(async () => {
    calls++;
    if (calls === 1) throw new Error('offline');
  }, { isActive: () => active, onError: error => errors.push(error.message) });
  await runner.request(); assert.equal(calls, 0);
  active = true;
  await runner.request(); await runner.request();
  assert.equal(calls, 2); assert.deepEqual(errors, ['offline']);
});

test('leaving a screen cancels queued refreshes during an in-flight request', async () => {
  let finish;
  const wait = new Promise(resolve => { finish = resolve; });
  let calls = 0;
  const runner = createLiveRefresh(async () => { calls++; await wait; });
  const pending = runner.request();
  await turn(); runner.request(); runner.stop(); finish(); await pending;
  await runner.request(); assert.equal(calls, 1);
});

test('a late response cannot commit after the user leaves or changes account', async () => {
  let finish;
  const wait = new Promise(resolve => { finish = resolve; });
  let committed = false;
  const runner = createLiveRefresh(async (_silent, isCurrent) => {
    await wait;
    if (isCurrent()) committed = true;
  });
  const pending = runner.request();
  await turn(); runner.stop(); finish(); await pending;
  assert.equal(committed, false);
});
