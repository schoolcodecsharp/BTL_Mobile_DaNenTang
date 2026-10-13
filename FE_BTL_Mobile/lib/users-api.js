import { apiFetch } from './api';

export const getUserProfile = userId => apiFetch(`/api/users/${userId}`);

/**
 * Cập nhật thông tin người dùng.
 * @param {number} userId
 * @param {{ fullName?: string, email?: string, avatarUrl?: string }} payload
 */
export async function updateUserProfile(userId, payload) {
  return apiFetch(`/api/users/${userId}`, {
    method: 'PUT',
    body: payload,
  });
}

/**
 * Đổi mật khẩu người dùng.
 * @param {number} userId
 * @param {{ oldPassword: string, newPassword: string }} payload
 */
export async function changeUserPassword(userId, payload) {
  return apiFetch(`/api/users/${userId}/password`, {
    method: 'PUT',
    body: payload,
  });
}
