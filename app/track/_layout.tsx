import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';

export default function TrackLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: Colors.neutral[50] },
      }}
    >
      <Stack.Screen name="index" />
    </Stack>
  );
}
