const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
test('history persists, deduplicates delivery and tap, and isolates accounts', async () => {
  const storage = new Map();
  const source = fs.readFileSync(require.resolve('./notification-history.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '') +
    '\nmodule.exports = { recordNotification, readHistory, markHistoryRead };';
  const load = () => {
    const context = { module: { exports: {} }, AsyncStorage: {
      getItem: async (key) => storage.get(key),
      setItem: async (key, value) => storage.set(key, value),
    } };
    vm.runInNewContext(source, context);
    return context.module.exports;
  };
  const h = load();
  const notification = { date: 1000, request: { identifier: 'task-reminder:7:2:due',
    content: { title: 'Task', body: 'Due', data: { userId: 7, taskId: 2, due: 1000 } } } };
  await Promise.all([h.recordNotification(notification), h.recordNotification(notification)]);
  const items = await h.readHistory(7);
  assert.equal(items.length, 1);
  assert.equal((await h.readHistory(8)).length, 0);
  await h.markHistoryRead(7, [items[0].id]);
  assert.equal((await load().readHistory(7))[0].read, true);
  await h.recordNotification(notification);
  assert.equal((await h.readHistory(7))[0].read, true);
});
