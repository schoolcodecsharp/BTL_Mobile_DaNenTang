import { useEffect } from 'react';
import { AppState } from 'react-native';
import { useAuthSession } from './auth-session';
import { createServerNotificationPoller } from '@/lib/server-notifications';
import { remindersSupported } from '@/lib/task-reminders';

export function ServerNotificationProvider({ children }) {
  const { user } = useAuthSession();
  useEffect(() => {
    if (!user?.id || !remindersSupported) return;
    let mounted = true;
    let timer;
    const poll = createServerNotificationPoller(user.id,
      () => mounted && AppState.currentState === 'active');
    const refresh = () => void poll().catch(error => console.warn('Thông báo nhóm:', error.message));
    const start = () => {
      clearInterval(timer);
      refresh();
      timer = setInterval(refresh, 15000);
    };
    if (AppState.currentState === 'active') start();
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') start();
      else clearInterval(timer);
    });
    return () => { mounted = false; clearInterval(timer); subscription.remove(); };
  }, [user?.id]);
  return children;
}
