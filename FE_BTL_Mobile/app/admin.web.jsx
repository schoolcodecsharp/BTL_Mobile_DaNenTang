import { Stack } from 'expo-router';
import AdminAccounts from '@/components/admin/admin-accounts';

export default function AdminWebScreen() {
  return <>
    <Stack.Screen options={{ headerShown: false, title: 'Quản lý tài khoản • TaskMaster' }} />
    <AdminAccounts />
  </>;
}
