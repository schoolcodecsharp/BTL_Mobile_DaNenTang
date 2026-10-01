import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ActivityIndicator, Alert, View } from 'react-native';

import { setApiToken } from '@/lib/api';
import { reportReminderError, stopReminders } from '@/lib/task-reminders';

const AuthSessionContext = createContext(null);
const SESSION_KEY = 'auth-session-v1';
let storageQueue = Promise.resolve();

function persistSession(session) {
  storageQueue = storageQueue.catch(() => {}).then(() => session
    ? AsyncStorage.setItem(SESSION_KEY, JSON.stringify(session))
    : AsyncStorage.removeItem(SESSION_KEY));
  return storageQueue;
}

export function AuthSessionProvider({ children }) {
  const [session, setSession] = useState(null); // { user, token }
  const [restored, setRestored] = useState(false);

  useEffect(() => {
    let active = true;
    async function restore() {
      try {
        await storageQueue.catch(() => {});
        const raw = await AsyncStorage.getItem(SESSION_KEY);
        const saved = raw ? JSON.parse(raw) : null;
        if (saved && (!Number.isInteger(saved.user?.id) || saved.user.id <= 0 ||
          typeof saved.user.username !== 'string' ||
          (saved.token !== null && typeof saved.token !== 'string'))) {
          await persistSession(null);
          return;
        }
        if (active) {
          setApiToken(saved?.token ?? null);
          setSession(saved);
        }
      } catch {
        if (active) setApiToken(null);
      } finally {
        if (active) setRestored(true);
      }
    }
    void restore();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!restored) return;
    void persistSession(session).catch(() => {
      Alert.alert('Chưa lưu được phiên đăng nhập', 'Vui lòng thử lại. Tài khoản có thể không được ghi nhớ khi mở lại ứng dụng.');
    });
  }, [session, restored]);

  const value = useMemo(() => ({
    user: session?.user ?? null,
    token: session?.token ?? null,
    signIn: (userData) => {
      const token = userData.accessToken ?? null;
      setApiToken(token);
      // Persist profile fields only, never passwords or the raw login response.
      const { id, username, email, fullName, avatar } = userData;
      setSession({ user: { id, username, email, fullName, avatar }, token });
    },
    updateUser: (updatedFields) => {
      setSession((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          user: {
            ...prev.user,
            ...updatedFields,
          },
        };
      });
    },
    signOut: () => {
      void stopReminders().catch(reportReminderError);
      setApiToken(null);
      setSession(null);
    },
  }), [session]);

  if (!restored) {
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" /></View>;
  }
  return <AuthSessionContext.Provider value={value}>{children}</AuthSessionContext.Provider>;
}

export function useAuthSession() {
  const context = useContext(AuthSessionContext);
  if (!context) throw new Error('useAuthSession must be used inside AuthSessionProvider.');
  return context;
}
