import { apiFetch } from './api';

/**
 * Lấy danh sách nhóm của user.
 * @param {number} userId
 */
export async function getTeams(userId) {
  return apiFetch(`/api/teams?userId=${userId}`);
}

/**
 * Tạo nhóm mới.
 * @param {{ tenNhom: string, moTa?: string, userId: number }} payload
 */
export async function createTeam(payload) {
  return apiFetch('/api/teams', { method: 'POST', body: payload });
}

/**
 * Lấy chi tiết nhóm + thành viên.
 * @param {number} teamId
 */
export async function getTeamDetail(teamId) {
  return apiFetch(`/api/teams/${teamId}`);
}

/**
 * Mời thành viên vào nhóm (chỉ trưởng nhóm).
 * @param {number} teamId
 * @param {{ userId: number, inviteEmail: string }} payload
 */
export async function inviteMember(teamId, payload) {
  return apiFetch(`/api/teams/${teamId}/invite`, { method: 'POST', body: payload });
}

/**
 * Chuyển trưởng nhóm (chỉ trưởng nhóm hiện tại).
 * @param {number} teamId
 * @param {{ userId: number, newLeaderId: number }} payload
 */
export async function transferLeader(teamId, payload) {
  return apiFetch(`/api/teams/${teamId}/transfer-leader`, { method: 'POST', body: payload });
}

/**
 * Xóa thành viên (chỉ trưởng nhóm).
 * @param {number} teamId
 * @param {number} memberId
 * @param {number} userId người thực hiện
 */
export async function removeMember(teamId, memberId, userId) {
  return apiFetch(`/api/teams/${teamId}/members/${memberId}`, {
    method: 'DELETE',
    body: { userId },
  });
}

/**
 * Rời nhóm (thành viên thường).
 * @param {number} teamId
 * @param {number} userId
 */
export async function leaveTeam(teamId, userId) {
  return apiFetch(`/api/teams/${teamId}/leave`, { method: 'DELETE', body: { userId } });
}

/**
 * Lấy công việc nhóm.
 * @param {number} teamId
 * @param {number} userId
 */
export async function getGroupTasks(teamId, userId) {
  return apiFetch(`/api/teams/${teamId}/tasks?userId=${userId}`);
}

/**
 * Tạo công việc nhóm (chỉ trưởng nhóm).
 * @param {number} teamId
 * @param {object} payload
 */
export async function createGroupTask(teamId, payload) {
  return apiFetch(`/api/teams/${teamId}/tasks`, { method: 'POST', body: payload });
}

/**
 * Cập nhật trạng thái công việc nhóm.
 * @param {number} teamId
 * @param {number} taskId
 * @param {{ userId: number, trangThai: string }} payload
 */
export async function updateGroupTaskStatus(teamId, taskId, payload) {
  return apiFetch(`/api/teams/${teamId}/tasks/${taskId}/status`, { method: 'PATCH', body: payload });
}
