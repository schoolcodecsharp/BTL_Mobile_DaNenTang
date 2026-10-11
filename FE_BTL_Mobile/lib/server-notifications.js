import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotifications } from './notifications-api';
import { getReminderStatus, notificationsModule, runNotificationOperation } from './task-reminders';

// Persist the cursor per account so opening the inbox or restarting cannot
// replay old events. The first fetch establishes the existing inbox baseline.
export function createServerNotificationPoller(userId, isActive) {
  let queue = Promise.resolve();
  const key = `server-notification-cursor-v1:${userId}`;
  return () => {
    queue = queue.catch(() => {}).then(async () => {
      // Startup is not an explicit opt-out. Do not consume new events before
      // this account's permission/preference state has actually been restored.
      if (!isActive() || !getReminderStatus(userId).ready) return;
      const list = await getNotifications(userId);
      if (!isActive() || !getReminderStatus(userId).ready) return;
      const saved = await AsyncStorage.getItem(key);
      const parsed = saved === null ? null : Number(saved);
      const cursor = Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null;
      let highest = cursor ?? 0;
      const sorted = [...list].sort((a, b) => Number(a.id) - Number(b.id));
      for (const item of sorted) {
        const id = Number(item.id);
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        if (!isActive() || !getReminderStatus(userId).ready) return;
        if (cursor !== null && id > cursor && !item.daDoc && getReminderStatus(userId).enabled) {
          const n = await runNotificationOperation('Mở thông báo nhóm', notificationsModule);
          if (!isActive()) return;
          if (n) {
            await runNotificationOperation('Tạo kênh thông báo nhóm', () => n.setNotificationChannelAsync?.('team-notifications', {
              name: 'Thông báo nhóm', importance: n.AndroidImportance.HIGH,
            }));
            const status = getReminderStatus(userId);
            if (!isActive() || !status.ready || !status.enabled) return;
            await runNotificationOperation('Gửi thông báo nhóm', () => n.scheduleNotificationAsync({
              identifier: `server-notification:${userId}:${id}`,
              content: {
                title: item.tieuDe || 'Thông báo', body: item.noiDung || '', sound: 'default',
                data: { userId: String(userId), notificationId: String(id),
                  teamId: item.nhomId, groupTaskId: item.congViecNhomId, taskId: item.congViecId },
              },
              trigger: { channelId: 'team-notifications' },
            }));
          }
        }
        highest = Math.max(highest, id);
        await AsyncStorage.setItem(key, String(highest));
      }
      if (saved === null && !sorted.length) await AsyncStorage.setItem(key, '0');
    });
    return queue;
  };
}
