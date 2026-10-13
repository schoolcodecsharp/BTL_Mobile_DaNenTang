const test = require('node:test');
const assert = require('node:assert/strict');
const { makeFixture } = require('../scripts/presentation-fixture');
test('presentation samples have coherent deadlines, state coverage and trash', () => {
  for (const now of [new Date('2026-10-12T23:00:00+07:00'), new Date('2026-10-13T00:15:00+07:00')]) {
    const fixture = makeFixture(now);
    assert.equal(fixture.tasks.length, 20);
    const active = fixture.tasks.filter(task => !task.trash);
    assert.equal(active.length, 17);
    assert.equal(active.filter(task => task.recurrence !== 'KHONG').length, 3);
    assert.equal(active.filter(task => task.status === 'HOAN_THANH').length, 7);
    assert.equal(active.filter(task => task.status !== 'HOAN_THANH' && task.due <= now).length, 1);
    assert(fixture.tasks.filter(task => task.trash).every(task => task.deleted < now && now - task.deleted < 30 * 86400000));
    assert.equal(fixture.groups.flatMap(group => group.tasks).length, 9);
    assert(fixture.groups.every(group => group.tasks.some(task => task.assignee === 'demo')));
    assert(fixture.groups.flatMap(group => group.tasks).filter(task => task.status === 'HOAN_THANH').every(task => task.due < now));
  }
});
