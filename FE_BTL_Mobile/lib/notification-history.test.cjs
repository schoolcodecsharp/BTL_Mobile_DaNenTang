const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function harness(storage = new Map()) {
  const source = fs.readFileSync(require.resolve('./notification-history.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') +
    '\nmodule.exports = { recordNotification, readHistory, markHistoryRead };';
  const context = { module: { exports: {} }, AsyncStorage: {
    getItem: async (key) => storage.get(key),
    setItem: async (key, value) => storage.set(key, value),
  } };
  vm.runInNewContext(source, context);
  return { ...context.module.exports, storage };
}
test('history persists, deduplicates delivery and tap, and isolates accounts', async () => {
  const h = harness();
  const notification = { date: 1000, request: { identifier: 'task-reminder:7:2:due',
    content: { title: 'Task', body: 'Due', data: { userId: 7, taskId: 2, due: 1000 } } } };
  await Promise.all([h.recordNotification(notification), h.recordNotification(notification)]);
  const items = await h.readHistory(7);
  assert.equal(items.length, 1);
  assert.equal((await h.readHistory(8)).length, 0);
  await h.markHistoryRead(7, [items[0].id]);
  assert.equal((await harness(h.storage).readHistory(7))[0].read, true);
  await h.recordNotification(notification);
  assert.equal((await h.readHistory(7))[0].read, true);
});

test('a received test notification persists once and remains isolated to its account', async () => {
  const h = harness();
  assert.equal((await h.readHistory(7)).length, 0);
  const notification = { date: 1000, request: { identifier: 'task-reminder-test:7:unique-id',
    content: { title: 'Thử nhắc công việc', body: 'Điện thoại đã nhận thông báo.',
      data: { userId: '7', test: true } } } };
  await Promise.all([h.recordNotification(notification), h.recordNotification(notification)]);
  const items = await h.readHistory(7);
  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Thử nhắc công việc');
  assert.equal(items[0].read, false);
  assert.equal((await h.readHistory(8)).length, 0);
  assert.equal((await harness(h.storage).readHistory(7)).length, 1);
  await h.markHistoryRead(7, [items[0].id]);
  await h.recordNotification(notification);
  assert.equal((await h.readHistory(7))[0].read, true);
});

test('test identifiers require the explicit boolean test flag and an account', async () => {
  const h = harness();
  for (const data of [{ userId: 7 }, { userId: 7, test: false }, { userId: 7, test: 'true' }, { test: true }]) {
    await h.recordNotification({ request: { identifier: 'task-reminder-test:7:unique-id',
      content: { title: 'Ignore', data } } });
  }
  await h.recordNotification({ request: { identifier: 'server-notification:7:1',
    content: { data: { userId: 7, test: true } } } });
  assert.equal((await h.readHistory(7)).length, 0);
  assert.equal(h.storage.size, 0);
});
