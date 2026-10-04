import AsyncStorage from '@react-native-async-storage/async-storage';
import { getNotifications } from './notifications-api';
import { getReminderState, notificationsModule } from './task-reminders';

// Persist the cursor per account so opening the inbox or restarting cannot
// replay old events. The first fetch establishes the existing inbox baseline.
export function createServerNotificationPoller(userId, isActive) {
  let queue = Promise.resolve();
  const key = `server-notification-cursor-v1:${userId}`;
  return () => {
    queue = queue.catch(() => {}).then(async () => {
      if (!isActive()) return;
      const list = await getNotifications(userId);
      if (!isActive()) return;
      const saved = await AsyncStorage.getItem(key);
      const cursor = saved === null ? null : Number(saved);
      let highest = cursor ?? 0;
      const sorted = [...list].sort((a, b) => Number(a.id) - Number(b.id));
      for (const item of sorted) {
        const id = Number(item.id);
        if (!Number.isSafeInteger(id) || id <= 0) continue;
        if (!isActive()) return;
        if (cursor !== null && id > cursor && !item.daDoc && getReminderState()) {
          const n = await notificationsModule();
          if (!isActive()) return;
          if (n) {
            await n.setNotificationChannelAsync?.('team-notifications', {
              name: 'Thông báo nhóm', importance: n.AndroidImportance.HIGH,
            });
            if (!isActive() || !getReminderState()) return;
            await n.scheduleNotificationAsync({
              identifier: `server-notification:${userId}:${id}`,
              content: {
                title: item.tieuDe || 'Thông báo', body: item.noiDung || '', sound: 'default',
                data: { userId: String(userId), notificationId: String(id),
                  teamId: item.nhomId, groupTaskId: item.congViecNhomId, taskId: item.congViecId },
              },
              trigger: { channelId: 'team-notifications' },
            });
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
