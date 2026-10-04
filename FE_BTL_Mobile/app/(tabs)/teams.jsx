import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
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
import { TaskExtras } from '@/components/task-extras';
import { useColorScheme } from '@/hooks/use-color-scheme';
import {
  createGroupTask,
  createTeam,
  deleteGroupTask,
  deleteTeam,
  getGroupTasks,
  getTeamActivity,
  getTeamDetail,
  getTeams,
  inviteMember,
  leaveTeam,
  removeMember,
  transferLeader,
  updateGroupTask,
  updateGroupTaskStatus,
} from '@/lib/teams-api';

const STATUS_LABELS = {
  CHUA_LAM: 'Chưa làm',
  DANG_LAM: 'Đang làm',
  HOAN_THANH: 'Hoàn thành',
  QUA_HAN: 'Quá hạn',
};

const STATUS_COLORS = {
  CHUA_LAM: '#6366F1',
  DANG_LAM: '#F59E0B',
  HOAN_THANH: '#10B981',
  QUA_HAN: '#EF4444',
};

// ─────────────────────────────────────────────────────────────
// MAIN SCREEN
// ─────────────────────────────────────────────────────────────
export default function TeamsScreen() {
  const params = useLocalSearchParams();
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { user } = useAuthSession();

  const [teams, setTeams] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState(null); // {id, detail, tasks}

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

  const fetchTeams = useCallback(async (isRefresh = false) => {
    if (!user?.id) return;
    if (isRefresh) setRefreshing(true); else setLoading(true);
    setError('');
    try {
      const data = await getTeams(user.id);
      setTeams(data ?? []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  const openTeamDetail = useCallback(async (teamId, focusTaskId) => {
    try {
      const [detail, tasksList, activity] = await Promise.all([
        getTeamDetail(teamId),
        user?.id ? getGroupTasks(teamId, user.id).catch(() => []) : Promise.resolve([]),
        getTeamActivity(teamId).catch(() => []),
      ]);
      setSelectedTeam({ id: teamId, detail, tasks: tasksList ?? [], activity: activity ?? [], focusTaskId });
    } catch (err) {
      Alert.alert('Lỗi', err.message);
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void fetchTeams(); }, [fetchTeams]));
  useEffect(() => {
    if (!params.teamId || !user?.id) return;
    const timer = setTimeout(() => {
      void openTeamDetail(params.teamId, params.taskId)
        .then(() => router.setParams({ teamId: '', taskId: '' }));
    }, 0);
    return () => clearTimeout(timer);
  }, [openTeamDetail, params.taskId, params.teamId, router, user?.id]);

  if (selectedTeam) {
    return (
      <TeamDetailScreen
        teamData={selectedTeam}
        user={user}
        theme={theme}
        isDark={isDark}
        onBack={() => { setSelectedTeam(null); fetchTeams(); }}
        onRefresh={async () => { await openTeamDetail(selectedTeam.id); }}
      />
    );
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <View style={[styles.pageHeader, { backgroundColor: theme.background }]}>
        <View>
          <Text style={[styles.eyebrow, { color: theme.muted }]}>CỘNG TÁC</Text>
          <Text style={[styles.pageTitle, { color: theme.text }]}>Nhóm của tôi</Text>
        </View>
      </View>

      {!!error && (
        <View style={[styles.errorBox, { backgroundColor: isDark ? '#450A0A' : '#FFF1F2', borderColor: '#FECDD3', marginHorizontal: 20 }]}>
          <Ionicons name="alert-circle-outline" size={16} color="#E11D48" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {loading && !refreshing ? (
        <View style={styles.loadingBox}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.muted }]}>Đang tải nhóm...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => fetchTeams(true)} tintColor={theme.primary} />}>
          {teams.length === 0 ? (
            <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
              <Ionicons name="people-outline" size={44} color={theme.muted} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>Chưa có nhóm nào</Text>
              <Text style={[styles.emptyText, { color: theme.muted }]}>Tạo nhóm mới để bắt đầu cộng tác.</Text>
            </View>
          ) : (
            teams.map((team) => {
              const isLeader = team.truongNhomId === user?.id;
              return (
                <TouchableOpacity
                  key={team.id}
                  activeOpacity={0.75}
                  onPress={() => openTeamDetail(team.id)}
                  style={[styles.teamCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.teamAvatar, { backgroundColor: theme.iconBg }]}>
                    <Ionicons name="people" size={26} color={theme.primary} />
                  </View>
                  <View style={styles.teamInfo}>
                    <Text style={[styles.teamName, { color: theme.text }]}>{team.tenNhom}</Text>
                    {!!team.moTa && <Text numberOfLines={1} style={[styles.teamDesc, { color: theme.muted }]}>{team.moTa}</Text>}
                    {isLeader && (
                      <View style={[styles.leaderBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
                        <Ionicons name="star" size={10} color={theme.primary} />
                        <Text style={[styles.leaderText, { color: theme.primary }]}>Trưởng nhóm</Text>
                      </View>
                    )}
                  </View>
                  <Ionicons name="chevron-forward" size={20} color={theme.muted} />
                </TouchableOpacity>
              );
            })
          )}
        </ScrollView>
      )}

      {/* FAB - Create Team */}
      <TouchableOpacity
        activeOpacity={0.85}
        onPress={() => setShowCreateModal(true)}
        style={styles.fab}>
        <Ionicons name="add" size={30} color="#FFFFFF" />
      </TouchableOpacity>

      {/* Create Team Modal */}
      <CreateTeamModal
        visible={showCreateModal}
        theme={theme}
        user={user}
        onClose={() => setShowCreateModal(false)}
        onCreated={() => { setShowCreateModal(false); fetchTeams(); }}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// TEAM DETAIL SCREEN
// ─────────────────────────────────────────────────────────────
function TeamDetailScreen({ teamData, user, theme, isDark, onBack, onRefresh }) {
  const { detail, tasks, activity, focusTaskId } = teamData;
  const isLeader = detail?.truongNhomId === user?.id;

  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState(false);
  const [deleteError, setDeleteError] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const focusedTask = (tasks ?? []).find((task) => String(task.id) === String(focusTaskId));
  const [viewingTask, setViewingTask] = useState(focusedTask ?? null);
  const [taskFilter, setTaskFilter] = useState('all'); // all | my | doing | done
  const [activeTab, setActiveTab] = useState(focusedTask ? 'tasks' : 'members'); // members | tasks | activity
  const [refreshing, setRefreshing] = useState(false);

  const myTasksCount = useMemo(() => {
    return (tasks ?? []).filter((t) => t.nguoiNhanId === user?.id || t.nguoiNhanId === null).length;
  }, [tasks, user?.id]);

  const doingTasksCount = useMemo(() => {
    return (tasks ?? []).filter((t) => t.trangThai === 'DANG_LAM' || t.trangThai === 'CHUA_LAM').length;
  }, [tasks]);

  const doneTasksCount = useMemo(() => {
    return (tasks ?? []).filter((t) => t.trangThai === 'HOAN_THANH').length;
  }, [tasks]);

  const filteredTasks = useMemo(() => {
    const list = tasks ?? [];
    if (taskFilter === 'my') {
      return list.filter((t) => t.nguoiNhanId === user?.id || t.nguoiNhanId === null);
    }
    if (taskFilter === 'doing') {
      return list.filter((t) => t.trangThai === 'DANG_LAM' || t.trangThai === 'CHUA_LAM');
    }
    if (taskFilter === 'done') {
      return list.filter((t) => t.trangThai === 'HOAN_THANH');
    }
    return list;
  }, [tasks, taskFilter, user?.id]);

  async function handleRefresh() {
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }

  async function handleRemoveMember(member) {
    Alert.alert('Xóa thành viên', `Xóa ${member.nguoiDung?.hoTen || member.nguoiDung?.tenDangNhap} khỏi nhóm?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa', style: 'destructive', onPress: async () => {
          try {
            await removeMember(detail.id, member.nguoiDungId, user.id);
            await onRefresh();
          } catch (err) { Alert.alert('Lỗi', err.message); }
        },
      },
    ]);
  }

  async function handleDeleteTeam() {
    if (!isLeader || deletingTeam) return;
    setDeletingTeam(true);
    setDeleteError('');
    try {
      await deleteTeam(detail.id);
    } catch (err) {
      setDeleteError(err.message);
      setDeletingTeam(false);
      return;
    }
    onBack();
  }

  async function handleLeave() {
    Alert.alert('Rời nhóm', 'Bạn có chắc muốn rời khỏi nhóm này?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Rời nhóm', style: 'destructive', onPress: async () => {
          try {
            await leaveTeam(detail.id, user.id);
            onBack();
          } catch (err) { Alert.alert('Lỗi', err.message); }
        },
      },
    ]);
  }

  function handleOpenCreateTask() {
    setEditingTask(null);
    setShowTaskModal(true);
  }

  function handleOpenEditTask(task) {
    setEditingTask(task);
    if (viewingTask?.id === task.id) setViewingTask(null);
    setShowTaskModal(true);
  }

  async function handleDeleteTask(task) {
    Alert.alert('Xóa công việc', `Bạn có chắc muốn xóa công việc "${task.tieuDe}"?`, [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Xóa',
        style: 'destructive',
        onPress: async () => {
          try {
            await deleteGroupTask(detail.id, task.id, { userId: user.id });
            if (viewingTask?.id === task.id) setViewingTask(null);
            await onRefresh();
          } catch (err) {
            Alert.alert('Lỗi', err.message);
          }
        },
      },
    ]);
  }

  async function handleUpdateTaskStatus(task, newStatus) {
    try {
      await updateGroupTaskStatus(detail.id, task.id, { userId: user.id, trangThai: newStatus });
      await onRefresh();
    } catch (err) { Alert.alert('Lỗi', err.message); }
  }

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      {/* Back header */}
      <View style={[styles.detailHeader, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={onBack} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </TouchableOpacity>
        <View style={{ flex: 1, marginLeft: 12 }}>
          <Text numberOfLines={1} style={[styles.detailTitle, { color: theme.text }]}>{detail?.tenNhom}</Text>
          {isLeader && <Text style={[styles.detailSub, { color: theme.primary }]}>Trưởng nhóm</Text>}
        </View>
        {!isLeader && (
          <TouchableOpacity onPress={handleLeave} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Ionicons name="exit-outline" size={22} color="#E11D48" />
          </TouchableOpacity>
        )}
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { backgroundColor: theme.surface, borderBottomColor: theme.border }]}>
        {[{ key: 'members', label: 'Thành viên', icon: 'people-outline' }, { key: 'tasks', label: 'Công việc', icon: 'clipboard-outline' }, { key: 'activity', label: 'Nhật ký', icon: 'time-outline' }].map((tab) => (
          <TouchableOpacity key={tab.key} onPress={() => setActiveTab(tab.key)} style={[styles.tab, activeTab === tab.key && styles.activeTab]}>
            <Ionicons name={tab.icon} size={16} color={activeTab === tab.key ? theme.primary : theme.muted} />
            <Text style={[styles.tabText, { color: activeTab === tab.key ? theme.primary : theme.muted }]}>{tab.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        contentContainerStyle={styles.detailContent}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={theme.primary} />}>

        {/* MEMBERS TAB */}
        {activeTab === 'members' && (
          <View>
            {(detail?.thanhViens ?? []).map((member) => {
              const isMe = member.nguoiDungId === user?.id;
              const memberIsLeader = member.vaiTro === 'TRUONG_NHOM';
              return (
                <View key={member.id} style={[styles.memberCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                  <View style={[styles.memberAvatar, { backgroundColor: memberIsLeader ? (isDark ? '#312E81' : '#EEF2FF') : theme.iconBg }]}>
                    <Text style={[styles.memberInitial, { color: memberIsLeader ? theme.primary : theme.muted }]}>
                      {(member.nguoiDung?.hoTen || member.nguoiDung?.tenDangNhap || '?')[0].toUpperCase()}
                    </Text>
                  </View>
                  <View style={styles.memberInfo}>
                    <View style={styles.memberNameRow}>
                      <Text style={[styles.memberName, { color: theme.text }]}>
                        {member.nguoiDung?.hoTen || member.nguoiDung?.tenDangNhap}
                        {isMe ? ' (Bạn)' : ''}
                      </Text>
                      {memberIsLeader && (
                        <View style={[styles.leaderBadge, { backgroundColor: isDark ? '#312E81' : '#EEF2FF' }]}>
                          <Ionicons name="star" size={10} color={theme.primary} />
                          <Text style={[styles.leaderText, { color: theme.primary }]}>Trưởng nhóm</Text>
                        </View>
                      )}
                    </View>
                    <Text style={[styles.memberEmail, { color: theme.muted }]}>{member.nguoiDung?.email}</Text>
                  </View>
                  {/* Actions: chỉ trưởng nhóm mới thấy, và chỉ với thành viên khác */}
                  {isLeader && !isMe && !memberIsLeader && (
                    <TouchableOpacity onPress={() => handleRemoveMember(member)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                      <Ionicons name="person-remove-outline" size={20} color="#E11D48" />
                    </TouchableOpacity>
                  )}
                </View>
              );
            })}

            {/* Leader actions */}
            {isLeader && (
              <View style={styles.leaderActions}>
                <TouchableOpacity
                  onPress={() => setShowInviteModal(true)}
                  style={[styles.actionBtn, { backgroundColor: theme.primary }]}>
                  <Ionicons name="person-add-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Mời thành viên</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setShowTransferModal(true)}
                  style={[styles.actionBtn, { backgroundColor: isDark ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border }]}>
                  <Ionicons name="swap-horizontal-outline" size={18} color={theme.text} />
                  <Text style={[styles.actionBtnText, { color: theme.text }]}>Chuyển trưởng nhóm</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { setDeleteError(''); setShowDeleteModal(true); }}
                  style={[styles.actionBtn, { backgroundColor: '#E11D48' }]}>
                  <Ionicons name="trash-outline" size={18} color="#FFFFFF" />
                  <Text style={styles.actionBtnText}>Xóa nhóm</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* TASKS TAB */}
        {activeTab === 'tasks' && (
          <View>
            {/* Quick Filter Bar */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterBar} contentContainerStyle={{ gap: 8, paddingBottom: 12 }}>
              {[
                { key: 'all', label: 'Tất cả', count: (tasks ?? []).length },
                { key: 'my', label: 'Việc của tôi', count: myTasksCount },
                { key: 'doing', label: 'Đang làm', count: doingTasksCount },
                { key: 'done', label: 'Đã xong', count: doneTasksCount },
              ].map((item) => {
                const isActive = taskFilter === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    onPress={() => setTaskFilter(item.key)}
                    style={[
                      styles.filterChip,
                      {
                        backgroundColor: isActive ? theme.primary : theme.surface,
                        borderColor: isActive ? theme.primary : theme.border,
                      },
                    ]}>
                    <Text
                      style={[
                        styles.filterChipText,
                        { color: isActive ? '#FFFFFF' : theme.text },
                      ]}>
                      {item.label} ({item.count})
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            {filteredTasks.length === 0 ? (
              <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}>
                <Ionicons name="clipboard-outline" size={38} color={theme.muted} />
                <Text style={[styles.emptyTitle, { color: theme.text }]}>Không có công việc nào</Text>
                <Text style={[styles.emptyText, { color: theme.muted }]}>
                  {taskFilter === 'all'
                    ? (isLeader ? 'Nhấn "Giao công việc" để bắt đầu.' : 'Nhóm chưa có công việc nào.')
                    : 'Không có công việc phù hợp với bộ lọc hiện tại.'}
                </Text>
              </View>
            ) : (
              filteredTasks.map((task) => {
                const color = STATUS_COLORS[task.trangThai] ?? '#6366F1';
                const isAssignedToMe = task.nguoiNhanId === user?.id;
                return (
                  <TouchableOpacity
                    key={task.id}
                    activeOpacity={0.8}
                    onPress={() => setViewingTask(task)}
                    style={[styles.groupTaskCard, { backgroundColor: isDark ? `${color}18` : `${color}0D`, borderColor: `${color}55` }]}>
                    <View style={[styles.statusBar2, { backgroundColor: color }]} />
                    <View style={styles.taskBody}>
                      <View style={styles.taskTopRow}>
                        <Text numberOfLines={1} style={[styles.taskTitle, { color: theme.text }]}>{task.tieuDe}</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                          <View style={[styles.statusBadge, { backgroundColor: `${color}18` }]}>
                            <Text style={[styles.statusText, { color }]}>{STATUS_LABELS[task.trangThai] ?? task.trangThai}</Text>
                          </View>
                          {isLeader && (
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <TouchableOpacity
                                onPress={() => handleOpenEditTask(task)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="create-outline" size={17} color={theme.muted} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                onPress={() => handleDeleteTask(task)}
                                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                                <Ionicons name="trash-outline" size={17} color="#E11D48" />
                              </TouchableOpacity>
                            </View>
                          )}
                        </View>
                      </View>
                      {!!task.moTa && <Text numberOfLines={2} style={[styles.taskDesc, { color: theme.muted }]}>{task.moTa}</Text>}
                      <View style={styles.taskMeta}>
                        {task.hanHoanThanh && (
                          <View style={styles.metaItem}>
                            <Ionicons name="calendar-outline" size={12} color={theme.muted} />
                            <Text style={[styles.metaText, { color: theme.muted }]}>
                              {new Date(task.hanHoanThanh).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </Text>
                          </View>
                        )}
                        {task.nguoiNhan && (
                          <View style={styles.metaItem}>
                            <Ionicons name="person-outline" size={12} color={theme.muted} />
                            <Text style={[styles.metaText, { color: theme.muted }]}>
                              {task.nguoiNhan.hoTen || task.nguoiNhan.tenDangNhap}
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
                      {/* Người được giao có thể cập nhật trạng thái */}
                      {(isAssignedToMe || isLeader) && task.trangThai !== 'HOAN_THANH' && (
                        <TouchableOpacity
                          onPress={() => handleUpdateTaskStatus(task, task.trangThai === 'CHUA_LAM' ? 'DANG_LAM' : 'HOAN_THANH')}
                          style={[styles.progressBtn, { backgroundColor: `${color}18`, borderColor: color }]}>
                          <Text style={[styles.progressBtnText, { color }]}>
                            {task.trangThai === 'CHUA_LAM' ? 'Bắt đầu' : 'Đánh dấu hoàn thành'}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}

            {/* Assign task - only leader */}
            {isLeader && (
              <TouchableOpacity
                onPress={handleOpenCreateTask}
                style={[styles.assignBtn, { backgroundColor: theme.primary }]}>
                <Ionicons name="add-circle-outline" size={20} color="#FFFFFF" />
                <Text style={styles.actionBtnText}>Giao công việc</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {activeTab === 'activity' && (
          <View style={{ gap: 12 }}>
            {!(activity ?? []).length && <View style={[styles.emptyState, { backgroundColor: theme.surface, borderColor: theme.border }]}><Ionicons name="time-outline" size={38} color={theme.muted} /><Text style={[styles.emptyTitle, { color: theme.text }]}>Chưa có hoạt động</Text></View>}
            {(activity ?? []).map((entry) => <View key={entry.id} style={{ flexDirection: 'row', gap: 12 }}>
              <View style={{ alignItems: 'center' }}><View style={{ width: 34, height: 34, borderRadius: 17, backgroundColor: theme.iconBg, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={entry.hanhDong === 'HOAN_THANH' ? 'checkmark' : entry.hanhDong === 'BINH_LUAN' ? 'chatbubble-outline' : 'create-outline'} size={17} color={theme.primary} /></View><View style={{ flex: 1, width: 2, backgroundColor: theme.border, marginTop: 5 }} /></View>
              <View style={[styles.detailInfoBox, { flex: 1, backgroundColor: theme.surface, borderColor: theme.border, marginBottom: 4 }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>{entry.nguoiThucHien?.hoTen || entry.nguoiThucHien?.tenDangNhap || 'Thành viên'}</Text>
                <Text style={{ color: theme.text, marginTop: 4 }}>{entry.noiDung}</Text>
                <Text style={{ color: theme.muted, fontSize: 11, marginTop: 7 }}>{new Date(entry.ngayTao).toLocaleString('vi-VN')}</Text>
              </View>
            </View>)}
          </View>
        )}
      </ScrollView>

      {/* Modals */}
      <Modal visible={showDeleteModal && isLeader} animationType="slide" transparent
        onRequestClose={() => { if (!deletingTeam) setShowDeleteModal(false); }}>
        <KeyboardModalOverlay>
          <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
            <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Xóa nhóm</Text>
            </View>
            <View style={styles.modalContent}>
              <Text style={[styles.detailInfoText, { color: theme.text }]}>
                Bạn có chắc muốn xóa nhóm “{detail.tenNhom}”? Toàn bộ công việc, bình luận,
                lịch sử hoạt động, thông báo và danh sách thành viên của nhóm sẽ bị xóa vĩnh viễn.
                Thao tác này không thể hoàn tác.
              </Text>
              {!!deleteError && <Text accessibilityRole="alert" style={styles.formError}>{deleteError}</Text>}
              <TouchableOpacity accessibilityRole="button" disabled={deletingTeam}
                onPress={handleDeleteTeam}
                style={[styles.saveBtn, { backgroundColor: '#E11D48', opacity: deletingTeam ? 0.6 : 1 }]}>
                {deletingTeam ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.saveBtnText}>Xóa nhóm vĩnh viễn</Text>}
              </TouchableOpacity>
              <TouchableOpacity accessibilityRole="button" disabled={deletingTeam}
                onPress={() => setShowDeleteModal(false)}
                style={[styles.outlineBtn, { marginTop: 12, borderColor: theme.border }]}>
                <Text style={[styles.outlineBtnText, { color: theme.text }]}>Hủy</Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardModalOverlay>
      </Modal>

      <InviteMemberModal
        visible={showInviteModal}
        theme={theme}
        teamId={detail?.id}
        userId={user?.id}
        onClose={() => setShowInviteModal(false)}
        onInvited={() => { setShowInviteModal(false); onRefresh(); }}
      />

      <TransferLeaderModal
        visible={showTransferModal}
        theme={theme}
        teamId={detail?.id}
        userId={user?.id}
        members={(detail?.thanhViens ?? []).filter((m) => m.nguoiDungId !== user?.id)}
        onClose={() => setShowTransferModal(false)}
        onTransferred={() => { setShowTransferModal(false); onBack(); }}
      />

      <AssignTaskModal
        visible={showTaskModal}
        theme={theme}
        isDark={isDark}
        teamId={detail?.id}
        userId={user?.id}
        members={detail?.thanhViens ?? []}
        editingTask={editingTask}
        onClose={() => { setShowTaskModal(false); setEditingTask(null); }}
        onCreated={() => { setShowTaskModal(false); setEditingTask(null); onRefresh(); }}
      />

      <TaskDetailModal
        visible={!!viewingTask}
        task={viewingTask}
        theme={theme}
        isDark={isDark}
        isLeader={isLeader}
        userId={user?.id}
        onClose={() => setViewingTask(null)}
        onEdit={(task) => handleOpenEditTask(task)}
        onDelete={(task) => handleDeleteTask(task)}
        onUpdateStatus={handleUpdateTaskStatus}
      />
    </SafeAreaView>
  );
}

// ─────────────────────────────────────────────────────────────
// CREATE TEAM MODAL
// ─────────────────────────────────────────────────────────────
function CreateTeamModal({ visible, theme, user, onClose, onCreated }) {
  const [tenNhom, setTenNhom] = useState('');
  const [moTa, setMoTa] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleCreate() {
    if (!tenNhom.trim()) { setError('Vui lòng nhập tên nhóm.'); return; }
    if (!user?.id) { setError('Bạn cần đăng nhập.'); return; }
    setSaving(true);
    setError('');
    try {
      await createTeam({ tenNhom: tenNhom.trim(), moTa: moTa.trim(), userId: user.id });
      void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      setTenNhom('');
      setMoTa('');
      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardModalOverlay>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Tạo nhóm mới</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={theme.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: theme.text }]}>Tên nhóm *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Ví dụ: Nhóm dự án A"
              placeholderTextColor={theme.muted}
              value={tenNhom}
              onChangeText={setTenNhom}
            />
            <Text style={[styles.label, { color: theme.text }]}>Mô tả nhóm</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Mô tả mục tiêu của nhóm..."
              placeholderTextColor={theme.muted}
              value={moTa}
              onChangeText={setMoTa}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            {!!error && <Text style={styles.formError}>{error}</Text>}
            <TouchableOpacity onPress={handleCreate} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Tạo nhóm</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardModalOverlay>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// INVITE MEMBER MODAL
// ─────────────────────────────────────────────────────────────
function InviteMemberModal({ visible, theme, teamId, userId, onClose, onInvited }) {
  const [email, setEmail] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleInvite() {
    if (!email.trim()) { setError('Vui lòng nhập email.'); return; }
    setSaving(true);
    setError('');
    try {
      await inviteMember(teamId, { userId, inviteEmail: email.trim() });
      setEmail('');
      onInvited();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardModalOverlay>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Mời thành viên</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={theme.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: theme.text }]}>Email người được mời</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="email@example.com"
              placeholderTextColor={theme.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
            />
            {!!error && <Text style={styles.formError}>{error}</Text>}
            <TouchableOpacity onPress={handleInvite} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Gửi lời mời</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardModalOverlay>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// TRANSFER LEADER MODAL
// ─────────────────────────────────────────────────────────────
function TransferLeaderModal({ visible, theme, teamId, userId, members, onClose, onTransferred }) {
  const [selectedId, setSelectedId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function handleTransfer() {
    if (!selectedId) { setError('Vui lòng chọn người nhận quyền.'); return; }
    Alert.alert(
      'Xác nhận chuyển quyền',
      'Sau khi chuyển, bạn sẽ trở thành thành viên thường và không còn quyền quản lý nhóm.',
      [
        { text: 'Hủy', style: 'cancel' },
        {
          text: 'Xác nhận', style: 'destructive', onPress: async () => {
            setSaving(true);
            setError('');
            try {
              await transferLeader(teamId, { userId, newLeaderId: selectedId });
              onTransferred();
            } catch (err) {
              setError(err.message);
            } finally {
              setSaving(false);
            }
          },
        },
      ]
    );
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardModalOverlay>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Chuyển trưởng nhóm</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={theme.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.transferNote, { color: theme.muted }]}>
              ⚠️ Sau khi chuyển, bạn sẽ trở thành thành viên thường và không còn quyền quản lý nhóm.
            </Text>
            <Text style={[styles.label, { color: theme.text }]}>Chọn người nhận quyền</Text>
            {members.filter((m) => m.vaiTro !== 'TRUONG_NHOM').map((m) => (
              <TouchableOpacity
                key={m.id}
                onPress={() => setSelectedId(m.nguoiDungId)}
                style={[styles.memberCard, {
                  backgroundColor: selectedId === m.nguoiDungId ? (theme.iconBg) : theme.surface,
                  borderColor: selectedId === m.nguoiDungId ? theme.primary : theme.border,
                }]}>
                <View style={[styles.memberAvatar, { backgroundColor: theme.iconBg }]}>
                  <Text style={[styles.memberInitial, { color: theme.primary }]}>
                    {(m.nguoiDung?.hoTen || m.nguoiDung?.tenDangNhap || '?')[0].toUpperCase()}
                  </Text>
                </View>
                <View style={styles.memberInfo}>
                  <Text style={[styles.memberName, { color: theme.text }]}>
                    {m.nguoiDung?.hoTen || m.nguoiDung?.tenDangNhap}
                  </Text>
                  <Text style={[styles.memberEmail, { color: theme.muted }]}>{m.nguoiDung?.email}</Text>
                </View>
                {selectedId === m.nguoiDungId && (
                  <Ionicons name="checkmark-circle" size={22} color={theme.primary} />
                )}
              </TouchableOpacity>
            ))}
            {!!error && <Text style={styles.formError}>{error}</Text>}
            <TouchableOpacity onPress={handleTransfer} disabled={saving} style={[styles.saveBtn, { backgroundColor: '#E11D48' }, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Chuyển quyền</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardModalOverlay>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// ASSIGN TASK MODAL
// ─────────────────────────────────────────────────────────────
function AssignTaskModal({ visible, theme, isDark, teamId, userId, members, editingTask, onClose, onCreated }) {
  const [form, setForm] = useState(() => editingTask ? {
        tieuDe: editingTask.tieuDe ?? '',
        moTa: editingTask.moTa ?? '',
        mucDoUuTien: editingTask.mucDoUuTien ?? 'TRUNG_BINH',
        dueDay: editingTask.hanHoanThanh ? new Date(editingTask.hanHoanThanh) : null,
        dueHour: editingTask.hanHoanThanh
          ? String(new Date(editingTask.hanHoanThanh).getHours()).padStart(2, '0')
          : '',
        dueMinute: editingTask.hanHoanThanh
          ? String(new Date(editingTask.hanHoanThanh).getMinutes()).padStart(2, '0')
          : '',
        nguoiNhanId: editingTask.nguoiNhanId ?? null,
        fileDinhKem: editingTask.fileDinhKem ?? [],
      } : {
        tieuDe: '',
        moTa: '',
        mucDoUuTien: 'TRUNG_BINH',
        dueDay: null,
        dueHour: '',
        dueMinute: '',
        nguoiNhanId: null,
        fileDinhKem: [],
      });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);

  const PRIORITY_OPTIONS = [
    { value: 'CAO', label: 'Cao', color: '#EF4444' },
    { value: 'TRUNG_BINH', label: 'Vừa', color: '#F59E0B' },
    { value: 'THAP', label: 'Thấp', color: '#10B981' },
  ];

  async function handleAssign() {
    if (!form.tieuDe.trim()) { setError('Vui lòng nhập tiêu đề.'); return; }
    if (form.dueHour !== '') {
      const h = parseInt(form.dueHour, 10);
      if (isNaN(h) || h < 0 || h > 23) {
        setError('Giờ phải nằm trong khoảng từ 00 đến 23.');
        return;
      }
    }
    if (form.dueMinute !== '') {
      const m = parseInt(form.dueMinute, 10);
      if (isNaN(m) || m < 0 || m > 59) {
        setError('Phút phải nằm trong khoảng từ 00 đến 59.');
        return;
      }
    }
    setSaving(true);
    setError('');
    try {
      const hanHoanThanh = (() => {
        if (!form.dueDay) return undefined;
        const d = new Date(form.dueDay);
        const h = parseInt(form.dueHour, 10);
        const m = parseInt(form.dueMinute, 10);
        d.setHours(!isNaN(h) ? h : 23, !isNaN(m) ? m : 59, 0, 0);
        return d.toISOString();
      })();

      const payload = {
        userId,
        tieuDe: form.tieuDe.trim(),
        moTa: form.moTa.trim() || undefined,
        mucDoUuTien: form.mucDoUuTien,
        hanHoanThanh,
        nguoiNhanId: form.nguoiNhanId,
        fileDinhKem: form.fileDinhKem.length > 0 ? form.fileDinhKem : undefined,
      };

      if (editingTask) {
        await updateGroupTask(teamId, editingTask.id, payload);
      } else {
        await createGroupTask(teamId, payload);
      }

      onCreated();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleClose() {
    setError('');
    onClose();
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardModalOverlay>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {editingTask ? 'Chỉnh sửa công việc' : 'Giao công việc'}
            </Text>
            <TouchableOpacity onPress={handleClose}><Ionicons name="close" size={24} color={theme.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <Text style={[styles.label, { color: theme.text }]}>Tiêu đề *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Tên công việc..."
              placeholderTextColor={theme.muted}
              value={form.tieuDe}
              onChangeText={(v) => setForm((f) => ({ ...f, tieuDe: v }))}
            />

            <Text style={[styles.label, { color: theme.text }]}>Mô tả</Text>
            <TextInput
              style={[styles.textInput, styles.textArea, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Mô tả..."
              placeholderTextColor={theme.muted}
              value={form.moTa}
              onChangeText={(v) => setForm((f) => ({ ...f, moTa: v }))}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />

            <Text style={[styles.label, { color: theme.text }]}>Mức độ ưu tiên</Text>
            <View style={styles.optionRow}>
              {PRIORITY_OPTIONS.map((opt) => (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => setForm((f) => ({ ...f, mucDoUuTien: opt.value }))}
                  style={[styles.optionChip, {
                    backgroundColor: form.mucDoUuTien === opt.value ? `${opt.color}20` : theme.background,
                    borderColor: form.mucDoUuTien === opt.value ? opt.color : theme.border,
                  }]}>
                  <View style={[styles.optionDot, { backgroundColor: opt.color }]} />
                  <Text style={[styles.optionText, { color: form.mucDoUuTien === opt.value ? opt.color : theme.muted }]}>{opt.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Hạn hoàn thành: Ngày, Giờ, Phút tách riêng */}
            <Text style={[styles.label, { color: theme.text }]}>Hạn hoàn thành</Text>
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
              <DateTimePicker
                value={form.dueDay ?? new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'inline' : 'default'}
                onDismiss={() => setShowDatePicker(false)}
                  onValueChange={(_, date) => {
                  setShowDatePicker(false);
                  if (date) setForm((f) => ({ ...f, dueDay: date }));
                }}
              />
            )}
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

            <Text style={[styles.label, { color: theme.text }]}>Giao cho</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setForm((f) => ({ ...f, nguoiNhanId: null }))}
                  style={[styles.memberChip, {
                    backgroundColor: !form.nguoiNhanId ? theme.primary : theme.background,
                    borderColor: !form.nguoiNhanId ? theme.primary : theme.border,
                  }]}>
                  <Text style={[styles.memberChipText, { color: !form.nguoiNhanId ? '#FFFFFF' : theme.muted }]}>Tất cả</Text>
                </TouchableOpacity>
                {members.map((m) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setForm((f) => ({ ...f, nguoiNhanId: m.nguoiDungId }))}
                    style={[styles.memberChip, {
                      backgroundColor: form.nguoiNhanId === m.nguoiDungId ? theme.primary : theme.background,
                      borderColor: form.nguoiNhanId === m.nguoiDungId ? theme.primary : theme.border,
                    }]}>
                    <Text style={[styles.memberChipText, { color: form.nguoiNhanId === m.nguoiDungId ? '#FFFFFF' : theme.muted }]}>
                      {m.nguoiDung?.hoTen || m.nguoiDung?.tenDangNhap}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={[styles.label, { color: theme.text }]}>Tệp đính kèm</Text>
            <FilePicker
              attachments={form.fileDinhKem}
              onChange={(files) => setForm((f) => ({ ...f, fileDinhKem: files }))}
              theme={{ surface: theme.background, border: theme.border, text: theme.text, muted: theme.muted, primary: theme.primary, iconBg: theme.iconBg }}
            />

            {!!error && <Text style={styles.formError}>{error}</Text>}
            <TouchableOpacity onPress={handleAssign} disabled={saving} style={[styles.saveBtn, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : (
                <Text style={styles.saveBtnText}>{editingTask ? 'Lưu thay đổi' : 'Giao công việc'}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </KeyboardModalOverlay>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// TASK DETAIL MODAL
// ─────────────────────────────────────────────────────────────
function TaskDetailModal({ visible, task, theme, isDark, isLeader, userId, onClose, onEdit, onDelete, onUpdateStatus }) {
  if (!task) return null;
  const color = STATUS_COLORS[task.trangThai] ?? '#6366F1';
  const isAssignedToMe = task.nguoiNhanId === userId;
  const canUpdateStatus = isAssignedToMe || isLeader;

  const PRIORITY_LABELS = {
    CAO: { label: 'Ưu tiên Cao', color: '#EF4444' },
    TRUNG_BINH: { label: 'Ưu tiên Vừa', color: '#F59E0B' },
    THAP: { label: 'Ưu tiên Thấp', color: '#10B981' },
  };
  const priorityInfo = PRIORITY_LABELS[task.mucDoUuTien] ?? PRIORITY_LABELS.TRUNG_BINH;

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <KeyboardModalOverlay>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Chi tiết công việc</Text>
            <TouchableOpacity onPress={onClose}><Ionicons name="close" size={24} color={theme.muted} /></TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {/* Title */}
            <Text style={[styles.detailTaskTitle, { color: theme.text }]}>{task.tieuDe}</Text>

            {/* Badges */}
            <View style={{ flexDirection: 'row', gap: 8, marginVertical: 10, flexWrap: 'wrap' }}>
              <View style={[styles.statusBadge, { backgroundColor: `${color}18`, paddingHorizontal: 10, paddingVertical: 5 }]}>
                <Text style={[styles.statusText, { color, fontSize: 12 }]}>{STATUS_LABELS[task.trangThai] ?? task.trangThai}</Text>
              </View>
              <View style={[styles.statusBadge, { backgroundColor: `${priorityInfo.color}18`, paddingHorizontal: 10, paddingVertical: 5 }]}>
                <Text style={[styles.statusText, { color: priorityInfo.color, fontSize: 12 }]}>{priorityInfo.label}</Text>
              </View>
            </View>

            {/* Description */}
            <Text style={[styles.detailSectionLabel, { color: theme.muted }]}>MÔ TẢ</Text>
            <View style={[styles.detailInfoBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Text style={[styles.detailInfoText, { color: task.moTa ? theme.text : theme.muted }]}>
                {task.moTa || 'Không có mô tả chi tiết cho công việc này.'}
              </Text>
            </View>

            {visible && <TaskExtras key={task.id} path={`/api/teams/${task.nhomId}/tasks/${task.id}/comments`} theme={theme} userId={userId} isLeader={isLeader} />}
            {/* People & Deadline */}
            <Text style={[styles.detailSectionLabel, { color: theme.muted, marginTop: 14 }]}>THÔNG TIN GIAO VIỆC</Text>
            <View style={[styles.detailInfoBox, { backgroundColor: theme.background, borderColor: theme.border, gap: 10 }]}>
              <View style={styles.detailRow}>
                <Ionicons name="person-outline" size={16} color={theme.muted} />
                <Text style={[styles.detailRowLabel, { color: theme.muted }]}>Người nhận:</Text>
                <Text style={[styles.detailRowValue, { color: theme.text }]}>
                  {task.nguoiNhan ? (task.nguoiNhan.hoTen || task.nguoiNhan.tenDangNhap) : 'Tất cả thành viên'}
                </Text>
              </View>
              {task.nguoiGiao && (
                <View style={styles.detailRow}>
                  <Ionicons name="person-circle-outline" size={16} color={theme.muted} />
                  <Text style={[styles.detailRowLabel, { color: theme.muted }]}>Người giao:</Text>
                  <Text style={[styles.detailRowValue, { color: theme.text }]}>
                    {task.nguoiGiao.hoTen || task.nguoiGiao.tenDangNhap}
                  </Text>
                </View>
              )}
              <View style={styles.detailRow}>
                <Ionicons name="calendar-outline" size={16} color={theme.muted} />
                <Text style={[styles.detailRowLabel, { color: theme.muted }]}>Hạn chót:</Text>
                <Text style={[styles.detailRowValue, { color: task.hanHoanThanh ? theme.text : theme.muted }]}>
                  {task.hanHoanThanh
                    ? new Date(task.hanHoanThanh).toLocaleString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
                    : 'Không đặt hạn chót'}
                </Text>
              </View>
            </View>

            {/* Attachments */}
            <Text style={[styles.detailSectionLabel, { color: theme.muted, marginTop: 14 }]}>TỆP ĐÍNH KÈM ({task.fileDinhKem?.length || 0})</Text>
            {(!task.fileDinhKem || task.fileDinhKem.length === 0) ? (
              <View style={[styles.detailInfoBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
                <Text style={[styles.detailInfoText, { color: theme.muted }]}>Không có tệp đính kèm nào.</Text>
              </View>
            ) : (
              <View style={{ gap: 8 }}>
                {task.fileDinhKem.map((file, idx) => (
                  <View key={idx} style={[styles.attachmentItem, { backgroundColor: theme.background, borderColor: theme.border }]}>
                    <Ionicons name="document-attach-outline" size={20} color={theme.primary} />
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text numberOfLines={1} style={[styles.attachmentName, { color: theme.text }]}>{file.filename || file.name || `Tệp ${idx + 1}`}</Text>
                      {file.size && <Text style={[styles.attachmentSize, { color: theme.muted }]}>{(file.size / 1024).toFixed(1)} KB</Text>}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Status change action */}
            {canUpdateStatus && task.trangThai !== 'HOAN_THANH' && (
              <TouchableOpacity
                onPress={() => {
                  onUpdateStatus(task, task.trangThai === 'CHUA_LAM' ? 'DANG_LAM' : 'HOAN_THANH');
                  onClose();
                }}
                style={[styles.saveBtn, { backgroundColor: color, marginTop: 16 }]}>
                <Text style={styles.saveBtnText}>
                  {task.trangThai === 'CHUA_LAM' ? 'Bắt đầu làm công việc này' : 'Đánh dấu đã hoàn thành'}
                </Text>
              </TouchableOpacity>
            )}

            {/* Leader edit / delete */}
            {isLeader && (
              <View style={{ flexDirection: 'row', gap: 10, marginTop: 12 }}>
                <TouchableOpacity
                  onPress={() => { onEdit(task); }}
                  style={[styles.outlineBtn, { borderColor: theme.primary, flex: 1 }]}>
                  <Ionicons name="create-outline" size={17} color={theme.primary} />
                  <Text style={[styles.outlineBtnText, { color: theme.primary }]}>Chỉnh sửa</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => { onDelete(task); }}
                  style={[styles.outlineBtn, { borderColor: '#E11D48', flex: 1 }]}>
                  <Ionicons name="trash-outline" size={17} color="#E11D48" />
                  <Text style={[styles.outlineBtnText, { color: '#E11D48' }]}>Xóa việc</Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardModalOverlay>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────
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
  teamCard: { borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'center', padding: 14, gap: 14 },
  teamAvatar: { width: 50, height: 50, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  teamInfo: { flex: 1, minWidth: 0 },
  teamName: { fontSize: 15, fontWeight: '800', marginBottom: 3 },
  teamDesc: { fontSize: 12.5, marginBottom: 6 },
  leaderBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start' },
  leaderText: { fontSize: 10.5, fontWeight: '800' },
  fab: { position: 'absolute', right: 21, bottom: 18, width: 58, height: 58, borderRadius: 19, backgroundColor: '#5B5CE2', justifyContent: 'center', alignItems: 'center', shadowColor: '#4F46E5', shadowOffset: { width: 0, height: 7 }, shadowOpacity: 0.35, shadowRadius: 12, elevation: 7 },
  // Detail
  detailHeader: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1 },
  detailTitle: { fontSize: 18, fontWeight: '800' },
  detailSub: { fontSize: 12, fontWeight: '600', marginTop: 2 },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 12 },
  activeTab: { borderBottomWidth: 2, borderBottomColor: '#5B5CE2' },
  tabText: { fontSize: 12.5, fontWeight: '700' },
  detailContent: { padding: 16, gap: 10, paddingBottom: 60 },
  memberCard: { flexDirection: 'row', alignItems: 'center', borderRadius: 14, borderWidth: 1, padding: 12, gap: 12 },
  memberAvatar: { width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 18, fontWeight: '800' },
  memberInfo: { flex: 1, minWidth: 0 },
  memberNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  memberName: { fontSize: 14, fontWeight: '700' },
  memberEmail: { fontSize: 12, marginTop: 2 },
  leaderActions: { gap: 10, marginTop: 8 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14 },
  actionBtnText: { color: '#FFFFFF', fontSize: 14, fontWeight: '700' },
  assignBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingVertical: 13, borderRadius: 14, marginTop: 8 },
  groupTaskCard: { borderRadius: 17, borderWidth: 1, flexDirection: 'row', alignItems: 'flex-start', overflow: 'hidden' },
  statusBar2: { width: 5, alignSelf: 'stretch' },
  taskBody: { flex: 1, padding: 12, minWidth: 0 },
  taskTopRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  taskTitle: { fontSize: 14.5, fontWeight: '700', flex: 1, marginRight: 8 },
  statusBadge: { borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10.5, fontWeight: '800' },
  taskDesc: { fontSize: 12.5, marginBottom: 8, lineHeight: 18 },
  taskMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap' },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 11.5 },
  progressBtn: { marginTop: 10, paddingVertical: 8, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  progressBtnText: { fontSize: 12.5, fontWeight: '700' },
  // Modal
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
  transferNote: { fontSize: 13, lineHeight: 20, marginBottom: 8, padding: 12, backgroundColor: 'rgba(239,68,68,0.08)', borderRadius: 10 },
  memberChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10, borderWidth: 1.5 },
  memberChipText: { fontSize: 12.5, fontWeight: '700' },
  // Filter bar
  filterBar: { marginTop: 4, marginBottom: 8 },
  filterChip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  filterChipText: { fontSize: 12, fontWeight: '700' },
  // Detail Modal styles
  detailTaskTitle: { fontSize: 18, fontWeight: '800', lineHeight: 24 },
  detailSectionLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginBottom: 6 },
  detailInfoBox: { padding: 12, borderRadius: 12, borderWidth: 1 },
  detailInfoText: { fontSize: 13.5, lineHeight: 20 },
  detailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  detailRowLabel: { fontSize: 13, fontWeight: '600', width: 95 },
  detailRowValue: { fontSize: 13, fontWeight: '700', flex: 1 },
  attachmentItem: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
  attachmentName: { fontSize: 13, fontWeight: '600' },
  attachmentSize: { fontSize: 11, marginTop: 2 },
  outlineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, height: 46, borderRadius: 12, borderWidth: 1.5 },
  outlineBtnText: { fontSize: 14, fontWeight: '700' },
});
