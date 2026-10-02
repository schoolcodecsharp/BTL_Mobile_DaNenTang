import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Modal, ScrollView, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTrashTasks, permanentlyDeleteTask, restoreTask } from '@/lib/tasks-api';

export function TaskTrash({ visible, userId, theme, onClose, onChanged }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    if (!visible || !userId) return;
    setLoading(true); setError('');
    try { setItems(await getTrashTasks(userId) ?? []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [userId, visible]);
  useEffect(() => {
    if (!visible || !userId) return undefined;
    let active = true;
    const timer = setTimeout(() => {
      setLoading(true);
      setError('');
      getTrashTasks(userId)
        .then((data) => { if (active) setItems(data ?? []); })
        .catch((err) => { if (active) setError(err.message); })
        .finally(() => { if (active) setLoading(false); });
    }, 0);
    return () => { active = false; clearTimeout(timer); };
  }, [userId, visible]);
  async function restore(task) {
    try { await restoreTask(userId, task.id); await load(); onChanged(); }
    catch (err) { Alert.alert('Không thể khôi phục', err.message); }
  }
  function remove(task) {
    Alert.alert('Xóa vĩnh viễn?', `“${task.tieuDe}” sẽ không thể khôi phục.`, [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Xóa vĩnh viễn', style: 'destructive', onPress: async () => {
        try { await permanentlyDeleteTask(userId, task.id); await load(); onChanged(); }
        catch (err) { Alert.alert('Không thể xóa', err.message); }
      } },
    ]);
  }
  return <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
    <View style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: '#00000070' }}>
      <View style={{ maxHeight: '88%', minHeight: '55%', backgroundColor: theme.surface, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 20, paddingBottom: 36 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}><View><Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>Thùng rác</Text><Text style={{ color: theme.muted, marginTop: 3 }}>Tự xóa vĩnh viễn sau 30 ngày</Text></View><TouchableOpacity onPress={onClose}><Ionicons name="close" size={26} color={theme.text} /></TouchableOpacity></View>
        {loading && <ActivityIndicator color={theme.primary} />}
        {!!error && <View><Text style={{ color: '#E11D48' }}>{error}</Text><TouchableOpacity onPress={load}><Text style={{ color: theme.primary, paddingVertical: 10 }}>Thử lại</Text></TouchableOpacity></View>}
        {!loading && !error && !items.length && <View style={{ alignItems: 'center', paddingVertical: 50 }}><Ionicons name="trash-outline" size={44} color={theme.muted} /><Text style={{ color: theme.muted, marginTop: 12 }}>Thùng rác đang trống.</Text></View>}
        <ScrollView contentContainerStyle={{ gap: 10 }}>{items.map(task => {
          const deleteAt = new Date(new Date(task.ngayXoa).getTime() + 30 * 86400000);
          return <View key={task.id} style={{ borderWidth: 1, borderColor: theme.border, borderRadius: 14, padding: 14, backgroundColor: theme.background, gap: 8 }}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{task.tieuDe}</Text>
            <Text style={{ color: theme.muted, fontSize: 12 }}>Xóa vĩnh viễn sau {deleteAt.toLocaleDateString('vi-VN')}</Text>
            <View style={{ flexDirection: 'row', gap: 10 }}><TouchableOpacity onPress={() => restore(task)} style={{ flex: 1, backgroundColor: theme.primary, padding: 10, borderRadius: 10 }}><Text style={{ color: '#FFF', textAlign: 'center', fontWeight: '700' }}>Khôi phục</Text></TouchableOpacity><TouchableOpacity onPress={() => remove(task)} style={{ padding: 10 }}><Text style={{ color: '#E11D48', fontWeight: '700' }}>Xóa hẳn</Text></TouchableOpacity></View>
          </View>;
        })}</ScrollView>
      </View>
    </View>
  </Modal>;
}
