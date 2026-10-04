import { apiFetch } from './api';
import { changeTaskReminder, reminderRevision, reportReminderError, syncTaskReminders, readTaskReminderOptions, saveTaskReminderOptions } from './task-reminders';

/**
 * Lấy danh sách công việc của user.
 * @param {number} userId
 */
export async function getTasks(userId) {
  const revision = reminderRevision();
  const tasks = await apiFetch(`/api/users/${userId}/tasks`);
  const options = await readTaskReminderOptions(userId);
  await syncTaskReminders(userId, tasks ?? [], revision).catch(reportReminderError);
  return (tasks ?? []).map(task => ({ ...task, nhacTruoc: options[String(task.id)] }));
}

/**
 * Tạo công việc mới.
 * @param {number} userId
 * @param {{ title: string, description?: string, priority?: string, status?: string, categoryId?: number, startDate?: string, dueDate?: string, attachments?: object[] }} payload
 */
export async function createTask(userId, payload) {
  const task = await apiFetch(`/api/users/${userId}/tasks`, { method: 'POST', body: payload });
  if (Array.isArray(payload.reminderOffsets)) await saveTaskReminderOptions(userId, task.id, payload.reminderOffsets).catch(reportReminderError);
  await changeTaskReminder(userId, task).catch(reportReminderError);
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
  if (Array.isArray(payload.reminderOffsets)) await saveTaskReminderOptions(userId, taskId, payload.reminderOffsets).catch(reportReminderError);
  // The update endpoint returns 204; use its replacement payload for the reminder.
  await changeTaskReminder(userId, {
    id: taskId, tieuDe: payload.title, hanHoanThanh: payload.dueDate,
    trangThai: payload.status ?? 'CHUA_LAM',
  }).catch(reportReminderError);
  return result;
}

/**
 * Xóa công việc.
 * @param {number} userId
 * @param {number} taskId
 */
export async function deleteTask(userId, taskId) {
  const result = await apiFetch(`/api/users/${userId}/tasks/${taskId}`, { method: 'DELETE' });
  await changeTaskReminder(userId, { id: taskId }, true).catch(reportReminderError);
  return result;
}

export const getTrashTasks = (userId) => apiFetch(`/api/users/${userId}/tasks/trash`);
export const restoreTask = (userId, taskId) => apiFetch(`/api/users/${userId}/tasks/${taskId}/restore`, { method: 'POST' });
export const permanentlyDeleteTask = (userId, taskId) => apiFetch(`/api/users/${userId}/tasks/${taskId}/permanent`, { method: 'DELETE' });
