const test = require('node:test');
const assert = require('node:assert/strict');
const { createDatePickerSession } = require('./date-picker-session.cjs');
function harness() {
  const picked = []; let params; let opens = 0; let closes = 0;
  const session = createDatePickerSession({ open(value) { params = value; opens++; },
    dismiss: async () => {}, onPick: date => picked.push(date), onClose: () => { closes++; } });
  return { session, picked, get params() { return params; }, get opens() { return opens; }, get closes() { return closes; } };
}
test('clock rerenders cannot reopen a date picker and late results cannot restore the old date', () => {
  const h = harness(); const old = new Date('2026-10-13T06:00:00+07:00'); const next = new Date('2026-10-15T06:00:00+07:00');
  h.session.start(old); h.session.start(old); assert.equal(h.opens, 1);
  h.params.onValueChange({}, next); h.params.onValueChange({}, old); h.params.onDismiss();
  assert.equal(h.picked.length, 1); assert.equal(h.picked[0].getTime(), next.getTime()); assert.equal(h.closes, 1);
});
test('canceling or closing an editor leaves the existing draft date unchanged', () => {
  const h = harness(); h.session.start(new Date()); h.params.onDismiss(); h.params.onValueChange({}, new Date());
  assert.equal(h.picked.length, 0); assert.equal(h.closes, 1);
  const closed = harness(); closed.session.start(new Date()); closed.session.stop(); closed.params.onValueChange({}, new Date());
  assert.equal(closed.picked.length, 0); assert.equal(closed.closes, 0);
});
