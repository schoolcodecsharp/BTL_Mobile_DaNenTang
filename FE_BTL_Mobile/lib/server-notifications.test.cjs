const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');

function harness() {
  const state = { list: [], active: true, enabled: true, fail: false, delivered: [], storage: new Map() };
  const source = fs.readFileSync(require.resolve('./server-notifications.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '').replace(/export /g, '')
    + '\nmodule.exports = { createServerNotificationPoller };';
  const context = { module: { exports: {} },
    AsyncStorage: { async getItem(key) { return state.storage.get(key) ?? null; },
      async setItem(key, value) { state.storage.set(key, value); } },
    getNotifications: async () => state.list,
    getReminderState: () => state.enabled,
    notificationsModule: async () => ({ AndroidImportance: { HIGH: 4 },
      async setNotificationChannelAsync() {},
      async scheduleNotificationAsync(notification) {
        if (state.fail) throw new Error('native failure');
        state.delivered.push(notification);
      } }),
  };
  vm.runInNewContext(source, context);
  state.poll = context.module.exports.createServerNotificationPoller(7, () => state.active);
  return state;
}
const event = (id, daDoc = false) => ({ id, daDoc, tieuDe: 'Được giao việc', noiDung: 'Việc mới', nhomId: 4, congViecNhomId: 9 });

test('baseline is quiet, new unread events alert once even with concurrent polls', async () => {
  const h = harness();
  h.list = [event(1)];
  await h.poll();
  assert.equal(h.delivered.length, 0);
  h.list = [event(3, true), event(2), event(1)];
  await Promise.all([h.poll(), h.poll()]);
  assert.equal(h.delivered.length, 1);
  assert.equal(h.delivered[0].identifier, 'server-notification:7:2');
  assert.equal(h.delivered[0].content.data.teamId, 4);
  assert.equal(h.delivered[0].content.data.groupTaskId, 9);
});

test('failed delivery remains retryable instead of silently advancing the cursor', async () => {
  const h = harness();
  await h.poll();
  h.list = [event(1)]; h.fail = true;
  await assert.rejects(h.poll(), /native failure/);
  assert.equal(h.storage.get('server-notification-cursor-v1:7'), '0');
  h.fail = false;
  await h.poll();
  assert.equal(h.delivered.length, 1);
});

test('disabled notification preference consumes events without replaying them later', async () => {
  const h = harness(); await h.poll();
  h.enabled = false; h.list = [event(1)]; await h.poll();
  h.enabled = true; await h.poll();
  assert.equal(h.delivered.length, 0);
});

test('no polling or delivery after logout/background', async () => {
  const h = harness(); await h.poll();
  h.active = false; h.list = [event(1)]; await h.poll();
  assert.equal(h.delivered.length, 0);
  assert.equal(h.storage.get('server-notification-cursor-v1:7'), '0');
  h.active = true; await h.poll();
  assert.equal(h.delivered.length, 1);
});
