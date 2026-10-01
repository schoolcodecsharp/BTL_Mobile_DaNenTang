import AsyncStorage from '@react-native-async-storage/async-storage';

const listeners = new Set();
let queue = Promise.resolve();
const key = (userId) => `notification-history-v1:${userId}`;
export const subscribeHistory = (listener) => { listeners.add(listener); return () => listeners.delete(listener); };
export async function readHistory(userId) {
  await queue.catch(() => {});
  return JSON.parse(await AsyncStorage.getItem(key(userId)) || '[]');
}
export function recordNotification(notification) {
  const request = notification?.request;
  const data = request?.content?.data;
  if (!request?.identifier?.startsWith('task-reminder:') || !data?.userId) return Promise.resolve();
  const userId = String(data.userId);
  const id = `${request.identifier}:${data.due ?? notification.date}`;
  const next = queue.catch(() => {}).then(async () => {
    const list = JSON.parse(await AsyncStorage.getItem(key(userId)) || '[]');
    if (list.some((item) => item.id === id)) return;
    list.unshift({ id, title: request.content.title || 'Nhắc công việc', body: request.content.body || '',
      taskId: data.taskId, date: notification.date || Date.now(), read: false });
    list.sort((a, b) => b.date - a.date);
    await AsyncStorage.setItem(key(userId), JSON.stringify(list));
    listeners.forEach((listener) => listener(userId));
  });
  queue = next;
  return next;
}
export function markHistoryRead(userId, ids) {
  const next = queue.catch(() => {}).then(async () => {
    const list = JSON.parse(await AsyncStorage.getItem(key(userId)) || '[]');
    await AsyncStorage.setItem(key(userId), JSON.stringify(list.map((item) => ids.includes(item.id) ? { ...item, read: true } : item)));
    listeners.forEach((listener) => listener(String(userId)));
  });
  queue = next;
  return next;
}
