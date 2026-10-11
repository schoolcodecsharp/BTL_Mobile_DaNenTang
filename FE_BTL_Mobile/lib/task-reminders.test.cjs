const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const { PREFIX, buildReminderPlan } = require('./reminder-plan.cjs');

const nextTurn = () => new Promise(resolve => setImmediate(resolve));

function deferred() {
  let resolve;
  const promise = new Promise(yes => { resolve = yes; });
  return { promise, resolve };
}

const plain = value => JSON.parse(JSON.stringify(value));

function fakeTimers() {
  let now = 0;
  let nextId = 0;
  const timers = new Map();
  return {
    setTimeout(callback, delay) {
      const id = ++nextId;
      timers.set(id, { callback, at: now + delay });
      return id;
    },
    clearTimeout(id) { timers.delete(id); },
    get pendingCount() { return timers.size; },
    async advance(milliseconds) {
      const target = now + milliseconds;
      for (;;) {
        const pending = [...timers].filter(([, timer]) => timer.at <= target)
          .sort((left, right) => left[1].at - right[1].at)[0];
        if (!pending) break;
        const [id, timer] = pending;
        now = timer.at;
        timers.delete(id);
        timer.callback();
        await nextTurn();
      }
      now = target;
      await nextTurn();
    },
  };
}

function harness({ granted = true, platform = 'android', expoGo = false, nativeOverrides = {}, storageOverrides = {} } = {}) {
  const pending = new Map();
  const storage = new Map();
  const calls = [];
  const logs = [];
  const timers = fakeTimers();
  const n = {
    AndroidImportance: { HIGH: 4 }, IosAuthorizationStatus: { PROVISIONAL: 3 },
    SchedulableTriggerInputTypes: { DATE: 'date' },
    setNotificationHandler(handler) { n.handler = handler; calls.push('handler'); },
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
    ...nativeOverrides,
  };
  let source = fs.readFileSync(require.resolve('./task-reminders.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/export /g, '')
    .replace("await import('expo-notifications')", 'await loadNotifications()')
    .replace(/require\(['"]expo-notifications['"]\)/g, 'loadNotifications()');
  source += '\nmodule.exports = { activateReminders, stopReminders, setRemindersEnabled, syncTaskReminders, changeTaskReminder, reminderRevision, notificationsModule, sendTestReminder, saveTaskReminderOptions, getReminderState, getReminderStatus, refreshReminderPermission, subscribeReminders, runNotificationOperation: typeof runNotificationOperation === "function" ? runNotificationOperation : undefined };';
  const context = { module: { exports: {} }, PREFIX, buildReminderPlan, mockNotifications: n,
    Platform: { OS: platform }, Alert: { alert() {} },
    console: Object.fromEntries(['log', 'info', 'warn', 'error', 'debug'].map(name => [name, (...args) => logs.push({ name, args })])),
    setTimeout: timers.setTimeout, clearTimeout: timers.clearTimeout,
    Constants: { executionEnvironment: expoGo ? 'storeClient' : 'bare' },
    ExecutionEnvironment: { StoreClient: 'storeClient' },
    loadNotifications() {
      calls.push('import');
      if (expoGo && platform === 'android') throw new Error('Push unavailable in Expo Go');
      return n;
    },
    AsyncStorage: {
      async getItem(k) {
        return storageOverrides.getItem ? storageOverrides.getItem(k, storage) : storage.get(k) ?? null;
      },
      async setItem(k, v) {
        if (storageOverrides.setItem) return storageOverrides.setItem(k, v, storage);
        storage.set(k, v);
      },
    },
  };
  vm.runInNewContext(source, context);
  return { ...context.module.exports, pending, calls, storage, native: n, timers, logs };
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
  await sync(h, [task(1)]);
  assert.equal(h.pending.size, 1);
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
  await h.setRemindersEnabled(true);
  await sync(h, [task(1)]);
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
  await h.sendTestReminder(7);
  const scheduled = h.calls.find(item => typeof item === 'object');
  assert.equal(scheduled.trigger.channelId, 'task-reminders');
  assert.ok(scheduled.trigger.date.getTime() >= before + 10000);
  assert.match(scheduled.identifier, /^task-reminder-test:7:\d+$/);
  assert.deepEqual(JSON.parse(JSON.stringify(scheduled.content.data)), { userId: '7', test: true });
  const denied = harness({ granted: false });
  await assert.rejects(denied.sendTestReminder(7), /quyền thông báo/);
  assert.equal(denied.pending.size, 0);
});

test('notification initialization is cached even when callers initialize concurrently', async () => {
  const h = harness();
  const [first, second, third] = await Promise.all([
    h.notificationsModule(), h.notificationsModule(), h.notificationsModule(),
  ]);
  assert.equal(first, h.native);
  assert.equal(second, first);
  assert.equal(third, first);
  assert.equal(h.calls.filter(call => call === 'import').length, 1);
  assert.equal(h.calls.filter(call => call === 'handler').length, 1);
});

test('native operation success and rejection clear their deadline timers', async () => {
  const h = harness();
  assert.equal(await h.runNotificationOperation('successful native stage', async () => 'done'), 'done');
  assert.equal(h.timers.pendingCount, 0);
  const failure = new Error('Native bridge failed');
  await assert.rejects(h.runNotificationOperation('failed native stage', async () => { throw failure; }), error => error === failure);
  assert.equal(h.timers.pendingCount, 0);
});

test('a never-settling native operation fails with its stage after the default ten seconds', async () => {
  const h = harness();
  let settled = false;
  const operation = h.runNotificationOperation('stalled native stage', () => new Promise(() => {}));
  const failure = assert.rejects(operation, /stalled native stage/).then(() => { settled = true; });
  await h.timers.advance(9999);
  assert.equal(settled, false);
  await h.timers.advance(1);
  await failure;
  assert.equal(h.timers.pendingCount, 0);
});

for (const [method, label, value] of [
  ['setNotificationChannelAsync', 'tạo kênh thông báo', undefined],
  ['getPermissionsAsync', 'kiểm tra quyền thông báo', { granted: true, canAskAgain: true }],
  ['getAllScheduledNotificationsAsync', 'đọc lịch nhắc', []],
]) {
  test(`a stalled ${method} times out without poisoning the serial queue for a retry`, async () => {
    let stalled = true;
    const h = harness({ nativeOverrides: { [method]: () => stalled ? new Promise(() => {}) : Promise.resolve(value) } });
    const failed = assert.rejects(h.activateReminders(7), error => error.message.includes(label));
    await nextTurn();
    assert.equal(h.timers.pendingCount, 1);
    await h.timers.advance(10000);
    await failed;
    stalled = false;
    await h.activateReminders(7);
    await sync(h, [task(1)]);
    assert.equal(h.pending.size, 2);
    assert.equal(h.timers.pendingCount, 0);
  });
}

test('stalled native scheduling times out and a later reconciliation can retry', async () => {
  const h = harness();
  await h.activateReminders(7);
  const schedule = h.native.scheduleNotificationAsync;
  h.native.scheduleNotificationAsync = () => new Promise(() => {});
  const failed = assert.rejects(sync(h, [task(1)]), /đặt lịch nhắc/);
  await nextTurn();
  await h.timers.advance(10000);
  await failed;
  h.native.scheduleNotificationAsync = schedule;
  await sync(h, [task(1)]);
  assert.equal(h.pending.size, 2);
  assert.equal(h.timers.pendingCount, 0);
});

test('stalled native cancellation times out and disabling reminders later clears the queue', async () => {
  const h = harness();
  await h.activateReminders(7);
  await sync(h, [task(1)]);
  const cancel = h.native.cancelScheduledNotificationAsync;
  h.native.cancelScheduledNotificationAsync = () => new Promise(() => {});
  const failed = assert.rejects(h.changeTaskReminder(7, { id: 1 }, true), /hủy lịch nhắc/);
  await nextTurn();
  await h.timers.advance(10000);
  await failed;
  h.native.cancelScheduledNotificationAsync = cancel;
  await h.setRemindersEnabled(false);
  await sync(h, [task(1)]);
  assert.equal(h.pending.size, 0);
  assert.equal(h.timers.pendingCount, 0);
});

test('notification permission prompts receive sixty seconds before timing out', async () => {
  const h = harness({ granted: false, nativeOverrides: { requestPermissionsAsync: () => new Promise(() => {}) } });
  let settled = false;
  const failed = assert.rejects(h.sendTestReminder(7), /quá|timeout|thời gian|hết|phản hồi/i)
    .then(() => { settled = true; });
  await nextTurn();
  await h.timers.advance(59999);
  assert.equal(settled, false);
  await h.timers.advance(1);
  await failed;
  assert.equal(h.pending.size, 0);
  assert.equal(h.timers.pendingCount, 0);
});

test('test notifications require an account and unsupported runtimes never import native notifications', async () => {
  const h = harness();
  await assert.rejects(h.sendTestReminder(), /đăng nhập|tài khoản/i);
  assert.equal(h.calls.length, 0);
  for (const options of [{ expoGo: true }, { platform: 'web' }]) {
    const unsupported = harness(options);
    await assert.rejects(unsupported.sendTestReminder(7), /APK|Android/i);
    assert.equal(unsupported.calls.length, 0);
  }
});

test('reminder readiness belongs to the current account and is ready before publishing enabled state', async () => {
  const h = harness();
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: false, enabled: false });
  const published = [];
  h.subscribeReminders(() => published.push(plain(h.getReminderStatus(7))));
  await h.activateReminders(7);
  assert.deepEqual(published[0], { ready: true, enabled: true });
  assert.deepEqual(plain(h.getReminderStatus(8)), { ready: false, enabled: false });
  await h.setRemindersEnabled(false);
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: true, enabled: false });
  await h.stopReminders();
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: false, enabled: false });
  assert.equal(h.timers.pendingCount, 0);
});

for (const action of ['activate', 'refresh', 'toggle']) {
  test(`logout while ${action} waits for permission cannot publish the old account as enabled`, async () => {
    const h = harness();
    if (action !== 'activate') await h.activateReminders(7);
    if (action === 'toggle') await h.setRemindersEnabled(false);
    const permission = deferred();
    h.native.getPermissionsAsync = () => permission.promise;
    const published = [];
    h.subscribeReminders(value => published.push(value));
    const operation = {
      activate: () => h.activateReminders(7),
      refresh: () => h.refreshReminderPermission(),
      toggle: () => h.setRemindersEnabled(true),
    }[action]();
    await nextTurn();
    assert.equal(h.timers.pendingCount, 1);
    const logout = h.stopReminders();
    permission.resolve({ granted: true, canAskAgain: true });
    await Promise.all([operation, logout]);
    assert.deepEqual(published, [false]);
    assert.equal(h.getReminderState(), false);
    assert.deepEqual(plain(h.getReminderStatus(7)), { ready: false, enabled: false });
    assert.equal(h.storage.get('task-reminders-enabled:7'), action === 'activate' ? undefined : action === 'toggle' ? 'false' : 'true');
    assert.equal(h.timers.pendingCount, 0);
  });
}

test('a new account does not inherit a late permission result from the previous account', async () => {
  const permission = deferred();
  const h = harness({ nativeOverrides: { getPermissionsAsync: () => permission.promise } });
  const oldAccount = h.activateReminders(7);
  await nextTurn();
  h.native.getPermissionsAsync = async () => ({ granted: false, canAskAgain: false });
  const newAccount = h.activateReminders(8);
  permission.resolve({ granted: true, canAskAgain: true });
  await Promise.all([oldAccount, newAccount]);
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: false, enabled: false });
  assert.deepEqual(plain(h.getReminderStatus(8)), { ready: true, enabled: false });
  assert.equal(h.getReminderState(), false);
  assert.equal(h.storage.get('task-reminders-enabled:7'), undefined);
  assert.equal(h.timers.pendingCount, 0);
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

test('disabling publishes and persists before its slow native reconciliation completes', async () => {
  const h = harness();
  const a = task(1);
  await h.activateReminders(7);
  await sync(h, [a]);
  const pendingRead = deferred();
  let reads = 0;
  const readScheduled = h.native.getAllScheduledNotificationsAsync;
  h.native.getAllScheduledNotificationsAsync = () => ++reads === 1 ? pendingRead.promise : readScheduled();

  let settled = false;
  const toggle = h.setRemindersEnabled(false).then(() => { settled = true; });
  await nextTurn();
  assert.equal(reads, 1, 'Native cancellation starts in the background');
  assert.equal(settled, true, 'The switch does not wait for the Android notification bridge');
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: true, enabled: false });

  pendingRead.resolve([...h.pending.values()]);
  await toggle;
  await sync(h, [a]);
  assert.equal(h.pending.size, 0, 'Owned alarms are still canceled once the native bridge responds');
  assert.equal(h.timers.pendingCount, 0);
});

test('OFF then ON remains usable while an earlier native reconciliation occupies the serial queue', async () => {
  const h = harness();
  const a = task(1);
  await h.activateReminders(7);
  const pendingRead = deferred();
  let reads = 0;
  const readScheduled = h.native.getAllScheduledNotificationsAsync;
  h.native.getAllScheduledNotificationsAsync = () => ++reads === 1 ? pendingRead.promise : readScheduled();
  const backlog = sync(h, [a]);
  await nextTurn();
  assert.equal(reads, 1);

  let offSettled = false;
  const off = h.setRemindersEnabled(false).then(() => { offSettled = true; });
  await nextTurn();
  assert.equal(offSettled, true, 'OFF is not queued behind native work');
  assert.equal(h.getReminderState(), false);
  let onSettled = false;
  const on = h.setRemindersEnabled(true).then(() => { onSettled = true; });
  await nextTurn();
  assert.equal(onSettled, true, 'ON permission and preference are independent of queued alarm reconciliation');
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'true');
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: true, enabled: true });

  pendingRead.resolve([]);
  await Promise.all([backlog, off, on]);
  await sync(h, [a]);
  assert.equal(h.pending.size, 2);
  assert.equal(h.calls.filter(call => typeof call === 'object').length, 2, 'Queued reconciliations reuse the final desired alarms');
  assert.equal(h.timers.pendingCount, 0);
});

test('repeated disable and re-enable cycles cancel and restore reminders without duplicate alarms', async () => {
  const h = harness();
  const a = task(1);
  await h.activateReminders(7);
  await sync(h, [a]);
  h.pending.set('other', { identifier: 'other', content: {} });

  for (let cycle = 0; cycle < 4; cycle++) {
    await h.setRemindersEnabled(false);
    await sync(h, [a]);
    assert.equal(h.pending.size, 1);
    assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
    await h.setRemindersEnabled(true);
    await sync(h, [a]);
    assert.equal(h.pending.size, 3);
    assert.ok(h.pending.has(`${PREFIX}7:1:soon`));
    assert.ok(h.pending.has(`${PREFIX}7:1:due`));
    assert.equal(h.storage.get('task-reminders-enabled:7'), 'true');
    await sync(h, [a]);
    assert.equal(h.calls.filter(call => typeof call === 'object').length, (cycle + 2) * 2);
  }
  assert.equal(h.timers.pendingCount, 0);
});

test('OFF wins over an older ON request whose permission result arrives late', async () => {
  const h = harness();
  const a = task(1);
  await h.activateReminders(7);
  await sync(h, [a]);
  await h.setRemindersEnabled(false);
  await sync(h, [a]);
  const permission = deferred();
  h.native.getPermissionsAsync = () => permission.promise;
  const published = [];
  h.subscribeReminders(value => published.push(value));
  const oldOn = h.setRemindersEnabled(true);
  await nextTurn();
  assert.equal(h.timers.pendingCount, 1);
  let offSettled = false;
  const off = h.setRemindersEnabled(false).then(() => { offSettled = true; });
  await nextTurn();
  assert.equal(offSettled, true, 'A newer OFF does not wait for an older ON permission prompt');
  assert.equal(h.getReminderState(), false);
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');

  permission.resolve({ granted: true, canAskAgain: true });
  await Promise.all([oldOn, off]);
  await sync(h, [a]);
  assert.equal(h.getReminderState(), false);
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
  assert.equal(published.includes(true), false, 'A superseded permission result cannot turn the switch back on');
  assert.equal(h.pending.size, 0);
  assert.equal(h.timers.pendingCount, 0);
});

test('a late preference write from the old account cannot publish enabled state for the new account', async () => {
  const write = deferred();
  let holdOldAccountWrite = false;
  const h = harness({ storageOverrides: {
    async setItem(key, value, storage) {
      if (holdOldAccountWrite && key === 'task-reminders-enabled:7' && value === 'true') await write.promise;
      storage.set(key, value);
    },
  } });
  await h.activateReminders(7);
  await h.setRemindersEnabled(false);
  await sync(h, []);
  holdOldAccountWrite = true;
  h.storage.set('task-reminders-enabled:8', 'false');
  const published = [];
  h.subscribeReminders(value => published.push(value));
  const oldOn = h.setRemindersEnabled(true);
  await nextTurn();
  const newAccount = h.activateReminders(8);
  await nextTurn();
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: false, enabled: false });

  write.resolve();
  await Promise.all([oldOn, newAccount]);
  assert.deepEqual(plain(h.getReminderStatus(8)), { ready: true, enabled: false });
  assert.equal(h.getReminderState(), false);
  assert.equal(published.includes(true), false);
  assert.equal(h.storage.get('task-reminders-enabled:8'), 'false');
  assert.equal(h.timers.pendingCount, 0);
});

test('preference writes are serialized so the latest toggle survives a slow older storage write', async () => {
  const firstWrite = deferred();
  let holdWrite = false;
  const writes = [];
  const h = harness({ storageOverrides: {
    async setItem(key, value, storage) {
      if (holdWrite && key === 'task-reminders-enabled:7') {
        writes.push(value);
        if (writes.length === 1) await firstWrite.promise;
      }
      storage.set(key, value);
    },
  } });
  await h.activateReminders(7);
  holdWrite = true;
  const off = h.setRemindersEnabled(false);
  await nextTurn();
  const on = h.setRemindersEnabled(true);
  await nextTurn();
  assert.deepEqual(writes, ['false'], 'The newer write cannot complete before the pending older write');

  firstWrite.resolve();
  await Promise.all([off, on]);
  await sync(h, []);
  assert.deepEqual(writes, ['false', 'true']);
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'true');
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: true, enabled: true });
  assert.equal(h.timers.pendingCount, 0);
});

test('background reconciliation errors are reported without rejecting a saved OFF preference', async () => {
  const h = harness();
  await h.activateReminders(7);
  h.native.getAllScheduledNotificationsAsync = async () => { throw new Error('Native bridge unavailable'); };
  await h.setRemindersEnabled(false);
  await nextTurn();
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
  assert.equal(h.getReminderState(), false);
  assert.ok(h.logs.some(entry => entry.name === 'warn' && entry.args.some(arg => String(arg).includes('Native bridge unavailable'))));
  assert.equal(h.timers.pendingCount, 0);
});

test('foreground personal and team notifications respect the latest preference and account while explicit tests stay usable', async () => {
  const h = harness();
  await h.activateReminders(7);
  const present = (identifier, userId = '7') => h.native.handler.handleNotification({
    request: { identifier, content: { data: { userId } } },
  });
  const shown = { shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false };
  const hidden = { shouldShowBanner: false, shouldShowList: false, shouldPlaySound: false, shouldSetBadge: false };
  assert.deepEqual(plain(await present(`${PREFIX}7:1:due`)), shown);
  assert.deepEqual(plain(await present('server-notification:7:2')), shown);
  assert.deepEqual(plain(await present(`${PREFIX}8:1:due`, '8')), hidden);
  assert.deepEqual(plain(await present('server-notification:8:2', '8')), hidden);

  await h.setRemindersEnabled(false);
  assert.deepEqual(plain(await present(`${PREFIX}7:1:due`)), hidden);
  assert.deepEqual(plain(await present('server-notification:7:2')), hidden);
  assert.deepEqual(plain(await present('task-reminder-test:7:unique-test')), shown);
  assert.deepEqual(plain(await present('unrelated-notification')), shown);
  await h.setRemindersEnabled(true);
  assert.deepEqual(plain(await present(`${PREFIX}7:1:due`)), shown);
  await h.stopReminders();
  assert.deepEqual(plain(await present(`${PREFIX}7:1:due`)), hidden);
});

test('an older permission refresh cannot overwrite a newer OFF preference', async () => {
  const h = harness();
  await h.activateReminders(7);
  const permission = deferred();
  h.native.getPermissionsAsync = () => permission.promise;
  const refresh = h.refreshReminderPermission();
  await nextTurn();
  let offSettled = false;
  const off = h.setRemindersEnabled(false).then(() => { offSettled = true; });
  await nextTurn();
  assert.equal(offSettled, true);

  permission.resolve({ granted: true, canAskAgain: true });
  await Promise.all([refresh, off]);
  await sync(h, []);
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: true, enabled: false });
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
  assert.equal(h.timers.pendingCount, 0);
});

test('a late first-login default preference write cannot overwrite a newer OFF choice', async () => {
  const firstWrite = deferred();
  let writes = 0;
  const h = harness({ storageOverrides: {
    async setItem(key, value, storage) {
      if (key === 'task-reminders-enabled:7' && ++writes === 1) await firstWrite.promise;
      storage.set(key, value);
    },
  } });
  const activation = h.activateReminders(7);
  await nextTurn();
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: true, enabled: true });
  const off = h.setRemindersEnabled(false);
  await nextTurn();

  firstWrite.resolve();
  await Promise.all([activation, off]);
  await sync(h, []);
  assert.deepEqual(plain(h.getReminderStatus(7)), { ready: true, enabled: false });
  assert.equal(h.storage.get('task-reminders-enabled:7'), 'false');
  assert.equal(h.timers.pendingCount, 0);
});
