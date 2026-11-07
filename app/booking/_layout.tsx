import { Stack } from 'expo-router';
import { Colors } from '@/lib/theme';
import { BookingProvider } from '@/lib/booking-context';

export default function BookingLayout() {
  return (
    <BookingProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: Colors.neutral[50] },
        }}
      >
        <Stack.Screen name="select-bus" />
        <Stack.Screen name="select-stops" />
        <Stack.Screen name="parcel-details" />
        <Stack.Screen name="payment" />
        <Stack.Screen name="summary" />
        <Stack.Screen name="confirmation" />
      </Stack>
    </BookingProvider>
  );
}
