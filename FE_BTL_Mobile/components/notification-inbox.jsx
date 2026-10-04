import { useCallback, useEffect, useState } from 'react';
import { Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
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
  const [visible, setVisible] = useState(false);
  const [history, setHistory] = useState({ userId: null, items: [] });
  const [serverHistory, setServerHistory] = useState({ userId: null, items: [] });
  const localItems = history.userId === user?.id ? history.items : [];
  const serverItems = serverHistory.userId === user?.id ? serverHistory.items : [];
  const items = [...serverItems.map((item) => ({ id: `server:${item.id}`, serverId: item.id,
    title: item.tieuDe, body: item.noiDung || '', date: new Date(item.ngayTao).getTime(), read: item.daDoc,
    taskId: item.congViecId, teamId: item.nhomId, groupTaskId: item.congViecNhomId, type: item.loai })), ...localItems]
    .sort((a, b) => b.date - a.date);
  const refreshServer = useCallback(async () => {
    if (!user?.id) return;
    const list = await getNotifications(user.id);
    setServerHistory({ userId: user.id, items: list ?? [] });
  }, [user]);
  useFocusEffect(useCallback(() => {
    void refreshServer().catch(() => {});
    const timer = setInterval(() => void refreshServer().catch(() => {}), 30000);
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
    <TouchableOpacity accessibilityLabel={`Thông báo, ${unread} chưa đọc`} onPress={() => setVisible(true)} style={{ padding: 12, borderRadius: 16, backgroundColor: theme.surface }}>
      <Ionicons name="notifications-outline" size={23} color={theme.text} />
      {unread > 0 && <Text style={{ position: 'absolute', right: 0, top: 0, backgroundColor: '#DC2626', color: '#FFFFFF', borderRadius: 10, paddingHorizontal: 5, fontSize: 11 }}>{unread > 99 ? '99+' : unread}</Text>}
    </TouchableOpacity>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={() => setVisible(false)}>
      <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000070' }}>
        <View style={{ maxHeight: '85%', backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
            <Text style={{ color: theme.text, fontSize: 22, fontWeight: '700' }}>Lịch sử thông báo</Text>
            <TouchableOpacity accessibilityLabel="Đóng thông báo" onPress={() => setVisible(false)}><Ionicons name="close" size={26} color={theme.text} /></TouchableOpacity>
          </View>
          <ScrollView>
            {!items.length && <Text style={{ color: theme.muted, paddingVertical: 24 }}>{user ? 'Chưa có thông báo đã nhận.' : 'Đăng nhập để xem thông báo.'}</Text>}
            {items.map((item) => <TouchableOpacity key={item.id} onPress={async () => {
              try {
                if (item.serverId) await markNotificationRead(user.id, item.serverId);
                else await markHistoryRead(user.id, [item.id]);
              } catch { Alert.alert('Thông báo', 'Chưa lưu được trạng thái đã đọc.'); return; }
              setVisible(false);
              if (item.teamId) router.push({ pathname: '/(tabs)/teams', params: { teamId: String(item.teamId), taskId: item.groupTaskId ? String(item.groupTaskId) : '' } });
              else if (item.taskId) router.push({ pathname: '/(tabs)/tasks', params: { taskId: String(item.taskId) } });
              if (item.serverId) void refreshServer().catch(() => {});
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
