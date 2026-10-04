const PREFIX = 'task-reminder:';
const REMINDER_OPTIONS = [
  { key: 'day', minutes: 1440, label: '1 ngày', body: 'Công việc sẽ đến hạn sau 1 ngày.' },
  { key: 'hour', minutes: 60, label: '1 giờ', body: 'Công việc sẽ đến hạn sau 1 giờ.' },
  { key: 'halfHour', minutes: 30, label: '30 phút', body: 'Công việc sẽ đến hạn sau 30 phút.' },
  { key: 'soon', minutes: 10, label: '10 phút', body: 'Công việc sẽ đến hạn sau 10 phút.' },
  { key: 'five', minutes: 5, label: '5 phút', body: 'Công việc sẽ đến hạn sau 5 phút.' },
  { key: 'due', minutes: 0, label: 'Đúng hạn', body: 'Công việc đã đến hạn.' },
];
const DEFAULT_OFFSETS = [1440, 60, 10, 0];

function buildReminderPlan(userId, tasks, now = Date.now()) {
  return tasks.flatMap((task) => {
    const due = task.hanHoanThanh ? new Date(task.hanHoanThanh).getTime() : NaN;
    if (!Number.isFinite(due) || due <= now || task.trangThai === 'HOAN_THANH') return [];
    const offsets = Array.isArray(task.nhacTruoc) ? task.nhacTruoc : DEFAULT_OFFSETS;
    return REMINDER_OPTIONS.filter(stage => offsets.includes(stage.minutes)).map((stage) => ({
      identifier: `${PREFIX}${userId}:${task.id}:${stage.key}`,
      taskId: String(task.id), userId: String(userId),
      title: task.tieuDe, body: stage.body,
      due, at: due - stage.minutes * 60000,
    })).filter((item) => item.at > now);
  }).sort((a, b) => a.at - b.at).slice(0, 60);
}

module.exports = { PREFIX, buildReminderPlan, REMINDER_OPTIONS, DEFAULT_OFFSETS };
