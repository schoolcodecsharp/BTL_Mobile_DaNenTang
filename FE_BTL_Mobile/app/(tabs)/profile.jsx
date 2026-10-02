import { useFocusEffect , useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/components/auth-session';
import { useTaskReminders } from '@/components/task-reminder-provider';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { getTasks } from '@/lib/tasks-api';
import { changeUserPassword, updateUserProfile } from '@/lib/users-api';
import { apiUpload } from '@/lib/api';

export default function ProfileScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { user, updateUser, signOut } = useAuthSession();

  const { notificationsEnabled, setNotificationsEnabled, notificationsDisabled } = useTaskReminders();
  const [refreshing, setRefreshing] = useState(false);
  const [taskStats, setTaskStats] = useState({ total: 0, completed: 0, rate: 0 });

  // Modal states
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const theme = {
    background: isDark ? '#0B1120' : '#F7F8FC',
    surface: isDark ? '#151E31' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#172033',
    muted: isDark ? '#91A0B7' : '#6B7280',
    border: isDark ? '#25324A' : '#E8ECF3',
    separator: isDark ? '#25324A' : '#EFF1F5',
    primary: '#5B5CE2',
    iconBg: isDark ? '#282A62' : '#EEF2FF',
  };

  const fullName = user?.fullName?.trim() || (user ? user.username : 'Khách trải nghiệm');
  const email = user?.email || 'Chưa đăng nhập tài khoản';
  const initials = fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(-2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || 'K';

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;
    try {
      const data = await getTasks(user.id);
      const list = data ?? [];
      const total = list.length;
      const completed = list.filter((t) => t.trangThai === 'HOAN_THANH').length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;
      setTaskStats({ total, completed, rate });
    } catch {
      // ignore
    }
  }, [user]);

  useFocusEffect(useCallback(() => { void fetchStats(); }, [fetchStats]));

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  const handleLogout = () => {
    if (!user) {
      router.replace('/(auth)/login');
      return;
    }
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi TaskMaster?', [
      { text: 'Hủy', style: 'cancel' },
      {
        text: 'Đăng xuất',
        style: 'destructive',
        onPress: () => {
          signOut();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const handleMenuPress = (key) => {
    if (!user && (key === 'profile' || key === 'security')) {
      Alert.alert('Chưa đăng nhập', 'Vui lòng đăng nhập để sử dụng tính năng này.');
      return;
    }
    switch (key) {
      case 'profile':
        setShowEditProfile(true);
        break;
      case 'security':
        setShowChangePassword(true);
        break;
      case 'theme':
        Alert.alert(
          'Giao diện ứng dụng',
          `Hiện ứng dụng đang tự động đồng bộ theo chế độ của thiết bị (${isDark ? 'Giao diện Tối' : 'Giao diện Sáng'}).`
        );
        break;
      case 'language':
        Alert.alert('Ngôn ngữ', 'Ứng dụng đang hỗ trợ Tiếng Việt làm ngôn ngữ mặc định.');
        break;
      case 'help':
        setShowHelp(true);
        break;
      default:
        break;
    }
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.primary} />}>
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: theme.muted }]}>TÀI KHOẢN</Text>
            <Text style={[styles.pageTitle, { color: theme.text }]}>Hồ sơ của tôi</Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowHelp(true)}
            style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}>
            <Ionicons name="help-outline" size={22} color={theme.text} />
          </TouchableOpacity>
        </View>

        {/* Profile Card */}
        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.avatarWrap}>
            <View style={styles.avatar}>
              {user?.avatar ? <Image source={{ uri: user.avatar }} style={styles.avatarImage} /> : <Text style={styles.avatarText}>{initials}</Text>}
            </View>
            <View style={styles.onlineBadge} />
          </View>
          <Text style={[styles.name, { color: theme.text }]}>{fullName}</Text>
          <Text style={[styles.email, { color: theme.muted }]}>{email}</Text>

          {user && (
            <TouchableOpacity
              onPress={() => setShowEditProfile(true)}
              activeOpacity={0.8}
              style={[styles.editButton, { backgroundColor: theme.iconBg }]}>
              <Ionicons name="create-outline" size={16} color={theme.primary} />
              <Text style={[styles.editText, { color: theme.primary }]}>Chỉnh sửa hồ sơ</Text>
            </TouchableOpacity>
          )}

          {/* Stats */}
          <View style={[styles.stats, { borderTopColor: theme.separator }]}>
            <Stat value={taskStats.total} label="Công việc" theme={theme} />
            <View style={[styles.statItem, styles.statMiddle, { borderColor: theme.separator }]}>
              <Text style={[styles.statValue, { color: theme.text }]}>{taskStats.completed}</Text>
              <Text style={[styles.statLabel, { color: theme.muted }]}>Hoàn thành</Text>
            </View>
            <Stat value={`${taskStats.rate}%`} label="Hiệu suất" theme={theme} />
          </View>
        </View>

        {/* Account Settings */}
        <Text style={[styles.groupLabel, { color: theme.muted }]}>CÀI ĐẶT CHUNG</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          {/* Notification Switch */}
          <View style={styles.menuRow}>
            <View style={[styles.menuIcon, { backgroundColor: isDark ? '#3F1D2E' : '#FFF1F2' }]}>
              <Ionicons name="notifications-outline" size={20} color="#F43F5E" />
            </View>
            <View style={styles.menuCopy}>
              <Text style={[styles.menuTitle, { color: theme.text }]}>Thông báo</Text>
              <Text style={[styles.menuSubtitle, { color: theme.muted }]}>Nhắc trước hạn 10 phút trên điện thoại</Text>
            </View>
            <Switch
              disabled={notificationsDisabled} value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: '#CBD5E1', true: '#A5B4FC' }}
              thumbColor={notificationsEnabled ? theme.primary : '#F8FAFC'}
            />
          </View>

          {/* Edit Profile */}
          <MenuRow
            item={{
              icon: 'person-outline',
              title: 'Thông tin cá nhân',
              subtitle: 'Cập nhật họ tên và email',
              color: '#6366F1',
              key: 'profile',
            }}
            theme={theme}
            isDark={isDark}
            onPress={() => handleMenuPress('profile')}
          />

          {/* Security */}
          <MenuRow
            item={{
              icon: 'shield-checkmark-outline',
              title: 'Bảo mật tài khoản',
              subtitle: 'Đổi mật khẩu bảo vệ tài khoản',
              color: '#10B981',
              key: 'security',
            }}
            theme={theme}
            isDark={isDark}
            onPress={() => handleMenuPress('security')}
          />
        </View>

        {/* App Settings */}
        <Text style={[styles.groupLabel, { color: theme.muted }]}>ỨNG DỤNG</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <MenuRow
            item={{
              icon: 'color-palette-outline',
              title: 'Giao diện',
              subtitle: isDark ? 'Chế độ Tối (Theo hệ thống)' : 'Chế độ Sáng (Theo hệ thống)',
              color: '#8B5CF6',
              key: 'theme',
            }}
            theme={theme}
            isDark={isDark}
            onPress={() => handleMenuPress('theme')}
          />
          <MenuRow
            item={{
              icon: 'language-outline',
              title: 'Ngôn ngữ',
              subtitle: 'Tiếng Việt',
              color: '#0EA5E9',
              key: 'language',
            }}
            theme={theme}
            isDark={isDark}
            onPress={() => handleMenuPress('language')}
          />
          <MenuRow
            item={{
              icon: 'help-circle-outline',
              title: 'Trợ giúp & phản hồi',
              subtitle: 'Hướng dẫn sử dụng, giới thiệu đồ án',
              color: '#F59E0B',
              key: 'help',
            }}
            theme={theme}
            isDark={isDark}
            onPress={() => handleMenuPress('help')}
          />
        </View>

        {/* Logout / Login */}
        <TouchableOpacity
          onPress={handleLogout}
          activeOpacity={0.8}
          style={[styles.logoutButton, { backgroundColor: theme.surface, borderColor: isDark ? '#5A2431' : '#FFE4E6' }]}>
          <Ionicons name={user ? 'log-out-outline' : 'log-in-outline'} size={21} color="#E11D48" />
          <Text style={styles.logoutText}>{user ? 'Đăng xuất' : 'Đăng nhập tài khoản'}</Text>
        </TouchableOpacity>

        <Text style={[styles.version, { color: theme.muted }]}>TaskMaster • Phiên bản 1.0.0 (BTL Mobile)</Text>
      </ScrollView>

      {/* Edit Profile Modal */}
      {user && showEditProfile && (
        <EditProfileModal
          visible={showEditProfile}
          user={user}
          theme={theme}
          onClose={() => setShowEditProfile(false)}
          onUpdated={(updated) => {
            updateUser(updated);
            setShowEditProfile(false);
            Alert.alert('Thành công', 'Hồ sơ cá nhân đã được cập nhật.');
          }}
        />
      )}

      {/* Change Password Modal */}
      {user && showChangePassword && (
        <ChangePasswordModal
          visible={showChangePassword}
          userId={user.id}
          theme={theme}
          onClose={() => setShowChangePassword(false)}
          onSuccess={() => {
            setShowChangePassword(false);
            Alert.alert('Thành công', 'Mật khẩu đã được thay đổi thành công.');
          }}
        />
      )}

      {/* Help Modal */}
      <HelpModal visible={showHelp} theme={theme} onClose={() => setShowHelp(false)} />
    </SafeAreaView>
  );
}

function Stat({ value, label, theme }) {
  return (
    <View style={styles.statItem}>
      <Text style={[styles.statValue, { color: theme.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text>
    </View>
  );
}

function MenuRow({ item, theme, isDark, onPress }) {
  return (
    <TouchableOpacity
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.menuRow, { borderTopColor: theme.separator }]}>
      <View style={[styles.menuIcon, { backgroundColor: isDark ? `${item.color}25` : `${item.color}12` }]}>
        <Ionicons name={item.icon} size={20} color={item.color} />
      </View>
      <View style={styles.menuCopy}>
        <Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text>
        <Text style={[styles.menuSubtitle, { color: theme.muted }]}>{item.subtitle}</Text>
      </View>
      <Ionicons name="chevron-forward" size={19} color={theme.muted} />
    </TouchableOpacity>
  );
}

// ─────────────────────────────────────────────────────────────
// EDIT PROFILE MODAL
// ─────────────────────────────────────────────────────────────
function EditProfileModal({ visible, user, theme, onClose, onUpdated }) {
  const [fullName, setFullName] = useState(user.fullName ?? '');
  const [email, setEmail] = useState(user.email ?? '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [avatar, setAvatar] = useState(user.avatar ?? null);
  const [avatarAsset, setAvatarAsset] = useState(null);

  async function pickAvatar() {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) { setError('Cần quyền truy cập thư viện ảnh để chọn ảnh đại diện.'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.8 });
    if (!result.canceled && result.assets?.[0]) {
      setAvatarAsset(result.assets[0]);
      setAvatar(result.assets[0].uri);
    }
  }


  async function handleSave() {
    if (!email.trim()) {
      setError('Vui lòng nhập địa chỉ email.');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Địa chỉ email không đúng định dạng.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      let avatarUrl = avatar;
      if (avatarAsset) {
        const upload = await apiUpload([{ uri: avatarAsset.uri,
          name: avatarAsset.fileName || `avatar-${user.id}.jpg`, type: avatarAsset.mimeType || 'image/jpeg',
          file: avatarAsset.file }]);
        avatarUrl = upload?.files?.[0]?.url;
        if (!avatarUrl) throw new Error('Không nhận được địa chỉ ảnh sau khi tải lên.');
      }
      const res = await updateUserProfile(user.id, {
        fullName: fullName.trim() || undefined,
        email: email.trim(),
        avatarUrl,
      });
      onUpdated({
        fullName: res?.fullName ?? fullName.trim(),
        email: res?.email ?? email.trim(),
        avatar: res?.avatarUrl ?? avatarUrl,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Chỉnh sửa hồ sơ</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            <View style={{ alignItems: 'center', marginBottom: 10 }}>
              <TouchableOpacity onPress={pickAvatar} style={styles.avatar}>
                {avatar ? <Image source={{ uri: avatar }} style={styles.avatarImage} /> : <Ionicons name="camera-outline" size={28} color="#FFFFFF" />}
              </TouchableOpacity>
              <TouchableOpacity onPress={pickAvatar}><Text style={{ color: theme.primary, fontWeight: '700', padding: 8 }}>Chọn ảnh đại diện</Text></TouchableOpacity>
              {!!avatar && <TouchableOpacity onPress={() => { setAvatar(null); setAvatarAsset(null); }}><Text style={{ color: '#E11D48', padding: 5 }}>Xóa ảnh</Text></TouchableOpacity>}
            </View>
            <Text style={[styles.inputLabel, { color: theme.text }]}>Tên đăng nhập (không thể đổi)</Text>
            <View style={[styles.textInput, styles.disabledInput, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <Ionicons name="lock-closed-outline" size={16} color={theme.muted} />
              <Text style={{ color: theme.muted, fontSize: 14 }}>{user.username}</Text>
            </View>

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>Họ và tên</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="Nhập họ và tên..."
              placeholderTextColor={theme.muted}
              value={fullName}
              onChangeText={setFullName}
            />

            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>Email *</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: theme.background, borderColor: theme.border, color: theme.text }]}
              placeholder="example@gmail.com"
              placeholderTextColor={theme.muted}
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />

            {!!error && <Text style={styles.formError}>{error}</Text>}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: 22 }, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Lưu thay đổi</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// CHANGE PASSWORD MODAL
// ─────────────────────────────────────────────────────────────
function ChangePasswordModal({ visible, userId, theme, onClose, onSuccess }) {
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');


  async function handleSave() {
    if (!oldPassword) {
      setError('Vui lòng nhập mật khẩu hiện tại.');
      return;
    }
    if (!newPassword) {
      setError('Vui lòng nhập mật khẩu mới.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Mật khẩu mới phải có tối thiểu 6 ký tự.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Xác nhận mật khẩu mới không khớp.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await changeUserPassword(userId, { oldPassword, newPassword });
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Đổi mật khẩu</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
            {/* Old password */}
            <Text style={[styles.inputLabel, { color: theme.text }]}>Mật khẩu hiện tại *</Text>
            <View style={[styles.passwordWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Nhập mật khẩu hiện tại..."
                placeholderTextColor={theme.muted}
                value={oldPassword}
                onChangeText={setOldPassword}
                secureTextEntry={!showOld}
              />
              <TouchableOpacity onPress={() => setShowOld(!showOld)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showOld ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
              </TouchableOpacity>
            </View>

            {/* New password */}
            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>Mật khẩu mới (tối thiểu 6 ký tự) *</Text>
            <View style={[styles.passwordWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Nhập mật khẩu mới..."
                placeholderTextColor={theme.muted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNew}
              />
              <TouchableOpacity onPress={() => setShowNew(!showNew)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showNew ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
              </TouchableOpacity>
            </View>

            {/* Confirm password */}
            <Text style={[styles.inputLabel, { color: theme.text, marginTop: 14 }]}>Xác nhận mật khẩu mới *</Text>
            <View style={[styles.passwordWrap, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <TextInput
                style={[styles.passwordInput, { color: theme.text }]}
                placeholder="Nhập lại mật khẩu mới..."
                placeholderTextColor={theme.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirm}
              />
              <TouchableOpacity onPress={() => setShowConfirm(!showConfirm)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name={showConfirm ? 'eye-off-outline' : 'eye-outline'} size={20} color={theme.muted} />
              </TouchableOpacity>
            </View>

            {!!error && <Text style={styles.formError}>{error}</Text>}

            <TouchableOpacity
              onPress={handleSave}
              disabled={saving}
              style={[styles.saveBtn, { backgroundColor: '#10B981', marginTop: 22 }, saving && { opacity: 0.7 }]}>
              {saving ? <ActivityIndicator color="#FFFFFF" size="small" /> : <Text style={styles.saveBtnText}>Cập nhật mật khẩu</Text>}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// HELP & ABOUT MODAL
// ─────────────────────────────────────────────────────────────
function HelpModal({ visible, theme, onClose }) {
  return (
    <Modal visible={visible} animationType="slide" transparent presentationStyle="overFullScreen">
      <View style={styles.modalOverlay}>
        <View style={[styles.modalSheet, { backgroundColor: theme.surface }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>Trợ giúp & Thông tin</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
              <Ionicons name="close" size={24} color={theme.muted} />
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent} showsVerticalScrollIndicator={false}>
            {/* App overview */}
            <View style={[styles.helpBox, { backgroundColor: theme.background, borderColor: theme.border }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                <View style={[styles.helpIconWrap, { backgroundColor: `${theme.primary}20` }]}>
                  <Ionicons name="checkbox-outline" size={22} color={theme.primary} />
                </View>
                <View>
                  <Text style={[styles.helpAppName, { color: theme.text }]}>TaskMaster Mobile</Text>
                  <Text style={{ fontSize: 12, color: theme.muted }}>Phiên bản 1.0.0 (BTL Di động Đa nền tảng)</Text>
                </View>
              </View>
              <Text style={{ fontSize: 13, color: theme.muted, lineHeight: 19 }}>
                Ứng dụng hỗ trợ quản lý công việc cá nhân và đội nhóm toàn diện với lời nhắc, tiến độ công việc, phân loại danh mục và đính kèm tệp tin.
              </Text>
            </View>

            {/* Guides */}
            <Text style={[styles.helpSectionTitle, { color: theme.text }]}>HƯỚNG DẪN TÍNH NĂNG</Text>

            <View style={[styles.helpBox, { backgroundColor: theme.background, borderColor: theme.border, gap: 12 }]}>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Ionicons name="time-outline" size={18} color={theme.primary} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpGuideTitle, { color: theme.text }]}>Tạo hạn chót chi tiết</Text>
                  <Text style={[styles.helpGuideDesc, { color: theme.muted }]}>
                    Khi tạo việc, bạn có thể chọn ngày bằng lịch và điền riêng Giờ (00–23) cùng Phút (00–59) để quản lý thời gian chính xác.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Ionicons name="people-outline" size={18} color="#10B981" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpGuideTitle, { color: theme.text }]}>Làm việc đội nhóm</Text>
                  <Text style={[styles.helpGuideDesc, { color: theme.muted }]}>
                    Trưởng nhóm mời thành viên qua email, phân chia công việc cho từng thành viên, theo dõi tiến độ và nhận thông báo khi task hoàn thành.
                  </Text>
                </View>
              </View>

              <View style={{ flexDirection: 'row', gap: 10 }}>
                <Ionicons name="attach-outline" size={18} color="#F59E0B" />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.helpGuideTitle, { color: theme.text }]}>Đính kèm tệp tin</Text>
                  <Text style={[styles.helpGuideDesc, { color: theme.muted }]}>
                    Tải lên tài liệu hoặc ảnh đính kèm để chia sẻ đầy đủ tài liệu phục vụ thực hiện công việc.
                  </Text>
                </View>
              </View>
            </View>

            <TouchableOpacity
              onPress={onClose}
              style={[styles.saveBtn, { backgroundColor: theme.primary, marginTop: 18 }]}>
              <Text style={styles.saveBtnText}>Đã hiểu</Text>
            </TouchableOpacity>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 },
  eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 },
  pageTitle: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 },
  headerButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { borderRadius: 24, borderWidth: 1, paddingTop: 23, alignItems: 'center', overflow: 'hidden', marginBottom: 25, elevation: 2 },
  avatarWrap: { marginBottom: 12 },
  avatar: { width: 82, height: 82, borderRadius: 27, overflow: 'hidden', backgroundColor: '#5B5CE2', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#EEF2FF' },
  avatarText: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' },
  avatarImage: { width: '100%', height: '100%', borderRadius: 23, resizeMode: 'cover' },
  onlineBadge: { position: 'absolute', right: -1, bottom: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFFFFF' },
  name: { fontSize: 21, fontWeight: '800', marginBottom: 4 },
  email: { fontSize: 13, marginBottom: 15 },
  editButton: { height: 38, borderRadius: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 21 },
  editText: { fontSize: 12.5, fontWeight: '700' },
  stats: { width: '100%', borderTopWidth: 1, flexDirection: 'row', paddingVertical: 16 },
  statItem: { flex: 1, alignItems: 'center' },
  statMiddle: { borderLeftWidth: 1, borderRightWidth: 1 },
  statValue: { fontSize: 18, fontWeight: '800' },
  statLabel: { fontSize: 11.5, marginTop: 3 },
  groupLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginLeft: 4, marginBottom: 9 },
  menuCard: { borderRadius: 19, borderWidth: 1, overflow: 'hidden', marginBottom: 22 },
  menuRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderTopWidth: StyleSheet.hairlineWidth },
  menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  menuCopy: { flex: 1 },
  menuTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 },
  menuSubtitle: { fontSize: 11.5 },
  logoutButton: { height: 52, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 },
  logoutText: { color: '#E11D48', fontSize: 14, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 11, marginTop: 18 },
  // Modal styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '90%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14, borderBottomWidth: 1 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalContent: { padding: 20, paddingBottom: 40 },
  inputLabel: { fontSize: 13, fontWeight: '700', marginBottom: 8 },
  textInput: { borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 12, fontSize: 14 },
  disabledInput: { flexDirection: 'row', alignItems: 'center', gap: 8, opacity: 0.7 },
  passwordWrap: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderRadius: 12, paddingHorizontal: 14 },
  passwordInput: { flex: 1, paddingVertical: 12, fontSize: 14 },
  formError: { color: '#E11D48', fontSize: 13, marginTop: 10, textAlign: 'center' },
  saveBtn: { height: 50, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 15, fontWeight: '800' },
  helpBox: { padding: 14, borderRadius: 14, borderWidth: 1, marginBottom: 14 },
  helpIconWrap: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  helpAppName: { fontSize: 15, fontWeight: '800' },
  helpSectionTitle: { fontSize: 12, fontWeight: '800', letterSpacing: 1.1, marginBottom: 8, marginTop: 6 },
  helpGuideTitle: { fontSize: 13.5, fontWeight: '700', marginBottom: 3 },
  helpGuideDesc: { fontSize: 12.5, lineHeight: 18 },
});
