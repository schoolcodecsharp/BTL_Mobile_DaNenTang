import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/components/auth-session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTask, updateTask } from '@/lib/tasks-api';
import { getGroupTasks, getTeamDetail, updateGroupTaskStatus } from '@/lib/teams-api';
import { STATUS_ACTIONS, formatTaskDeadline, notifyTaskChanged, parseTaskId,
  personalTaskStatusPayload } from '@/lib/task-detail.cjs';

export default function TaskDetailScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const { user } = useAuthSession();
  const userId = user?.id;
  const isDark = useColorScheme() === 'dark';
  const taskId = parseTaskId(params.id);
  const teamId = params.teamId === undefined ? null : parseTaskId(params.teamId);
  const invalidLink = !taskId || (params.teamId !== undefined && !teamId);
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const mounted = useRef(false);
  const loadRevision = useRef(0);
  const writePending = useRef(false);

  const theme = {
    background: isDark ? '#0B1120' : '#F7F8FC', surface: isDark ? '#151E31' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#172033', muted: isDark ? '#A3B1C6' : '#647084',
    border: isDark ? '#334155' : '#DCE2EB', primary: '#5B5CE2',
    error: isDark ? '#FDA4AF' : '#BE123C', feedback: isDark ? '#A5B4FC' : '#4849BA',
    skeleton: isDark ? '#25324A' : '#E8ECF3',
  };

  const loadDetail = useCallback(async () => {
    const revision = ++loadRevision.current;
    const isCurrent = () => mounted.current && revision === loadRevision.current;
    setLoading(true); setError(''); setTask(null);
    try {
      if (!userId) throw new Error('Bạn cần đăng nhập để xem công việc.');
      if (invalidLink) throw new Error('Liên kết công việc không hợp lệ. Quay lại Trang chủ để chọn lại.');
      let detail;
      if (teamId) {
        const [team, list] = await Promise.all([getTeamDetail(teamId), getGroupTasks(teamId, userId)]);
        const found = (list ?? []).find(item => item.id === taskId);
        if (!found) throw new Error('Công việc không còn tồn tại hoặc bạn không có quyền xem.');
        detail = { ...found, teamId,
          canChangeStatus: team.truongNhomId === userId || found.nguoiNhanId === userId };
      } else {
        detail = await getTask(userId, taskId);
        if (!detail) throw new Error('Không tìm thấy công việc. Công việc có thể đã được chuyển vào Thùng rác.');
      }
      if (isCurrent()) setTask(detail);
    } catch (err) {
      if (isCurrent()) setError(err.status === 404
        ? 'Không tìm thấy công việc. Công việc có thể đã được chuyển vào Thùng rác.'
        : err.message || 'Chưa tải được chi tiết. Vui lòng thử lại.');
    } finally {
      if (isCurrent()) setLoading(false);
    }
  }, [invalidLink, taskId, teamId, userId]);

  useEffect(() => {
    mounted.current = true;
    const timer = setTimeout(() => { void loadDetail(); }, 0);
    return () => { clearTimeout(timer); mounted.current = false; loadRevision.current += 1; };
  }, [loadDetail]);

  async function changeStatus(status) {
    if (!user?.id || !task || writePending.current ||
      (task.teamId && !task.canChangeStatus) || task.trangThai === status) return;
    writePending.current = true;
    const revision = loadRevision.current;
    const isCurrent = () => mounted.current && revision === loadRevision.current;
    setSaving(true); setError('');
    try {
      if (task.teamId) {
        await updateGroupTaskStatus(task.teamId, task.id, { userId: user.id, trangThai: status });
      } else {
        await updateTask(user.id, task.id, personalTaskStatusPayload(task, status));
      }
      // Notify even if this screen was closed during the request.
      notifyTaskChanged();
      if (isCurrent()) {
        setTask(current => ({ ...current, trangThai: status }));
        // Only return after saving, and do not interrupt a user who already
        // left this screen while the request was pending. Reuse Home when it
        // is in the stack, or replace a directly opened detail route.
        if (navigation.isFocused()) router.dismissTo('/(tabs)/home');
      }
    } catch (err) {
      if (isCurrent()) setError(err.message || 'Chưa đổi được trạng thái. Vui lòng thử lại.');
    } finally {
      writePending.current = false;
      if (mounted.current) setSaving(false);
    }
  }

  const goBack = () => router.canGoBack() ? router.back() : router.replace('/(tabs)/home');
  const readOnly = Boolean(task?.teamId && !task.canChangeStatus);

  return <SafeAreaView edges={['top', 'bottom', 'left', 'right']}
    style={[styles.screen, { backgroundColor: theme.background }]}>
    <View style={[styles.header, { borderBottomColor: theme.border }]}>
      <Pressable accessibilityRole="button" accessibilityLabel="Quay lại Trang chủ"
        onPress={goBack} style={({ pressed }) => [styles.back, { opacity: pressed ? 0.6 : 1 }]}>
        <Ionicons name="arrow-back" size={24} color={theme.text} />
      </Pressable>
      <Text accessibilityRole="header" style={[styles.screenTitle, { color: theme.text }]}>Chi tiết công việc</Text>
    </View>
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <View style={styles.content}>
        {loading && <View accessibilityLabel="Đang tải chi tiết công việc" style={styles.loading}>
          {[34, 18, 18, 18].map((height, index) => <View key={index}
            style={{ height, width: index === 3 ? '60%' : '100%', backgroundColor: theme.skeleton, borderRadius: 6 }} />)}
          <Text style={{ color: theme.muted }}>Đang tải chi tiết…</Text>
        </View>}
        {!loading && task && <>
          <Text selectable accessibilityRole="header" style={[styles.taskTitle, { color: theme.text }]}>{task.tieuDe}</Text>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.muted }]}>Mô tả công việc</Text>
            <Text selectable style={[styles.description, { color: theme.text }]}>{task.moTa?.trim() ? task.moTa : 'Chưa có mô tả.'}</Text>
          </View>
          <View style={styles.field}>
            <Text style={[styles.label, { color: theme.muted }]}>Hạn hoàn thành</Text>
            <Text selectable style={[styles.deadline, { color: theme.text }]}>{formatTaskDeadline(task.hanHoanThanh)}</Text>
          </View>
          <View style={[styles.actions, { borderTopColor: theme.border }]}>
            {STATUS_ACTIONS.map(action => {
              const selected = task.trangThai === action.value;
              const disabled = saving || readOnly;
              const foreground = selected ? '#FFFFFF' : theme.text;
              return <Pressable key={action.value} accessibilityRole="button" accessibilityLabel={action.label}
                aria-pressed={selected}
                accessibilityState={{ selected, disabled }} disabled={disabled} onPress={() => void changeStatus(action.value)}
                style={({ pressed }) => [styles.statusButton, { backgroundColor: selected ? theme.primary : theme.surface,
                  borderColor: selected ? theme.primary : theme.border, opacity: disabled ? 0.55 : pressed ? 0.75 : 1 }]}>
                <Ionicons name={action.icon} size={21} color={foreground} />
                <Text style={[styles.buttonLabel, { color: foreground }]}>{action.label}</Text>
                {selected && <Ionicons name="checkmark" size={20} color={foreground} />}
              </Pressable>;
            })}
          </View>
          {readOnly && <Text style={[styles.feedback, { color: theme.muted }]}>Chỉ trưởng nhóm hoặc người được giao việc được đổi trạng thái.</Text>}
          {saving && <Text accessibilityLiveRegion="polite" style={[styles.feedback, { color: theme.muted }]}>Đang lưu trạng thái…</Text>}
        </>}
        {!!error && <View accessibilityRole="alert" style={styles.error}>
          <Text style={[styles.feedback, { color: theme.error }]}>{error}</Text>
          {!task && !loading && !invalidLink && user?.id && <Pressable accessibilityRole="button" onPress={() => void loadDetail()}
            style={styles.retry}><Text style={{ color: theme.feedback, fontWeight: '700' }}>Thử lại</Text></Pressable>}
        </View>}
      </View>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingVertical: 8, borderBottomWidth: 1 },
  back: { width: 48, height: 48, alignItems: 'center', justifyContent: 'center' },
  screenTitle: { flex: 1, fontSize: 20, fontWeight: '700' },
  scrollContent: { flexGrow: 1, padding: 20, paddingBottom: 32 },
  content: { width: '100%', maxWidth: 680, alignSelf: 'center' },
  taskTitle: { fontSize: 25, lineHeight: 34, fontWeight: '800', marginBottom: 28 },
  field: { gap: 8, marginBottom: 26 },
  label: { fontSize: 13, lineHeight: 20, fontWeight: '600' },
  description: { fontSize: 16, lineHeight: 25 },
  deadline: { fontSize: 16, lineHeight: 24, fontWeight: '600' },
  actions: { gap: 12, borderTopWidth: 1, paddingTop: 24 },
  statusButton: { minHeight: 52, borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  buttonLabel: { flex: 1, fontSize: 15, lineHeight: 22, fontWeight: '700' },
  feedback: { fontSize: 14, lineHeight: 22, marginTop: 14 },
  error: { marginTop: 6 },
  retry: { minHeight: 48, alignSelf: 'flex-start', justifyContent: 'center', paddingHorizontal: 12 },
  loading: { gap: 18 },
});
