import { apiFetch } from './api';

/**
 * Lấy danh sách công việc của user.
 * @param {number} userId
 */
export async function getTasks(userId) {
  return apiFetch(`/api/users/${userId}/tasks`);
}

/**
 * Tạo công việc mới.
 * @param {number} userId
 * @param {{ title: string, description?: string, priority?: string, status?: string, categoryId?: number, startDate?: string, dueDate?: string, attachments?: object[] }} payload
 */
export async function createTask(userId, payload) {
  return apiFetch(`/api/users/${userId}/tasks`, { method: 'POST', body: payload });
}

/**
 * Cập nhật công việc.
 * @param {number} userId
 * @param {number} taskId
 * @param {object} payload
 */
export async function updateTask(userId, taskId, payload) {
  return apiFetch(`/api/users/${userId}/tasks/${taskId}`, { method: 'PUT', body: payload });
}

/**
 * Xóa công việc.
 * @param {number} userId
 * @param {number} taskId
 */
export async function deleteTask(userId, taskId) {
  return apiFetch(`/api/users/${userId}/tasks/${taskId}`, { method: 'DELETE' });
}
