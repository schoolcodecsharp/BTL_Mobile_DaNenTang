import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants, { ExecutionEnvironment } from 'expo-constants';
import { Alert, Platform } from 'react-native';
import { PREFIX, buildReminderPlan } from './reminder-plan.cjs';

let owner = null;
let enabled = false;
let tasks = [];
let revision = 0;
let queue = Promise.resolve();
let preferenceQueue = Promise.resolve();
let preferenceRevision = 0;
let nativeModule;
let readyOwner = null;
let lastErrorAlert = 0;
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
export function getReminderStatus(userId) {
  const ready = readyOwner === owner && owner === String(userId);
  return { ready, enabled: ready && enabled };
}
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
function persistPreference(id, value, request) {
  const saved = preferenceQueue.catch(() => {}).then(async () => {
    if (owner !== id || preferenceRevision !== request) return;
    await AsyncStorage.setItem(preferenceKey(id), String(value));
  });
  preferenceQueue = saved.catch(() => {});
  return saved;
}
export function reportReminderError(error) {
  console.warn('Task reminders:', error);
  if (Date.now() - lastErrorAlert < 30000) return;
  lastErrorAlert = Date.now();
  Alert.alert('Chưa cập nhật được lịch nhắc', `${error.message}\nDữ liệu công việc vẫn được lưu. Vào Cá nhân để thử lại hoặc kiểm tra quyền thông báo.`);
}
export function runNotificationOperation(label, work, timeoutMs = 10000) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Điện thoại không phản hồi khi ${label}. Hãy mở lại ứng dụng rồi thử lại.`)), timeoutMs);
  });
  return Promise.race([Promise.resolve().then(work), timeout]).finally(() => clearTimeout(timer));
}
export async function notificationsModule() {
  if (!remindersSupported) return null;
  if (!nativeModule) {
    // This embedded release is a single bundle. Load synchronously, only after
    // the capability guard, instead of waiting for a dynamic-import chunk.
    const notifications = require('expo-notifications');
    notifications.setNotificationHandler({
      handleNotification: async (notification) => {
        const request = notification.request;
        const data = request.content.data;
        const controlled = request.identifier.startsWith(PREFIX) || request.identifier.startsWith('server-notification:');
        // An explicit test remains usable while reminders are off. Real owned
        // reminders must respect the latest switch/account even during cleanup.
        const show = !controlled || (enabled && String(data?.userId) === owner);
        return { shouldShowBanner: show, shouldShowList: show, shouldPlaySound: show, shouldSetBadge: false };
      },
    });
    nativeModule = notifications;
  }
  return nativeModule;
}
async function permission(request) {
  const n = await notificationsModule();
  if (!n) return false;
  if (Platform.OS === 'android') {
    await runNotificationOperation('tạo kênh thông báo', () => n.setNotificationChannelAsync('task-reminders', {
      // Omitting sound uses Android's default; a string is checked as a custom file.
      name: 'Nhắc công việc', importance: n.AndroidImportance.HIGH,
    }));
  }
  let result = await runNotificationOperation('kiểm tra quyền thông báo', () => n.getPermissionsAsync());
  if (request && !result.granted && result.canAskAgain) {
    result = await runNotificationOperation('xin quyền thông báo', () => n.requestPermissionsAsync(), 60000);
  }
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
  const pending = await runNotificationOperation('đọc lịch nhắc', () => n.getAllScheduledNotificationsAsync());
  for (const item of pending) {
    if (!item.identifier.startsWith(PREFIX)) continue;
    const target = planned.find((plan) => plan.identifier === item.identifier);
    const data = item.content.data;
    if (target && data?.due === target.due && item.content.title === target.title && item.content.body === target.body) {
      desired.delete(item.identifier);
    } else {
      await runNotificationOperation('hủy lịch nhắc', () => n.cancelScheduledNotificationAsync(item.identifier));
    }
  }
  for (const item of desired.values()) {
    await runNotificationOperation('đặt lịch nhắc', () => n.scheduleNotificationAsync({
      identifier: item.identifier,
      content: {
        title: item.title,
        body: item.body,
        sound: 'default',
        data: { taskId: item.taskId, userId: item.userId, due: item.due },
      },
      trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(item.at), channelId: 'task-reminders' },
    }));
    records[item.identifier] = { due: item.due, at: item.at };
    await AsyncStorage.setItem('task-reminders-armed', JSON.stringify(records));
  }
}

export function refreshReminderPermission() {
  const id = owner;
  const request = preferenceRevision;
  return (async () => {
    if (!id) return;
    const preference = await AsyncStorage.getItem(preferenceKey(id));
    const allowed = preference !== 'false' && await permission(false);
    if (owner !== id || preferenceRevision !== request) return;
    readyOwner = id;
    publish(allowed);
    if (!allowed) reconcilePreference(id, request);
  })();
}

function reconcilePreference(id, request) {
  // Cancellation/scheduling remains ordered, but preference controls never
  // wait behind native work. Superseded OFF/ON requests are skipped.
  void serial(async () => {
    if (owner !== id || preferenceRevision !== request) return;
    await reconcile();
  }).catch(reportReminderError);
}

export async function sendTestReminder(userId) {
  if (!remindersSupported) throw new Error('Hãy dùng bản APK để thử thông báo trên Android.');
  if (!userId) throw new Error('Hãy đăng nhập để thử thông báo.');
  if (!await permission(true)) {
    throw new Error('Hãy bật quyền thông báo cho ứng dụng trong Cài đặt của điện thoại.');
  }
  const n = await notificationsModule();
  return runNotificationOperation('đặt thông báo thử', () => n.scheduleNotificationAsync({
    identifier: `task-reminder-test:${userId}:${Date.now()}`,
    content: { title: 'Thử nhắc công việc', body: 'Điện thoại đã nhận được thông báo nhắc.', sound: 'default',
      data: { userId: String(userId), test: true } },
    trigger: { type: n.SchedulableTriggerInputTypes.DATE, date: new Date(Date.now() + 10000), channelId: 'task-reminders' },
  }));
}

export function activateReminders(userId) {
  owner = String(userId);
  readyOwner = null;
  const request = ++preferenceRevision;
  revision++;
  const id = owner;
  return serial(async () => {
    if (owner !== id || preferenceRevision !== request) return;
    tasks = [];
    const preference = await AsyncStorage.getItem(preferenceKey(id));
    const allowed = preference !== 'false' && await permission(preference === null);
    if (owner !== id || preferenceRevision !== request) return;
    readyOwner = id;
    publish(allowed);
    if (preference === null) await persistPreference(id, true, request);
    if (owner !== id || preferenceRevision !== request) return;
    // Preserve this account's pending reminders until its task list is fetched.
    const n = await notificationsModule();
    if (n) for (const item of await runNotificationOperation('đọc lịch nhắc', () => n.getAllScheduledNotificationsAsync())) {
      if (item.identifier.startsWith(PREFIX) && String(item.content.data?.userId) === id &&
        !tasks.some((task) => String(task.id) === String(item.content.data.taskId))) {
        tasks.push({ id: item.content.data.taskId, tieuDe: item.content.title,
          hanHoanThanh: new Date(item.content.data.due).toISOString(), trangThai: 'CHUA_LAM' });
      }
      if (item.identifier.startsWith(PREFIX) && (!enabled || String(item.content.data?.userId) !== id)) {
        await runNotificationOperation('hủy lịch nhắc', () => n.cancelScheduledNotificationAsync(item.identifier));
      }
    }
  });
}
export function stopReminders() {
  owner = null;
  readyOwner = null;
  preferenceRevision++;
  revision++;
  publish(false);
  return serial(async () => { tasks = []; await reconcile(); });
}
export async function setRemindersEnabled(value) {
  const id = owner;
  if (!id || !remindersSupported) return;
  const request = ++preferenceRevision;
  revision++;
  const allowed = value ? await permission(true) : false;
  if (id !== owner || preferenceRevision !== request) return;
  // Serialize only storage writes, independently from the notification queue.
  await persistPreference(id, value, request);
  if (id !== owner || preferenceRevision !== request) return;
  readyOwner = id;
  publish(allowed);
  reconcilePreference(id, request);
  if (value && !allowed) Alert.alert('Chưa có quyền thông báo', 'Hãy bật quyền thông báo cho ứng dụng trong Cài đặt của điện thoại rồi thử lại.');
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
