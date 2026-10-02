import { apiFetch } from './api';

export const getNotifications = (userId) => apiFetch(`/api/users/${userId}/notifications`);
export const markNotificationRead = (userId, notificationId) => apiFetch(`/api/users/${userId}/notifications/${notificationId}/read`, { method: 'PATCH' });
export const deleteNotification = (userId, notificationId) => apiFetch(`/api/users/${userId}/notifications/${notificationId}`, { method: 'DELETE' });
