const PREFIX = 'task-reminder:';

function buildReminderPlan(userId, tasks, now = Date.now()) {
  return tasks.flatMap((task) => {
    const due = task.hanHoanThanh ? new Date(task.hanHoanThanh).getTime() : NaN;
    if (!Number.isFinite(due) || due <= now || task.trangThai === 'HOAN_THANH') return [];
    return [
      { key: 'day', minutes: 1440, body: 'Công việc sẽ đến hạn sau 1 ngày.' },
      { key: 'hour', minutes: 60, body: 'Công việc sẽ đến hạn sau 1 giờ.' },
      { key: 'soon', minutes: 10, body: 'Công việc sẽ đến hạn sau 10 phút.' },
      { key: 'due', minutes: 0, body: 'Công việc đã đến hạn.' },
    ].map((stage) => ({
      identifier: `${PREFIX}${userId}:${task.id}:${stage.key}`,
      taskId: String(task.id), userId: String(userId),
      title: task.tieuDe, body: stage.body,
      due, at: due - stage.minutes * 60000,
    })).filter((item) => item.at > now);
  }).sort((a, b) => a.at - b.at).slice(0, 60);
}

module.exports = { PREFIX, buildReminderPlan };
