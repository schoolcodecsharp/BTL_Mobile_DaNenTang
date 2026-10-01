const test = require('node:test');
const assert = require('node:assert/strict');
const { orderHomeTasks } = require('./home-task-order.cjs');
const now = new Date(2026, 9, 1, 12).getTime();
const at = (day, hour) => new Date(2026, 9, day, hour).toISOString();
const task = (id, due, priority = 'CAO', extra = {}) => ({ id, hanHoanThanh: due,
  mucDoUuTien: priority, trangThai: 'CHUA_LAM', ...extra });

test('urgency precedes priority, then nearest deadline; completed tasks are hidden', () => {
  const input = [task(1, null), task(2, at(2, 10)), task(3, at(1, 15), 'THAP'),
    task(4, at(1, 11), 'THAP'), task(5, at(1, 17)), task(6, at(1, 14)),
    task(7, at(1, 9), 'CAO', { trangThai: 'HOAN_THANH' })];
  assert.deepEqual(orderHomeTasks(input, now).map(t => t.id), [4, 6, 5, 3, 2, 1]);
  assert.equal(input[3].trangThai, 'CHUA_LAM');
  assert.equal(orderHomeTasks(input, now)[0].trangThai, 'QUA_HAN');
});
test('local midnight, future starts, invalid dates and deterministic group/personal ties', () => {
  const input = [task(1, at(2, 0)), task(2, at(1, 23), 'THAP'),
    task(3, null, 'CAO', { ngayBatDau: at(2, 8) }), task(4, 'invalid')];
  assert.deepEqual(orderHomeTasks(input, now).map(t => t.id), [2, 1, 4]);
  const ties = [task(1, null, 'CAO', { teamId: 8 }), task(1, null)];
  assert.deepEqual(orderHomeTasks(ties, now), orderHomeTasks([...ties].reverse(), now));
  assert.equal(orderHomeTasks([task(5, at(1, 12))], now)[0].trangThai, 'QUA_HAN');
});
