import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';

import { HapticTab } from '@/components/haptic-tab';
import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#5B5CE2',
        tabBarInactiveTintColor: isDark ? '#718096' : '#94A3B8',
        tabBarStyle: { height: 68, paddingTop: 7, paddingBottom: 8, backgroundColor: isDark ? '#151E31' : '#FFFFFF', borderTopColor: isDark ? '#25324A' : '#E8ECF3' },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => <Ionicons size={24} name={focused ? 'home' : 'home-outline'} color={color} />,
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => <Ionicons size={25} name={focused ? 'person' : 'person-outline'} color={color} />,
        }}
      />
    </Tabs>
  );
}
