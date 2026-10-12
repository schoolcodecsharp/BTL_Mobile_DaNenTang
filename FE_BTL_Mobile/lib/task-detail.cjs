const STATUS_ACTIONS = [
  { value: 'DANG_LAM', label: 'Đang làm', icon: 'play-outline' },
  { value: 'CHUA_LAM', label: 'Chưa làm', icon: 'ellipse-outline' },
  { value: 'HOAN_THANH', label: 'Hoàn thành', icon: 'checkmark-done-outline' },
];

function parseTaskId(value) {
  if (typeof value !== 'string' || !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id <= 2147483647 ? id : null;
}

function personalTaskStatusPayload(task, status) {
  if (!STATUS_ACTIONS.some(action => action.value === status)) throw new Error('Trạng thái không hợp lệ.');
  // PUT is a replacement endpoint. Preserve the task's other fields; omitting
  // attachments deliberately leaves the existing files unchanged on the server.
  return {
    title: task.tieuDe, description: task.moTa, priority: task.mucDoUuTien,
    status, categoryId: task.danhMucId, startDate: task.ngayBatDau,
    dueDate: task.hanHoanThanh, recurrence: task.lapLai ?? 'KHONG',
    ...(Array.isArray(task.nhacTruoc) ? { reminderOffsets: task.nhacTruoc } : {}),
  };
}

function formatTaskDeadline(value) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Chưa đặt hạn hoàn thành';
  return new Date(value).toLocaleString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

// Home can refresh even when the user goes back while a write is still pending.
const taskListeners = new Set();
function subscribeTaskChanges(listener) {
  taskListeners.add(listener);
  return () => taskListeners.delete(listener);
}
function notifyTaskChanged() {
  for (const listener of taskListeners) {
    try { listener(); } catch { /* A view refresh must not turn a saved write into a failure. */ }
  }
}

module.exports = { STATUS_ACTIONS, parseTaskId, personalTaskStatusPayload, formatTaskDeadline,
  subscribeTaskChanges, notifyTaskChanged };
