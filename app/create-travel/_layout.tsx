import { Stack } from 'expo-router';
import { colors } from '@/src/theme';

export default function CreateTravelLayout() {
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.cream } }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="preference" />
      <Stack.Screen name="places" />
      <Stack.Screen name="map-search" />
    </Stack>
  );
}
