import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/components/auth-session';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTasks, updateTask } from '@/lib/tasks-api';

const FILTERS = ['Tất cả', 'Chưa làm', 'Đã xong'];

const PRIORITY_COLORS = {
  CAO: '#EF4444',
  TRUNG_BINH: '#F59E0B',
  THAP: '#10B981',
};

const PRIORITY_LABELS = {
  CAO: 'Cao',
  TRUNG_BINH: 'Vừa',
  THAP: 'Thấp',
};

function getTodayLabel() {
  const value = new Intl.DateTimeFormat('vi-VN', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date());
  return value.charAt(0).toUpperCase() + value.slice(1);
}

export default function HomeScreen() {
  const isDark = useColorScheme() === 'dark';
  const { user } = useAuthSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('Tất cả');
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const theme = {
    background: isDark ? '#0B1120' : '#F7F8FC',
    surface: isDark ? '#151E31' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#172033',
    muted: isDark ? '#91A0B7' : '#6B7280',
    border: isDark ? '#25324A' : '#E8ECF3',
    primary: '#5B5CE2',
  };

  const fetchTasks = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    isRefresh ? setRefreshing(true) : setLoading(true);
    setError('');
    try {
      const data = await getTasks(user.id);
      setTasks(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => { fetchTasks(); }, [fetchTasks]);

  const toggleTask = async (task) => {
    if (!user?.id) return;
    const newStatus = task.trangThai === 'HOAN_THANH' ? 'CHUA_LAM' : 'HOAN_THANH';
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, trangThai: newStatus } : t));
    void Haptics.selectionAsync().catch(() => {});
    try {
      await updateTask(user.id, task.id, {
        title: task.tieuDe,
        description: task.moTa,
        priority: task.mucDoUuTien,
        status: newStatus,
        categoryId: task.danhMucId,
      });
    } catch {
      // Revert on error
      setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, trangThai: task.trangThai } : t));
    }
  };

  const displayName = user?.fullName?.trim() || user?.username || 'Bạn';
  const completed = tasks.filter((t) => t.trangThai === 'HOAN_THANH').length;
  const progress = tasks.length ? Math.round((completed / tasks.length) * 100) : 0;

  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const done = task.trangThai === 'HOAN_THANH';
    const matchesFilter = filter === 'Tất cả' || (filter === 'Đã xong' ? done : !done);
    return matchesFilter && task.tieuDe.toLowerCase().includes(search.trim().toLowerCase());
  }), [filter, search, tasks]);

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTasks(true)} tintColor={theme.primary} />}>

        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.muted }]}>{getTodayLabel()}</Text>
            <Text style={[styles.greeting, { color: theme.text }]}>Xin chào, {displayName}! 👋</Text>
          </View>
          <TouchableOpacity
            accessibilityLabel="Thông báo"
            activeOpacity={0.75}
            onPress={() => Alert.alert('Thông báo', 'Bạn không có thông báo mới.')}
            style={[styles.iconButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="notifications-outline" size={23} color={theme.text} />
            <View style={styles.notificationDot} />
          </TouchableOpacity>
        </View>

        {/* Progress Card */}
        <View style={styles.heroCard}>
          <View style={styles.heroGlow} />
          <View style={styles.heroTop}>
            <View style={styles.heroCopy}>
              <Text style={styles.heroLabel}>TIẾN ĐỘ HÔM NAY</Text>
              <Text style={styles.heroTitle}>
                {progress >= 100 ? '🎉 Hoàn thành tất cả!' : progress >= 50 ? 'Bạn đang làm rất tốt!' : 'Cố lên nhé!'}
              </Text>
              <Text style={styles.heroSubtitle}>{completed}/{tasks.length} công việc đã hoàn thành</Text>
            </View>
            <View style={styles.progressCircle}>
              <Text style={styles.progressValue}>{progress}%</Text>
            </View>
          </View>
          <View style={styles.progressTrack}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        {/* Summary */}
        <View style={styles.summaryRow}>
          <SummaryCard icon="time-outline" iconColor="#6366F1" iconBackground={isDark ? '#312E81' : '#EEF2FF'} value={tasks.length - completed} label="Đang chờ" theme={theme} />
          <SummaryCard icon="checkmark-done" iconColor="#10B981" iconBackground={isDark ? '#064E3B' : '#ECFDF5'} value={completed} label="Hoàn thành" theme={theme} />
        </View>

        {/* Search */}
        <View style={[styles.searchBox, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="search-outline" size={21} color={theme.muted} />
          <TextInput
            value={search} onChangeText={setSearch}
            placeholder="Tìm kiếm công việc..."
            placeholderTextColor={theme.muted}
            style={[styles.searchInput, { color: theme.text }]} />
          {!!search && <Pressable onPress={() => setSearch('')}><Ionicons name="close-circle" size={19} color={theme.muted} /></Pressable>}
        </View>

        {/* Section header */}
        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Công việc hôm nay</Text>
            <Text style={[styles.sectionSubtitle, { color: theme.muted }]}>{visibleTasks.length} công việc được hiển thị</Text>
          </View>
        </View>

        {/* Filters */}
        <View style={styles.filters}>
          {FILTERS.map((item) => {
            const active = filter === item;
            return (
              <TouchableOpacity key={item} onPress={() => setFilter(item)}
                style={[styles.filterChip, { backgroundColor: active ? theme.primary : theme.surface, borderColor: active ? theme.primary : theme.border }]}>
                <Text style={[styles.filterText, { color: active ? '#FFFFFF' : theme.muted }]}>{item}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Error */}
        {!!error && (
          <View style={[styles.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FFF1F2', borderColor: '#FECDD3' }]}>
            <Ionicons name="alert-circle-outline" size={18} color="#E11D48" />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        {/* Loading */}
        {loading && !refreshing && (
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color={theme.primary} />
            <Text style={[styles.loadingText, { color: theme.muted }]}>Đang tải công việc...</Text>
          </View>
        )}

        {/* Task list */}
        {!loading && (
          <View style={styles.taskList}>
            {visibleTasks.map((task) => {
              const done = task.trangThai === 'HOAN_THANH';
              const color = PRIORITY_COLORS[task.mucDoUuTien] ?? '#6366F1';
              const priorityLabel = PRIORITY_LABELS[task.mucDoUuTien] ?? task.mucDoUuTien;
              const hasFiles = task.fileDinhKem?.length > 0;
              return (
                <TouchableOpacity
                  activeOpacity={0.78} key={task.id}
                  onPress={() => toggleTask(task)}
                  style={[styles.taskCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.categoryBar, { backgroundColor: color }]} />
                  <View style={[styles.checkButton, { borderColor: done ? '#10B981' : theme.border, backgroundColor: done ? '#10B981' : 'transparent' }]}>
                    {done && <Ionicons name="checkmark" size={15} color="#FFFFFF" />}
                  </View>
                  <View style={styles.taskBody}>
                    <Text numberOfLines={1} style={[styles.taskTitle, { color: theme.text }, done && { color: theme.muted, textDecorationLine: 'line-through' }]}>
                      {task.tieuDe}
                    </Text>
                    <View style={styles.taskMeta}>
                      {task.hanHoanThanh && (
                        <>
                          <Ionicons name="time-outline" size={13} color={theme.muted} />
                          <Text style={[styles.taskMetaText, { color: theme.muted }]}>
                            {new Date(task.hanHoanThanh).toLocaleDateString('vi-VN')}
                          </Text>
                          <View style={styles.metaDot} />
                        </>
                      )}
                      {task.danhMuc && (
                        <>
                          <View style={[styles.categoryDot, { backgroundColor: task.danhMuc.mauSac ?? color }]} />
                          <Text style={[styles.taskMetaText, { color: theme.muted }]}>{task.danhMuc.tenDanhMuc}</Text>
                        </>
                      )}
                      {hasFiles && (
                        <>
                          <View style={styles.metaDot} />
                          <Ionicons name="attach-outline" size={13} color={theme.muted} />
                          <Text style={[styles.taskMetaText, { color: theme.muted }]}>{task.fileDinhKem.length}</Text>
                        </>
                      )}
                    </View>
                  </View>
                  <View style={[styles.priorityBadge, { backgroundColor: `${color}18` }]}>
                    <Text style={[styles.priorityText, { color }]}>{priorityLabel}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
            {!visibleTasks.length && !loading && (
              <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="file-tray-outline" size={38} color={theme.muted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Không tìm thấy công việc</Text>
                <Text style={[styles.emptyText, { color: theme.muted }]}>
                  {!user ? 'Đăng nhập để xem công việc của bạn.' : 'Thử đổi bộ lọc hoặc từ khóa tìm kiếm.'}
                </Text>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function SummaryCard({ icon, iconColor, iconBackground, value, label, theme }) {
  return (
    <View style={[styles.summaryCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
      <View style={[styles.summaryIcon, { backgroundColor: iconBackground }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <View>
        <Text style={[styles.summaryNumber, { color: theme.text }]}>{value}</Text>
        <Text style={[styles.summaryLabel, { color: theme.muted }]}>{label}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 116 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 22 },
  eyebrow: { fontSize: 13, fontWeight: '600', marginBottom: 5 },
  greeting: { fontSize: 24, fontWeight: '800', letterSpacing: -0.6 },
  iconButton: { width: 46, height: 46, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  notificationDot: { position: 'absolute', width: 8, height: 8, borderRadius: 4, right: 10, top: 9, backgroundColor: '#F43F5E', borderWidth: 1.5, borderColor: '#FFFFFF' },
  heroCard: { backgroundColor: '#5957DB', borderRadius: 24, padding: 20, overflow: 'hidden', marginBottom: 14, shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.24, shadowRadius: 16, elevation: 5 },
  heroGlow: { position: 'absolute', width: 180, height: 180, borderRadius: 90, backgroundColor: 'rgba(255,255,255,0.10)', right: -48, top: -92 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroCopy: { flex: 1, paddingRight: 14 },
  heroLabel: { color: '#DADAFE', fontSize: 11, fontWeight: '800', letterSpacing: 1.2, marginBottom: 7 },
  heroTitle: { color: '#FFFFFF', fontSize: 21, fontWeight: '800', marginBottom: 5 },
  heroSubtitle: { color: '#E0E7FF', fontSize: 13 },
  progressCircle: { width: 65, height: 65, borderRadius: 33, borderWidth: 6, borderColor: 'rgba(255,255,255,0.28)', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.10)' },
  progressValue: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
  progressTrack: { marginTop: 18, height: 6, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.22)', overflow: 'hidden' },
  progressFill: { height: '100%', borderRadius: 4, backgroundColor: '#FFFFFF' },
  summaryRow: { flexDirection: 'row', gap: 12, marginBottom: 18 },
  summaryCard: { flex: 1, borderWidth: 1, borderRadius: 18, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  summaryIcon: { width: 40, height: 40, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  summaryNumber: { fontSize: 19, fontWeight: '800' },
  summaryLabel: { fontSize: 11.5, marginTop: 1 },
  searchBox: { height: 50, borderRadius: 15, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, marginBottom: 24 },
  searchInput: { flex: 1, fontSize: 14, paddingHorizontal: 10, paddingVertical: 0 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  sectionTitle: { fontSize: 19, fontWeight: '800', letterSpacing: -0.25 },
  sectionSubtitle: { fontSize: 12, marginTop: 3 },
  filters: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  filterChip: { borderRadius: 20, borderWidth: 1, paddingHorizontal: 15, paddingVertical: 8 },
  filterText: { fontSize: 12.5, fontWeight: '700' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 14 },
  errorText: { color: '#E11D48', fontSize: 13, flex: 1 },
  loadingBox: { alignItems: 'center', paddingVertical: 40, gap: 12 },
  loadingText: { fontSize: 14 },
  taskList: { gap: 10 },
  taskCard: { minHeight: 76, borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 14, overflow: 'hidden' },
  categoryBar: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 4 },
  checkButton: { width: 25, height: 25, borderRadius: 8, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  taskBody: { flex: 1, minWidth: 0 },
  taskTitle: { fontSize: 14.5, fontWeight: '700', marginBottom: 7 },
  taskMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  taskMetaText: { fontSize: 11.5 },
  metaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: '#CBD5E1', marginHorizontal: 3 },
  categoryDot: { width: 6, height: 6, borderRadius: 3 },
  priorityBadge: { borderRadius: 9, paddingHorizontal: 8, paddingVertical: 5, marginLeft: 8 },
  priorityText: { fontSize: 10.5, fontWeight: '800' },
  emptyState: { alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 28 },
  emptyTitle: { fontSize: 15, fontWeight: '700', marginTop: 10 },
  emptyText: { fontSize: 12.5, marginTop: 4, textAlign: 'center' },
});
