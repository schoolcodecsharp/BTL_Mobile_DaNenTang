import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTrashTasks, permanentlyDeleteTask, restoreTask } from '@/lib/tasks-api';
import { confirmAction } from '@/lib/confirm-action';
import { useLiveRefresh } from '@/hooks/use-live-refresh';

export function TaskTrash({ visible, userId, theme, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState(null);
  const busyRef = useRef(false);
  const load = useCallback(async (silent = false, isCurrent = () => true) => {
    if (!visible || !userId) return;
    if (silent && busyRef.current) return;
    if (!silent) setLoading(true);
    try { const data = await getTrashTasks(userId); if (isCurrent()) { setItems(data ?? []); setError(''); } }
    catch (err) { if (isCurrent()) setError(err.message); }
    finally { if (isCurrent() && !silent) setLoading(false); }
  }, [userId, visible]);
  useLiveRefresh(load, { enabled: visible && !!userId, identity: userId });
  async function restore(task) {
    if (busyRef.current) return;
    busyRef.current = true; setBusyId(task.id); setError('');
    try {
      await restoreTask(userId, task.id);
      setItems(current => current.filter(item => item.id !== task.id));
      await load(); onChanged();
    } catch (err) { setError(`Không thể khôi phục: ${err.message}`); }
    finally { busyRef.current = false; setBusyId(null); }
  }
  function remove(task) {
    if (busyRef.current) return;
    confirmAction({
      title: 'Xóa vĩnh viễn?', message: `“${task.tieuDe}” sẽ bị xóa hẳn và không thể khôi phục.`,
      confirmText: 'Xóa vĩnh viễn', destructive: true,
      onConfirm: async () => {
        if (busyRef.current) return;
        busyRef.current = true; setBusyId(task.id); setError('');
        try {
          await permanentlyDeleteTask(userId, task.id);
          setItems(current => current.filter(item => item.id !== task.id));
          await load(); onChanged();
        } catch (err) { setError(`Không thể xóa: ${err.message}`); }
        finally { busyRef.current = false; setBusyId(null); }
      },
    });
  }
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000070' }}>
      <View style={{ maxHeight: '88%', minHeight: '55%', backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><View style={{ flex: 1 }}><Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>Thùng rác</Text><Text style={{ color: theme.muted, marginTop: 3, lineHeight: 20 }}>Giữ công việc trong 30 ngày kể từ khi xóa. Khôi phục để đưa về danh sách.</Text></View><TouchableOpacity accessibilityLabel="Đóng thùng rác" onPress={onClose} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={26} color={theme.text} /></TouchableOpacity></View>
        {loading && <ActivityIndicator color={theme.primary} />}
        {!!error && <View><Text style={{ color: theme.danger }}>{error}</Text><TouchableOpacity onPress={() => load()}><Text style={{ color: theme.notice, paddingVertical: 10 }}>Thử lại</Text></TouchableOpacity></View>}
        {!loading && !error && !items.length && <View style={{ alignItems: 'center', paddingVertical: 50 }}><Ionicons name="trash-outline" size={44} color={theme.muted} /><Text style={{ color: theme.muted, marginTop: 12 }}>Thùng rác đang trống.</Text></View>}
        <ScrollView contentContainerStyle={{ gap: 10 }}>{items.map(task => {
          const deleteAt = new Date(new Date(task.ngayXoa).getTime() + 30 * 86400000);
          return <View key={task.id} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, backgroundColor: theme.background, gap: 8 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{task.tieuDe}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>Xóa vĩnh viễn sau {deleteAt.toLocaleDateString('vi-VN')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}><TouchableOpacity accessibilityRole="button" disabled={busyId !== null} onPress={() => restore(task)} style={{ flex: 1, minHeight: 44, justifyContent: 'center', backgroundColor: theme.primary, padding: 10, borderRadius: 10, opacity: busyId !== null ? 0.55 : 1 }}><Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '700' }}>{busyId === task.id ? 'Đang xử lý…' : 'Khôi phục'}</Text></TouchableOpacity><TouchableOpacity accessibilityRole="button" disabled={busyId !== null} onPress={() => remove(task)} style={{ minHeight: 44, justifyContent: 'center', padding: 10, opacity: busyId !== null ? 0.55 : 1 }}><Text style={{ color: theme.danger, fontWeight: '700' }}>Xóa hẳn</Text></TouchableOpacity></View>
          </View>;
        })}</ScrollView>
      </View>
    </View>
  </Modal>;
}
