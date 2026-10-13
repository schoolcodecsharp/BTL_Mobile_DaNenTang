import { useCallback, useEffect, useRef, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { AppState, Platform } from 'react-native';
import { createLiveRefresh } from '@/lib/live-refresh.cjs';
import { subscribeTaskChanges } from '@/lib/task-detail.cjs';

function foreground() {
  return Platform.OS === 'web'
    ? typeof document === 'undefined' || document.visibilityState !== 'hidden'
    : AppState.currentState !== 'background' && AppState.currentState !== 'inactive';
}

// Pages opt into periodic polling only for shared data that can change remotely.
export function useLiveRefresh(refresh, { enabled = true, identity = '', interval = 0, listenToTaskChanges = false } = {}) {
  const callback = useRef(refresh);
  useEffect(() => { callback.current = refresh; }, [refresh]);
  useFocusEffect(useCallback(() => {
    if (!enabled) return undefined;
    const runner = createLiveRefresh((silent, isCurrent) => callback.current(silent, isCurrent), {
      isActive: foreground, onError: error => console.warn('Làm mới dữ liệu:', error.message),
    });
    void runner.request(false);
    const timer = interval > 0 ? setInterval(() => { void runner.request(); }, interval) : null;
    const subscription = AppState.addEventListener('change', state => {
      if (state === 'active') void runner.request();
    });
    const unsubscribe = listenToTaskChanges ? subscribeTaskChanges(() => { void runner.request(); }) : () => {};
    const onVisible = () => { if (foreground()) void runner.request(); };
    if (Platform.OS === 'web' && typeof document !== 'undefined') document.addEventListener('visibilitychange', onVisible);
    return () => {
      runner.stop(); if (timer !== null) clearInterval(timer); subscription.remove(); unsubscribe();
      if (Platform.OS === 'web' && typeof document !== 'undefined') document.removeEventListener('visibilitychange', onVisible);
    };
  }, [enabled, identity, interval, listenToTaskChanges]));
}

export function useLiveNow() {
  const [now, setNow] = useState(Date.now);
  useFocusEffect(useCallback(() => {
    const update = () => { if (foreground()) setNow(Date.now()); };
    update();
    const timer = setInterval(update, 1000);
    const subscription = AppState.addEventListener('change', state => { if (state === 'active') update(); });
    return () => { clearInterval(timer); subscription.remove(); };
  }, []));
  return now;
}
