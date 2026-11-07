import { Tabs } from 'expo-router';
import { Home, Package, User as UserIcon } from 'lucide-react-native';
import { Platform } from 'react-native';
import { Colors, Typography } from '@/lib/theme';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.primary[600],
        tabBarInactiveTintColor: Colors.neutral[400],
        tabBarStyle: {
          backgroundColor: Colors.neutral[0],
          borderTopWidth: 0,
          elevation: 0,
          ...(Platform.OS === 'web' ? {} : { height: 64, paddingBottom: 8, paddingTop: 8 }),
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: Typography.fontFamilyMedium,
          marginTop: 2,
        },
        tabBarIconStyle: { marginBottom: 2 },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ size, color }) => (
            <Home size={size} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="bookings"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ size, color }) => (
            <Package size={size} color={color} strokeWidth={2.2} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ size, color }) => (
            <UserIcon size={size} color={color} strokeWidth={2.2} />
          ),
        }}
      />
    </Tabs>
  );
}
