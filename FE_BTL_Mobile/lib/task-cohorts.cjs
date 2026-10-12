function isRecurringTask(task) {
  return Boolean(task.lapLai && task.lapLai !== 'KHONG');
}

function countTaskScopes(tasks) {
  const counts = { regular: 0, recurring: 0, group: 0 };
  for (const task of tasks) {
    if (task.teamId) counts.group += 1;
    else if (isRecurringTask(task)) counts.recurring += 1;
    else counts.regular += 1;
  }
  return counts;
}

module.exports = { isRecurringTask, countTaskScopes };
