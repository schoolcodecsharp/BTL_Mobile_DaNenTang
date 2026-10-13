import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { KeyboardModalOverlay } from '@/components/keyboard-modal-overlay';
import { useAuthSession } from '@/components/auth-session';
import { FilePicker } from '@/components/file-picker';
import { KanbanBoard } from '@/components/kanban-board';
import { TaskDatePicker } from '@/components/task-date-picker';
import { TaskTrash } from '@/components/task-trash';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { DEFAULT_OFFSETS, REMINDER_OPTIONS } from '@/lib/reminder-plan.cjs';
import { createTask, deleteTask, getTasks, trashCompletedTasks, updateTask } from '@/lib/tasks-api';
import { confirmAction } from '@/lib/confirm-action';
import { isRecurringTask } from '@/lib/task-cohorts.cjs';
import { effectiveStatus } from '@/lib/task-status.cjs';
import { useLiveNow, useLiveRefresh } from '@/hooks/use-live-refresh';

const PRIORITY_OPTIONS = [
  { value: 'CAO', label: 'Cao', color: '#EF4444' },
  { value: 'TRUNG_BINH', label: 'Vừa', color: '#F59E0B' },
  { value: 'THAP', label: 'Thấp', color: '#10B981' },
];

const STATUS_OPTIONS = [
  { value: 'CHUA_LAM', label: 'Chưa làm' },
  { value: 'DANG_LAM', label: 'Đang làm' },
  { value: 'HOAN_THANH', label: 'Hoàn thành' },
  { value: 'QUA_HAN', label: 'Quá hạn' },
];

const STATUS_COLORS = {
  CHUA_LAM: '#6366F1',
  DANG_LAM: '#F59E0B',
  HOAN_THANH: '#10B981',
  QUA_HAN: '#EF4444',
};

const STATUS_LABELS = {
  CHUA_LAM: 'Chưa làm',
  DANG_LAM: 'Đang làm',
  HOAN_THANH: 'Hoàn thành',
  QUA_HAN: 'Quá hạn',
};

const RECURRENCE_OPTIONS = [
  { value: 'KHONG', label: 'Không lặp' },
  { value: 'HANG_NGAY', label: 'Hằng ngày' },
  { value: 'HANG_TUAN', label: 'Hằng tuần' },
  { value: 'HANG_THANG', label: 'Hằng tháng' },
];

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'TRUNG_BINH',
  status: 'CHUA_LAM',
  dueDay: null,     // Date object | null
  dueHour: '',      // "HH"
  dueMinute: '',    // "mm"
  categoryId: null,
  attachments: [],
  recurrence: 'KHONG',
  reminderOffsets: DEFAULT_OFFSETS,
};

export default function TasksScreen() {
  const { taskId } = useLocalSearchParams();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { user } = useAuthSession();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [viewMode, setViewMode] = useState('list');
  const [taskList, setTaskList] = useState('regular');
  const [movingId, setMovingId] = useState(null);
  const [showTrash, setShowTrash] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [deletingId, setDeletingId] = useState(null);
  const [cleaningCompleted, setCleaningCompleted] = useState(false);
  const [notice, setNotice] = useState('');
  const deletingRef = useRef(false);
  const now = useLiveNow();

  const theme = {
    background: isDark ? '#0B1120' : '#F7F8FC',
    surface: isDark ? '#151E31' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#172033',
    muted: isDark ? '#91A0B7' : '#6B7280',
    border: isDark ? '#25324A' : '#E8ECF3',
    primary: '#5B5CE2',
    iconBg: isDark ? '#282A62' : '#EEF2FF',
    separator: isDark ? '#25324A' : '#EFF1F5',
    danger: isDark ? '#FDA4AF' : '#BE123C',
    notice: isDark ? '#A5B4FC' : '#5B5CE2',
  };

  const fetchTasks = useCallback(async (isRefresh = false, silent = false, isCurrent = () => true) => {
    if (!user?.id) return;
    if (!silent) { if (isRefresh) setRefreshing(true); else setLoading(true); }
    try {
      const data = await getTasks(user.id);
      if (!isCurrent()) return;
      setTasks(data ?? []);
      setError('');
    } catch (err) {
      if (isCurrent()) setError(err.message);
    } finally {
      if (isCurrent() && !silent) { setLoading(false); setRefreshing(false); }
    }
  }, [user]);

  useLiveRefresh((silent, isCurrent) => fetchTasks(false, silent, isCurrent), { enabled: !!user?.id, identity: user?.id, listenToTaskChanges: true });

  function openCreate() {
    setShowDatePicker(false);
    setEditingTask(null);
    setForm({ ...EMPTY_FORM, recurrence: taskList === 'recurring' ? 'HANG_NGAY' : 'KHONG' });
    setFormError('');
    setShowModal(true);
  }

  const openEdit = useCallback((task) => {
    setShowDatePicker(false);
    setTaskList(task.lapLai && task.lapLai !== 'KHONG' ? 'recurring' : 'regular');
    setEditingTask(task);
    setForm({
      title: task.tieuDe,
      description: task.moTa ?? '',
      priority: task.mucDoUuTien ?? 'TRUNG_BINH',
      status: task.trangThai ?? 'CHUA_LAM',
      dueDay: task.hanHoanThanh ? new Date(task.hanHoanThanh) : null,
      dueHour: task.hanHoanThanh
        ? String(new Date(task.hanHoanThanh).getHours()).padStart(2, '0')
        : '',
      dueMinute: task.hanHoanThanh
        ? String(new Date(task.hanHoanThanh).getMinutes()).padStart(2, '0')
        : '',
      categoryId: task.danhMucId ?? null,
      attachments: task.fileDinhKem ?? [],
      recurrence: task.lapLai ?? 'KHONG',
      reminderOffsets: task.nhacTruoc ?? DEFAULT_OFFSETS,
    });
    setFormError('');
    setShowModal(true);
  }, []);

  useEffect(() => {
    if (!taskId || loading) return;
    const task = tasks.find((item) => String(item.id) === String(taskId));
    if (!task) return;
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      openEdit(task);
      router.setParams({ taskId: '' });
    });
    return () => { active = false; };
  }, [taskId, tasks, loading, router, openEdit]);

  function closeModal() {
    setShowDatePicker(false);
    setShowModal(false);
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError('Vui lòng nhập tiêu đề công việc.'); return; }
    if (!user?.id) { setFormError('Bạn cần đăng nhập để lưu công việc.'); return; }
    if (form.recurrence !== 'KHONG' && !form.dueDay) { setFormError('Công việc lặp lại cần có hạn hoàn thành.'); return; }
    if (form.dueHour !== '') {
      const h = parseInt(form.dueHour, 10);
      if (isNaN(h) || h < 0 || h > 23) {
        setFormError('Giờ phải nằm trong khoảng từ 00 đến 23.');
        return;
      }
    }
    if (form.dueMinute !== '') {
      const m = parseInt(form.dueMinute, 10);
      if (isNaN(m) || m < 0 || m > 59) {
        setFormError('Phút phải nằm trong khoảng từ 00 đến 59.');
        return;
      }
    }
    setSaving(true);
    setFormError('');
    try {
      const dueDate = (() => {
        if (!form.dueDay) return undefined;
        const d = new Date(form.dueDay);
        const h = parseInt(form.dueHour, 10);
        const m = parseInt(form.dueMinute, 10);
        d.setHours(!isNaN(h) ? h : 23, !isNaN(m) ? m : 59, 0, 0);
        return d.toISOString();
      })();
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        status: form.status,
        dueDate,
        categoryId: form.categoryId ?? undefined,
        attachments: form.attachments.length > 0 ? form.attachments : undefined,
        recurrence: form.recurrence,
        reminderOffsets: form.reminderOffsets,
      };
      if (editingTask) {
        await updateTask(user.id, editingTask.id, payload);
      } else {
        await createTask(user.id, payload);
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTaskList(form.recurrence === 'KHONG' ? 'regular' : 'recurring');
      closeModal();
      await fetchTasks();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleDelete(task) {
    if (!user?.id || deletingRef.current) return;
    confirmAction({
      title: 'Chuyển vào Thùng rác?',
      message: `“${task.tieuDe}” sẽ rời danh sách công việc. Bạn có thể khôi phục trong 30 ngày.`,
      confirmText: 'Chuyển vào Thùng rác',
      destructive: true,
      onConfirm: async () => {
        if (deletingRef.current) return;
        deletingRef.current = true; setDeletingId(task.id); setError(''); setNotice('');
        try {
          await deleteTask(user.id, task.id);
          setTasks(current => current.filter(item => item.id !== task.id));
          setNotice('Đã chuyển công việc vào Thùng rác.');
          await fetchTasks();
        } catch (err) {
          setError(err.message);
        } finally {
          deletingRef.current = false; setDeletingId(null);
        }
      },
    });
  }

  function handleCleanupCompleted() {
    if (!user?.id || deletingRef.current || !completedTasks.length) return;
    // Snapshot exactly what the user is confirming, not tasks completed later.
    const taskIds = completedTasks.map(task => task.id);
    confirmAction({
      title: 'Dọn công việc đã hoàn thành?',
      message: `Chuyển ${taskIds.length} công việc đã hoàn thành trong mục ${taskList === 'recurring' ? 'Lặp lại' : 'Công việc'} vào Thùng rác? Công việc chưa xong không bị ảnh hưởng. Bạn có thể khôi phục trong 30 ngày.`,
      confirmText: 'Chuyển vào Thùng rác',
      destructive: true,
      onConfirm: async () => {
        if (deletingRef.current) return;
        deletingRef.current = true; setCleaningCompleted(true); setError(''); setNotice('');
        try {
          const result = await trashCompletedTasks(user.id, taskIds);
          const moved = new Set(result.taskIds);
          setTasks(current => current.filter(task => !moved.has(task.id)));
          setNotice(result.movedCount
            ? `Đã chuyển ${result.movedCount} công việc vào Thùng rác. Có thể khôi phục trong 30 ngày.`
            : 'Không còn công việc phù hợp để dọn. Danh sách đã được cập nhật.');
          await fetchTasks();
        } catch (err) {
          setError(err.message);
        } finally {
          deletingRef.current = false; setCleaningCompleted(false);
        }
      },
    });
  }

  const handleMoveTask = useCallback(async (task, status) => {
    if (!user?.id || movingId) return;
    setMovingId(task.id);
    setTasks((current) => current.map(item => item.id === task.id ? { ...item, trangThai: status } : item));
    try {
      await updateTask(user.id, task.id, {
        title: task.tieuDe,
        description: task.moTa || undefined,
        priority: task.mucDoUuTien || 'TRUNG_BINH',
        status,
        categoryId: task.danhMucId || undefined,
        startDate: task.ngayBatDau || undefined,
        dueDate: task.hanHoanThanh || undefined,
        attachments: task.fileDinhKem ?? [],
        recurrence: task.lapLai || 'KHONG',
      });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      await fetchTasks();
    } catch (err) {
      await fetchTasks();
      Alert.alert('Không thể chuyển công việc', err.message);
    } finally {
      setMovingId(null);
    }
  }, [fetchTasks, movingId, user]);

  const recurringTasks = tasks.filter(isRecurringTask);
  const regularTasks = tasks.filter(task => !isRecurringTask(task));
  const selectedTasks = taskList === 'recurring' ? recurringTasks : regularTasks;
  const completedTasks = selectedTasks.filter(task => task.trangThai === 'HOAN_THANH');
  const listedTasks = selectedTasks.filter(task => statusFilter === 'all' ||
    (statusFilter === 'completed' ? task.trangThai === 'HOAN_THANH' : task.trangThai !== 'HOAN_THANH'));

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>CÁ NHÂN</Text>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Công việc của tôi</Text>
        </View>
      </View>
      <View style={[styles.taskToolbar, { gap: 8 }]}>
        {[
          ['regular', 'clipboard-outline', 'Công việc', regularTasks.length],
          ['recurring', 'repeat-outline', 'Lặp lại', recurringTasks.length],
        ].map(([value, icon, label, count]) => <TouchableOpacity key={value}
          accessibilityRole="tab" accessibilityState={{ selected: taskList === value }}
          onPress={() => setTaskList(value)}
          style={[styles.viewSwitchBtn, { flex: 1, borderRadius: 12, paddingVertical: 12,
            backgroundColor: taskList === value ? theme.primary : theme.surface }]}>
          <Ionicons name={icon} size={18} color={taskList === value ? '#FFFFFF' : theme.muted} />
          <Text style={{ color: taskList === value ? '#FFFFFF' : theme.text, fontWeight: '700' }}>{label} ({count})</Text>
        </TouchableOpacity>)}
      </View>
      <View style={styles.taskToolbar}>
        <View style={[styles.viewSwitch, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {[['list', 'list-outline', 'Danh sách'], ['kanban', 'grid-outline', 'Bảng']].map(([value, icon, label]) => <TouchableOpacity key={value} accessibilityState={{ selected: viewMode === value }} onPress={() => setViewMode(value)} style={[styles.viewSwitchBtn, viewMode === value && { backgroundColor: theme.primary }]}>
            <Ionicons name={icon} size={16} color={viewMode === value ? '#FFFFFF' : theme.muted} />
            <Text style={{ color: viewMode === value ? '#FFFFFF' : theme.muted, fontSize: 11, fontWeight: '700' }}>{label}</Text>
          </TouchableOpacity>)}
        </View>
        <TouchableOpacity accessibilityLabel="Mở thùng rác" onPress={() => setShowTrash(true)} style={[styles.trashButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <Ionicons name="trash-outline" size={20} color={theme.muted} />
          <Text style={{ color: theme.muted, fontSize: 12, fontWeight: '700' }}>Thùng rác</Text>
        </TouchableOpacity>
      </View>

      {viewMode === 'list' && <View style={styles.taskToolbar}>
        {[
          ['all', 'Tất cả', selectedTasks.length],
          ['open', 'Chưa xong', selectedTasks.length - completedTasks.length],
          ['completed', 'Hoàn thành', completedTasks.length],
        ].map(([value, label, count]) => <TouchableOpacity key={value}
          accessibilityRole="button" accessibilityState={{ selected: statusFilter === value }}
          onPress={() => { setStatusFilter(value); setNotice(''); }}
          style={[styles.statusFilter, { backgroundColor: statusFilter === value ? theme.primary : theme.surface }]}>
          <Text style={{ color: statusFilter === value ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: 12 }}>{label} ({count})</Text>
        </TouchableOpacity>)}
      </View>}
      {viewMode === 'list' && statusFilter === 'completed' && completedTasks.length > 0 && <View style={styles.taskToolbar}>
        <TouchableOpacity accessibilityRole="button" accessibilityLabel="Dọn công việc đã hoàn thành"
          disabled={cleaningCompleted || deletingId !== null || movingId !== null || loading}
          onPress={handleCleanupCompleted}
          style={[styles.cleanupButton, { backgroundColor: theme.surface, borderColor: theme.border,
            opacity: cleaningCompleted || deletingId !== null || movingId !== null || loading ? 0.55 : 1 }]}>
          {cleaningCompleted ? <ActivityIndicator size="small" color={theme.danger} /> : <Ionicons name="trash-outline" size={18} color={theme.danger} />}
          <Text style={{ color: theme.danger, fontWeight: '700', fontSize: 13 }}>{cleaningCompleted ? 'Đang chuyển…' : `Chuyển ${completedTasks.length} việc vào Thùng rác`}</Text>
        </TouchableOpacity>
      </View>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={[styles.taskNotice, { color: theme.notice }]}>{notice}</Text>}

      {/* Error */}
      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FFF1F2', borderColor: '#FECDD3', marginHorizontal: 20 }]}>
          <Ionicons name="alert-circle-outline" size={16} color="#E11D48" />
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

      {/* Task List */}
      {!loading && viewMode === 'kanban' && <KanbanBoard tasks={selectedTasks} now={now} theme={theme} onOpen={openEdit} onMove={handleMoveTask} movingId={movingId} refreshing={refreshing} onRefresh={() => fetchTasks(true)} />}
      {!loading && viewMode === 'list' && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTasks(true)} tintColor={theme.primary} />}>
          {listedTasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="clipboard-outline" size={42} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>{statusFilter === 'completed' ? 'Chưa có công việc hoàn thành' : statusFilter === 'open' ? 'Không còn công việc chưa xong' : taskList === 'recurring' ? 'Chưa có công việc lặp lại' : 'Chưa có công việc làm một lần'}</Text>
              <Text style={[styles.emptyText, { color: theme.muted }]}>{statusFilter === 'completed' ? 'Việc đã dọn nằm trong Thùng rác. Bạn có thể khôi phục tại đó.' : statusFilter === 'open' ? 'Chọn Tất cả hoặc Hoàn thành để xem các công việc khác.' : taskList === 'recurring' ? 'Nhấn + để tạo công việc hằng ngày, hằng tuần hoặc hằng tháng.' : 'Nhấn nút + để tạo công việc đầu tiên.'}</Text>
            </View>
          ) : (
            listedTasks.map((task) => {
              const status = effectiveStatus(task, now);
              const color = STATUS_COLORS[status] ?? '#6366F1';
              return (
                <TouchableOpacity
                  key={task.id}
                  activeOpacity={0.75}
                  onPress={() => openEdit(task)}
                  style={[styles.taskCard, { backgroundColor: isDark ? `${color}18` : `${color}0D`, borderColor: `${color}55` }]}>
                  <View style={[styles.statusBar, { backgroundColor: color }]} />
                  <View style={styles.taskBody}>
                    <View style={styles.taskTop}>
                      <Text numberOfLines={1} style={[styles.taskTitle, { color: theme.text }]}>{task.tieuDe}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
                        <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[status] ?? status}</Text>
                      </View>
                    </View>
                    {!!task.moTa && (
                      <Text numberOfLines={2} style={[styles.taskDesc, { color: theme.muted }]}>{task.moTa}</Text>
                    )}
                    <View style={styles.taskMeta}>
                      {task.hanHoanThanh && (
                        <View style={styles.metaItem}>
                          <Ionicons name="calendar-outline" size={12} color={theme.muted} />
                          <Text style={[styles.metaText, { color: theme.muted }]}>
                            {new Date(task.hanHoanThanh).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                          </Text>
                        </View>
                      )}
                      {task.fileDinhKem?.length > 0 && (
                        <View style={styles.metaItem}>
                          <Ionicons name="attach-outline" size={12} color={theme.muted} />
                          <Text style={[styles.metaText, { color: theme.muted }]}>{task.fileDinhKem.length} file</Text>
                        </View>
                      )}
                      {task.lapLai && task.lapLai !== 'KHONG' && <View style={styles.metaItem}><Ionicons name="repeat-outline" size={12} color={theme.primary} /><Text style={[styles.metaText, { color: theme.primary }]}>{RECURRENCE_OPTIONS.find(option => option.value === task.lapLai)?.label || 'Lặp lại'}</Text></View>}
                    </View>
                  </View>
                  <TouchableOpacity accessibilityRole="button" accessibilityLabel={`Chuyển ${task.tieuDe} vào Thùng rác`}
                    disabled={deletingId !== null || cleaningCompleted}
                    onPress={(event) => { event.stopPropagation(); handleDelete(task); }}
                    style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', opacity: deletingId !== null || cleaningCompleted ? 0.55 : 1 }}>
                    {deletingId === task.id ? <ActivityIndicator size="small" color="#E11D48" /> : <Ionicons name="trash-outline" size={19} color="#E11D48" />}
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* FAB */}
      <TouchableOpacity
        activeOpacity={0.85}
        accessibilityLabel="Thêm công việc"
        onPress={openCreate}
        style={styles.fab}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create / Edit Modal */}
      <Modal visible={showModal} animationType="slide" transparent presentationStyle="overFullScreen">
        <KeyboardModalOverlay>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            {/* Modal Header */}
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                {editingTask ? 'Chỉnh sửa công việc' : 'Tạo công việc mới'}
              </Text>
              <TouchableOpacity onPress={closeModal} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close" size={24} color={theme.muted} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              {/* Title */}
              <Text style={[styles.label, { color: theme.text }]}>Tiêu đề *</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Tên công việc..."
                placeholderTextColor={theme.muted}
                value={form.title}
                onChangeText={(v) => setForm((f) => ({ ...f, title: v }))}
              />

              {/* Description */}
              <Text style={[styles.label, { color: theme.text }]}>Mô tả</Text>
              <TextInput
                style={[styles.textInput, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="Mô tả chi tiết..."
                placeholderTextColor={theme.muted}
                value={form.description}
                onChangeText={(v) => setForm((f) => ({ ...f, description: v }))}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />

              {/* Priority */}
              <Text style={[styles.label, { color: theme.text }]}>Mức độ ưu tiên</Text>
              <View style={styles.optionRow}>
                {PRIORITY_OPTIONS.map((opt) => (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => setForm((f) => ({ ...f, priority: opt.value }))}
                    style={[styles.optionChip, {
                      backgroundColor: form.priority === opt.value ? `${opt.color}20` : theme.background,
                      borderColor: form.priority === opt.value ? opt.color : theme.border,
                    }]}>
                    <View style={[styles.optionDot, { backgroundColor: opt.color }]} />
                    <Text style={[styles.optionText, { color: form.priority === opt.value ? opt.color : theme.muted }]}>{opt.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Status */}
              <Text style={[styles.label, { color: theme.text }]}>Trạng thái</Text>
              <View style={styles.optionRow}>
                {STATUS_OPTIONS.map((opt) => {
                  const c = STATUS_COLORS[opt.value];
                  return (
                    <TouchableOpacity
                      key={opt.value}
                      onPress={() => setForm((f) => ({ ...f, status: opt.value }))}
                      style={[styles.optionChip, {
                        backgroundColor: form.status === opt.value ? `${c}20` : theme.background,
                        borderColor: form.status === opt.value ? c : theme.border,
                      }]}>
                      <Text style={[styles.optionText, { color: form.status === opt.value ? c : theme.muted }]}>{opt.label}</Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Due date */}
              <Text style={[styles.label, { color: theme.text }]}>Hạn hoàn thành</Text>
              {/* Ngày */}
              <TouchableOpacity
                onPress={() => setShowDatePicker(true)}
                style={[styles.textInput, styles.pickerBtn, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Ionicons name="calendar-outline" size={17} color={theme.muted} />
                <Text style={{ color: form.dueDay ? theme.text : theme.muted, fontSize: 14, flex: 1 }}>
                  {form.dueDay ? form.dueDay.toLocaleDateString('vi-VN') : 'Chọn ngày...'}
                </Text>
                {form.dueDay && (
                  <TouchableOpacity onPress={() => setForm((f) => ({ ...f, dueDay: null }))}>
                    <Ionicons name="close-circle" size={17} color={theme.muted} />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
              {showDatePicker && (
                <TaskDatePicker
                  value={form.dueDay}
                  onClose={() => setShowDatePicker(false)}
                  onPick={date => setForm(f => ({ ...f, dueDay: date }))}
                />
              )}
              {/* Giờ và Phút */}
              <View style={styles.timeRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timeLabel, { color: theme.muted }]}>Giờ (00–23)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, textAlign: 'center' }]}
                    placeholder="HH"
                    placeholderTextColor={theme.muted}
                    value={form.dueHour}
                    onChangeText={(v) => {
                      const num = v.replace(/\D/g, '').slice(0, 2);
                      if (num === '' || parseInt(num, 10) <= 23) {
                        setForm((f) => ({ ...f, dueHour: num }));
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
                <Text style={[styles.timeSep, { color: theme.text }]}>:</Text>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.timeLabel, { color: theme.muted }]}>Phút (00–59)</Text>
                  <TextInput
                    style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text, textAlign: 'center' }]}
                    placeholder="mm"
                    placeholderTextColor={theme.muted}
                    value={form.dueMinute}
                    onChangeText={(v) => {
                      const num = v.replace(/\D/g, '').slice(0, 2);
                      if (num === '' || parseInt(num, 10) <= 59) {
                        setForm((f) => ({ ...f, dueMinute: num }));
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={2}
                  />
                </View>
              </View>

              <Text style={[styles.label, { color: theme.text }]}>Nhắc trước hạn</Text>
              <View style={styles.optionRow}>
                {REMINDER_OPTIONS.map(option => {
                  const selected = form.reminderOffsets.includes(option.minutes);
                  return <TouchableOpacity key={option.key} accessibilityRole="checkbox"
                    accessibilityState={{ checked: selected, disabled: !form.dueDay }} disabled={!form.dueDay}
                    onPress={() => setForm(current => ({ ...current, reminderOffsets: selected
                      ? current.reminderOffsets.filter(value => value !== option.minutes)
                      : [...current.reminderOffsets, option.minutes] }))}
                    style={[styles.optionChip, { borderColor: selected ? theme.primary : theme.border,
                      backgroundColor: selected ? `${theme.primary}20` : theme.background, opacity: form.dueDay ? 1 : 0.5 }]}>
                    <Ionicons name={selected ? 'checkbox-outline' : 'square-outline'} size={16} color={theme.primary} />
                    <Text style={[styles.optionText, { color: theme.text }]}>{option.label}</Text>
                  </TouchableOpacity>;
                })}
              </View>
              <Text style={{ color: theme.muted, fontSize: 12, marginTop: 8 }}>
                {!form.dueDay ? 'Đặt hạn hoàn thành để chọn lịch nhắc.' : form.reminderOffsets.length
                  ? 'Chọn nhiều mốc. Mốc đã qua sẽ bỏ qua. Lựa chọn chỉ lưu trên thiết bị này.'
                  : 'Đã tắt nhắc cho công việc này.'}
              </Text>
              <Text style={[styles.label, { color: theme.text }]}>Lặp lại</Text>
              <View style={styles.optionRow}>
                {RECURRENCE_OPTIONS.map((opt) => <TouchableOpacity key={opt.value} onPress={() => setForm((f) => ({ ...f, recurrence: opt.value }))} style={[styles.optionChip, { backgroundColor: form.recurrence === opt.value ? `${theme.primary}20` : theme.background, borderColor: form.recurrence === opt.value ? theme.primary : theme.border }]}>
                  <Ionicons name="repeat-outline" size={14} color={form.recurrence === opt.value ? theme.primary : theme.muted} />
                  <Text style={[styles.optionText, { color: form.recurrence === opt.value ? theme.primary : theme.muted }]}>{opt.label}</Text>
                </TouchableOpacity>)}
              </View>
              {form.recurrence !== 'KHONG' && !form.dueDay && <Text style={{ color: '#E11D48', fontSize: 12, marginTop: 7 }}>Công việc lặp lại cần có hạn hoàn thành.</Text>}

              {/* File attachments */}
              <Text style={[styles.label, { color: theme.text }]}>Tệp đính kèm</Text>
              <FilePicker
                attachments={form.attachments}
                onChange={(files) => setForm((f) => ({ ...f, attachments: files }))}
                theme={{ surface: theme.background, border: theme.border, text: theme.text, muted: theme.muted, primary: theme.primary, iconBg: theme.iconBg }}
              />

              {/* Error */}
              {!!formError && (
                <Text style={styles.formError}>{formError}</Text>
              )}

              {/* Save button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={saving}
                activeOpacity={0.85}
                style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
                {saving
                  ? <ActivityIndicator color="#FFFFFF" size="small" />
                  : <Text style={styles.saveBtnText}>{editingTask ? 'Lưu thay đổi' : 'Tạo công việc'}</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardModalOverlay>
      </Modal>
      <TaskTrash visible={showTrash} userId={user?.id} theme={theme} onClose={() => setShowTrash(false)} onChanged={() => fetchTasks()} />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  pageTitle: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  taskToolbar: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingHorizontal: 20, marginBottom: 12 },
  statusFilter: { flex: 1, minHeight: 44, paddingHorizontal: 6, paddingVertical: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  cleanupButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, minHeight: 44, paddingHorizontal: 12, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  taskNotice: { paddingHorizontal: 20, marginBottom: 12, fontSize: 13, lineHeight: 19 },
  trashButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, minHeight: 44, borderRadius: 12, borderWidth: 1 },
  viewSwitch: { flexDirection: 'row', flexWrap: 'wrap', borderRadius: 12, borderWidth: 1, padding: 3, maxWidth: '100%' },
  viewSwitchBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 7, borderRadius: 9 },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, borderRadius: 12, borderWidth: 1, padding: 12, marginBottom: 8 },
  errorText: { color: '#E11D48', fontSize: 13, flex: 1 },
  loadingBox: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { fontSize: 14 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 120, gap: 10 },
  emptyState: { alignItems: 'center', borderWidth: 1, borderRadius: 18, padding: 36, marginTop: 20 },
  emptyTitle: { fontSize: 16, fontWeight: '700', marginTop: 12 },
  emptyText: { fontSize: 13, marginTop: 6, textAlign: 'center' },
  taskCard: { borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingRight: 14, overflow: 'hidden' },
  statusBar: { width: 5, alignSelf: 'stretch', marginRight: 14 },
  taskBody: { flex: 1, minWidth: 0 },
  taskTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  taskTitle: { fontSize: 14.5, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  taskDesc: { fontSize: 12.5, marginBottom: 6, lineHeight: 18 },
  taskMeta: { flexDirection: 'row', gap: 10 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5 },
  fab: { position: 'absolute', right: 21, bottom: 18, width: 58, height: 58, borderRadius: 19, backgroundColor: '#5B5CE2', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 7 },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalContent: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  textInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textArea: { minHeight: 80, paddingTop: 12 },
  pickerBtn: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  timeRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8 },
  timeLabel: { fontSize: 11, fontWeight: '600', marginBottom: 6 },
  timeSep: { fontSize: 22, fontWeight: '700', marginBottom: 10 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  optionDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { fontSize: 12.5, fontWeight: '700' },
  formError: { color: '#E11D48', fontSize: 13, marginTop: 12, textAlign: 'center' },
  saveBtn: { marginTop: 22, backgroundColor: '#5B5CE2', height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
