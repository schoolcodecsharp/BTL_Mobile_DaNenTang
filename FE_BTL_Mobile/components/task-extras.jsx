import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, Text, TextInput, View } from 'react-native';
import { apiFetch } from '@/lib/api';

// Mount per task so requests and drafts cannot carry over between tasks.
export function TaskExtras({ path, theme, userId, isLeader = false }) {
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
  return <View style={{ gap: 12, marginVertical: 18 }}>
    <Text style={{ color: theme.text, fontWeight: '700', fontSize: 17 }}>Bình luận nhóm</Text>
    {<Pressable accessibilityRole="button" disabled={busy || loading} onPress={load}><Text style={{ color: theme.primary, paddingVertical: 6 }}>Làm mới bình luận</Text></Pressable>}
    {loading && <ActivityIndicator color={theme.primary} />}
    {!!error && <View><Text accessibilityRole="alert" style={{ color: '#E11D48' }}>{error}</Text><Pressable disabled={busy} onPress={load}><Text style={{ color: theme.primary, paddingVertical: 8 }}>Thử tải lại</Text></Pressable></View>}
    {!loading && !error && items.length === 0 && <Text style={{ color: theme.muted }}>Chưa có bình luận. Bắt đầu trao đổi tại đây.</Text>}
    {items.map(item => <View key={item.id} style={{ padding: 12, borderRadius: 12, borderWidth: 1, borderColor: theme.border, backgroundColor: theme.background, gap: 6 }}>
      <>
        <Text style={{ color: theme.text, fontWeight: '700' }}>{item.tacGia?.hoTen || item.tacGia?.tenDangNhap || 'Thành viên'}</Text>
        <Text style={{ color: theme.muted, fontSize: 12 }}>{new Date(item.ngayTao).toLocaleString('vi-VN')}</Text>
        <Text style={{ color: theme.text }}>{item.noiDung}</Text>
      </>
      {(item.nguoiDungId === userId || isLeader) && <Pressable disabled={busy} onPress={() => Alert.alert('Xóa bình luận?', item.noiDung, [{ text: 'Hủy', style: 'cancel' }, { text: 'Xóa', style: 'destructive', onPress: () => mutate(`/${item.id}`, 'DELETE') }])}>
        <Text style={{ color: '#E11D48', paddingVertical: 6 }}>Xóa</Text>
      </Pressable>}
    </View>)}
    <TextInput accessibilityLabel="Nội dung bình luận" placeholder="Viết bình luận…" placeholderTextColor={theme.muted} value={draft} onChangeText={setDraft} multiline maxLength={2000} editable={!busy} style={{ color: theme.text, borderColor: theme.border, borderWidth: 1, borderRadius: 12, padding: 12 }} />
    <Pressable accessibilityRole="button" disabled={busy || loading || !draft.trim()} onPress={() => mutate('', 'POST', { noiDung: draft.trim() })} style={{ backgroundColor: theme.primary, opacity: busy || loading || !draft.trim() ? 0.45 : 1, borderRadius: 12, padding: 12 }}><Text style={{ color: '#FFFFFF', textAlign: 'center', fontWeight: '700' }}>{busy ? 'Đang lưu…' : 'Gửi bình luận'}</Text></Pressable>
  </View>;
}
