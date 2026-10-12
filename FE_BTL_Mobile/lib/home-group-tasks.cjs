function positiveUserId(value) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (typeof value === 'string' && !/^[1-9]\d*$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

// The shared team list is for collaboration. Home is the user's own workload,
// so being a leader, creator, or team member alone must not include a task.
function assignedGroupTasksForHome(tasks, team, userId) {
  const currentUserId = positiveUserId(userId);
  if (currentUserId === null) return [];
  return (tasks ?? [])
    .filter(task => positiveUserId(task?.nguoiNhanId) === currentUserId)
    .map(task => ({
      ...task,
      teamId: team.id,
      teamName: team.tenNhom,
      canChangeStatus: true,
    }));
}

module.exports = { assignedGroupTasksForHome };
