import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAuthSession } from '@/components/auth-session';
import { useColorScheme } from '@/hooks/use-color-scheme';

const MENU_GROUPS = [
  [
    { icon: 'person-outline', title: 'Thông tin cá nhân', subtitle: 'Tên, email và ảnh đại diện', color: '#6366F1' },
    { icon: 'shield-checkmark-outline', title: 'Bảo mật tài khoản', subtitle: 'Mật khẩu và quyền riêng tư', color: '#10B981' },
  ],
  [
    { icon: 'color-palette-outline', title: 'Giao diện', subtitle: 'Theo cài đặt của thiết bị', color: '#8B5CF6' },
    { icon: 'language-outline', title: 'Ngôn ngữ', subtitle: 'Tiếng Việt', color: '#0EA5E9' },
    { icon: 'help-circle-outline', title: 'Trợ giúp & phản hồi', subtitle: 'Câu hỏi thường gặp, liên hệ', color: '#F59E0B' },
  ],
];

export default function ProfileScreen() {
  const router = useRouter();
  const isDark = useColorScheme() === 'dark';
  const { user, signOut } = useAuthSession();
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const theme = {
    background: isDark ? '#0B1120' : '#F7F8FC', surface: isDark ? '#151E31' : '#FFFFFF',
    text: isDark ? '#F8FAFC' : '#172033', muted: isDark ? '#91A0B7' : '#6B7280',
    border: isDark ? '#25324A' : '#E8ECF3', separator: isDark ? '#25324A' : '#EFF1F5', primary: '#5B5CE2',
  };
  const fullName = user?.fullName?.trim() || (user ? user.username : 'Khách trải nghiệm');
  const email = user?.email || 'Chưa đăng nhập tài khoản';
  const initials = fullName.split(/\s+/).filter(Boolean).slice(-2).map((part) => part[0]).join('').toUpperCase() || 'K';

  const handleLogout = () => {
    if (!user) { router.replace('/(auth)/login'); return; }
    Alert.alert('Đăng xuất', 'Bạn có chắc muốn đăng xuất khỏi TaskMaster?', [
      { text: 'Hủy', style: 'cancel' },
      { text: 'Đăng xuất', style: 'destructive', onPress: () => { signOut(); router.replace('/(auth)/login'); } },
    ]);
  };

  return (
    <SafeAreaView edges={['top', 'left', 'right']} style={[styles.safeArea, { backgroundColor: theme.background }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View><Text style={[styles.eyebrow, { color: theme.muted }]}>TÀI KHOẢN</Text><Text style={[styles.pageTitle, { color: theme.text }]}>Hồ sơ của tôi</Text></View>
          <TouchableOpacity onPress={() => Alert.alert('Cài đặt', 'Các cài đặt nâng cao sẽ được cập nhật sớm.')} style={[styles.headerButton, { backgroundColor: theme.surface, borderColor: theme.border }]}><Ionicons name="settings-outline" size={22} color={theme.text} /></TouchableOpacity>
        </View>

        <View style={[styles.profileCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.avatarWrap}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={styles.onlineBadge} /></View>
          <Text style={[styles.name, { color: theme.text }]}>{fullName}</Text><Text style={[styles.email, { color: theme.muted }]}>{email}</Text>
          <TouchableOpacity onPress={() => Alert.alert('Chỉnh sửa hồ sơ', 'Biểu mẫu cập nhật hồ sơ sẽ được kết nối với API người dùng.')} activeOpacity={0.8} style={[styles.editButton, { backgroundColor: isDark ? '#282A62' : '#EEF2FF' }]}><Ionicons name="create-outline" size={16} color={theme.primary} /><Text style={[styles.editText, { color: theme.primary }]}>Chỉnh sửa hồ sơ</Text></TouchableOpacity>
          <View style={[styles.stats, { borderTopColor: theme.separator }]}>
            <Stat value="24" label="Công việc" theme={theme} />
            <View style={[styles.statItem, styles.statMiddle, { borderColor: theme.separator }]}><Text style={[styles.statValue, { color: theme.text }]}>18</Text><Text style={[styles.statLabel, { color: theme.muted }]}>Hoàn thành</Text></View>
            <Stat value="75%" label="Hiệu suất" theme={theme} />
          </View>
        </View>

        <Text style={[styles.groupLabel, { color: theme.muted }]}>CÀI ĐẶT CHUNG</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>
          <View style={styles.menuRow}><View style={[styles.menuIcon, { backgroundColor: isDark ? '#3F1D2E' : '#FFF1F2' }]}><Ionicons name="notifications-outline" size={20} color="#F43F5E" /></View><View style={styles.menuCopy}><Text style={[styles.menuTitle, { color: theme.text }]}>Thông báo</Text><Text style={[styles.menuSubtitle, { color: theme.muted }]}>Nhắc việc và cập nhật</Text></View><Switch value={notificationsEnabled} onValueChange={setNotificationsEnabled} trackColor={{ false: '#CBD5E1', true: '#A5B4FC' }} thumbColor={notificationsEnabled ? theme.primary : '#F8FAFC'} /></View>
          {MENU_GROUPS[0].map((item) => <MenuRow key={item.title} item={item} theme={theme} isDark={isDark} />)}
        </View>

        <Text style={[styles.groupLabel, { color: theme.muted }]}>ỨNG DỤNG</Text>
        <View style={[styles.menuCard, { backgroundColor: theme.surface, borderColor: theme.border }]}>{MENU_GROUPS[1].map((item) => <MenuRow key={item.title} item={item} theme={theme} isDark={isDark} />)}</View>

        <TouchableOpacity onPress={handleLogout} activeOpacity={0.8} style={[styles.logoutButton, { backgroundColor: theme.surface, borderColor: isDark ? '#5A2431' : '#FFE4E6' }]}><Ionicons name={user ? 'log-out-outline' : 'log-in-outline'} size={21} color="#E11D48" /><Text style={styles.logoutText}>{user ? 'Đăng xuất' : 'Đăng nhập tài khoản'}</Text></TouchableOpacity>
        <Text style={[styles.version, { color: theme.muted }]}>TaskMaster • Phiên bản 1.0.0</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Stat({ value, label, theme }) {
  return <View style={styles.statItem}><Text style={[styles.statValue, { color: theme.text }]}>{value}</Text><Text style={[styles.statLabel, { color: theme.muted }]}>{label}</Text></View>;
}

function MenuRow({ item, theme, isDark }) {
  return (
    <TouchableOpacity activeOpacity={0.7} onPress={() => Alert.alert(item.title, 'Tính năng này sẽ được hoàn thiện trong bản cập nhật tiếp theo.')} style={[styles.menuRow, { borderTopColor: theme.separator }]}>
      <View style={[styles.menuIcon, { backgroundColor: isDark ? `${item.color}25` : `${item.color}12` }]}><Ionicons name={item.icon} size={20} color={item.color} /></View>
      <View style={styles.menuCopy}><Text style={[styles.menuTitle, { color: theme.text }]}>{item.title}</Text><Text style={[styles.menuSubtitle, { color: theme.muted }]}>{item.subtitle}</Text></View><Ionicons name="chevron-forward" size={19} color={theme.muted} />
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1 }, content: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 42 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }, eyebrow: { fontSize: 11, fontWeight: '800', letterSpacing: 1.4, marginBottom: 4 }, pageTitle: { fontSize: 25, fontWeight: '800', letterSpacing: -0.5 }, headerButton: { width: 44, height: 44, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  profileCard: { borderRadius: 24, borderWidth: 1, paddingTop: 23, alignItems: 'center', overflow: 'hidden', marginBottom: 25, shadowColor: '#0F172A', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.05, shadowRadius: 14, elevation: 2 }, avatarWrap: { marginBottom: 12 }, avatar: { width: 82, height: 82, borderRadius: 27, backgroundColor: '#5B5CE2', alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: '#EEF2FF' }, avatarText: { color: '#FFFFFF', fontSize: 25, fontWeight: '800' }, onlineBadge: { position: 'absolute', right: -1, bottom: 2, width: 18, height: 18, borderRadius: 9, backgroundColor: '#10B981', borderWidth: 3, borderColor: '#FFFFFF' }, name: { fontSize: 21, fontWeight: '800', marginBottom: 4 }, email: { fontSize: 13, marginBottom: 15 }, editButton: { height: 38, borderRadius: 12, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 21 }, editText: { fontSize: 12.5, fontWeight: '700' },
  stats: { width: '100%', borderTopWidth: 1, flexDirection: 'row', paddingVertical: 16 }, statItem: { flex: 1, alignItems: 'center' }, statMiddle: { borderLeftWidth: 1, borderRightWidth: 1 }, statValue: { fontSize: 18, fontWeight: '800' }, statLabel: { fontSize: 11.5, marginTop: 3 },
  groupLabel: { fontSize: 11, fontWeight: '800', letterSpacing: 1.1, marginLeft: 4, marginBottom: 9 }, menuCard: { borderRadius: 19, borderWidth: 1, overflow: 'hidden', marginBottom: 22 }, menuRow: { minHeight: 68, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 15, borderTopWidth: StyleSheet.hairlineWidth }, menuIcon: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 }, menuCopy: { flex: 1 }, menuTitle: { fontSize: 14, fontWeight: '700', marginBottom: 3 }, menuSubtitle: { fontSize: 11.5 },
  logoutButton: { height: 52, borderRadius: 16, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 2 }, logoutText: { color: '#E11D48', fontSize: 14, fontWeight: '700' }, version: { textAlign: 'center', fontSize: 11, marginTop: 18 },
});
