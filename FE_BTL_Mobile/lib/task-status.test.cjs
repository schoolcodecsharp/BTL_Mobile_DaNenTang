const assert = require('node:assert/strict');
const test = require('node:test');
const { effectiveStatus } = require('./task-status.cjs');
test('unfinished personal and group tasks become overdue at the deadline', () => {
  const due = '2026-09-30T12:00:00Z';
  const now = Date.parse(due);
  for (const trangThai of ['CHUA_LAM', 'DANG_LAM']) {
    const task = { trangThai, hanHoanThanh: due };
    assert.equal(effectiveStatus(task, now - 1), trangThai);
    assert.equal(effectiveStatus(task, now), 'QUA_HAN');
    assert.equal(effectiveStatus({ ...task, teamId: 3 }, now + 1), 'QUA_HAN');
    assert.equal(task.trangThai, trangThai);
  }
  assert.equal(effectiveStatus({ trangThai: 'HOAN_THANH', hanHoanThanh: due }, now + 1), 'HOAN_THANH');
  for (const hanHoanThanh of [null, undefined, 'invalid']) {
    assert.equal(effectiveStatus({ trangThai: 'CHUA_LAM', hanHoanThanh }, now), 'CHUA_LAM');
  }
});
