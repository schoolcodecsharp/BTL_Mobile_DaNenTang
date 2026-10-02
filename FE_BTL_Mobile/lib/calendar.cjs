function dayKey(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (!value || Number.isNaN(date.getTime())) return null;
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
function monthCells(year, month) {
  const offset = (new Date(year, month, 1).getDay() + 6) % 7;
  const count = new Date(year, month + 1, 0).getDate();
  return Array.from({ length: Math.ceil((offset + count) / 7) * 7 }, (_, index) => {
    const day = index - offset + 1;
    return day < 1 || day > count ? null : new Date(year, month, day);
  });
}
function tasksForDay(tasks, key) {
  return tasks.filter(task => dayKey(task.hanHoanThanh) === key)
    .sort((a, b) => new Date(a.hanHoanThanh) - new Date(b.hanHoanThanh) || a.id - b.id);
}
module.exports = { dayKey, monthCells, tasksForDay };
