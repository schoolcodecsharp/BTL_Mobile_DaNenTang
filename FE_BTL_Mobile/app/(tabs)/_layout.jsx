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
        tabBarStyle: {
          height: 68,
          paddingTop: 7,
          paddingBottom: 8,
          backgroundColor: isDark ? '#151E31' : '#FFFFFF',
          borderTopColor: isDark ? '#25324A' : '#E8ECF3',
        },
        tabBarLabelStyle: { fontSize: 10.5, fontWeight: '700' },
        headerShown: false,
        tabBarButton: HapticTab,
      }}>

      <Tabs.Screen
        name="home"
        options={{
          title: 'Trang chủ',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'home' : 'home-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Công việc',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'checkbox' : 'checkbox-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="teams"
        options={{
          title: 'Nhóm',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={24} name={focused ? 'people' : 'people-outline'} color={color} />
          ),
        }}
      />

      <Tabs.Screen
        name="profile"
        options={{
          title: 'Cá nhân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons size={25} name={focused ? 'person' : 'person-outline'} color={color} />
          ),
        }}
      />

      {/* Hide old files if they still exist */}
      <Tabs.Screen name="index" options={{ href: null }} />
      <Tabs.Screen name="explore" options={{ href: null }} />
    </Tabs>
  );
}
