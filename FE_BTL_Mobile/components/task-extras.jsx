import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { apiFetch } from '@/lib/api';

// Mount per task so requests and drafts cannot carry over between tasks.
export function TaskExtras({ path, theme, comments = false, userId, isLeader = false }) {
  const [items, setItems] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setItems(await apiFetch(path)); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }, [path]);
  useEffect(() => {
    let active = true;
    apiFetch(path).then(data => { if (active) setItems(data); })
      .catch(err => { if (active) setError(err.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [path]);
  async function mutate(suffix, method, body) {
    setBusy(true); setError('');
    try {
      await apiFetch(path + suffix, { method, body });
      if (method === 'POST') setDraft('');
      await load();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }
  const done = items.filter(item => item.hoanThanh).length;
  return <View style={{ gap: 12, marginVertical: 18 }}>
    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 17 }}>{comments ? 'Bình luận nhóm' : `Checklist · ${done}/${items.length} bước`}</Text>
    {comments && <Pressable accessibilityRole="button" disabled={busy || loading} onPress={load}><Text style={{ color: theme.primary, paddingVertical: 6 }}>Làm mới bình luận</Text></Pressable>}
    {!comments && items.length > 0 && <View style={{ height: 6, backgroundColor: theme.border, borderRadius: 4 }}><View style={{ height: 6, borderRadius: 4, backgroundColor: theme.primary, width: `${done / items.length * 100}%` }} /></View>}
    {loading && <ActivityIndicator color={theme.primary} />}
    {!!error && <View><Text accessibilityRole="alert" style={{ color: '#E11D48' }}>{error}</Text><Pressable disabled={busy} onPress={load}><Text style={{ color: theme.primary, paddingVertical: 8 }}>Thử tải lại</Text></Pressable></View>}
    {!loading && !error && items.length === 0 && <Text style={{ color: theme.muted }}>{comments ? 'Chưa có bình luận. Bắt đầu trao đổi tại đây.' : 'Thêm các bước nhỏ để theo dõi tiến độ.'}</Text>}
    {items.map(item => <View key={item.id} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, gap: 6 }}>
      {comments ? <>
        <Text style={{ color: theme.text, fontWeight: '700' }}>{item.tacGia?.hoTen || item.tacGia?.tenDangNhap || 'Thành viên'}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{new Date(item.ngayTao).toLocaleString('vi-VN')}</Text>
        <Text style={{ color: theme.text }}>{item.noiDung}</Text>
      </> : <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: item.hoanThanh, disabled: busy }} disabled={busy} onPress={() => mutate(`/${item.id}`, 'PATCH', { hoanThanh: !item.hoanThanh })}>
        <Text style={{ color: theme.text, textDecorationLine: item.hoanThanh ? 'line-through' : 'none', paddingVertical: 6 }}>{item.hoanThanh ? '☑' : '☐'} {item.noiDung}</Text>
      </Pressable>}
      {(!comments || item.nguoiDungId === userId || isLeader) && <Pressable disabled={busy} onPress={() => Alert.alert(comments ? 'Xóa bình luận?' : 'Xóa bước công việc?', item.noiDung, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => mutate(`/${item.id}`, 'DELETE') }])}>
        <Text style={{ color: '#E11D48', paddingVertical: 6 }}>Xóa</Text>
      </Pressable>}
    </View>)}
    <TextInput accessibilityLabel={comments ? 'Nội dung bình luận' : 'Bước công việc mới'} placeholder={comments ? 'Viết bình luận…' : 'Thêm bước công việc…'} placeholderTextColor={theme.muted} value={draft} onChangeText={setDraft} multiline={comments} maxLength={comments ? 2000 : 200} editable={!busy} style={{ color: theme.text, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12 }} />
    <Pressable accessibilityRole="button" disabled={busy || loading || !draft.trim()} onPress={() => mutate('', 'POST', { noiDung: draft.trim() })} style={{ backgroundColor: theme.primary, opacity: busy || loading || !draft.trim() ? 0.45 : 1, borderRadius: 12, padding: 12 }}><Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }}>{busy ? 'Đang lưu…' : comments ? 'Gửi bình luận' : 'Thêm bước'}</Text></Pressable>
    {!comments && <Text style={{ color: theme.muted, fontSize: 12 }}>Các bước được lưu ngay. Trạng thái công việc được cập nhật riêng.</Text>}
  </View>;
}
