function effectiveStatus(task, now = Date.now()) {
  if (task.trangThai === 'HOAN_THANH') return 'HOAN_THANH';
  const deadline = Date.parse(task.hanHoanThanh);
  return Number.isFinite(deadline) && deadline <= now ? 'QUA_HAN' : task.trangThai;
}
module.exports = { effectiveStatus };
