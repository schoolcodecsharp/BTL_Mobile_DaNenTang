const test = require('node:test');
const assert = require('node:assert/strict');
const { nextOccurrence } = require('../lib/recurrence');

test('recurrence advances daily and weekly while preserving time', () => {
  assert.equal(nextOccurrence('2026-10-01T08:30:00.000Z', 'HANG_NGAY').toISOString(), '2026-10-02T08:30:00.000Z');
  assert.equal(nextOccurrence('2026-10-01T08:30:00.000Z', 'HANG_TUAN').toISOString(), '2026-10-08T08:30:00.000Z');
});

test('monthly recurrence clamps to the final day of shorter months', () => {
  assert.equal(nextOccurrence('2027-01-31T08:30:00.000Z', 'HANG_THANG').toISOString(), '2027-02-28T08:30:00.000Z');
  assert.equal(nextOccurrence('2028-01-31T08:30:00.000Z', 'HANG_THANG').toISOString(), '2028-02-29T08:30:00.000Z');
});

test('non-recurring and invalid dates do not produce an occurrence', () => {
  assert.equal(nextOccurrence('2026-10-01T08:30:00.000Z', 'KHONG'), null);
  assert.equal(nextOccurrence('invalid', 'HANG_NGAY'), null);
});
