const assert = require('node:assert/strict');
const test = require('node:test');
const { isRecurringTask, countTaskScopes } = require('./task-cohorts.cjs');

test('Home and Tasks use the same personal regular/recurring definition', () => {
  for (const lapLai of [undefined, null, '', 'KHONG']) assert.equal(isRecurringTask({ lapLai }), false);
  for (const lapLai of ['HANG_NGAY', 'HANG_TUAN', 'HANG_THANG']) assert.equal(isRecurringTask({ lapLai }), true);
});

test('scope counts partition the displayed list without double-counting group or colliding IDs', () => {
  const tasks = [{ id: 1 }, { id: 2, lapLai: 'KHONG' },
    { id: 3, lapLai: 'HANG_NGAY' }, { id: 4, lapLai: 'HANG_TUAN' },
    { id: 1, teamId: 7 }, { id: 3, teamId: 7, lapLai: 'HANG_NGAY' }];
  const before = JSON.stringify(tasks);
  const counts = countTaskScopes(tasks);
  assert.deepEqual(counts, { regular: 2, recurring: 2, group: 2 });
  assert.equal(counts.regular + counts.recurring + counts.group, tasks.length);
  assert.equal(JSON.stringify(tasks), before);
  assert.deepEqual(countTaskScopes([]), { regular: 0, recurring: 0, group: 0 });
});
