import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Alert, Platform } from 'react-native';
import { PREFIX, buildReminderPlan } from './reminder-plan.cjs';

let owner = null;
let enabled = false;
let tasks = [];
let revision = 0;
let queue = Promise.resolve();
let nativeModule;
const listeners = new Set();
// Importing expo-notifications registers push listeners, which throw in Android Expo Go.
export const remindersSupported = Platform.OS !== 'web' && !(
  Platform.OS === 'android' && Constants.executionEnvironment === ExecutionEnvironment.StoreClient
);
const preferenceKey = (id) => `task-reminders-enabled:${id}`;
const taskPreferencesKey = (id) => `task-reminder-options:${id}`;

export async function readTaskReminderOptions(userId) {
  return JSON.parse(await AsyncStorage.getItem(taskPreferencesKey(userId)) || '{}');
}
export function saveTaskReminderOptions(userId, taskId, offsets) {
  return serial(async () => {
    const options = await readTaskReminderOptions(userId);
    options[String(taskId)] = offsets;
    await AsyncStorage.setItem(taskPreferencesKey(userId), JSON.stringify(options));
  });
}

export function getReminderState() { return enabled; }
export function reminderRevision() { return revision; }
export function subscribeReminders(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
function publish(value) {
  enabled = value;
  listeners.forEach((listener) => listener(value));
}
function serial(work) {
  const next = queue.then(work);
  queue = next.catch(() => {});
  return next;
}
export function reportReminderError(error) {
  console.warn('Task reminders:', error);
  Alert.alert('Chưa cập nhật được lịch nhắc', 'Dữ liệu công việc vẫn được lưu. Hãy mở lại app và kiểm tra quyền thông báo để thử lại.');
}
export async function notificationsModule() {
  if (!remindersSupported) return null;
  if (!nativeModule) {
    const notifications = await import('expo-notifications');
    notifications.setNotificationHandler({
      handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: true, shouldSetBadge: false }),
    });
    nativeModule = notifications;
  }
  return nativeModule;
}
async function permission(request) {
  const n = await notificationsModule();
  if (!n) return false;
  if (Platform.OS === 'android') {
    await n.setNotificationChannelAsync('task-reminders', {
      // Omitting sound uses Android's default; a string is checked as a custom file.
      name: 'Nhắc công việc', importance: n.AndroidImportance.HIGH,
    });
  }
  let result = await n.getPermissionsAsync();
  if (request && !result.granted && result.canAskAgain) result = await n.requestPermissionsAsync();
  return result.granted || result.ios?.status === n.IosAuthorizationStatus.PROVISIONAL;
}
async function reconcile() {
  const n = await notificationsModule();
  if (!n) return;
  const options = owner ? await readTaskReminderOptions(owner) : {};
  const planned = enabled && owner ? buildReminderPlan(owner, tasks.map(task => ({
    ...task, nhacTruoc: options[String(task.id)] ?? task.nhacTruoc,
  }))) : [];
  const desired = new Map(planned.map((item) => [item.identifier, item]));
  const records = JSON.parse(await AsyncStorage.getItem('task-reminders-armed') || '{}');
  for (const [id, record] of Object.entries(records)) {
    if (record.due <= Date.now()) delete records[id];
  }
  for (const item of planned) {
    const record = records[item.identifier];
    if (record?.due === item.due && record.at <= Date.now()) desired.delete(item.identifier);
  }
  const pending = await n.getAllScheduledNotificationsAsync();
  for (const item of pending) {
    if (!item.identifier.startsWith(PREFIX)) continue;
    const target = planned.find((plan) => plan.identifier === item.identifier);
    const data = item.content.data;
    if (target && data?.due === target.due && item.content.title === target.title && item.content.body === target.body) {
      desired.delete(item.identifier);
    } else {
      await n.cancelScheduledNotificationAsync(item.identifier);
    }
  }
  for (const item of desired.values()) {
    await n.scheduleNotificationAsync({
      identifier: item.identifier,
      content: {
        title: item.title,
        body: item.body,
        sound: 'default',
        data: { taskId: item.taskId, userId: item.userId, due: item.due },
      },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(item.at), channelId: 'task-reminders' },
    });
    records[item.identifier] = { due: item.due, at: item.at };
    await AsyncStorage.setItem('task-reminders-armed', JSON.stringify(records));
  }
}

export function refreshReminderPermission() {
  return serial(async () => {
    if (!owner) return;
    const preference = await AsyncStorage.getItem(preferenceKey(owner));
    publish(preference !== 'false' && await permission(false));
    if (!enabled) await reconcile();
  });
}

export async function sendTestReminder() {
  if (!remindersSupported) throw new Error('Hãy dùng bản APK để thử thông báo trên Android.');
  if (!await permission(true)) {
    throw new Error('Hãy bật quyền thông báo cho ứng dụng trong Cài đặt của điện thoại.');
  }
  const n = await notificationsModule();
  await n.scheduleNotificationAsync({
    content: { title: 'Thử nhắc công việc', body: 'Điện thoại đã nhận được thông báo nhắc.', sound: 'default' },
    trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 10000), channelId: 'task-reminders' },
  });
}

export function activateReminders(userId) {
  owner = String(userId);
  revision++;
  const id = owner;
  return serial(async () => {
    if (owner !== id) return;
    tasks = [];
    const preference = await AsyncStorage.getItem(preferenceKey(id));
    publish(preference !== 'false' && await permission(preference === null));
    if (preference === null) await AsyncStorage.setItem(preferenceKey(id), 'true');
    // Preserve this account's pending reminders until its task list is fetched.
    const n = await notificationsModule();
    if (n) for (const item of await n.getAllScheduledNotificationsAsync()) {
      if (item.identifier.startsWith(PREFIX) && String(item.content.data?.userId) === id &&
        !tasks.some((task) => String(task.id) === String(item.content.data.taskId))) {
        tasks.push({ id: item.content.data.taskId, tieuDe: item.content.title,
          hanHoanThanh: new Date(item.content.data.due).toISOString(), trangThai: 'CHUA_LAM' });
      }
      if (item.identifier.startsWith(PREFIX) && (!enabled || String(item.content.data?.userId) !== id)) {
        await n.cancelScheduledNotificationAsync(item.identifier);
      }
    }
  });
}
export function stopReminders() {
  owner = null;
  revision++;
  publish(false);
  return serial(async () => { tasks = []; await reconcile(); });
}
export function setRemindersEnabled(value) {
  const id = owner;
  return serial(async () => {
    if (!id || id !== owner || !remindersSupported) return;
    const allowed = value ? await permission(true) : false;
    await AsyncStorage.setItem(preferenceKey(id), String(value));
    publish(allowed);
    await reconcile();
    if (value && !allowed) Alert.alert('Chưa có quyền thông báo', 'Hãy bật quyền thông báo cho ứng dụng trong Cài đặt của điện thoại rồi thử lại.');
  });
}
export function syncTaskReminders(userId, list, expectedRevision) {
  return serial(async () => {
    if (String(userId) !== owner || expectedRevision !== revision) return;
    tasks = list;
    await reconcile();
  });
}
export function changeTaskReminder(userId, task, deleted = false) {
  const version = ++revision;
  return serial(async () => {
    if (String(userId) !== owner) return;
    tasks = tasks.filter((item) => String(item.id) !== String(task.id));
    if (!deleted) tasks.push(task);
    await reconcile();
    return version;
  });
}
