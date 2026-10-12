import { apiFetch } from './api';
import { changeTaskReminder, reminderRevision, reportReminderError, syncTaskReminders, readTaskReminderOptions, saveTaskReminderOptions } from './task-reminders';

function queueReminderChange(userId, task, offsets) {
  const updates = [];
  if (Array.isArray(offsets)) updates.push(saveTaskReminderOptions(userId, task.id, offsets));
  // Both helpers share a serial queue. Enqueue them now, in this order, so a
  // later delete cannot be overtaken by an update waiting to save preferences.
  updates.push(changeTaskReminder(userId, task));
  void Promise.all(updates).catch(reportReminderError);
}

/**
 * Lấy danh sách công việc của user.
 * @param {number} userId
 */
export async function getTasks(userId) {
  const revision = reminderRevision();
  const tasks = await apiFetch(`/api/users/${userId}/tasks`);
  const options = await readTaskReminderOptions(userId);
  // Native notification work must not block displaying a successful API result.
  void syncTaskReminders(userId, tasks ?? [], revision).catch(reportReminderError);
  return (tasks ?? []).map(task => ({ ...task, nhacTruoc: options[String(task.id)] }));
}

/** Read one non-trashed personal task without waiting for native reminder work. */
export const getTask = (userId, taskId) => apiFetch(`/api/users/${userId}/tasks/${taskId}`);

/**
 * Tạo công việc mới.
 * @param {number} userId
 * @param {{ title: string, description?: string, priority?: string, status?: string, categoryId?: number, startDate?: string, dueDate?: string, attachments?: object[] }} payload
 */
export async function createTask(userId, payload) {
  const task = await apiFetch(`/api/users/${userId}/tasks`, { method: 'POST', body: payload });
  queueReminderChange(userId, task, payload.reminderOffsets);
  return task;
}

/**
 * Cập nhật công việc.
 * @param {number} userId
 * @param {number} taskId
 * @param {object} payload
 */
export async function updateTask(userId, taskId, payload) {
  const result = await apiFetch(`/api/users/${userId}/tasks/${taskId}`, { method: 'PUT', body: payload });
  // The update endpoint returns 204; use its replacement payload for the reminder.
  queueReminderChange(userId, {
    id: taskId, tieuDe: payload.title, hanHoanThanh: payload.dueDate,
    trangThai: payload.status ?? 'CHUA_LAM',
  }, payload.reminderOffsets);
  return result;
}

/**
 * Xóa công việc.
 * @param {number} userId
 * @param {number} taskId
 */
export async function deleteTask(userId, taskId) {
  const result = await apiFetch(`/api/users/${userId}/tasks/${taskId}`, { method: 'DELETE' });
  void changeTaskReminder(userId, { id: taskId }, true).catch(reportReminderError);
  return result;
}

/** Move only the confirmed completed tasks to recoverable trash. */
export async function trashCompletedTasks(userId, taskIds) {
  const result = await apiFetch(`/api/users/${userId}/tasks/completed/trash`, {
    method: 'POST', body: { taskIds },
  });
  void Promise.all((result.taskIds ?? []).map(taskId =>
    changeTaskReminder(userId, { id: taskId }, true))).catch(reportReminderError);
  return result;
}

export const getTrashTasks = (userId) => apiFetch(`/api/users/${userId}/tasks/trash`);
export const restoreTask = (userId, taskId) => apiFetch(`/api/users/${userId}/tasks/${taskId}/restore`, { method: 'POST' });
export const permanentlyDeleteTask = (userId, taskId) => apiFetch(`/api/users/${userId}/tasks/${taskId}/permanent`, { method: 'DELETE' });
