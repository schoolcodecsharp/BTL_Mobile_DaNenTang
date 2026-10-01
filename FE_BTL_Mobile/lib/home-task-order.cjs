const { effectiveStatus } = require('./task-status.cjs');
const PRIORITY = { CAO: 0, TRUNG_BINH: 1, THAP: 2 };
const timestamp = (value) => {
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : Number.MAX_SAFE_INTEGER;
};

// Compare explicit ranks rather than a weighted score: an urgent deadline cannot
// be outweighed by an unrelated attribute. Dates use the device's local day.
function orderHomeTasks(tasks, now = Date.now()) {
  const tomorrow = new Date(now);
  tomorrow.setHours(24, 0, 0, 0);
  const dayEnd = tomorrow.getTime();
  return tasks
    .filter((task) => task.trangThai !== 'HOAN_THANH' &&
      (!task.ngayBatDau || timestamp(task.ngayBatDau) <= now ||
        timestamp(task.hanHoanThanh) <= now || task.trangThai === 'QUA_HAN'))
    .map((task) => {
      const result = { ...task, trangThai: effectiveStatus(task, now) };
      const due = timestamp(task.hanHoanThanh);
      const urgency = result.trangThai === 'QUA_HAN' ? 0
        : due < dayEnd ? 1 : due < Number.MAX_SAFE_INTEGER ? 2 : 3;
      return { task: result, urgency, due,
        priority: PRIORITY[task.mucDoUuTien] ?? 3,
        key: `${task.teamId ? `team:${task.teamId}` : 'personal'}:${task.id}` };
    })
    .sort((a, b) => a.urgency - b.urgency || a.priority - b.priority ||
      a.due - b.due ||
      Number(b.task.trangThai === 'DANG_LAM') - Number(a.task.trangThai === 'DANG_LAM') ||
      a.key.localeCompare(b.key))
    .map(({ task }) => task);
}
module.exports = { orderHomeTasks };
