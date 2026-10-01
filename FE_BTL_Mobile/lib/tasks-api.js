import { apiFetch } from './api';
import { changeTaskReminder, reminderRevision, reportReminderError, syncTaskReminders } from './task-reminders';

/**
 * Lấy danh sách công việc của user.
 * @param {number} userId
 */
export async function getTasks(userId) {
  const revision = reminderRevision();
  const tasks = await apiFetch(`/api/users/${userId}/tasks`);
  await syncTaskReminders(userId, tasks ?? [], revision).catch(reportReminderError);
  return tasks;
}

/**
 * Tạo công việc mới.
 * @param {number} userId
 * @param {{ title: string, description?: string, priority?: string, status?: string, categoryId?: number, startDate?: string, dueDate?: string, attachments?: object[] }} payload
 */
export async function createTask(userId, payload) {
  const task = await apiFetch(`/api/users/${userId}/tasks`, { method: 'POST', body: payload });
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
