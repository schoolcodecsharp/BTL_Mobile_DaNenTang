const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

const nextTurn = () => new Promise(resolve => setImmediate(resolve));
const plain = value => JSON.parse(JSON.stringify(value));

async function resolvesWithoutNative(promise) {
  const waiting = Symbol('still waiting');
  const result = await Promise.race([promise, nextTurn().then(() => waiting)]);
  assert.notEqual(result, waiting, 'A successful API result must not wait for native reminder work');
  return result;
}

function harness(overrides = {}) {
  const calls = [];
  const errors = [];
  const defaults = {
    apiFetch: async () => null,
    reminderRevision: () => 7,
    readTaskReminderOptions: async () => ({}),
    syncTaskReminders: async () => {},
    saveTaskReminderOptions: async () => {},
    changeTaskReminder: async () => {},
    reportReminderError: error => errors.push(error),
  };
  const context = { module: { exports: {} } };
  for (const [name, implementation] of Object.entries({ ...defaults, ...overrides })) {
    context[name] = (...args) => {
      calls.push({ name, args });
      return implementation(...args);
    };
  }
  const source = fs.readFileSync(require.resolve('./tasks-api.js'), 'utf8')
    .replace(/^import .*;\r?\n/gm, '')
    .replace(/^export /gm, '')
    + '\nmodule.exports = { getTasks, createTask, updateTask, deleteTask };';
  vm.runInNewContext(source, context);
  return { ...context.module.exports, calls, errors };
}

test('task loading waits for API/options but not native sync, and preserves the fetch revision', async () => {
  const response = deferred();
  const preferences = deferred();
  const native = deferred();
  let revision = 7;
  const h = harness({
    apiFetch: () => response.promise,
    readTaskReminderOptions: () => preferences.promise,
    syncTaskReminders: () => native.promise,
    reminderRevision: () => revision,
  });
  let settled = false;
  const pending = h.getTasks(12).then(result => { settled = true; return result; });
  await nextTurn();
  assert.equal(settled, false);
  assert.deepEqual(h.calls.map(call => call.name), ['reminderRevision', 'apiFetch']);
  assert.deepEqual(h.calls[1].args, ['/api/users/12/tasks']);
  revision = 8;
  const task = { id: 23, tieuDe: 'Prepare demo' };
  response.resolve([task]);
  await nextTurn();
  assert.equal(settled, false, 'Reminder options must be read before exposing tasks');
  assert.deepEqual(h.calls.at(-1), { name: 'readTaskReminderOptions', args: [12] });
  preferences.resolve({ 23: [60, 10, 0] });
  const result = await resolvesWithoutNative(pending);
  assert.deepEqual(plain(result), [{ ...task, nhacTruoc: [60, 10, 0] }]);
  assert.equal(Object.hasOwn(task, 'nhacTruoc'), false);
  assert.deepEqual(plain(h.calls.at(-1)), { name: 'syncTaskReminders', args: [12, [task], 7] });
});

test('an empty task response still returns immediately while reminders sync in the background', async () => {
  const h = harness({ syncTaskReminders: () => deferred().promise });
  assert.deepEqual(plain(await resolvesWithoutNative(h.getTasks(12))), []);
  assert.deepEqual(plain(h.calls.at(-1).args), [12, [], 7]);
});

for (const action of ['create', 'update']) {
  test(`${action} returns its API result with preference saving and native changes pending`, async () => {
    const preferences = deferred();
    const native = deferred();
    const response = action === 'create' ? { id: 23, tieuDe: 'Prepare demo' } : null;
    const payload = { title: 'Prepare demo', dueDate: '2026-10-10T08:00:00.000Z', reminderOffsets: [30, 0] };
    const h = harness({
      apiFetch: async () => response,
      saveTaskReminderOptions: () => preferences.promise,
      changeTaskReminder: () => native.promise,
    });
    const pending = action === 'create' ? h.createTask(12, payload) : h.updateTask(12, 23, payload);
    assert.equal(await resolvesWithoutNative(pending), response);
    assert.deepEqual(h.calls.map(call => call.name), ['apiFetch', 'saveTaskReminderOptions', 'changeTaskReminder']);
    assert.deepEqual(plain(h.calls[0].args), [
      action === 'create' ? '/api/users/12/tasks' : '/api/users/12/tasks/23',
      { method: action === 'create' ? 'POST' : 'PUT', body: payload },
    ]);
    assert.deepEqual(plain(h.calls[1].args), [12, 23, [30, 0]]);
    const reminderTask = action === 'create' ? response : {
      id: 23, tieuDe: payload.title, hanHoanThanh: payload.dueDate, trangThai: 'CHUA_LAM',
    };
    assert.deepEqual(plain(h.calls[2].args), [12, reminderTask]);
  });
}

test('updates preserve explicit status and omit preference saving when no offsets were provided', async () => {
  const h = harness({ changeTaskReminder: () => deferred().promise });
  const payload = { title: 'Finished task', status: 'HOAN_THANH', dueDate: '2026-10-10T08:00:00.000Z' };
  assert.equal(await resolvesWithoutNative(h.updateTask(12, 23, payload)), null);
  assert.deepEqual(h.calls.map(call => call.name), ['apiFetch', 'changeTaskReminder']);
  assert.deepEqual(plain(h.calls[1].args), [12, {
    id: 23, tieuDe: payload.title, hanHoanThanh: payload.dueDate, trangThai: 'HOAN_THANH',
  }]);
});

test('delete returns its completed HTTP result without awaiting native cancellation', async () => {
  const h = harness({ changeTaskReminder: () => deferred().promise });
  assert.equal(await resolvesWithoutNative(h.deleteTask(12, 23)), null);
  assert.deepEqual(plain(h.calls), [
    { name: 'apiFetch', args: ['/api/users/12/tasks/23', { method: 'DELETE' }] },
    { name: 'changeTaskReminder', args: [12, { id: 23 }, true] },
  ]);
});

test('an update enqueues its native change before a later delete even if preference saving is stalled', async () => {
  const h = harness({
    saveTaskReminderOptions: () => deferred().promise,
    changeTaskReminder: () => deferred().promise,
  });
  await resolvesWithoutNative(h.updateTask(12, 23, { title: 'Changed task', reminderOffsets: [] }));
  await resolvesWithoutNative(h.deleteTask(12, 23));
  const reminders = h.calls.filter(call => call.name !== 'apiFetch');
  assert.deepEqual(reminders.map(call => call.name), ['saveTaskReminderOptions', 'changeTaskReminder', 'changeTaskReminder']);
  assert.deepEqual(plain(reminders[0].args), [12, 23, []]);
  assert.equal(reminders[1].args[1].tieuDe, 'Changed task');
  assert.equal(reminders[1].args[2], undefined);
  assert.deepEqual(plain(reminders[2].args), [12, { id: 23 }, true]);
});

test('HTTP failures reject unchanged and do not read options or enqueue reminder work', async () => {
  for (const action of ['get', 'create', 'update', 'delete']) {
    const failure = new Error(`HTTP ${action} failed`);
    const h = harness({ apiFetch: async () => { throw failure; } });
    const payload = { title: 'Task', reminderOffsets: [0] };
    const pending = {
      get: () => h.getTasks(12),
      create: () => h.createTask(12, payload),
      update: () => h.updateTask(12, 23, payload),
      delete: () => h.deleteTask(12, 23),
    }[action]();
    await assert.rejects(pending, error => error === failure);
    assert.deepEqual(h.calls.map(call => call.name), action === 'get' ? ['reminderRevision', 'apiFetch'] : ['apiFetch']);
    assert.equal(h.errors.length, 0);
  }
});

test('reminder failures are reported without turning successful HTTP results into failures', async () => {
  const scenarios = [
    ['get', 'syncTaskReminders'],
    ['create', 'saveTaskReminderOptions'],
    ['create', 'changeTaskReminder'],
    ['update', 'saveTaskReminderOptions'],
    ['update', 'changeTaskReminder'],
    ['delete', 'changeTaskReminder'],
  ];
  for (const [action, helper] of scenarios) {
    const failure = new Error(`Native ${helper} failed`);
    const response = action === 'get' ? [{ id: 23 }] : action === 'create' ? { id: 23 } : null;
    const h = harness({ apiFetch: async () => response, [helper]: async () => { throw failure; } });
    const payload = { title: 'Task', reminderOffsets: [0] };
    const pending = {
      get: () => h.getTasks(12),
      create: () => h.createTask(12, payload),
      update: () => h.updateTask(12, 23, payload),
      delete: () => h.deleteTask(12, 23),
    }[action]();
    const result = await resolvesWithoutNative(pending);
    if (action === 'get') assert.equal(result[0].id, 23);
    else assert.equal(result, response);
    await nextTurn();
    assert.deepEqual(h.errors, [failure]);
  }
});

test('unreadable reminder preferences still reject task loading before syncing', async () => {
  const failure = new Error('Preference storage failed');
  const h = harness({ apiFetch: async () => [{ id: 23 }], readTaskReminderOptions: async () => { throw failure; } });
  await assert.rejects(h.getTasks(12), error => error === failure);
  assert.deepEqual(h.calls.map(call => call.name), ['reminderRevision', 'apiFetch', 'readTaskReminderOptions']);
});
