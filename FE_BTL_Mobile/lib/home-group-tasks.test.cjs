const assert = require('node:assert/strict');
const test = require('node:test');
const { assignedGroupTasksForHome } = require('./home-group-tasks.cjs');
const { orderHomeTasks } = require('./home-task-order.cjs');
const { countTaskScopes } = require('./task-cohorts.cjs');

test('Home includes only the current assignee, with number/string ID compatibility', () => {
  const team = { id: 7, tenNhom: 'Dự án di động', truongNhomId: 9 };
  const tasks = [
    { id: 1, nguoiNhanId: 5 },
    { id: 2, nguoiNhanId: '5' },
    { id: 3, nguoiNhanId: 9, nguoiGiaoId: 5 },
    { id: 4, nguoiNhanId: null },
  ];
  const before = JSON.stringify(tasks);
  assert.deepEqual(assignedGroupTasksForHome(tasks, team, '5'), [
    { ...tasks[0], teamId: 7, teamName: 'Dự án di động', canChangeStatus: true },
    { ...tasks[1], teamId: 7, teamName: 'Dự án di động', canChangeStatus: true },
  ]);
  assert.equal(JSON.stringify(tasks), before);
});

test('leaders and task creators get no implicit Home visibility for another assignee', () => {
  const team = { id: 7, tenNhom: 'Dự án', truongNhomId: 5 };
  const tasks = [
    { id: 1, nguoiNhanId: 8, nguoiGiaoId: 5 },
    { id: 2, nguoiNhanId: 5, nguoiGiaoId: 8 },
    { id: 3, nguoiNhanId: null, nguoiGiaoId: 5 },
  ];
  assert.deepEqual(assignedGroupTasksForHome(tasks, team, 5).map(task => task.id), [2]);
  assert.deepEqual(assignedGroupTasksForHome(tasks, team, 8).map(task => task.id), [1]);
});

test('unassigned or malformed IDs never match a missing or invalid account', () => {
  const team = { id: 7, tenNhom: 'Dự án' };
  const invalidIds = [undefined, null, '', ' ', 0, '0', -1, '-1', 1.5, '1.5',
    true, false, [], {}, NaN, Infinity, Number.MAX_SAFE_INTEGER + 1, '5e0'];
  const tasks = invalidIds.map((nguoiNhanId, id) => ({ id, nguoiNhanId }));
  assert.deepEqual(assignedGroupTasksForHome(tasks, team, 5), []);
  for (const userId of invalidIds) {
    assert.deepEqual(assignedGroupTasksForHome([{ id: 1, nguoiNhanId: 5 }], team, userId), []);
  }
  assert.deepEqual(assignedGroupTasksForHome([null, undefined, {}], team, 5), []);
  assert.deepEqual(assignedGroupTasksForHome(undefined, team, 5), []);
});

test('Home workload totals, unfinished counts and scopes exclude everybody else before ordering', () => {
  const team = { id: 7, tenNhom: 'Dự án', truongNhomId: 5 };
  const personal = [{ id: 1, trangThai: 'CHUA_LAM' },
    { id: 2, trangThai: 'HOAN_THANH', lapLai: 'HANG_TUAN' }];
  const group = [
    { id: 1, nguoiNhanId: 5, trangThai: 'CHUA_LAM', ngayBatDau: '2099-01-01T00:00:00Z' },
    { id: 2, nguoiNhanId: '5', trangThai: 'HOAN_THANH' },
    { id: 3, nguoiNhanId: 8, trangThai: 'CHUA_LAM' },
    { id: 4, nguoiNhanId: 8, trangThai: 'HOAN_THANH' },
    { id: 5, nguoiNhanId: null, trangThai: 'DANG_LAM' },
  ];
  const workload = [...personal, ...assignedGroupTasksForHome(group, team, 5)];
  assert.equal(workload.length, 4);
  assert.equal(workload.filter(task => task.trangThai === 'HOAN_THANH').length, 2);
  const unfinished = orderHomeTasks(workload, Date.parse('2026-10-12T00:00:00Z'));
  assert.equal(unfinished.length, 2);
  assert.deepEqual(countTaskScopes(unfinished), { regular: 1, recurring: 0, group: 1 });
  assert.ok(unfinished.some(task => task.teamId === 7 && task.id === 1));
});

test('reassignment moves Home visibility to the new recipient without mutating the shared list', () => {
  const team = { id: 7, tenNhom: 'Dự án', truongNhomId: 5 };
  const original = [{ id: 1, nguoiNhanId: 5, trangThai: 'DANG_LAM' }];
  const reassigned = [{ ...original[0], nguoiNhanId: 8 }];
  assert.equal(assignedGroupTasksForHome(original, team, 5).length, 1);
  assert.equal(assignedGroupTasksForHome(reassigned, team, 5).length, 0);
  assert.equal(assignedGroupTasksForHome(reassigned, team, 8).length, 1);
  assert.equal(original[0].nguoiNhanId, 5);
  assert.equal(reassigned.length, 1);
});
