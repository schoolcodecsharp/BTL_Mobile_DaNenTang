const test = require('node:test');
const assert = require('node:assert/strict');
const { dayKey, monthCells, tasksForDay } = require('./calendar.cjs');
test('calendar uses local date boundaries and handles absent/invalid deadlines', () => {
  assert.equal(dayKey(new Date(2026, 9, 1, 23, 59)), '2026-10-01');
  assert.equal(dayKey(null), null);
  assert.equal(dayKey('invalid'), null);
});
test('month grid starts Monday and includes leap day', () => {
  const cells = monthCells(2024, 1);
  assert.equal(cells.length % 7, 0);
  assert.equal(cells[0], null);
  assert.equal(cells[3].getDate(), 1);
  assert.equal(cells.filter(Boolean).length, 29);
  assert.equal(monthCells(2026, 1).filter(Boolean).length, 28);
});
test('day agenda sorts deadlines and excludes undated tasks and other days', () => {
  const tasks = [{ id: 1, hanHoanThanh: new Date(2026, 9, 1, 18) }, { id: 2, hanHoanThanh: null }, { id: 3, hanHoanThanh: new Date(2026, 9, 1, 8) }, { id: 4, hanHoanThanh: new Date(2026, 9, 2, 8) }];
  assert.deepEqual(tasksForDay(tasks, '2026-10-01').map(task => task.id), [3, 1]);
});
