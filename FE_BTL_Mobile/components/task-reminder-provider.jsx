import { createContext, useContext, useEffect, useState } from 'react';
import { AppState } from 'react-native';
import { router, useRootNavigationState } from 'expo-router';
import { useAuthSession } from './auth-session';
import { getTasks } from '@/lib/tasks-api';
import { recordNotification } from '@/lib/notification-history';
import {
  activateReminders, getReminderState, notificationsModule, refreshReminderPermission,
  remindersSupported, reportReminderError, setRemindersEnabled, subscribeReminders,
} from '@/lib/task-reminders';

const Context = createContext(null);
export const useTaskReminders = () => useContext(Context);

export function TaskReminderProvider({ children }) {
  const { user } = useAuthSession();
  const navigation = useRootNavigationState();
  const [enabled, setEnabled] = useState(getReminderState);
  const [busy, setBusy] = useState(false);
  const [response, setResponse] = useState(null);

  useEffect(() => subscribeReminders(setEnabled), []);
  useEffect(() => {
    if (!user?.id || !remindersSupported) return;
    let active = true;
    const activation = activateReminders(user.id);
    Promise.resolve().then(() => { if (active) setBusy(true); });
    activation.then(() => active && getTasks(user.id))
      .catch(reportReminderError).finally(() => { if (active) setBusy(false); });
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
        const presented = await n.getPresentedNotificationsAsync();
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
      const last = await n.getLastNotificationResponseAsync();
      if (active && last) { await capture(last.notification); setResponse(last); }
    }).catch(reportReminderError);
    return () => { active = false; subscription?.remove(); received?.remove(); foreground?.remove(); };
  }, []);

  useEffect(() => {
    if (!response || !user?.id || !navigation?.key) return;
    const data = response.notification.request.content.data;
    if (String(data?.userId) === String(user.id) && data?.taskId) {
      router.push({ pathname: '/(tabs)/tasks', params: { taskId: String(data.taskId) } });
    }
    notificationsModule().then(async (n) => {
      await n?.clearLastNotificationResponseAsync();
      setResponse((current) => current === response ? null : current);
    }).catch(reportReminderError);
  }, [response, user?.id, navigation?.key]);

  async function toggle(value) {
    setBusy(true);
    try {
      await setRemindersEnabled(value);
      if (value && user?.id) await getTasks(user.id);
    } catch (error) { reportReminderError(error); }
    finally { setBusy(false); }
  }
  return <Context.Provider value={{ notificationsEnabled: enabled, setNotificationsEnabled: toggle, notificationsDisabled: busy || !user?.id || !remindersSupported }}>{children}</Context.Provider>;
}
