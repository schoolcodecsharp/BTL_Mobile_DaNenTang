import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useAuthSession } from './auth-session';
import { getTasks } from '@/lib/tasks-api';
import { recordNotification } from '@/lib/notification-history';
import { markNotificationRead } from '@/lib/notifications-api';
import {
  activateReminders, getReminderState, notificationsModule, refreshReminderPermission,
  remindersSupported, reportReminderError, setRemindersEnabled, subscribeReminders,
  runNotificationOperation,
} from '@/lib/task-reminders';

const Context = createContext(null);
export const useTaskReminders = () => useContext(Context);

export function TaskReminderProvider({ children }) {
  const { user } = useAuthSession();
  const navigation = useRootNavigationState();
  const [enabled, setEnabled] = useState(getReminderState);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [response, setResponse] = useState(null);
  const toggleRequest = useRef(0);

  useEffect(() => subscribeReminders(setEnabled), []);
  useEffect(() => {
    toggleRequest.current++;
    if (!user?.id || !remindersSupported) return;
    let active = true;
    const activation = activateReminders(user.id);
    Promise.resolve().then(() => { if (active) { setBusy(true); setError(''); } });
    activation.then(() => active && getTasks(user.id))
      .catch(error => { if (active) setError(error.message); reportReminderError(error); })
      .finally(() => { if (active) setBusy(false); });
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        refreshReminderPermission().then(() => active && getTasks(user.id)).catch(reportReminderError);
      }
    });
    return () => { active = false; subscription.remove(); };
  }, [user?.id]);

  useEffect(() => {
    let active = true;
    let subscription;
    let received;
    let foreground;
    notificationsModule().then(async (n) => {
      if (!n || !active) return;
      const capture = (notification) => recordNotification(notification).catch(reportReminderError);
      const collect = async () => {
        const presented = await runNotificationOperation('đọc thông báo đã nhận', () => n.getPresentedNotificationsAsync());
        await Promise.all(presented.map(capture));
      };
      received = n.addNotificationReceivedListener(capture);
      subscription = n.addNotificationResponseReceivedListener((value) => {
        void capture(value.notification);
        setResponse(value);
      });
      foreground = AppState.addEventListener('change', (state) => {
        if (state === 'active') void collect().catch(reportReminderError);
      });
      await collect();
      const last = await runNotificationOperation('đọc thông báo đã mở', () => n.getLastNotificationResponseAsync());
      if (active && last) { await capture(last.notification); setResponse(last); }
    }).catch(reportReminderError);
    return () => { active = false; subscription?.remove(); received?.remove(); foreground?.remove(); };
  }, []);

  useEffect(() => {
    if (!response || !user?.id || !navigation?.key) return;
    const data = response.notification.request.content.data;
    if (String(data?.userId) === String(user.id)) {
      if (data.notificationId) {
        void markNotificationRead(user.id, data.notificationId).catch(error =>
          console.warn('Thông báo nhóm:', error.message));
      }
      if (data.teamId) {
        router.push({ pathname: '/(tabs)/teams', params: { teamId: String(data.teamId),
          taskId: data.groupTaskId ? String(data.groupTaskId) : '' } });
      } else if (data.taskId) {
        router.push({ pathname: '/(tabs)/tasks', params: { taskId: String(data.taskId) } });
      }
    }
    notificationsModule().then(async (n) => {
      if (n) await runNotificationOperation('đánh dấu thông báo đã mở', () => n.clearLastNotificationResponseAsync());
      setResponse((current) => current === response ? null : current);
    }).catch(reportReminderError);
  }, [response, user?.id, navigation?.key]);

  async function toggle(value) {
    const request = ++toggleRequest.current;
    setBusy(true);
    setError('');
    try {
      await setRemindersEnabled(value);
      if (value && user?.id && request === toggleRequest.current) {
        // Refreshing tasks/rebuilding alarms must not lock the switch.
        void getTasks(user.id).catch(error => {
          if (request === toggleRequest.current) setError(error.message);
          reportReminderError(error);
        });
      }
    } catch (error) {
      if (request === toggleRequest.current) setError(error.message);
      reportReminderError(error);
    } finally { if (request === toggleRequest.current) setBusy(false); }
  }
  return <Context.Provider value={{ notificationsEnabled: enabled, setNotificationsEnabled: toggle,
    notificationsBusy: busy, notificationsError: error,
    notificationsDisabled: busy || !user?.id || !remindersSupported }}>{children}</Context.Provider>;
}
