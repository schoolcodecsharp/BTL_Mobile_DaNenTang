const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { PREFIX, buildReminderPlan } = require('./reminder-plan.cjs');

function harness({ granted = true, platform = 'android', expoGo = false } = {}) {
  const pending = new Map();
  const storage = new Map();
  const calls = [];
  const n = {
    AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler() {},
    async setNotificationChannelAsync(id, options) {
      assert.equal(id, 'task-reminders');
      assert.equal(Object.hasOwn(options, 'sound'), false, 'Use the system sound, not a custom sound filename');
      calls.push('channel');
    },
    async getPermissionsAsync() { return { granted, canAskAgain: true }; },
    async requestPermissionsAsync() { calls.push('permission'); return { granted }; },
    async getAllScheduledNotificationsAsync() { return [...pending.values()]; },
    async cancelScheduledNotificationAsync(id) { pending.delete(id); },
    async scheduleNotificationAsync(item) { pending.set(item.identifier, item); calls.push(item); },
  };
  let source = fs.readFileSync(require.resolve('./task-reminders.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/export /g, '')
    .replace("await import('expo-notifications')", 'loadNotifications()');
  source += '\nmodule.exports = { activateReminders, stopReminders, setRemindersEnabled, syncTaskReminders, changeTaskReminder, reminderRevision, notificationsModule, sendTestReminder, saveTaskReminderOptions };';
  const context = { module: { exports: {} }, PREFIX, buildReminderPlan, mockNotifications: n,
    Platform: { OS: platform }, Alert: { alert() {} }, console,
    Constants: { executionEnvironment: expoGo ? 'storeClient' : 'bare' },
    ExecutionEnvironment: { StoreClient: 'storeClient' },
    loadNotifications() {
      calls.push('import');
      if (expoGo && platform === 'android') throw new Error('Push unavailable in Expo Go');
      return n;
    },
    AsyncStorage: { async getItem(k) { return storage.get(k) ?? null; }, async setItem(k, v) { storage.set(k, v); } },
  };
  vm.runInNewContext(source, context);
  return { ...context.module.exports, pending, calls, storage };
}
const task = (id, minutes = 30) => ({ id, tieuDe: `Task ${id}`, trangThai: 'CHUA_LAM', hanHoanThanh: new Date(Date.now() + minutes * 60000).toISOString() });
async function sync(h, tasks) { await h.syncTaskReminders(7, tasks, h.reminderRevision()); }

test('plans early reminders, falls back to due time, skips completed/invalid/past and caps nearest 60', () => {
  const now = Date.now();
  const early = task(1, 30), near = task(2, 5);
  const plan = buildReminderPlan(7, [early, near, task(3, -1), { ...task(4), trangThai: 'HOAN_THANH' }, { id: 5 }], now);
  assert.equal(plan.length, 3);
  assert.equal(plan[0].at, new Date(near.hanHoanThanh).getTime());
  assert.equal(plan[1].at, new Date(early.hanHoanThanh).getTime() - 600000);
  assert.equal(buildReminderPlan(7, Array.from({ length: 80 }, (_, i) => task(i, i + 20)), now).length, 60);
});
test('resync is idempotent, editing replaces, completion and deletion cancel', async () => {
  const h = harness(); await h.activateReminders(7);
  const a = task(1), b = task(2);
  await sync(h, [a, b]); await sync(h, [a, b]);
  assert.equal(h.calls.filter((c) => typeof c === 'object').length, 4);
  const changed = { ...a, hanHoanThanh: task(1, 60).hanHoanThanh };
  await h.changeTaskReminder(7, changed);
  assert.equal(h.pending.get(`${PREFIX}7:1:due`).content.data.due, new Date(changed.hanHoanThanh).getTime());
  await h.changeTaskReminder(7, { ...changed, trangThai: 'HOAN_THANH' });
  await h.changeTaskReminder(7, b, true);
  assert.equal(h.pending.size, 0);
});
test('disable persists, re-enable restores, logout clears only owned notifications', async () => {
  const h = harness(); await h.activateReminders(7); await sync(h, [task(1)]);
  h.pending.set('other', { identifier: 'other', content: {} });
  await h.setRemindersEnabled(false);
  assert.equal(h.pending.size, 1);
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
  await h.setRemindersEnabled(true);
  assert.equal(h.pending.size, 3);
  await h.stopReminders(); assert.equal(h.pending.size, 1);
});
test('stale fetch cannot resurrect deleted tasks, and old account cannot schedule', async () => {
  const h = harness(); await h.activateReminders(7);
  const a = task(1); await sync(h, [a]);
  const old = h.reminderRevision();
  await h.changeTaskReminder(7, a, true);
  await h.syncTaskReminders(7, [a], old);
  assert.equal(h.pending.size, 0);
  await h.activateReminders(8); await h.changeTaskReminder(7, a);
  assert.equal(h.pending.size, 0);
});
test('denied permission and web never schedule', async () => {
  for (const options of [{ granted: false }, { platform: 'web' }]) {
    const h = harness(options); await h.activateReminders(7); await sync(h, [task(1)]);
    assert.equal(h.pending.size, 0);
  }
});
test('a delivered early reminder does not suppress the separate due notification', async () => {
  const h = harness(); await h.activateReminders(7);
  const a = task(1, 5);
  h.storage.set('task-reminders-armed', JSON.stringify({ [`${PREFIX}7:1:soon`]: { due: new Date(a.hanHoanThanh).getTime(), at: Date.now() - 1000 } }));
  await sync(h, [a]); assert.equal(h.pending.size, 1);
  assert.ok(h.pending.has(`${PREFIX}7:1:due`));
});

test('Android Expo Go startup, login and logout never import notifications', async () => {
  const h = harness({ expoGo: true });
  assert.equal(await h.notificationsModule(), null);
  await h.activateReminders(7);
  await sync(h, [task(1)]);
  await h.setRemindersEnabled(true);
  await h.stopReminders();
  assert.equal(h.calls.length, 0);
  assert.equal(h.pending.size, 0);
});

test('four distinct milestones and safe migration from the previous single reminder', async () => {
  const h = harness(); await h.activateReminders(7);
  const a = task(1, 1500);
  const plan = buildReminderPlan(7, [a]);
  assert.equal(plan.length, 4);
  assert.equal(new Set(plan.map(p => p.identifier)).size, 4);
  assert.deepEqual(plan.map(p => (p.due - p.at) / 60000), [1440, 60, 10, 0]);
  h.pending.set(PREFIX + '7:1', { identifier: PREFIX + '7:1', content: { title: a.tieuDe, data: { due: Date.parse(a.hanHoanThanh) } } });
  await sync(h, [a]);
  assert.equal(h.pending.has(PREFIX + '7:1'), false);
  assert.equal(h.pending.size, 4);
  await sync(h, [a]);
  assert.equal(h.calls.filter(c => typeof c === 'object').length, 4);
  await h.changeTaskReminder(7, { ...a, trangThai: 'HOAN_THANH' });
  assert.equal(h.pending.size, 0);
});

test('test reminder schedules locally ten seconds ahead and refuses denied permission', async () => {
  const h = harness();
  const before = Date.now();
  await h.sendTestReminder();
  const scheduled = h.calls.find(item => typeof item === 'object');
  assert.equal(scheduled.trigger.channelId, 'task-reminders');
  assert.ok(scheduled.trigger.date.getTime() >= before + 10000);
  const denied = harness({ granted: false });
  await assert.rejects(denied.sendTestReminder(), /quyền thông báo/);
  assert.equal(denied.pending.size, 0);
});

test('per-task reminder choices survive resync and an empty choice cancels all reminders', async () => {
 const h = harness(); await h.activateReminders(7);
 const a = task(99, 120);
 await h.saveTaskReminderOptions(7, a.id, [30, 5, 0]);
 await sync(h, [a]);
 assert.equal(h.pending.size, 3);
 assert.ok(h.pending.has(PREFIX + '7:99:halfHour'));
 assert.ok(h.pending.has(PREFIX + '7:99:five'));
 await sync(h, [a]);
 assert.equal(h.calls.filter(c => typeof c === 'object').length, 3);
 await h.saveTaskReminderOptions(7, a.id, []);
 await sync(h, [a]);
 assert.equal(h.pending.size, 0);
});
