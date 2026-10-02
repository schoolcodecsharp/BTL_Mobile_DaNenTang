import { useCallback, useState } from 'react';
import { useFocusEffect, useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthSession } from '@/components/auth-session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTasks } from '@/lib/tasks-api';
import { dayKey, monthCells, tasksForDay } from '@/lib/calendar.cjs';

const labels = { CHUA_LAM: 'Chưa làm', DANG_LAM: 'Đang làm', HOAN_THANH: 'Hoàn thành', QUA_HAN: 'Quá hạn' };
export default function CalendarScreen() {
  const { user } = useAuthSession();
  const router = useRouter();
  const dark = useColorScheme() === 'dark';
  const theme = { background: dark ? '#0B1120' : '#F7F8FC', surface: dark ? '#151E31' : '#FFFFFF', text: dark ? '#F8FAFC' : '#172033', muted: dark ? '#91A0B7' : '#6B7280', border: dark ? '#25324A' : '#E8ECF3', primary: '#5B5CE2' };
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => dayKey(new Date()));
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  useFocusEffect(useCallback(() => {
    let active = true;
    if (user?.id) {
      setLoading(true); setError('');
      getTasks(user.id).then(data => { if (active) setTasks(data ?? []); })
        .catch(err => { if (active) setError(err.message); })
        .finally(() => { if (active) setLoading(false); });
    }
    return () => { active = false; };
  }, [user]));
  async function reload() {
    if (!user?.id) return;
    setLoading(true); setError('');
    try { setTasks(await getTasks(user.id) ?? []); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }
  function move(delta) {
    const next = new Date(month.getFullYear(), month.getMonth() + delta, 1);
    setMonth(next); setSelected(dayKey(next));
  }
  const today = dayKey(new Date());
  const daily = tasksForDay(tasks, selected);
  const counts = tasks.reduce((result, task) => {
    const key = dayKey(task.hanHoanThanh);
    if (key) result[key] = (result[key] || 0) + 1;
    return result;
  }, {});
  return <SafeAreaView style={{ flex: 1, backgroundColor: theme.background }} edges={['top']}>
    <ScrollView contentContainerStyle={{ padding: 20, gap: 18, paddingBottom: 40 }} refreshControl={<RefreshControl refreshing={loading} onRefresh={reload} />}>
      <Text style={{ color: theme.text, fontSize: 27, fontWeight: '800' }}>Lịch công việc</Text>
      <Text style={{ color: theme.muted }}>Theo dõi hạn hoàn thành công việc cá nhân.</Text>
      <View style={{ backgroundColor: theme.surface, borderRadius: 20, padding: 12, gap: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
          <Pressable accessibilityLabel="Tháng trước" onPress={() => move(-1)} style={{ padding: 10 }}><Ionicons name="chevron-back" color={theme.text} size={24} /></Pressable>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 18 }}>Tháng {month.getMonth() + 1}/{month.getFullYear()}</Text>
          <Pressable accessibilityLabel="Tháng sau" onPress={() => move(1)} style={{ padding: 10 }}><Ionicons name="chevron-forward" color={theme.text} size={24} /></Pressable>
        </View>
        <View style={{ flexDirection: 'row' }}>{['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'].map(label => <Text key={label} style={{ width: `${100 / 7}%`, textAlign: 'center', color: theme.muted }}>{label}</Text>)}</View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>{monthCells(month.getFullYear(), month.getMonth()).map((date, index) => {
          const key = dayKey(date);
          const active = key === selected;
          return <View key={index} style={{ width: `${100 / 7}%`, padding: 2 }}>
            {date && <Pressable accessibilityRole="button" accessibilityLabel={`${date.toLocaleDateString('vi-VN')}, ${counts[key] || 0} công việc`} accessibilityState={{ selected: active }} onPress={() => setSelected(key)} style={{ height: 50, alignItems: 'center', justifyContent: 'center', gap: 4, borderRadius: 12, backgroundColor: active ? theme.primary : theme.surface, borderWidth: 1, borderColor: key === today ? theme.primary : 'transparent' }}>
              <Text style={{ color: active ? '#FFFFFF' : theme.text, fontWeight: '600' }}>{date.getDate()}</Text>
              <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: counts[key] ? active ? '#FFFFFF' : theme.primary : 'transparent' }} />
            </Pressable>}
          </View>;
        })}</View>
        <Pressable onPress={() => { const now = new Date(); setMonth(new Date(now.getFullYear(), now.getMonth(), 1)); setSelected(dayKey(now)); }}><Text style={{ color: theme.primary, textAlign: 'center', padding: 8 }}>Về hôm nay</Text></Pressable>
      </View>
      {!!error && <View><Text accessibilityRole="alert" style={{ color: '#E11D48' }}>{error}</Text><Pressable onPress={reload}><Text style={{ color: theme.primary, padding: 10 }}>Thử lại</Text></Pressable></View>}
      <Text style={{ color: theme.text, fontSize: 18, fontWeight: '700' }}>Ngày {selected?.split('-').reverse().join('/')} · {daily.length} việc</Text>
      {loading && <ActivityIndicator color={theme.primary} />}
      {!loading && !error && daily.length === 0 && <Text style={{ color: theme.muted }}>Không có công việc đến hạn trong ngày này.</Text>}
      {daily.map(task => {
        const overdue = task.trangThai !== 'HOAN_THANH' && new Date(task.hanHoanThanh) < new Date();
        return <Pressable key={task.id} onPress={() => router.push({ pathname: '/(tabs)/tasks', params: { taskId: task.id } })} style={{ padding: 16, borderRadius: 16, backgroundColor: theme.surface, borderWidth: 1, borderColor: overdue ? '#EF4444' : theme.border, gap: 8 }}>
          <Text style={{ color: theme.text, fontWeight: '700', fontSize: 16 }}>{task.tieuDe}</Text>
          <Text style={{ color: overdue ? '#EF4444' : theme.muted }}>{new Date(task.hanHoanThanh).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} · {overdue ? 'Quá hạn' : labels[task.trangThai] || task.trangThai}</Text>
        </Pressable>;
      })}
      <Text style={{ color: theme.muted, fontSize: 12 }}>{tasks.filter(task => !dayKey(task.hanHoanThanh)).length} công việc chưa đặt deadline. Chúng vẫn nằm trong tab Công việc.</Text>
    </ScrollView>
  </SafeAreaView>;
}
