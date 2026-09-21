import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useState } from 'react';
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

import { useAuthSession } from '@/components/auth-session';
import { FilePicker } from '@/components/file-picker';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { createTask, deleteTask, getTasks, updateTask } from '@/lib/tasks-api';

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

const EMPTY_FORM = {
  title: '',
  description: '',
  priority: 'TRUNG_BINH',
  status: 'CHUA_LAM',
  dueDate: '',
  attachments: [],
};

export default function TasksScreen() {
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

  const theme = {
    background: isDark ? '#0B1120' : '#F7F8FC',
    surface: isDark ? '#151E31' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#172033',
    muted: isDark ? '#91A0B7' : '#6B7280',
    border: isDark ? '#25324A' : '#E8ECF3',
    primary: '#5B5CE2',
    iconBg: isDark ? '#282A62' : '#EEF2FF',
    separator: isDark ? '#25324A' : '#EFF1F5',
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

  function openCreate() {
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setFormError('');
    setShowModal(true);
  }

  function openEdit(task) {
    setEditingTask(task);
    setForm({
      title: task.tieuDe,
      description: task.moTa ?? '',
      priority: task.mucDoUuTien ?? 'TRUNG_BINH',
      status: task.trangThai ?? 'CHUA_LAM',
      dueDate: task.hanHoanThanh ? new Date(task.hanHoanThanh).toISOString().slice(0, 10) : '',
      attachments: task.fileDinhKem ?? [],
    });
    setFormError('');
    setShowModal(true);
  }

  function closeModal() {
    setShowModal(false);
    setEditingTask(null);
    setForm(EMPTY_FORM);
    setFormError('');
  }

  async function handleSave() {
    if (!form.title.trim()) { setFormError('Vui lòng nhập tiêu đề công việc.'); return; }
    if (!user?.id) { setFormError('Bạn cần đăng nhập để lưu công việc.'); return; }
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || undefined,
        attachments: form.attachments.length > 0 ? form.attachments : undefined,
      };
      if (editingTask) {
        await updateTask(user.id, editingTask.id, payload);
      } else {
        await createTask(user.id, payload);
      }
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      closeModal();
      await fetchTasks();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(task) {
    Alert.alert('Xóa công việc', `Xóa "${task.tieuDe}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await deleteTask(user.id, task.id);
            await fetchTasks();
          } catch (err) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Header */}
      <View style={[styles.pageHeader, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>CÁ NHÂN</Text>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Công việc của tôi</Text>
        </View>
      </View>

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
      {!loading && (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTasks(true)} tintColor={theme.primary} />}>
          {tasks.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="clipboard-outline" size={42} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Chưa có công việc nào</Text>
              <Text style={[styles.emptyText, { color: theme.muted }]}>Nhấn nút + để tạo công việc đầu tiên.</Text>
            </View>
          ) : (
            tasks.map((task) => {
              const color = STATUS_COLORS[task.trangThai] ?? '#6366F1';
              return (
                <TouchableOpacity
                  key={task.id}
                  activeOpacity={0.75}
                  onPress={() => openEdit(task)}
                  style={[styles.taskCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.statusBar, { backgroundColor: color }]} />
                  <View style={styles.taskBody}>
                    <View style={styles.taskTop}>
                      <Text numberOfLines={1} style={[styles.taskTitle, { color: theme.text }]}>{task.tieuDe}</Text>
                      <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
                        <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[task.trangThai] ?? task.trangThai}</Text>
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
                            {new Date(task.hanHoanThanh).toLocaleDateString('vi-VN')}
                          </Text>
                        </View>
                      )}
                      {task.fileDinhKem?.length > 0 && (
                        <View style={styles.metaItem}>
                          <Ionicons name="attach-outline" size={12} color={theme.muted} />
                          <Text style={[styles.metaText, { color: theme.muted }]}>{task.fileDinhKem.length} file</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity onPress={() => handleDelete(task)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                    <Ionicons name="trash-outline" size={19} color="#E11D48" />
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
        <View style={styles.modalOverlay}>
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
              <Text style={[styles.label, { color: theme.text }]}>Hạn hoàn thành (YYYY-MM-DD)</Text>
              <TextInput
                style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
                placeholder="2025-12-31"
                placeholderTextColor={theme.muted}
                value={form.dueDate}
                onChangeText={(v) => setForm((f) => ({ ...f, dueDate: v }))}
                keyboardType="numeric"
              />

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
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  pageHeader: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  pageTitle: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
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
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalContent: { padding: 20, paddingBottom: 40 },
  label: { fontSize: 13, fontWeight: '700', marginBottom: 8, marginTop: 14 },
  textInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  textArea: { minHeight: 80, paddingTop: 12 },
  optionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  optionChip: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  optionDot: { width: 8, height: 8, borderRadius: 4 },
  optionText: { fontSize: 12.5, fontWeight: '700' },
  formError: { color: '#E11D48', fontSize: 13, marginTop: 12, textAlign: 'center' },
  saveBtn: { marginTop: 22, backgroundColor: '#5B5CE2', height: 52, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
});
