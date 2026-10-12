const assert = require('node:assert/strict');
const test = require('node:test');
const { STATUS_ACTIONS, parseTaskId, personalTaskStatusPayload, formatTaskDeadline,
  subscribeTaskChanges, notifyTaskChanged } = require('./task-detail.cjs');

test('details expose only the three requested status actions in the requested order', () => {
  assert.deepEqual(STATUS_ACTIONS.map(({ value, label }) => ({ value, label })), [
    { value: 'DANG_LAM', label: 'Đang làm' }, { value: 'CHUA_LAM', label: 'Chưa làm' },
    { value: 'HOAN_THANH', label: 'Hoàn thành' },
  ]);
});

test('route IDs reject malformed, ambiguous and out-of-range values', () => {
  assert.equal(parseTaskId('101'), 101);
  for (const value of [undefined, null, 101, ['101'], '', '0', '-1', '1.5', '1abc', '01', ' 1', '2147483648']) {
    assert.equal(parseTaskId(value), null);
  }
});

test('status replacement keeps every other task field and leaves existing attachments untouched', () => {
  const task = { tieuDe: 'Viết báo cáo', moTa: 'Nội dung đầy đủ\nDòng thứ hai', mucDoUuTien: 'CAO',
    trangThai: 'QUA_HAN', danhMucId: 7, ngayBatDau: '2026-10-10T08:00:00Z',
    hanHoanThanh: '2026-10-15T10:00:00Z', lapLai: 'HANG_TUAN',
    fileDinhKem: [{ url: '/uploads/report.pdf' }], nhacTruoc: [60, 10] };
  const before = JSON.stringify(task);
  assert.deepEqual(personalTaskStatusPayload(task, 'HOAN_THANH'), {
    title: task.tieuDe, description: task.moTa, priority: task.mucDoUuTien,
    status: 'HOAN_THANH', categoryId: 7, startDate: task.ngayBatDau,
    dueDate: task.hanHoanThanh, recurrence: 'HANG_TUAN', reminderOffsets: [60, 10],
  });
  assert.equal(Object.hasOwn(personalTaskStatusPayload(task, 'DANG_LAM'), 'attachments'), false);
  assert.equal(JSON.stringify(task), before);
});

test('status replacement preserves nullable fields and does not overwrite absent reminder preferences', () => {
  const payload = personalTaskStatusPayload({ tieuDe: 'Mua đồ dùng', moTa: null, mucDoUuTien: 'THAP',
    danhMucId: null, ngayBatDau: null, hanHoanThanh: null }, 'CHUA_LAM');
  assert.equal(payload.description, null);
  assert.equal(payload.categoryId, null);
  assert.equal(payload.startDate, null);
  assert.equal(payload.dueDate, null);
  assert.equal(payload.recurrence, 'KHONG');
  assert.equal(Object.hasOwn(payload, 'reminderOffsets'), false);
  assert.throws(() => personalTaskStatusPayload({}, 'QUA_HAN'), /không hợp lệ/);
});

test('missing or invalid deadlines have an honest fallback; valid deadlines include date and time', () => {
  for (const value of [undefined, null, '', 'bad date']) {
    assert.equal(formatTaskDeadline(value), 'Chưa đặt hạn hoàn thành');
  }
  const formatted = formatTaskDeadline('2026-10-15T10:30:00Z');
  assert.match(formatted, /15\/10\/2026/);
  assert.match(formatted, /\d{2}:\d{2}/);
});

test('Home refresh subscription notifies active subscribers and cleans up on leaving the screen', () => {
  let count = 0;
  const unsubscribe = subscribeTaskChanges(() => { count += 1; });
  const badSubscriber = subscribeTaskChanges(() => { throw new Error('view unavailable'); });
  assert.doesNotThrow(notifyTaskChanged);
  assert.equal(count, 1);
  unsubscribe(); badSubscriber(); notifyTaskChanged();
  assert.equal(count, 1);
});
