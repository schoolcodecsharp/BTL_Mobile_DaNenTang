import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useAuthSession } from './auth-session';
import { markHistoryRead, readHistory, subscribeHistory } from '@/lib/notification-history';
import { getNotifications, markNotificationRead } from '@/lib/notifications-api';
const TYPES = {
  GIAO_VIEC_NHOM: ['briefcase-outline', 'Giao việc'],
  DOI_NGUOI_NHAN: ['swap-horizontal-outline', 'Đổi người nhận'],
  DOI_HAN_NHOM: ['calendar-outline', 'Đổi hạn'],
  TRANG_THAI_NHOM: ['checkmark-circle-outline', 'Trạng thái'],
  BINH_LUAN_NHOM: ['chatbubble-outline', 'Bình luận'],
  THANH_VIEN_NHOM: ['people-outline', 'Thành viên'],
  TRUONG_NHOM: ['star-outline', 'Trưởng nhóm'],
};

export function NotificationInbox({ theme }) {
  const { user } = useAuthSession();
  const accountId = user?.id ?? null;
  const [visible, setVisible] = useState(false);
  const [history, setHistory] = useState({ userId: null, items: [] });
  const [serverHistory, setServerHistory] = useState({ userId: null, items: [] });
  const [serverStatus, setServerStatus] = useState({ userId: null, loading: false, error: '' });
  const activeUser = useRef(null);
  const requestSequence = useRef(0);
  const mounted = useRef(true);
  useLayoutEffect(() => {
    activeUser.current = accountId;
    requestSequence.current++;
  }, [accountId]);
  const status = serverStatus.userId === user?.id ? serverStatus : { loading: false, error: '' };
  const localItems = history.userId === user?.id ? history.items : [];
  const serverItems = serverHistory.userId === user?.id ? serverHistory.items : [];
  const items = [...serverItems.map((item) => ({ id: `server:${item.id}`, serverId: item.id,
    title: item.tieuDe, body: item.noiDung || '', date: new Date(item.ngayTao).getTime(), read: item.daDoc,
    taskId: item.congViecId, teamId: item.nhomId, groupTaskId: item.congViecNhomId, type: item.loai })), ...localItems]
    .sort((a, b) => b.date - a.date);
  const refreshServer = useCallback(async () => {
    if (!accountId) return;
    const userId = accountId;
    const request = ++requestSequence.current;
    const current = () => mounted.current && activeUser.current === userId && requestSequence.current === request;
    setServerStatus({ userId, loading: true, error: '' });
    try {
      const list = await getNotifications(userId);
      if (!current()) return;
      setServerHistory({ userId, items: list ?? [] });
      setServerStatus({ userId, loading: false, error: '' });
    } catch (error) {
      if (!current()) return;
      setServerStatus({ userId, loading: false, error: error.status === 401
        ? 'Phiên đăng nhập đã hết hạn. Đăng nhập lại để tải thông báo nhóm.'
        : error.message || 'Chưa tải được thông báo nhóm. Kiểm tra mạng rồi thử lại.' });
    }
  }, [accountId]);
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; };
  }, []);
  useFocusEffect(useCallback(() => {
    void refreshServer();
    const timer = setInterval(() => void refreshServer(), 30000);
    return () => clearInterval(timer);
  }, [refreshServer]));
  useEffect(() => {
    if (!user?.id) return;
    let active = true;
    const refresh = () => readHistory(user.id).then((list) => {
      if (active) setHistory({ userId: user.id, items: list });
    }).catch(() => { if (active) Alert.alert('Thông báo', 'Chưa đọc được lịch sử thông báo.'); });
    void refresh();
    const unsubscribe = subscribeHistory((id) => { if (id === String(user.id)) void refresh(); });
    return () => { active = false; unsubscribe(); };
  }, [user?.id]);
  const unread = items.filter((item) => !item.read).length;
  return <>
    <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Thông báo, ${unread} chưa đọc`} onPress={() => { setVisible(true); void refreshServer(); }} style={{ minWidth: 48, minHeight: 48, padding: 12, borderRadius: 16, backgroundColor: theme.surface }}>
      <Ionicons name="notifications-outline" size={23} color={theme.text} />
      {unread > 0 && <Text style={{ position: 'absolute', right: 0, top: 0, backgroundColor: '#DC2626', color: '#FFFFFF', borderRadius: 10, paddingHorizontal: 5, fontSize: 11 }}>{unread > 99 ? '99+' : unread}</Text>}
    </TouchableOpacity>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000070' }}>
        <View style={{ maxHeight: '85%', backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700', flex: 1 }}>Lịch sử thông báo</Text>
            <TouchableOpacity accessibilityRole="button" accessibilityLabel="Đóng thông báo" onPress={() => setVisible(false)} style={{ minWidth: 48, minHeight: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={26} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView>
            {status.loading && <View accessibilityLiveRegion="polite" style={{ flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 14 }}>
              <ActivityIndicator color={theme.primary} />
              <Text style={{ color: theme.muted, fontSize: 14, flex: 1 }}>Đang tải thông báo nhóm...</Text>
            </View>}
            {!!status.error && <View accessibilityLiveRegion="polite" style={{ paddingVertical: 14 }}>
              <Text style={{ color: theme.text, fontSize: 16, lineHeight: 23 }}>{status.error}</Text>
              <TouchableOpacity accessibilityRole="button" onPress={() => void refreshServer()} style={{ minHeight: 48, minWidth: 48, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 4 }}>
                <Text style={{ color: theme.primary, fontSize: 16, fontWeight: '600' }}>Thử lại</Text>
              </TouchableOpacity>
            </View>}
            {!items.length && !status.loading && !status.error && <View style={{ paddingVertical: 24 }}>
              <Text style={{ color: theme.muted }}>{user ? 'Chưa có thông báo đã nhận.' : 'Đăng nhập để xem thông báo.'}</Text>
              {user && <Text style={{ color: theme.muted, marginTop: 8, fontSize: 14, lineHeight: 20 }}>Thông báo thử và nhắc công việc được lưu ở đây sau khi điện thoại nhận được.</Text>}
            </View>}
            {items.map((item) => <TouchableOpacity key={item.id} onPress={async () => {
              try {
                if (item.serverId) await markNotificationRead(user.id, item.serverId);
                else await markHistoryRead(user.id, [item.id]);
              } catch { Alert.alert('Thông báo', 'Chưa lưu được trạng thái đã đọc.'); return; }
              setVisible(false);
              if (item.teamId) router.push({ pathname: '/(tabs)/teams', params: { teamId: String(item.teamId), taskId: item.groupTaskId ? String(item.groupTaskId) : '' } });
              else if (item.taskId) router.push({ pathname: '/(tabs)/tasks', params: { taskId: String(item.taskId) } });
              if (item.serverId) void refreshServer();
            }} style={{ padding: 14, marginBottom: 10, borderRadius: 12, backgroundColor: item.read ? theme.background : '#6366F11A' }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 }}>
                <Ionicons name={(TYPES[item.type] ?? ['alarm-outline', 'Nhắc nhở'])[0]} size={16} color={theme.primary} />
                <Text style={{ color: theme.primary, fontSize: 12 }}>{(TYPES[item.type] ?? ['alarm-outline', item.serverId ? 'Thông báo' : 'Nhắc nhở'])[1]}</Text>
              </View>
              <Text style={{ color: theme.text, fontWeight: item.read ? '500' : '700' }}>{item.title}</Text>
              <Text style={{ color: theme.text, marginTop: 5 }}>{item.body}</Text>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>{new Date(item.date).toLocaleString('vi-VN')}{item.read ? '' : ' • Chưa đọc'}</Text>
            </TouchableOpacity>)}
          </ScrollView>
        </View>
      </View>
    </Modal>
  </>;
}
